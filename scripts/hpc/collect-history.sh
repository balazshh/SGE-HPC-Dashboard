#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=./common.sh
source "$SCRIPT_DIR/common.sh"
collector_init
require_cmd_if_no_file qacct "${QACCT_FILE:-}"

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

qacct_txt="$workdir/qacct.txt"
history_tsv="$workdir/jobs-history.tsv"
sql_file="$workdir/load-history.sql"

run_command_or_cat "$QACCT_COMMAND" "${QACCT_FILE:-}" > "$qacct_txt"

awk -v hpc_tz="$HPC_TZ" '
function month_num(name) {
  return index("JanFebMarAprMayJunJulAugSepOctNovDec", name) / 3;
}
function qacct_utc(value, parts, month, day, year, clock, epoch) {
  gsub(/^[[:space:]]+|[[:space:]]+$/, "", value);
  split(value, parts, /[[:space:]]+/);
  month = month_num(parts[2]);
  day = parts[3] + 0;
  split(parts[4], clock, ":");
  year = parts[5] + 0;
  epoch = mktime(sprintf("%d %d %d %d %d %d", year, month, day, clock[1], clock[2], clock[3]));
  return strftime("%Y-%m-%d %H:%M:%S", epoch, 1);
}
function reset() {
  owner = jobname = jobnumber = qsub_time = start_time = end_time = failed = exit_status = "";
}
function flush(state_final, submitted_at, started_at, finished_at) {
  if (jobnumber == "" || end_time == "") return;
  state_final = ((failed + 0) > 0 || (exit_status + 0) > 0) ? "error" : "finished";
  submitted_at = qacct_utc(qsub_time);
  started_at = start_time == "" ? "" : qacct_utc(start_time);
  finished_at = qacct_utc(end_time);
  print jobnumber, owner, jobname, state_final, submitted_at, started_at, finished_at;
}
BEGIN {
  ENVIRON["TZ"] = hpc_tz;
  reset();
}
/^=+$/ {
  flush();
  reset();
  next;
}
NF {
  key = $1;
  $1 = "";
  sub(/^[[:space:]]+/, "", $0);
  if (key == "owner") owner = $0;
  else if (key == "jobname") jobname = $0;
  else if (key == "jobnumber") jobnumber = $0;
  else if (key == "qsub_time") qsub_time = $0;
  else if (key == "start_time") start_time = $0;
  else if (key == "end_time") end_time = $0;
  else if (key == "failed") failed = $0;
  else if (key == "exit_status") exit_status = $0;
}
END {
  flush();
}
' OFS='\t' "$qacct_txt" > "$history_tsv"

awk -F '\t' '
function esc(value) {
  gsub(/\\/, "\\\\", value);
  gsub(/\047/, "\047\047", value);
  return value;
}
function quote(value) {
  return sq esc(value) sq;
}
function flush_batch() {
  if (count > 0) {
    printf "\nON DUPLICATE KEY UPDATE\n  owner = VALUES(owner),\n  name = VALUES(name),\n  state_final = VALUES(state_final),\n  submitted_at = VALUES(submitted_at),\n  started_at = VALUES(started_at),\n  finished_at = VALUES(finished_at);\n";
    count = 0;
  }
}
BEGIN {
  sq = sprintf("%c", 39);
  prefix = "INSERT INTO jobs_history (job_id, owner, name, state_final, submitted_at, started_at, finished_at) VALUES\n";
  batch_size = 500;
  count = 0;
}
NF {
  started_at = $6 == "" ? "NULL" : quote($6);
  row = "  (" quote($1) ", " quote($2) ", " quote($3) ", " quote($4) ", " quote($5) ", " started_at ", " quote($7) ")";
  if (count == 0) {
    printf "%s%s", prefix, row;
  } else {
    printf ",\n%s", row;
  }
  count++;
  if (count >= batch_size) flush_batch();
}
END {
  flush_batch();
}
' "$history_tsv" > "$sql_file"

mysql_file "$sql_file"
echo "history loaded"
