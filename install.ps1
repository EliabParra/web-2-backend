# Control de Laboratorio installer for Windows. Run it again to update: .env and the database are kept.
#   $env:LAB_MODE   local (this PC only) | server (reachable from the LAN). Asked on first install if unset.
#   $env:LAB_DIR    install folder (default $HOME\control-lab)
#   $env:LAB_BRANCH branch of both repos (default master)
#   $env:HTTP_PORT     default 3000 local, 80 server
#   $env:ADMIN_USER / $env:ADMIN_PASSWORD  admin credentials for the first install. Asked if unset; empty password = generated.
$ErrorActionPreference = 'Stop'

$Dir = if ($env:LAB_DIR) { $env:LAB_DIR } else { Join-Path $HOME 'control-lab' }
$Branch = if ($env:LAB_BRANCH) { $env:LAB_BRANCH } else { 'master' }
$EnvFile = Join-Path $Dir '.env'

$Mode = $env:LAB_MODE
if (-not $Mode -and -not (Test-Path $EnvFile)) {
    Write-Host '¿Dónde vas a instalar Control de Laboratorio?'
    Write-Host '  1) En esta PC (solo se usa desde aquí)'
    Write-Host '  2) En un servidor (se usa desde otras PCs de la red)'
    if ((Read-Host 'Elige 1 o 2 [1]') -eq '2') { $Mode = 'server' }
}

switch ($(if ($Mode) { $Mode } else { 'local' })) {
    'local' { $Bind = '127.0.0.1'; $Port = if ($env:HTTP_PORT) { $env:HTTP_PORT } else { '3000' } }
    'server' { $Bind = '0.0.0.0'; $Port = if ($env:HTTP_PORT) { $env:HTTP_PORT } else { '80' } }
    default { throw "LAB_MODE debe ser 'local' o 'server'" }
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

function Test-Password($p) { $p.Length -ge 8 -and $p -notmatch '[\s$#"''\\]' }
$PasswordRule = 'Mínimo 8 caracteres, sin espacios, $, #, comillas ni barras invertidas.'

$UserName = $env:ADMIN_USER
$Password = $env:ADMIN_PASSWORD
if (-not (Test-Path $EnvFile)) {
    if (-not $UserName) { $UserName = Read-Host 'Usuario administrador [admin]' }
    while (-not $env:ADMIN_PASSWORD) {
        $Password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR((Read-Host 'Contraseña del administrador (vacío = generar una)' -AsSecureString)))
        if (-not $Password) { break }
        if (-not (Test-Password $Password)) { Write-Host $PasswordRule; continue }
        $Again = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR((Read-Host 'Repite la contraseña' -AsSecureString)))
        if ($Password -ceq $Again) { break }
        Write-Host 'Las contraseñas no coinciden.'
    }
}
if (-not $UserName) { $UserName = 'admin' }
if ($UserName -notmatch '^[A-Za-z0-9._-]+$') { throw 'El usuario solo puede tener letras, números, punto, guion y guion bajo.' }
if ($Password -and -not (Test-Password $Password)) { throw "ADMIN_PASSWORD: $PasswordRule" }

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
    $Generated = -not $Password
    if ($Generated) { $Password = (New-Secret).Substring(0, 16) }
    @(
        "ADMIN_USER=$UserName"
        "ADMIN_PASSWORD=$Password"
        "PGPASSWORD=$(New-Secret)"
        "SESSION_SECRET=$(New-Secret)"
        "BIND_ADDRESS=$Bind"
        "HTTP_PORT=$Port"
    ) | Set-Content -Encoding ascii $EnvFile
    Write-Host "==> Creado $EnvFile (usuario administrador: $UserName)"
    if ($Generated) { Write-Host "==> Contraseña generada: $Password (guárdala; también queda en $EnvFile)" }
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
Write-Host "==> Control de Laboratorio está corriendo: http://${HostName}:$($Settings.HTTP_PORT)  (credenciales en $EnvFile)"
