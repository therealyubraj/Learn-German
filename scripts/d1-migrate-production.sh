#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_production-common.sh
source "${SCRIPT_DIR}/_production-common.sh"

prepare_production_wrangler
trap restore_wrangler EXIT INT TERM

D1_DATABASE_NAME="learn-german-sync" \
D1_WRANGLER_CONFIG="../wrangler.jsonc" \
D1_WRANGLER_ENV="production" \
D1_REMOTE="true" \
node "${SCRIPT_DIR}/d1-migrate.mjs"
