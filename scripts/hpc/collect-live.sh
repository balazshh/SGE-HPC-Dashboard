#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=./common.sh
source "$SCRIPT_DIR/common.sh"
collector_init
require_cmd qstat

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

cluster_txt="$workdir/qstat-cluster.txt"
jobs_txt="$workdir/qstat-jobs.txt"
jobs_tsv="$workdir/jobs-current.tsv"
summary_env="$workdir/summary.env"
sql_file="$workdir/load-live.sql"
recorded_at="$(date -u '+%F %T')"

run_command_or_cat "$QSTAT_CLUSTER_COMMAND" "${QSTAT_CLUSTER_FILE:-}" > "$cluster_txt"
run_command_or_cat "$QSTAT_JOBS_COMMAND" "${QSTAT_JOBS_FILE:-}" > "$jobs_txt"

read -r total_slots used_slots free_slots offline_node_count < <(
  awk 'NF && $1 != "CLUSTER" && $1 !~ /^-+$/ { print $6, $3, $5, $7; exit }' "$cluster_txt"
)

awk -v recorded_at="$recorded_at" -v summary_env="$summary_env" '
function state_group(raw) {
  if (raw == "r" || raw == "t" || raw == "Rr" || raw == "Rt") return "running";
  if (raw == "qw") return "queued";
  if (raw == "hqw" || raw == "hRwq") return "hold";
  if (raw == "s" || raw == "ts" || raw == "S" || raw == "tS" || raw == "T" || raw == "tT" || raw == "Rs" || raw == "Rts" || raw == "RS" || raw == "RtS" || raw == "RT" || raw == "RtT") return "suspended";
  if (raw == "Eqw" || raw == "Ehqw" || raw == "EhRqw") return "error";
  if (raw == "dr" || raw == "dt" || raw == "dRr" || raw == "dRt" || raw == "ds" || raw == "dS" || raw == "dT" || raw == "dRs" || raw == "dRS" || raw == "dRT") return "deleted";
  return "queued";
}
function qstat_utc(date_part, time_part, date_bits, time_bits, epoch) {
  split(date_part, date_bits, "/");
  split(time_part, time_bits, ":");
  epoch = mktime(sprintf("%d %d %d %d %d %d", date_bits[3], date_bits[1], date_bits[2], time_bits[1], time_bits[2], time_bits[3]));
  return strftime("%Y-%m-%d %H:%M:%S", epoch, 1);
}
BEGIN {
  running = queued = failed = hold = 0;
}
NF && $1 != "job-ID" && $1 !~ /^-+$/ {
  job_id = $1;
  name = $3;
  owner = $4;
  state_raw = $5;
  state = state_group(state_raw);
  submitted_at = qstat_utc($6, $7);
  started_at = state == "running" ? submitted_at : "";
  slots = $NF + 0;

  if (state == "running") running++;
  else if (state == "queued") queued++;
  else if (state == "error") failed++;
  else if (state == "hold") hold++;

  print job_id, owner, name, state_raw, state, submitted_at, started_at, slots, recorded_at;
}
END {
  printf("running_jobs=%d\nqueued_jobs=%d\nfailed_jobs=%d\nhold_jobs=%d\n", running, queued, failed, hold) > summary_env;
}
' OFS='\t' "$jobs_txt" > "$jobs_tsv"

# shellcheck disable=SC1090
source "$summary_env"
health_status="healthy"
if (( offline_node_count > 0 )); then
  health_status="degraded"
fi

cat > "$sql_file" <<SQL
START TRANSACTION;
INSERT INTO cluster_snapshots
  (recorded_at, total_slots, used_slots, free_slots, running_jobs, queued_jobs, failed_jobs, hold_jobs, health_status, offline_node_count)
VALUES
  ('${recorded_at}', ${total_slots}, ${used_slots}, ${free_slots}, ${running_jobs}, ${queued_jobs}, ${failed_jobs}, ${hold_jobs}, '${health_status}', ${offline_node_count});
DELETE FROM jobs_current;
LOAD DATA LOCAL INFILE '${jobs_tsv}'
INTO TABLE jobs_current
FIELDS TERMINATED BY '\t'
LINES TERMINATED BY '\n'
(job_id, owner, name, state_raw, state_group, submitted_at, @started_at, slots, last_seen_at)
SET started_at = NULLIF(@started_at, '');
COMMIT;
SQL

mysql_file "$sql_file"
echo "live snapshot loaded: ${recorded_at}"
