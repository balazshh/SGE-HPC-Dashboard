#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=./common.sh
source "$SCRIPT_DIR/common.sh"
collector_init

mysql_exec <<'SQL'
DELETE FROM jobs_history WHERE finished_at < UTC_TIMESTAMP() - INTERVAL 365 DAY;
SQL

echo "old data cleaned"
