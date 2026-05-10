#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SERVER_DIR="${ROOT_DIR}/server"
WRANGLER_FILE="${ROOT_DIR}/wrangler.jsonc"
ENV_FILE_PATH="${ENV_FILE:-}"
BACKUP_FILE=""

load_production_env_file() {
  if [[ -z "${ENV_FILE_PATH}" ]]; then
    printf 'ENV_FILE is required for production commands.\n' >&2
    exit 1
  fi

  if [[ ! -f "${ENV_FILE_PATH}" ]]; then
    printf 'ENV_FILE not found: %s\n' "${ENV_FILE_PATH}" >&2
    exit 1
  fi

  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE_PATH}"
  set +a
}

restore_wrangler() {
  if [[ -n "${BACKUP_FILE}" && -f "${BACKUP_FILE}" ]]; then
    cp "${BACKUP_FILE}" "${WRANGLER_FILE}"
    rm -f "${BACKUP_FILE}"
  fi
}

prepare_production_wrangler() {
  load_production_env_file

  BACKUP_FILE="$(mktemp "${TMPDIR:-/tmp}/wrangler.jsonc.backup.XXXXXX")"
  cp "${WRANGLER_FILE}" "${BACKUP_FILE}"

  WRANGLER_FILE="${WRANGLER_FILE}" node "${SCRIPT_DIR}/patch-production-config.mjs"
}

run_build() {
  pnpm --dir "${ROOT_DIR}/client" build
}

run_dist() {
  pnpm --dir "${ROOT_DIR}/client" dist
}

run_dev() {
  run_dist
  pnpm --dir "${SERVER_DIR}" exec wrangler dev --config ../wrangler.jsonc -e development
}

run_d1_apply_development() {
  pnpm --dir "${SERVER_DIR}" exec wrangler d1 execute learn-german-sync-development --config ../wrangler.jsonc --env development --local --file=./schema.sql
}

run_d1_apply_production() {
  prepare_production_wrangler
  trap restore_wrangler EXIT INT TERM
  pnpm --dir "${SERVER_DIR}" exec wrangler d1 execute learn-german-sync-prod --config ../wrangler.jsonc --env production --remote --file=./schema.sql
}

run_deploy_worker_production() {
  prepare_production_wrangler
  trap restore_wrangler EXIT INT TERM
  pnpm --dir "${SERVER_DIR}" exec wrangler deploy --config ../wrangler.jsonc -e production
}

run_deploy() {
  prepare_production_wrangler
  trap restore_wrangler EXIT INT TERM
  pnpm --dir "${SERVER_DIR}" exec wrangler d1 execute learn-german-sync-prod --config ../wrangler.jsonc --env production --remote --file=./schema.sql
  run_dist
  pnpm --dir "${SERVER_DIR}" exec wrangler deploy --config ../wrangler.jsonc -e production
}

COMMAND="${1:-}"

case "${COMMAND}" in
  build)
    run_build
    ;;
  dist)
    run_dist
    ;;
  dev)
    run_dev
    ;;
  d1:apply:development)
    run_d1_apply_development
    ;;
  d1:apply:PRODUCTION)
    run_d1_apply_production
    ;;
  deploy:worker:PRODUCTION)
    run_deploy_worker_production
    ;;
  deploy)
    run_deploy
    ;;
  *)
    printf 'Unknown command: %s\n' "${COMMAND}" >&2
    printf 'Expected one of: build, dist, dev, d1:apply:development, d1:apply:PRODUCTION, deploy:worker:PRODUCTION, deploy\n' >&2
    exit 1
    ;;
esac
