#!/usr/bin/env bash
# One-time (and safe to repeat) server preparation for INA. Run as root.
#
# Everything lands under /opt/ina and under names that start with "ina", so
# nothing here can collide with the BauWerk instances on the same machine.
set -euo pipefail

INA_ROOT=/opt/ina
APP_DIR=$INA_ROOT/app
NODE_DIR=$INA_ROOT/node
COREPACK_HOME=$INA_ROOT/corepack
NODE_MAJOR=22
DOMAIN=isnotalone.de
WEB_PORT=3100
DB_NAME=ina
DB_USER=ina
CERT_EMAIL="${CERT_EMAIL:-info@ertz-elektrotechnik.com}"

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }

[ "$(id -u)" -eq 0 ] || { echo "run as root" >&2; exit 1; }

# --- user and directories ----------------------------------------------------
log "user and directories"
id -u ina >/dev/null 2>&1 || useradd --system --home-dir "$INA_ROOT" --shell /usr/sbin/nologin ina
mkdir -p "$APP_DIR" "$NODE_DIR" "$COREPACK_HOME" "$INA_ROOT/backups"
chown -R ina:ina "$INA_ROOT"

# --- Node 22, private to INA -------------------------------------------------
# The system Node is 20 and belongs to BauWerk; INA wants 22 and must not
# change what BauWerk runs on. A tarball under /opt/ina/node is the isolation.
log "node $NODE_MAJOR under $NODE_DIR"
if ! "$NODE_DIR/bin/node" --version 2>/dev/null | grep -q "^v$NODE_MAJOR\."; then
  TARBALL=$(curl -fsSL "https://nodejs.org/dist/latest-v$NODE_MAJOR.x/" \
    | grep -oE "node-v$NODE_MAJOR\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz" | head -1)
  [ -n "$TARBALL" ] || { echo "could not find a node $NODE_MAJOR tarball" >&2; exit 1; }
  TMP=$(mktemp -d)
  curl -fsSL "https://nodejs.org/dist/latest-v$NODE_MAJOR.x/$TARBALL" -o "$TMP/node.tar.xz"
  rm -rf "$NODE_DIR"/*
  tar -xJf "$TMP/node.tar.xz" -C "$NODE_DIR" --strip-components=1
  rm -rf "$TMP"
fi
"$NODE_DIR/bin/node" --version

# pnpm through corepack, with its home under /opt/ina so nothing global changes.
log "pnpm via corepack"
export COREPACK_HOME COREPACK_ENABLE_DOWNLOAD_PROMPT=0
PNPM_VERSION=$(grep -oE '"packageManager": *"pnpm@[0-9.]+"' "$APP_DIR/package.json" | grep -oE '[0-9.]+' || echo "12.4.1")
"$NODE_DIR/bin/corepack" enable --install-directory "$NODE_DIR/bin" pnpm
"$NODE_DIR/bin/corepack" prepare "pnpm@$PNPM_VERSION" --activate
chown -R ina:ina "$NODE_DIR" "$COREPACK_HOME"
PATH="$NODE_DIR/bin:$PATH" pnpm --version

# --- Postgres: own role, own database ----------------------------------------
log "postgres role $DB_USER and database $DB_NAME"
PASS_FILE=$INA_ROOT/db-password
if [ ! -s "$PASS_FILE" ]; then
  tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32 >"$PASS_FILE"
  chmod 600 "$PASS_FILE"
fi
DB_PASSWORD=$(cat "$PASS_FILE")

if ! sudo -u postgres psql -Atc "select 1 from pg_roles where rolname='$DB_USER'" | grep -q 1; then
  sudo -u postgres psql -c "create role $DB_USER login password '$DB_PASSWORD'"
else
  sudo -u postgres psql -c "alter role $DB_USER password '$DB_PASSWORD'"
fi
if ! sudo -u postgres psql -Atc "select 1 from pg_database where datname='$DB_NAME'" | grep -q 1; then
  # Locale C like the development database, so ORDER BY on player names does
  # not depend on the host locale and the two never sort differently.
  sudo -u postgres createdb --owner="$DB_USER" --template=template0 --encoding=UTF8 --locale=C "$DB_NAME"
fi

# --- systemd -----------------------------------------------------------------
log "systemd units"
install -m 644 "$APP_DIR/deploy/systemd/ina-web.service" /etc/systemd/system/ina-web.service
install -m 644 "$APP_DIR/deploy/systemd/ina-pipeline.service" /etc/systemd/system/ina-pipeline.service
install -m 644 "$APP_DIR/deploy/systemd/ina-pipeline.timer" /etc/systemd/system/ina-pipeline.timer
systemctl daemon-reload
systemctl enable ina-web.service ina-pipeline.timer >/dev/null

# --- nginx + certificate -----------------------------------------------------
log "nginx vhost for $DOMAIN"
install -m 644 "$APP_DIR/deploy/nginx/isnotalone.de.conf" "/etc/nginx/sites-available/$DOMAIN"
ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
nginx -t
systemctl reload nginx

if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  log "certificate"
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "$CERT_EMAIL" --redirect
fi

log "done — now run deploy/deploy.sh from the development machine"
