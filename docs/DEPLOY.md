# Deploy Toproc

One installer sets up the whole app (database, backend, frontend) with Docker. Data lives in a Docker volume and survives restarts, reboots and updates.

## Pick a mode

| Mode | Use it for | Opens at | Default port |
| --- | --- | --- | --- |
| `local` (default) | One PC (Windows or Linux) | `http://localhost:3000` | 3000 |
| `server` | A Linux server other PCs reach over the LAN | `http://<server-ip>` | 80 |

The mode is saved in `.env` on the first install (`BIND_ADDRESS`, `HTTP_PORT`).

## Install

Requirements: internet access and admin rights. Docker is installed for you if missing.

**Linux, local mode**

```bash
curl -fsSL https://raw.githubusercontent.com/EliabParra/web-2-backend/master/install.sh | bash
```

**Linux, server mode**

```bash
curl -fsSL https://raw.githubusercontent.com/EliabParra/web-2-backend/master/install.sh | TOPROC_MODE=server bash
```

**Windows** (PowerShell as Administrator)

```powershell
irm https://raw.githubusercontent.com/EliabParra/web-2-backend/master/install.ps1 | iex
```

On Windows the first run installs Docker Desktop and asks you to restart. Restart, open Docker Desktop once, and run the same command again. For server mode, run `$env:TOPROC_MODE='server'` first.

Optional variables: `TOPROC_DIR` (install folder, default `~/toproc`), `TOPROC_BRANCH` (default `master`), `HTTP_PORT` (first install only).

The installer prints the URL at the end.

## Log in

User `admin`. The password is generated on the first install, printed once, and stored in `~/toproc/.env` (`ADMIN_PASSWORD`).

To change it: edit `ADMIN_PASSWORD` in `.env` and re-run the installer.

## Update

Re-run the installer. It downloads the latest code, rebuilds, and applies new migrations. `.env` and the database are kept.

## Everyday commands

Run these from `~/toproc` (use `sudo` on Linux if your user is not in the `docker` group):

```bash
C="docker compose --env-file .env -f web-2-backend/docker-compose.prod.yml"
$C ps              # status
$C logs -f api     # app logs
$C logs migrate    # migration logs
$C restart api
$C down            # stop (data is kept)
$C up -d           # start again
```

## Backup and restore

```bash
# Backup
$C exec -T db pg_dump -U toproc -d toproc -Fc > toproc-$(date +%F).dump

# Restore (replaces current data)
$C stop api
$C exec -T db pg_restore -U toproc -d toproc --clean --if-exists < toproc-2026-01-31.dump
$C start api
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `port is already allocated` | Set another `HTTP_PORT` in `.env`, re-run the installer. |
| Other PCs can't open it (server mode) | Check `BIND_ADDRESS=0.0.0.0` in `.env` and open the port in the firewall (`sudo ufw allow 80/tcp`). |
| `migrate` exited with an error | `$C logs migrate`, fix the cause, re-run the installer. |
| Windows: `Docker is not running` | Open Docker Desktop, wait until it says *running*, re-run. |
| Login fails after editing `.env` | Re-run the installer so the admin password is re-applied. |
| Start from zero (deletes all data) | `$C down -v`, then re-run the installer. |

## What runs

`docker-compose.prod.yml` starts three services:

- `db`: PostgreSQL 18, volume `toproc_db_data`, not exposed to the network.
- `migrate`: one-shot job. Applies the schema and seed data, creates the admin (profile 3, `super_admin`) and registers every BO method from tx 1000. Safe to re-run.
- `api`: the backend; it also serves the built frontend on the same port. Restarts automatically.
