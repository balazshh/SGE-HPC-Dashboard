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
  export DB2_HOST="${DB2_HOST:-}"
  export DB2_PORT="${DB2_PORT:-3306}"
  export DB2_NAME="${DB2_NAME:-}"
  export DB2_USER="${DB2_USER:-}"
  export DB2_PASSWORD="${DB2_PASSWORD:-}"
  export HPC_TZ="${HPC_TZ:-Europe/Budapest}"
  export QSTAT_CLUSTER_COMMAND="${QSTAT_CLUSTER_COMMAND:-qstat -g c}"
  export QSTAT_JOBS_COMMAND="${QSTAT_JOBS_COMMAND:-qstat -u '*'}"
  export SGE_QUEUE_TOTALS_NON_OVERLAPPING="${SGE_QUEUE_TOTALS_NON_OVERLAPPING:-false}"
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

  if second_target_enabled; then
    require_env DB2_HOST
    require_env DB2_PORT
    require_env DB2_NAME
    require_env DB2_USER
    require_env DB2_PASSWORD
  elif [[ -n "$DB2_HOST$DB2_NAME$DB2_USER$DB2_PASSWORD" ]]; then
    echo "incomplete DB2_* second target config" >&2
    exit 1
  fi
}

second_target_enabled() {
  [[ -n "$DB2_HOST" && -n "$DB2_NAME" && -n "$DB2_USER" ]]
}

mysql_targets() {
  echo primary
  if second_target_enabled; then
    echo second
  fi
}

mysql_target_file() {
  local target="$1" file="$2" host port name user password
  case "$target" in
    primary) host="$DB_HOST"; port="$DB_PORT"; name="$DB_NAME"; user="$DB_USER"; password="$DB_PASSWORD" ;;
    second) host="$DB2_HOST"; port="$DB2_PORT"; name="$DB2_NAME"; user="$DB2_USER"; password="$DB2_PASSWORD" ;;
    *) echo "unknown mysql target: $target" >&2; return 1 ;;
  esac
  MYSQL_PWD="$password" mysql \
    --no-defaults \
    --default-character-set=utf8mb4 \
    -h "$host" \
    -P "$port" \
    -u "$user" \
    "$name" < "$file"
}

mysql_target_exec() {
  local target="$1" host port name user password
  case "$target" in
    primary) host="$DB_HOST"; port="$DB_PORT"; name="$DB_NAME"; user="$DB_USER"; password="$DB_PASSWORD" ;;
    second) host="$DB2_HOST"; port="$DB2_PORT"; name="$DB2_NAME"; user="$DB2_USER"; password="$DB2_PASSWORD" ;;
    *) echo "unknown mysql target: $target" >&2; return 1 ;;
  esac
  MYSQL_PWD="$password" mysql \
    --no-defaults \
    --default-character-set=utf8mb4 \
    -h "$host" \
    -P "$port" \
    -u "$user" \
    "$name"
}

mysql_file() {
  local file="$1" target name failed=0
  while read -r target; do
    [[ "$target" == primary ]] && name="$DB_NAME" || name="$DB2_NAME"
    if ! mysql_target_file "$target" "$file"; then
      echo "mysql target=$target db=$name failed" >&2
      failed=1
    fi
  done < <(mysql_targets)
  return "$failed"
}

mysql_exec() {
  local sql target name failed=0
  sql="$(cat)"
  while read -r target; do
    [[ "$target" == primary ]] && name="$DB_NAME" || name="$DB2_NAME"
    if ! printf '%s\n' "$sql" | mysql_target_exec "$target"; then
      echo "mysql target=$target db=$name failed" >&2
      failed=1
    fi
  done < <(mysql_targets)
  return "$failed"
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
