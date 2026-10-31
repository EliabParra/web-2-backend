#!/usr/bin/env bash
# Toproc installer for Linux. Re-run it to update: .env and the database are kept.
#   TOPROC_MODE   local (this PC only, default) | server (reachable from the LAN)
#   TOPROC_DIR    install folder (default ~/toproc)
#   TOPROC_BRANCH branch of both repos (default master)
#   HTTP_PORT     first install only (default 3000 local, 80 server)
set -euo pipefail

MODE=${TOPROC_MODE:-local}
DIR=${TOPROC_DIR:-$HOME/toproc}
BRANCH=${TOPROC_BRANCH:-master}
REPOS="web-2-backend web-2-frontend"

case "$MODE" in
    local) BIND=127.0.0.1; PORT=${HTTP_PORT:-3000} ;;
    server) BIND=0.0.0.0; PORT=${HTTP_PORT:-80} ;;
    *) echo "TOPROC_MODE must be 'local' or 'server'" >&2; exit 1 ;;
esac

SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"

if ! command -v docker >/dev/null 2>&1; then
    echo "==> Installing Docker"
    curl -fsSL https://get.docker.com | $SUDO sh
    $SUDO systemctl enable --now docker 2>/dev/null || true
fi
DOCKER="docker"; docker info >/dev/null 2>&1 || DOCKER="$SUDO docker"

echo "==> Downloading $BRANCH into $DIR"
mkdir -p "$DIR"
for repo in $REPOS; do
    tmp=$(mktemp -d)
    curl -fsSL "https://github.com/EliabParra/$repo/archive/refs/heads/$BRANCH.tar.gz" \
        | tar -xz --strip-components=1 -C "$tmp"
    rm -rf "${DIR:?}/$repo"
    mv "$tmp" "$DIR/$repo"
done

ENV_FILE="$DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
    secret() { head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n'; }
    ADMIN_PASSWORD=$(secret); ADMIN_PASSWORD=${ADMIN_PASSWORD:0:16}
    cat > "$ENV_FILE" <<EOF
ADMIN_USER=admin
ADMIN_PASSWORD=$ADMIN_PASSWORD
PGPASSWORD=$(secret)
SESSION_SECRET=$(secret)
BIND_ADDRESS=$BIND
HTTP_PORT=$PORT
EOF
    chmod 600 "$ENV_FILE"
    echo "==> Created $ENV_FILE (admin password: $ADMIN_PASSWORD)"
fi

echo "==> Building and starting (first run takes a few minutes)"
$DOCKER compose --env-file "$ENV_FILE" -f "$DIR/web-2-backend/docker-compose.prod.yml" up -d --build --wait

PORT=$(grep '^HTTP_PORT=' "$ENV_FILE" | cut -d= -f2)
HOST=localhost
grep -q '^BIND_ADDRESS=0.0.0.0' "$ENV_FILE" && HOST=$( (hostname -I 2>/dev/null || true) | awk '{print $1}'); HOST=${HOST:-<server-ip>}
echo "==> Toproc is running: http://$HOST:$PORT  (credentials in $ENV_FILE)"
