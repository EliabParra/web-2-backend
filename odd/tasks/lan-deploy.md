# lan-deploy — Fix and package Toproc (backend + frontend) for LAN / single-PC install
Branch: `feat/lan-deploy` in `web-2-backend` and `web-2-frontend` (frontend branch starts from `origin/main`). Delivery: exception-ok (personal university repos, one PR per repo, user decides push/merge).
Runners: backend `pnpm run verify` / `node --test`; frontend `npm run build` (+ `npm test` if present). Guiding rule: simple and direct, no over-engineering.

## Specs

- **S1 Backend runs in production.** "arreglar ambas y empaquetarlas bien para ser desplegadas". The production image must boot and execute transactions:
  - BOs resolve from the built output (today `src/core/transaction/TransactionExecutor.ts:36` uses `process.cwd()/BO`, image only has `dist/BO`).
  - The explorer (`scripts/explorer`, needs `typescript`) is not imported in production (port the fork's dynamic import in `src/api/AppServer.ts`).
  - Sessions use `security.sessions` (`SESSION_SCHEMA=security`, `SESSION_TABLE=sessions`), a real `SESSION_SECRET`, `APP_PORT` (not `PORT`).
  - Schema is created by a one-shot `migrate` service (`db sync` + `db seed` + BO registration) instead of an `init.sql` dump; `_migration_history` stays correct; re-running is idempotent.
  - BO registration is deterministic: BO dirs sorted (done in `scripts/db/seeders/bo-register.ts`), `--txStart 1000`, all methods granted to profile **3 (`super_admin`)**, never profile 1 (`public`). Profiles: public=1, session=2.
  - The seeded admin (user/password from env) can log in: no email-verification block.
  - Postgres 18 volume at `/var/lib/postgresql`; pnpm pinned (`packageManager`), `--frozen-lockfile`.
- **S2 One-script install with persistence.** "con pasos incluso si es una pc local que ni docker tiene que no tiene nada, que con un script o lo que sea pueda instalar la aplicacion con persistencia y asi". `install.sh` (Linux) and `install.ps1` (Windows): install Docker if missing, fetch both repos without requiring git (GitHub zip), generate `.env` with random secrets once (keep it on re-run), `docker compose up -d --build`. Data survives restarts, reboots and re-running the installer (update = re-run). App auto-restarts.
- **S3 Frontend: main's screens on the real backend.** User chose option 1: "portar las pantallas de main a master y conectarlas al backend real con useTx". Implementation decision: start from `main` (it has the UI) and bring in master's API layer (`axios-client`, `toProccess`, `useTx`), replacing mocks. *Assumption (scope)*: the goal is "gestionar el inventario de componentes, no como tal para prestarlos", so wire Login, Inventario (Inventory/Component/Category) and Ubicación (Location); hide modules that are not wired (loans, returns, security admin…) from navigation instead of deleting them. Remove mock users/data from wired paths and `lovable-tagger`.
- **S4 Same-origin serving.** The backend serves the built SPA (`APP_FRONTEND_MODE=spa`, `SPA_DIST_PATH`), so the intern opens `http://<server-ip>:<port>`. Frontend uses relative URLs. CSRF: read `csrfToken` from `GET /csrf` JSON and send `X-CSRF-Token` (backend never sets a cookie). No `/api/session` (does not exist): keep the user from the login response `{status, user, msg}` and treat an unauthenticated tx error as logged out.
- **S5 Docs.** "documentar una forma estandar de levantarlo sin fallos": backend `docs/DEPLOY.md` (install, update, backup/restore, troubleshooting) and `docs/DEV.md` (dev flow), README links; frontend README dev flow (vite proxy to backend).
- **S6** "ahorrar tokens, nada de sobreingenieria, ve a lo sencillo, directo".

### Shared contract (both writers)
- Tx map (fresh install, `--txStart 1000`): Auth register=1000 … getNavigation=1007; Category get=1009 getAll=1010 create=1011 update=1012 delete=1013; Component get=1014 getAll=1015 create=1016 update=1017 delete=1018; Inventory get=1033 getAll=1034 create=1035 update=1036 delete=1037 addStock=1038 removeStock=1039 moveLocation=1040; Location getAll=1054 create=1055 update=1056 delete=1057 get=1058. Backend pins this map with a test.
- Frontend build: `npm ci && npm run build` → `dist/`. Backend Dockerfile gets it through compose `additional_contexts: frontend: ${FRONTEND_DIR:-../web-2-frontend}`.
- Login: `POST /login {identifier, password}` with CSRF header; admin logs in with the username from `.env`.

## Tasks

| ID | Specs | Route | Status | Commit |
|----|-------|-------|--------|--------|
| T1 | S1 | delegated writer A (backend; parallel units) | pending | — |
| T2 | S1, S2, S4 | delegated writer A — Dockerfile w/ frontend stage, `docker-compose.prod.yml` (db, migrate, api), `.env.prod.example` | pending | — |
| T3 | S2, S5 | delegated writer A — `install.sh`, `install.ps1`, `docs/DEPLOY.md`, `docs/DEV.md` | pending | — |
| T4 | S3, S4 | delegated writer B (frontend; parallel units) — API layer, CSRF, auth | pending | — |
| T5 | S3, S5 | delegated writer B — wire Inventario/Ubicación, hide the rest, lockfile, README | pending | — |
| T6 | S1–S4 | independent verifier — end-to-end install on Docker, login, inventory CRUD (Risk items 2, 5) | pending | — |

## Log

- **L1 (2026-10-31, user, verbatim):** "hola mira este junto con @../web-2-frontend/ fueron mi proyecto de la materia web 2 junto con gabriela erick y alex, el profesor ahora quiere desplegarlo en un servidor en la universidad para que un pasante pueda acceder por red y tal y pueda gestionar el inventario de componentes, no como tal para prestarlos sino gestionar su inventario y tal, en ultima instancia que sea local en la propia maquina del pasante, el problema esq las configuraciones para desplegar en produccion como que no funcionan, no se si hay un fork u otra rama de este repo que ha estado trabajando un amigo mio que estaba intentando implementar el sistema angel pero no ha podido dar con la solucion, esto es un proyecto algo viejito y yo digamos que no recuerdo todo, pero me gustaria que lo revisaramos y que pudiesemos limpiar esos errores y estandarizar su desarrollo y su despliegue, porque tiene muchas mañas, no usa una arquitectura estandar sino mi framework toproc que usa una arquitectura que el profesor nos enseño y nos exigio usar en esa materia, yo aun se como funciona por dentro, lo que no recuerdo son todas las mañas para levantar el proyecto desarrollar hacerlo funcionar en produccion y tal porque de todas formas tiene muchos bugs tambien y en ultima instancia harcodeamos unas cosas en el frontend tambien, entonces bueno me gustaria que con subagentes y asi vayamos explorando, sin consumir tantos tokens pero vaina ir mapeando a ver que se puede hacer y a ver si podemos documentar una forma estandar de levantarlo sin fallos"
- **L2 (2026-10-31, user, verbatim):** "dale 1, vamos con odd a arreglar ambas y empaquetarlas bien para ser desplegadas, con pasos incluso si es una pc local que ni docker tiene que no tiene nada, que con un script o lo que sea pueda instalar la aplicacion con persistencia y asi, pero recuerda ahorrar tokens, nada de sobreingenieria, ve a lo sencillo, directo"
- **L3 (evidence):** Audit — friend's fork `Arisness-URU/*` branch `deploy/uru-local` (reusable: dynamic explorer import, PG18 volume path, pnpm pin, frontend `<Outlet/>`; discarded: `init.sql` dump granting all methods to public profile 1, wrong admin hash, `.vbs`/hosts hacks). Frontend `main` = mock UI with no API calls; `master` = API layer only. Parent made BO discovery sorted for a deterministic tx map.
