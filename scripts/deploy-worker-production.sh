#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_production-common.sh
source "${SCRIPT_DIR}/_production-common.sh"

prepare_production_wrangler
trap restore_wrangler EXIT INT TERM

pnpm --dir "${SERVER_DIR}" exec wrangler deploy \
  --config ../wrangler.jsonc \
  -e production
