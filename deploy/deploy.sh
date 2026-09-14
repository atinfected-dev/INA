#!/usr/bin/env bash
# Release the committed tree to the server. Run from the repository root on
# the development machine.
#
# Ships exactly what is committed: `git archive HEAD`, so node_modules, .next
# and .env never travel. The server .env is assembled here from the local one,
# with the server's own database URL swapped in.
set -euo pipefail

HOST=${INA_HOST:-bauwerk}          # ssh alias from ~/.ssh/config
INA_ROOT=/opt/ina
APP_DIR=$INA_ROOT/app
REF=${1:-HEAD}

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }

cd "$(git rev-parse --show-toplevel)"
[ -f .env ] || { echo "no .env at the repository root" >&2; exit 1; }

# --- pack ----------------------------------------------------------------------
log "packing $REF"
OUT=$(mktemp -d)
git archive --format=tar.gz --output "$OUT/ina.tar.gz" "$REF"

# Server .env: everything local except DATABASE_URL, which the server owns.
grep -vE '^DATABASE_URL=' .env >"$OUT/env.partial"

# --- upload --------------------------------------------------------------------
log "uploading to $HOST"
ssh "$HOST" "mkdir -p $INA_ROOT/incoming"
scp -q "$OUT/ina.tar.gz" "$OUT/env.partial" "$HOST:$INA_ROOT/incoming/"
rm -rf "$OUT"

# --- install, build, restart ---------------------------------------------------
log "installing and building on $HOST"
ssh "$HOST" bash -s <<'REMOTE'
set -euo pipefail
INA_ROOT=/opt/ina
APP_DIR=$INA_ROOT/app
export PATH=$INA_ROOT/node/bin:$PATH
export COREPACK_HOME=$INA_ROOT/corepack COREPACK_ENABLE_DOWNLOAD_PROMPT=0

mkdir -p "$APP_DIR"
# Replace the tree, keep what the server owns: node_modules (cache), .env,
# the previous build until the new one is in.
tar -xzf "$INA_ROOT/incoming/ina.tar.gz" -C "$APP_DIR"

if [ -s "$INA_ROOT/db-password" ]; then
  DB_PASSWORD=$(cat "$INA_ROOT/db-password")
  {
    echo "DATABASE_URL=\"postgresql://ina:${DB_PASSWORD}@127.0.0.1:5432/ina?schema=public\""
    cat "$INA_ROOT/incoming/env.partial"
  } >"$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
else
  echo "no /opt/ina/db-password yet — run deploy/server-setup.sh first, then deploy again" >&2
  chown -R ina:ina "$INA_ROOT"
  exit 0
fi

chown -R ina:ina "$INA_ROOT"

# Build as the service user so nothing in the tree ends up root-owned.
sudo -u ina env "PATH=$PATH" "COREPACK_HOME=$COREPACK_HOME" COREPACK_ENABLE_DOWNLOAD_PROMPT=0 HOME="$INA_ROOT" bash -s <<'ASINA'
set -euo pipefail
cd /opt/ina/app
pnpm install --frozen-lockfile
pnpm --filter @ina/db run generate
pnpm --filter @ina/db exec prisma migrate deploy
pnpm --filter @ina/web run build
ASINA

systemctl restart ina-web.service
sleep 2
systemctl --no-pager --lines=5 status ina-web.service || true
curl -s -o /dev/null -w "local web: %{http_code}\n" http://127.0.0.1:3100/
REMOTE

log "released"
