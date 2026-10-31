# Desplegar Control de Laboratorio

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

Después pregunta el usuario administrador (por defecto `admin`) y su contraseña. La contraseña no se ve al escribirla y se pide dos veces. Debe tener al menos 8 caracteres, sin espacios, `$`, `#`, comillas ni barras invertidas. Si la dejas vacía, el instalador genera una y la muestra.

Al final el instalador muestra la URL de la aplicación.

### Instalar sin preguntas

Para automatizar, define el modo con `LAB_MODE` (`local` o `server`) y las credenciales con `ADMIN_USER` y `ADMIN_PASSWORD`:

```bash
curl -fsSL https://raw.githubusercontent.com/EliabParra/web-2-backend/master/install.sh | LAB_MODE=server ADMIN_USER=pasante ADMIN_PASSWORD=ClaveSegura1 bash
```

```powershell
$env:LAB_MODE='server'; $env:ADMIN_USER='pasante'; $env:ADMIN_PASSWORD='ClaveSegura1'; irm https://raw.githubusercontent.com/EliabParra/web-2-backend/master/install.ps1 | iex
```

Si ya estaba instalado, pasar `LAB_MODE` cambia el modo guardado en `.env`.

Otras variables opcionales:

| Variable | Qué hace | Por defecto |
| --- | --- | --- |
| `LAB_DIR` | Carpeta de instalación | `~/control-lab` |
| `LAB_BRANCH` | Rama de ambos repositorios | `master` |
| `HTTP_PORT` | Puerto | 3000 (PC) / 80 (servidor) |

Para probar una rama antes de mergearla, usa la URL del script de esa rama y `LAB_BRANCH`. La rama tiene que existir en GitHub en los dos repositorios:

```bash
curl -fsSL https://raw.githubusercontent.com/EliabParra/web-2-backend/feat/lan-deploy/install.sh | LAB_BRANCH=feat/lan-deploy bash
```

## Iniciar sesión

Con el usuario y la contraseña que elegiste al instalar. Quedan guardados en `~/control-lab/.env` (`ADMIN_USER`, `ADMIN_PASSWORD`).

Para cambiar la contraseña: edita `ADMIN_PASSWORD` en `.env` y vuelve a ejecutar el instalador.

Si cambias `ADMIN_USER`, se crea un administrador nuevo con ese nombre; el anterior sigue existiendo y se puede desactivar desde *Seguridad → Usuarios*.

## Actualizar

Vuelve a ejecutar el instalador. Descarga el código nuevo, reconstruye y aplica las migraciones pendientes. Se conservan `.env` y la base de datos.

## Comandos del día a día

Ejecútalos desde `~/control-lab` (en Linux usa `sudo` si tu usuario no está en el grupo `docker`):

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

- `db`: PostgreSQL 18, volumen `control-lab_db_data`, no expuesto a la red.
- `migrate`: tarea de una sola vez. Aplica el esquema y los datos iniciales, crea el admin (perfil 3, `super_admin`), registra todos los métodos de los BO desde la tx 1000 y da al perfil público (1) los métodos de registro y recuperación de cuenta. Se puede ejecutar varias veces sin duplicar nada.
- `api`: el backend; también sirve el frontend compilado en el mismo puerto. Se reinicia solo.
