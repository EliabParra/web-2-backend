# Toproc installer for Windows. Run it again to update: .env and the database are kept.
#   $env:TOPROC_MODE   local (this PC only) | server (reachable from the LAN). Asked on first install if unset.
#   $env:TOPROC_DIR    install folder (default $HOME\toproc)
#   $env:TOPROC_BRANCH branch of both repos (default master)
#   $env:HTTP_PORT     default 3000 local, 80 server
$ErrorActionPreference = 'Stop'

$Dir = if ($env:TOPROC_DIR) { $env:TOPROC_DIR } else { Join-Path $HOME 'toproc' }
$Branch = if ($env:TOPROC_BRANCH) { $env:TOPROC_BRANCH } else { 'master' }
$EnvFile = Join-Path $Dir '.env'

$Mode = $env:TOPROC_MODE
if (-not $Mode -and -not (Test-Path $EnvFile)) {
    Write-Host '¿Dónde vas a instalar Toproc?'
    Write-Host '  1) En esta PC (solo se usa desde aquí)'
    Write-Host '  2) En un servidor (se usa desde otras PCs de la red)'
    if ((Read-Host 'Elige 1 o 2 [1]') -eq '2') { $Mode = 'server' }
}

switch ($(if ($Mode) { $Mode } else { 'local' })) {
    'local' { $Bind = '127.0.0.1'; $Port = if ($env:HTTP_PORT) { $env:HTTP_PORT } else { '3000' } }
    'server' { $Bind = '0.0.0.0'; $Port = if ($env:HTTP_PORT) { $env:HTTP_PORT } else { '80' } }
    default { throw "TOPROC_MODE debe ser 'local' o 'server'" }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host '==> Instalando Docker Desktop'
    winget install -e --id Docker.DockerDesktop --accept-package-agreements --accept-source-agreements
    Write-Host 'Docker Desktop instalado. Reinicia Windows, abre Docker Desktop una vez y vuelve a ejecutar este script.'
    return
}
$ErrorActionPreference = 'Continue'
docker info *> $null
$DockerReady = $LASTEXITCODE -eq 0
$ErrorActionPreference = 'Stop'
if (-not $DockerReady) { throw 'Docker no está corriendo. Abre Docker Desktop, espera a que esté listo y vuelve a ejecutar este script.' }

Write-Host "==> Descargando la rama $Branch en $Dir"
New-Item -ItemType Directory -Force -Path $Dir | Out-Null
foreach ($repo in 'web-2-backend', 'web-2-frontend') {
    $zip = Join-Path $env:TEMP "$repo.zip"
    $tmp = Join-Path $env:TEMP "$repo-src"
    Invoke-WebRequest "https://github.com/EliabParra/$repo/archive/refs/heads/$Branch.zip" -OutFile $zip -UseBasicParsing
    Remove-Item -Recurse -Force $tmp, (Join-Path $Dir $repo) -ErrorAction SilentlyContinue
    Expand-Archive $zip -DestinationPath $tmp
    Move-Item (Get-ChildItem $tmp -Directory | Select-Object -First 1).FullName (Join-Path $Dir $repo)
    Remove-Item -Recurse -Force $tmp, $zip
}

if (-not (Test-Path $EnvFile)) {
    function New-Secret { $b = New-Object byte[] 24; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); ($b | ForEach-Object { $_.ToString('x2') }) -join '' }
    $AdminPassword = (New-Secret).Substring(0, 16)
    @(
        'ADMIN_USER=admin'
        "ADMIN_PASSWORD=$AdminPassword"
        "PGPASSWORD=$(New-Secret)"
        "SESSION_SECRET=$(New-Secret)"
        "BIND_ADDRESS=$Bind"
        "HTTP_PORT=$Port"
    ) | Set-Content -Encoding ascii $EnvFile
    Write-Host "==> Creado $EnvFile (contraseña de admin: $AdminPassword)"
} elseif ($Mode) {
    (Get-Content $EnvFile) -replace '^BIND_ADDRESS=.*', "BIND_ADDRESS=$Bind" -replace '^HTTP_PORT=.*', "HTTP_PORT=$Port" | Set-Content -Encoding ascii $EnvFile
    Write-Host "==> Modo cambiado a $Mode en $EnvFile"
}

Write-Host '==> Construyendo e iniciando (la primera vez tarda unos minutos)'
docker compose --env-file $EnvFile -f (Join-Path $Dir 'web-2-backend\docker-compose.prod.yml') up -d --build --wait
if ($LASTEXITCODE -ne 0) { throw 'docker compose falló. Revisa docs/DEPLOY.md (Problemas comunes).' }

$Settings = Get-Content $EnvFile | ConvertFrom-StringData
$HostName = 'localhost'
if ($Settings.BIND_ADDRESS -eq '0.0.0.0') {
    $HostName = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1).IPAddress
}
Write-Host "==> Toproc está corriendo: http://${HostName}:$($Settings.HTTP_PORT)  (credenciales en $EnvFile)"
