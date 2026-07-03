#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=./common.sh
source "$SCRIPT_DIR/common.sh"
collector_init

mysql_exec <<'SQL'
START TRANSACTION;
DELETE FROM user_job_hourly WHERE bucket_start >= UTC_TIMESTAMP() - INTERVAL 365 DAY;
INSERT INTO user_job_hourly
  (owner, bucket_start, submitted_count, started_count, finished_count, failed_count)
SELECT
  owner,
  DATE_FORMAT(finished_at, '%Y-%m-%d %H:00:00') AS bucket_start,
  COUNT(*) AS submitted_count,
  SUM(started_at IS NOT NULL) AS started_count,
  SUM(state_final = 'finished') AS finished_count,
  SUM(state_final = 'error') AS failed_count
FROM jobs_history
WHERE finished_at >= UTC_TIMESTAMP() - INTERVAL 365 DAY
GROUP BY owner, DATE_FORMAT(finished_at, '%Y-%m-%d %H:00:00');

DELETE FROM user_job_daily WHERE bucket_date >= UTC_DATE() - INTERVAL 365 DAY;
INSERT INTO user_job_daily
  (owner, bucket_date, submitted_count, started_count, finished_count, failed_count)
SELECT
  owner,
  DATE(finished_at) AS bucket_date,
  COUNT(*) AS submitted_count,
  SUM(started_at IS NOT NULL) AS started_count,
  SUM(state_final = 'finished') AS finished_count,
  SUM(state_final = 'error') AS failed_count
FROM jobs_history
WHERE finished_at >= UTC_TIMESTAMP() - INTERVAL 365 DAY
GROUP BY owner, DATE(finished_at);
COMMIT;
SQL

echo "rollups rebuilt"
