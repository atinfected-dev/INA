#!/usr/bin/env bash
# The import pipeline, as the timer runs it.
#
# Every step only touches what has not been done yet — new reports, fights
# without parses, fights without damage taken — so on a quiet week this costs
# a handful of API points and a few seconds. Steps are ordered so each has
# what it needs: sync first, then everything that hangs off a fight, then the
# raid nights that group the fights.
set -euo pipefail
export PATH=/opt/ina/node/bin:$PATH
export COREPACK_HOME=/opt/ina/corepack COREPACK_ENABLE_DOWNLOAD_PROMPT=0
cd /opt/ina/app

run() { echo "==> $*"; pnpm --silent "$@"; }

run sync
run analyze
run deaths
run damage-taken
run interrupts
run sessions
echo "==> pipeline done"
