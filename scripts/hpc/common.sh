#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_ENV_FILE="$SCRIPT_DIR/collector.env"

load_collector_env() {
  local env_file="${COLLECTOR_ENV_FILE:-$DEFAULT_ENV_FILE}"
  if [[ -f "$env_file" ]]; then
    # shellcheck disable=SC1090
    source "$env_file"
  fi

  export DB_HOST="${DB_HOST:-}"
  export DB_PORT="${DB_PORT:-3306}"
  export DB_NAME="${DB_NAME:-}"
  export DB_USER="${DB_USER:-}"
  export DB_PASSWORD="${DB_PASSWORD:-}"
  export HPC_TZ="${HPC_TZ:-Europe/Budapest}"
  export QSTAT_CLUSTER_COMMAND="${QSTAT_CLUSTER_COMMAND:-qstat -g c}"
  export QSTAT_JOBS_COMMAND="${QSTAT_JOBS_COMMAND:-qstat -u '*'}"
  export QACCT_COMMAND="${QACCT_COMMAND:-qacct}"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing command: $1" >&2
    exit 1
  }
}

require_cmd_if_no_file() {
  local command_name="$1"
  local input_file="${2:-}"
  [[ -n "$input_file" ]] || require_cmd "$command_name"
}

require_env() {
  local name="$1"
  [[ -n "${!name:-}" ]] || {
    echo "missing env: $name" >&2
    exit 1
  }
}

collector_init() {
  load_collector_env
  require_cmd bash
  require_cmd awk
  require_cmd date
  require_cmd mysql
  require_env DB_HOST
  require_env DB_NAME
  require_env DB_USER
  require_env DB_PASSWORD
}

mysql_exec() {
  MYSQL_PWD="$DB_PASSWORD" mysql \
    --no-defaults \
    --default-character-set=utf8mb4 \
    -h "$DB_HOST" \
    -P "$DB_PORT" \
    -u "$DB_USER" \
    "$DB_NAME" "$@"
}

mysql_file() {
  MYSQL_PWD="$DB_PASSWORD" mysql \
    --no-defaults \
    --default-character-set=utf8mb4 \
    -h "$DB_HOST" \
    -P "$DB_PORT" \
    -u "$DB_USER" \
    "$DB_NAME" < "$1"
}

run_command_or_cat() {
  local command_text="$1"
  local input_file="${2:-}"

  if [[ -n "$input_file" ]]; then
    cat "$input_file"
  else
    bash -lc "$command_text"
  fi
}
