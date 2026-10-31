# Toproc installer for Windows. Re-run it to update: .env and the database are kept.
#   $env:TOPROC_MODE   local (this PC only, default) | server (reachable from the LAN)
#   $env:TOPROC_DIR    install folder (default $HOME\toproc)
#   $env:TOPROC_BRANCH branch of both repos (default master)
#   $env:HTTP_PORT     first install only (default 3000 local, 80 server)
$ErrorActionPreference = 'Stop'

$Mode = if ($env:TOPROC_MODE) { $env:TOPROC_MODE } else { 'local' }
$Dir = if ($env:TOPROC_DIR) { $env:TOPROC_DIR } else { Join-Path $HOME 'toproc' }
$Branch = if ($env:TOPROC_BRANCH) { $env:TOPROC_BRANCH } else { 'master' }

switch ($Mode) {
    'local' { $Bind = '127.0.0.1'; $Port = if ($env:HTTP_PORT) { $env:HTTP_PORT } else { '3000' } }
    'server' { $Bind = '0.0.0.0'; $Port = if ($env:HTTP_PORT) { $env:HTTP_PORT } else { '80' } }
    default { throw "TOPROC_MODE must be 'local' or 'server'" }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host '==> Installing Docker Desktop'
    winget install -e --id Docker.DockerDesktop --accept-package-agreements --accept-source-agreements
    Write-Host 'Docker Desktop installed. Restart Windows, open Docker Desktop once, then run this script again.'
    return
}
docker info *> $null
if ($LASTEXITCODE -ne 0) { throw 'Docker is not running. Open Docker Desktop, wait until it is ready, and run this script again.' }

Write-Host "==> Downloading $Branch into $Dir"
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

$EnvFile = Join-Path $Dir '.env'
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
    Write-Host "==> Created $EnvFile (admin password: $AdminPassword)"
}

Write-Host '==> Building and starting (first run takes a few minutes)'
docker compose --env-file $EnvFile -f (Join-Path $Dir 'web-2-backend\docker-compose.prod.yml') up -d --build --wait
if ($LASTEXITCODE -ne 0) { throw 'docker compose failed. See docs/DEPLOY.md (Troubleshooting).' }

$Settings = Get-Content $EnvFile | ConvertFrom-StringData
$HostName = 'localhost'
if ($Settings.BIND_ADDRESS -eq '0.0.0.0') {
    $HostName = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1).IPAddress
}
Write-Host "==> Toproc is running: http://${HostName}:$($Settings.HTTP_PORT)  (credentials in $EnvFile)"
