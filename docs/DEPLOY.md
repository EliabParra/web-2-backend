# Desplegar Toproc

Un solo instalador levanta toda la aplicación (base de datos, backend y frontend) con Docker. No hace falta descargar los repositorios antes: el instalador los descarga solo. Los datos viven en un volumen de Docker y sobreviven a reinicios, apagados y actualizaciones.

## Modos de instalación

La primera vez el instalador pregunta dónde se va a usar:

| Opción | Para qué | Se abre en | Puerto |
| --- | --- | --- | --- |
| 1) En esta PC | Una sola PC (Windows o Linux) | `http://localhost:3000` | 3000 |
| 2) En un servidor | Un servidor Linux al que entran otras PCs de la red | `http://<ip-del-servidor>` | 80 |

La elección queda guardada en `.env` (`BIND_ADDRESS`, `HTTP_PORT`). Las siguientes ejecuciones no vuelven a preguntar.

## Instalar

Requisitos: internet y permisos de administrador. Si Docker no está instalado, el instalador lo instala.

**Linux**

```bash
curl -fsSL https://raw.githubusercontent.com/EliabParra/web-2-backend/master/install.sh | bash
```

**Windows** (PowerShell como Administrador)

```powershell
irm https://raw.githubusercontent.com/EliabParra/web-2-backend/master/install.ps1 | iex
```

En Windows, la primera ejecución instala Docker Desktop y pide reiniciar. Reinicia, abre Docker Desktop una vez, espera a que diga *running* y ejecuta el mismo comando otra vez.

Al final el instalador muestra la URL de la aplicación.

### Instalar sin preguntas

Para automatizar, define el modo con `TOPROC_MODE` (`local` o `server`):

```bash
curl -fsSL https://raw.githubusercontent.com/EliabParra/web-2-backend/master/install.sh | TOPROC_MODE=server bash
```

```powershell
$env:TOPROC_MODE='server'; irm https://raw.githubusercontent.com/EliabParra/web-2-backend/master/install.ps1 | iex
```

Si ya estaba instalado, pasar `TOPROC_MODE` cambia el modo guardado en `.env`.

Otras variables opcionales:

| Variable | Qué hace | Por defecto |
| --- | --- | --- |
| `TOPROC_DIR` | Carpeta de instalación | `~/toproc` |
| `TOPROC_BRANCH` | Rama de ambos repositorios | `master` |
| `HTTP_PORT` | Puerto | 3000 (PC) / 80 (servidor) |

Para probar una rama antes de mergearla, usa la URL del script de esa rama y `TOPROC_BRANCH`. La rama tiene que existir en GitHub en los dos repositorios:

```bash
curl -fsSL https://raw.githubusercontent.com/EliabParra/web-2-backend/feat/lan-deploy/install.sh | TOPROC_BRANCH=feat/lan-deploy bash
```

## Iniciar sesión

Usuario `admin`. La contraseña se genera en la primera instalación, se muestra una vez y queda guardada en `~/toproc/.env` (`ADMIN_PASSWORD`).

Para cambiarla: edita `ADMIN_PASSWORD` en `.env` y vuelve a ejecutar el instalador.

## Actualizar

Vuelve a ejecutar el instalador. Descarga el código nuevo, reconstruye y aplica las migraciones pendientes. Se conservan `.env` y la base de datos.

## Comandos del día a día

Ejecútalos desde `~/toproc` (en Linux usa `sudo` si tu usuario no está en el grupo `docker`):

```bash
C="docker compose --env-file .env -f web-2-backend/docker-compose.prod.yml"
$C ps              # estado
$C logs -f api     # logs de la aplicación
$C logs migrate    # logs de las migraciones
$C restart api
$C down            # detener (los datos se conservan)
$C up -d           # volver a iniciar
```

## Respaldo y restauración

```bash
# Respaldo
$C exec -T db pg_dump -U toproc -d toproc -Fc > toproc-$(date +%F).dump

# Restaurar (reemplaza los datos actuales)
$C stop api
$C exec -T db pg_restore -U toproc -d toproc --clean --if-exists < toproc-2026-01-31.dump
$C start api
```

## Problemas comunes

| Síntoma | Solución |
| --- | --- |
| `port is already allocated` | Cambia `HTTP_PORT` en `.env` y vuelve a ejecutar el instalador. |
| Las otras PCs no pueden entrar (modo servidor) | Revisa que `.env` tenga `BIND_ADDRESS=0.0.0.0` y abre el puerto en el firewall (`sudo ufw allow 80/tcp`). |
| `migrate` terminó con error | `$C logs migrate`, corrige la causa y vuelve a ejecutar el instalador. |
| Windows: `Docker no está corriendo` | Abre Docker Desktop, espera a que diga *running* y vuelve a ejecutar. |
| El login falla después de editar `.env` | Vuelve a ejecutar el instalador para que se aplique la contraseña de admin. |
| Empezar de cero (borra todos los datos) | `$C down -v` y vuelve a ejecutar el instalador. |

## Qué se ejecuta

`docker-compose.prod.yml` levanta tres servicios:

- `db`: PostgreSQL 18, volumen `toproc_db_data`, no expuesto a la red.
- `migrate`: tarea de una sola vez. Aplica el esquema y los datos iniciales, crea el admin (perfil 3, `super_admin`), registra todos los métodos de los BO desde la tx 1000 y da al perfil público (1) los métodos de registro y recuperación de cuenta. Se puede ejecutar varias veces sin duplicar nada.
- `api`: el backend; también sirve el frontend compilado en el mismo puerto. Se reinicia solo.
