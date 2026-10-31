# Develop Toproc

Run Postgres in Docker, the backend and frontend on your machine with hot reload.

Requirements: Node.js 20+, pnpm (`corepack enable`), Docker.

## 1. Backend

```bash
cp .env.example .env
```

Make sure `.env` has these values (the dev database from `docker-compose.yml` listens on port 5441):

```dotenv
PGHOST=localhost
PGPORT=5441
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=toproc_dev
APP_PORT=3000
SESSION_SECRET=any-long-random-string
SESSION_SCHEMA=security
SESSION_TABLE=sessions
AUTH_PUBLIC_PROFILE_ID=1
AUTH_SESSION_PROFILE_ID=2
AUTH_REQUIRE_EMAIL_VERIFICATION=false
```

Then:

```bash
docker compose up -d db
pnpm install
pnpm run db sync --yes
pnpm run db seed --yes --seedAdmin --adminUser admin --adminPassword admin123 --profileId 3 --registerBo --txStart 1000
pnpm run dev
```

The API runs at `http://localhost:3000`. Log in as `admin` / `admin123`.

Profiles: `1` public, `2` session, `3` super_admin. Every BO method is granted to profile 3.

## 2. Frontend

In the `web-2-frontend` repo:

```bash
npm install
npm run dev
```

Vite proxies the API calls (`/toProccess`, `/login`, `/logout`, `/csrf`) to `http://localhost:3000`, so open the Vite URL it prints.

## Common tasks

| Task | Command |
| --- | --- |
| New BO | `pnpm run bo <cmd>` |
| Register new BO methods | `pnpm run db bo --yes --profileId 3` |
| Apply new migrations | `pnpm run db sync --yes` then `pnpm run db dml --yes` |
| Reset the dev database | `docker compose down -v && docker compose up -d db`, then the `db` commands above |
| Quality gate | `pnpm run verify` |
| Adminer (DB web UI) | `docker compose up -d adminer`, open `http://localhost:8080` |

## Test the production build locally

See [DEPLOY.md](DEPLOY.md). From this repo you can also run the stack directly:

```bash
FRONTEND_DIR=../web-2-frontend docker compose -f docker-compose.prod.yml up -d --build
```

It needs `ADMIN_PASSWORD`, `PGPASSWORD` and `SESSION_SECRET` in a `.env` next to the compose file or in your shell.
