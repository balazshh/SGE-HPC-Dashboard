#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=./common.sh
source "$SCRIPT_DIR/common.sh"
collector_init
require_cmd qacct

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

qacct_txt="$workdir/qacct.txt"
history_tsv="$workdir/jobs-history.tsv"
sql_file="$workdir/load-history.sql"

run_command_or_cat "$QACCT_COMMAND" "${QACCT_FILE:-}" > "$qacct_txt"

awk '
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
  qname = owner = jobname = jobnumber = qsub_time = start_time = end_time = failed = exit_status = slots = "";
}
function flush(state_final, submitted_at, started_at, finished_at) {
  if (jobnumber == "" || end_time == "") return;
  state_final = ((failed + 0) > 0 || (exit_status + 0) > 0) ? "error" : "finished";
  submitted_at = qacct_utc(qsub_time);
  started_at = start_time == "" ? "" : qacct_utc(start_time);
  finished_at = qacct_utc(end_time);
  print jobnumber, owner, jobname, state_final, submitted_at, started_at, finished_at, (slots == "" ? 1 : slots), qname;
}
BEGIN {
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
  if (key == "qname") qname = $0;
  else if (key == "owner") owner = $0;
  else if (key == "jobname") jobname = $0;
  else if (key == "jobnumber") jobnumber = $0;
  else if (key == "qsub_time") qsub_time = $0;
  else if (key == "start_time") start_time = $0;
  else if (key == "end_time") end_time = $0;
  else if (key == "failed") failed = $0;
  else if (key == "exit_status") exit_status = $0;
  else if (key == "slots") slots = $0;
}
END {
  flush();
}
' OFS='\t' "$qacct_txt" > "$history_tsv"

cat > "$sql_file" <<SQL
LOAD DATA LOCAL INFILE '${history_tsv}'
IGNORE
INTO TABLE jobs_history
FIELDS TERMINATED BY '\t'
LINES TERMINATED BY '\n'
(job_id, owner, name, state_final, submitted_at, @started_at, finished_at, slots, @queue)
SET started_at = NULLIF(@started_at, ''), queue = NULLIF(@queue, '');
SQL

mysql_file "$sql_file"
echo "history loaded"
