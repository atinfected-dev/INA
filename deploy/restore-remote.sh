#!/usr/bin/env bash
# Load deploy/out/ina-data.sql.gz into the server database. One-time.
#
# Refuses to run into a database that already has fights: this is the initial
# move, not a sync, and running it twice would double every row.
set -euo pipefail
HOST=${INA_HOST:-bauwerk}
cd "$(git rev-parse --show-toplevel)"
[ -f deploy/out/ina-data.sql.gz ] || { echo "run deploy/dump-local.sh first" >&2; exit 1; }

scp -q deploy/out/ina-data.sql.gz "$HOST:/opt/ina/incoming/"

ssh "$HOST" bash -s <<'REMOTE'
set -euo pipefail
DB_PASSWORD=$(cat /opt/ina/db-password)
export PGPASSWORD=$DB_PASSWORD
FIGHTS=$(psql -h 127.0.0.1 -U ina -d ina -Atc 'select count(*) from "Fight"')
if [ "$FIGHTS" != "0" ]; then
  echo "server database already holds $FIGHTS fights — refusing to load on top" >&2
  exit 1
fi
echo "loading…"
# pg_dump 17 writes `SET transaction_timeout`, which Postgres 16 does not know
# and refuses before a single row is loaded. Nothing else in a data-only dump
# is version-specific.
# Loaded as the postgres superuser: the dump disables foreign-key triggers
# while it copies, and disabling a system trigger is a superuser-only act.
# The rows still end up owned by the tables' owner, ina.
gunzip -c /opt/ina/incoming/ina-data.sql.gz   | grep -v '^SET transaction_timeout'   | sudo -u postgres psql -q -d ina -v ON_ERROR_STOP=1
psql -h 127.0.0.1 -U ina -d ina -Atc 'select (select count(*) from "Report") as reports, (select count(*) from "Fight") as fights, (select count(*) from "Character") as characters, (select count(*) from "Account") as accounts'
rm -f /opt/ina/incoming/ina-data.sql.gz
REMOTE
