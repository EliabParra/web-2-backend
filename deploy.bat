@echo off

:: Asegurar que el script se ejecuta en la carpeta donde está ubicado (vital al pedir permisos de Administrador)
cd /d "%~dp0"

:: 1. Configurar DNS Local
SET DOMAIN=inventory.uru.local
find /i "%DOMAIN%" "%WINDIR%\System32\drivers\etc\hosts" >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo 127.0.0.1 %DOMAIN% >> "%WINDIR%\System32\drivers\etc\hosts"
)

:: 2. Crear la red
docker network create uru_network

:: 3. Desplegar Backend (ya estamos en web-2-backend)
docker compose -f docker-compose.prod.yml up -d --build

:: 4. Movernos al Frontend y desplegar
cd ..\web-2-frontend
docker compose up -d --build
cd ..\web-2-backend

:: 5. Limpiar imagenes residuales
docker image prune -f
