#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=./common.sh
source "$SCRIPT_DIR/common.sh"
collector_init

mysql_exec <<'SQL'
DELETE FROM cluster_snapshots WHERE recorded_at < UTC_TIMESTAMP() - INTERVAL 90 DAY;
DELETE FROM jobs_history WHERE finished_at < UTC_TIMESTAMP() - INTERVAL 365 DAY;
DELETE FROM user_job_hourly WHERE bucket_start < UTC_TIMESTAMP() - INTERVAL 365 DAY;
DELETE FROM user_job_daily WHERE bucket_date < UTC_DATE() - INTERVAL 365 DAY;
SQL

echo "old data cleaned"
