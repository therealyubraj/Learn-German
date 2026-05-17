#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SERVER_DIR="${ROOT_DIR}/server"
CLIENT_DIR="${ROOT_DIR}/client"
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
