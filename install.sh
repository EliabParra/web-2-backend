#!/usr/bin/env bash
# Control de Laboratorio installer for Linux. Run it again to update: .env and the database are kept.
#   LAB_MODE   local (this PC only) | server (reachable from the LAN). Asked on first install if unset.
#   LAB_DIR    install folder (default ~/control-lab)
#   LAB_BRANCH branch of both repos (default master)
#   HTTP_PORT     default 3000 local, 80 server
set -euo pipefail

DIR=${LAB_DIR:-$HOME/control-lab}
BRANCH=${LAB_BRANCH:-master}
ENV_FILE="$DIR/.env"
REPOS="web-2-backend web-2-frontend"

MODE=${LAB_MODE:-}
if [ -z "$MODE" ] && [ ! -f "$ENV_FILE" ] && { : </dev/tty; } 2>/dev/null; then
    echo "¿Dónde vas a instalar Control de Laboratorio?"
    echo "  1) En esta PC (solo se usa desde aquí)"
    echo "  2) En un servidor (se usa desde otras PCs de la red)"
    read -r -p "Elige 1 o 2 [1]: " choice </dev/tty
    [ "$choice" = "2" ] && MODE=server
fi

case "${MODE:-local}" in
    local) BIND=127.0.0.1; PORT=${HTTP_PORT:-3000} ;;
    server) BIND=0.0.0.0; PORT=${HTTP_PORT:-80} ;;
    *) echo "LAB_MODE debe ser 'local' o 'server'" >&2; exit 1 ;;
esac

SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"

if ! command -v docker >/dev/null 2>&1; then
    echo "==> Instalando Docker"
    curl -fsSL https://get.docker.com | $SUDO sh
    $SUDO systemctl enable --now docker 2>/dev/null || true
fi
DOCKER="docker"; docker info >/dev/null 2>&1 || DOCKER="$SUDO docker"

echo "==> Descargando la rama $BRANCH en $DIR"
mkdir -p "$DIR"
for repo in $REPOS; do
    tmp=$(mktemp -d)
    curl -fsSL "https://github.com/EliabParra/$repo/archive/refs/heads/$BRANCH.tar.gz" \
        | tar -xz --strip-components=1 -C "$tmp"
    rm -rf "${DIR:?}/$repo"
    mv "$tmp" "$DIR/$repo"
done

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
    echo "==> Creado $ENV_FILE (contraseña de admin: $ADMIN_PASSWORD)"
elif [ -n "$MODE" ]; then
    sed -i "s/^BIND_ADDRESS=.*/BIND_ADDRESS=$BIND/; s/^HTTP_PORT=.*/HTTP_PORT=$PORT/" "$ENV_FILE"
    echo "==> Modo cambiado a $MODE en $ENV_FILE"
fi

echo "==> Construyendo e iniciando (la primera vez tarda unos minutos)"
$DOCKER compose --env-file "$ENV_FILE" -f "$DIR/web-2-backend/docker-compose.prod.yml" up -d --build --wait

PORT=$(grep '^HTTP_PORT=' "$ENV_FILE" | cut -d= -f2)
HOST=localhost
grep -q '^BIND_ADDRESS=0.0.0.0' "$ENV_FILE" && HOST=$( (hostname -I 2>/dev/null || true) | awk '{print $1}'); HOST=${HOST:-<ip-del-servidor>}
echo "==> Control de Laboratorio está corriendo: http://$HOST:$PORT  (credenciales en $ENV_FILE)"
