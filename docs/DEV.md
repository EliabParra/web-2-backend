# Desarrollar Control de Laboratorio

Postgres corre en Docker; el backend y el frontend corren en tu máquina con recarga automática.

Requisitos: Node.js 20+, pnpm (`corepack enable`) y Docker.

## 1. Backend

```bash
cp .env.example .env
```

Verifica que `.env` tenga estos valores (la base de desarrollo de `docker-compose.yml` escucha en el puerto 5441):

```dotenv
PGHOST=localhost
PGPORT=5441
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=toproc_dev
APP_PORT=3000
SESSION_SECRET=cualquier-cadena-larga-y-aleatoria
SESSION_SCHEMA=security
SESSION_TABLE=sessions
AUTH_PUBLIC_PROFILE_ID=1
AUTH_SESSION_PROFILE_ID=2
AUTH_REQUIRE_EMAIL_VERIFICATION=false
```

Después:

```bash
docker compose up -d db
pnpm install
pnpm run db sync --yes
pnpm run db seed --yes --seedAdmin --adminUser admin --adminPassword admin123 --profileId 3 --registerBo --seedPublicAuthPerms --publicProfileId 1
pnpm run dev
```

La API queda en `http://localhost:3000`. Inicia sesión con `admin` / `admin123`.

Perfiles: `1` público, `2` sesión, `3` super_admin. Todos los métodos de los BO se otorgan al perfil 3; el perfil 1 solo recibe los métodos públicos de `Auth` (registro y recuperación de cuenta).

## 2. Frontend

En el repositorio `web-2-frontend`:

```bash
npm install
npm run dev
```

Vite redirige las llamadas a la API (`/toProccess`, `/login`, `/logout`, `/csrf`) a `http://localhost:3000`, así que abre la URL que muestra Vite.

Los números de transacción del frontend están en `src/api/tx.ts` y deben coincidir con `scripts/db/tx-map.json` del backend.

## Cambios que llegan a instalaciones existentes

Las instalaciones se actualizan **ejecutando el mismo comando de instalación** (ver [DEPLOY.md](DEPLOY.md#instalar)): se descarga el código de `master`, se reconstruye y `migrate` aplica solo lo nuevo. Los datos se conservan si se respetan dos reglas:

1. **Esquema de base de datos:** cada cambio va en un archivo **nuevo** en `migrations/ddl/` (por ejemplo `91_business_item_brand.ts`). Nunca edites una migración que ya está en `master`: las instalaciones existentes ya la aplicaron y no la vuelven a ejecutar. Lo mismo vale para los datos iniciales en `migrations/dml/`.
2. **Métodos de BO nuevos:** cada método necesita un número de transacción fijo. Agrégalo en `scripts/db/tx-map.json` con el siguiente número libre (el mayor + 1) y el mismo número en `src/api/tx.ts` del frontend. Nunca cambies ni reutilices un número existente. Si te olvidas, `pnpm test` y `migrate` fallan indicando qué línea falta.

Antes de subir cambios a `master`, corre `pnpm run verify` en el backend y `npm run build` en el frontend.

## Tareas comunes

| Tarea | Comando |
| --- | --- |
| Nuevo BO | `pnpm run bo <cmd>` |
| Registrar métodos nuevos de un BO | `pnpm run db bo --yes --profileId 3` |
| Aplicar migraciones nuevas | `pnpm run db sync --yes` y luego `pnpm run db dml --yes` |
| Reiniciar la base de desarrollo | `docker compose down -v && docker compose up -d db`, luego los comandos `db` de arriba |
| Verificación completa | `pnpm run verify` |
| Adminer (interfaz web de la base) | `docker compose up -d adminer` y abre `http://localhost:8080` |

## Probar el build de producción en local

Ver [DEPLOY.md](DEPLOY.md). Desde este repositorio también puedes levantar el stack directamente, sin el instalador:

```bash
FRONTEND_DIR=../web-2-frontend docker compose -f docker-compose.prod.yml up -d --build
```

Necesita `ADMIN_PASSWORD`, `PGPASSWORD` y `SESSION_SECRET` en un `.env` junto al compose o en tu shell. Por defecto queda en `http://localhost:3000`.
