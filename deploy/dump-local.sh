#!/usr/bin/env bash
# Dump the development database's DATA for the one-time move to the server.
#
# Data only, plain SQL: the schema on the server comes from the Prisma
# migrations, and a plain dump from Postgres 17 loads into the server's 16
# without the archive-version trouble a custom-format dump would run into.
# The migration bookkeeping table is left out so the two never disagree.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
mkdir -p deploy/out
docker exec ina-postgres pg_dump -U ina -d ina \
  --data-only --no-owner --no-privileges --disable-triggers \
  --exclude-table=_prisma_migrations \
  | gzip -6 >deploy/out/ina-data.sql.gz
ls -la deploy/out/ina-data.sql.gz
