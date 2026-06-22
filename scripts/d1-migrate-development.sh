#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

D1_DATABASE_NAME="learn-german-sync-development" \
D1_WRANGLER_CONFIG="./wrangler.dev.jsonc" \
D1_WRANGLER_ENV="" \
D1_REMOTE="false" \
node "${SCRIPT_DIR}/d1-migrate.mjs"
