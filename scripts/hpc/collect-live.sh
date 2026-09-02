#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=./common.sh
source "$SCRIPT_DIR/common.sh"
collector_init
require_cmd_if_no_file qstat "${QSTAT_CLUSTER_FILE:-}"
require_cmd_if_no_file qstat "${QSTAT_JOBS_FILE:-}"
require_cmd_if_no_file qhost "${QHOST_FILE:-}"

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

cluster_txt="$workdir/qstat-cluster.txt"
jobs_txt="$workdir/qstat-jobs.txt"
qhost_txt="$workdir/qhost.txt"
jobs_tsv="$workdir/jobs-current.tsv"
nodes_tsv="$workdir/nodes-current.tsv"
queues_tsv="$workdir/queues-current.tsv"
summary_env="$workdir/summary.env"
sql_file="$workdir/load-live.sql"
recorded_at="$(date -u '+%F %T')"

run_command_or_cat "$QSTAT_CLUSTER_COMMAND" "${QSTAT_CLUSTER_FILE:-}" > "$cluster_txt"
run_command_or_cat "$QSTAT_JOBS_COMMAND" "${QSTAT_JOBS_FILE:-}" > "$jobs_txt"
run_command_or_cat "${QHOST_COMMAND:-qhost}" "${QHOST_FILE:-}" > "$qhost_txt"

# ponytail: qstat -g c totals assume queue slots are non-overlapping; fail closed until the cluster admin confirms that configuration.
cluster_totals="$workdir/cluster-totals.env"
if ! awk '
  BEGIN { records = 0 }
  NF && $1 != "CLUSTER" && $1 !~ /^-+$/ {
    if (NF < 6 || $3 !~ /^[0-9]+$/ || $4 !~ /^[0-9]+$/ || $5 !~ /^[0-9]+$/ || $6 !~ /^[0-9]+$/) {
      print "invalid SGE cluster capacity row" > "/dev/stderr";
      exit 1;
    }
    if (($3 + $4 + $5) > $6) {
      print "invalid SGE cluster capacity invariant" > "/dev/stderr";
      exit 1;
    }
    records++;
    total += $6;
    used += $3;
    reserved += $4;
    free += $5;
  }
  END {
    if (records == 0) exit 1;
    printf("total_slots=%d\nused_slots=%d\nreserved_slots=%d\nfree_slots=%d\nqueue_count=%d\n", total, used, reserved, free, records);
  }
' "$cluster_txt" > "$cluster_totals"; then
  echo "invalid or empty SGE cluster capacity" >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$cluster_totals"
if (( queue_count > 1 && SGE_QUEUE_TOTALS_NON_OVERLAPPING != "true" )); then
  echo "SGE queue totals overlap is not confirmed" >&2
  exit 1
fi

if ! awk 'NF && $1 != "CLUSTER" && $1 !~ /^-+$/ {
  if (NF < 6 || $3 !~ /^[0-9]+$/ || $4 !~ /^[0-9]+$/ || $5 !~ /^[0-9]+$/ || $6 !~ /^[0-9]+$/) exit 1;
  print $1, $3 + 0, $4 + 0, $5 + 0, $6 + 0, ""
}' OFS='\t' "$cluster_txt" > "$queues_tsv"; then
  echo "invalid SGE queue capacity row" >&2
  exit 1
fi

if ! awk -F '\t' 'BEGIN { records = 0 } NF { records++; if ($2 !~ /^[0-9]+$/ || $3 !~ /^[0-9]+$/ || $4 !~ /^[0-9]+$/ || $5 !~ /^[0-9]+$/ || $2 + $3 + $4 > $5) exit 1 } END { if (records == 0) exit 1 }' "$queues_tsv"; then
  echo "invalid SGE queue capacity invariant" >&2
  exit 1
fi

awk -v summary_env="$summary_env" -v hpc_tz="$HPC_TZ" -v recorded_at="$recorded_at" '
function state_group(raw) {
  if (raw == "r" || raw == "t" || raw == "Rr" || raw == "Rt") return "running";
  if (raw == "qw") return "queued";
  if (raw == "hqw" || raw == "hRwq") return "hold";
  if (raw == "s" || raw == "ts" || raw == "S" || raw == "tS" || raw == "T" || raw == "tT" || raw == "Rs" || raw == "Rts" || raw == "RS" || raw == "RtS" || raw == "RT" || raw == "RtT") return "suspended";
  if (raw == "Eqw" || raw == "Ehqw" || raw == "EhRqw") return "error";
  if (raw == "dr" || raw == "dt" || raw == "dRr" || raw == "dRt" || raw == "ds" || raw == "dS" || raw == "dT" || raw == "dRs" || raw == "dRS" || raw == "dRT") return "deleted";
  return "unknown";
}
function qstat_utc(date_part, time_part, date_bits, time_bits, year, epoch) {
  if (date_part !~ /^[0-9]+\/[0-9]+\/[0-9]+$/ || time_part !~ /^[0-9]+:[0-9]+:[0-9]+$/) return "";
  split(date_part, date_bits, "/");
  split(time_part, time_bits, ":");
  year = date_bits[3] + 0;
  if (year < 100) year += year < 70 ? 2000 : 1900;
  epoch = mktime(sprintf("%d %d %d %d %d %d", year, date_bits[1], date_bits[2], time_bits[1], time_bits[2], time_bits[3]));
  return epoch < 0 ? "" : strftime("%Y-%m-%d %H:%M:%S", epoch, 1);
}
function parse_slots(   i) {
  if ($8 ~ /^[0-9]+$/) return $8 + 0;
  if ($8 ~ /^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+$/) return $9 ~ /^[0-9]+$/ ? $9 + 0 : "";
  return "";
}
BEGIN {
  ENVIRON["TZ"] = hpc_tz;
  running = queued = failed = hold = total_jobs = 0;
}
NF && $1 != "job-ID" && $1 !~ /^-+$/ {
  job_id = $1;
  name = $3;
  owner = $4;
  state_raw = $5;
  state = state_group(state_raw);
  if (state == "unknown") {
    print "unsupported SGE job state " state_raw " for job " job_id > "/dev/stderr";
    exit 1;
  }
  scheduler_at = qstat_utc($6, $7);
  if (scheduler_at == "") {
    print "invalid SGE submit/start timestamp for job " job_id > "/dev/stderr";
    exit 1;
  }
  submitted_at = (state == "running" || state == "suspended") ? "" : scheduler_at;
  started_at = (state == "running" || state == "suspended") ? scheduler_at : "";
  slots = parse_slots();
  if (slots == "") {
    print "invalid SGE slots for job " job_id > "/dev/stderr";
    exit 1;
  }
  total_jobs++;
  if (state == "running") running++;
  else if (state == "queued") queued++;
  else if (state == "error") failed++;
  else if (state == "hold") hold++;

  print job_id, owner, name, state, submitted_at, started_at, slots;
}
END {
  printf("running_jobs=%d\nqueued_jobs=%d\nfailed_jobs=%d\nhold_jobs=%d\ntotal_jobs=%d\n", running, queued, failed, hold, total_jobs) > summary_env;
}
' OFS='\t' "$jobs_txt" > "$jobs_tsv"

if ! awk -v recorded_at="$recorded_at" '
function empty_if_dash(value) {
  return value == "-" ? "" : value;
}
function int_or_empty(value) {
  return value == "-" ? "" : value + 0;
}
BEGIN { records = 0 }
NF && $1 != "HOSTNAME" && $1 != "global" && $1 !~ /^-+$/ {
  if (NF < 9 || $3 !~ /^(-|[0-9]+)$/ || $4 !~ /^(-|[0-9]+)$/ || $5 !~ /^(-|[0-9]+)$/ || $6 !~ /^(-|[0-9]+)$/ || ($7 != "-" && $7 !~ /^[0-9]+([.][0-9]+)?$/) || ($8 != "-" && $8 !~ /^[0-9]+([.][0-9]+)?[KMGTkmgt]?$/) || ($9 != "-" && $9 !~ /^[0-9]+([.][0-9]+)?[KMGTkmgt]?$/)) {
    print "invalid SGE qhost numeric fields" > "/dev/stderr";
    exit 1;
  }
  records++;
  status = $2 == "-" ? "missing" : (($7 == "-" || $8 == "-" || $9 == "-") ? "partial" : "ok");
  print $1, empty_if_dash($2), int_or_empty($3), int_or_empty($4), int_or_empty($5), int_or_empty($6), empty_if_dash($7), empty_if_dash($8), empty_if_dash($9), status, recorded_at;
}
END {
  if (records == 0) exit 1;
}
' OFS='\t' "$qhost_txt" > "$nodes_tsv"; then
  echo "invalid or empty SGE qhost data" >&2
  exit 1
fi

offline_node_count="$(awk -F '\t' '$10 == "missing" { count++ } END { print count + 0 }' "$nodes_tsv")"

# shellcheck disable=SC1090
source "$summary_env"
health_status="healthy"
if (( offline_node_count > 0 )); then
  health_status="degraded"
fi

cat > "$sql_file" <<SQL
START TRANSACTION;
INSERT INTO cluster_snapshots
  (recorded_at, total_slots, used_slots, free_slots, reserved_slots, job_count, running_jobs, queued_jobs, failed_jobs, hold_jobs, health_status, offline_node_count)
VALUES
  ('${recorded_at}', ${total_slots}, ${used_slots}, ${free_slots}, ${reserved_slots}, ${total_jobs}, ${running_jobs}, ${queued_jobs}, ${failed_jobs}, ${hold_jobs}, '${health_status}', ${offline_node_count});
DELETE FROM jobs_current;
DELETE FROM nodes_current;
DELETE FROM queues_current;
SQL

awk -F '\t' '
function esc(value) {
  gsub(/\\/, "\\\\", value);
  gsub(/\047/, "\047\047", value);
  return value;
}
function quote(value) {
  return sq esc(value) sq;
}
BEGIN {
  sq = sprintf("%c", 39);
  prefix = "INSERT INTO jobs_current (job_id, owner, name, state_group, submitted_at, started_at, slots) VALUES\n";
  batch_size = 500;
  count = 0;
}
NF {
  submitted_at = $5 == "" ? "NULL" : quote($5);
  started_at = $6 == "" ? "NULL" : quote($6);
  row = "  (" quote($1) ", " quote($2) ", " quote($3) ", " quote($4) ", " submitted_at ", " started_at ", " ($7 + 0) ")";
  if (count == 0) {
    printf "%s%s", prefix, row;
  } else {
    printf ",\n%s", row;
  }
  count++;
  if (count >= batch_size) {
    printf ";\n";
    count = 0;
  }
}
END {
  if (count > 0) printf ";\n";
}
' "$jobs_tsv" >> "$sql_file"

awk -F '\t' '
function esc(value) {
  gsub(/\\/, "\\\\", value);
  gsub(/\047/, "\047\047", value);
  return value;
}
function quote(value) {
  return sq esc(value) sq;
}
function sql_string(value) {
  return value == "" ? "NULL" : quote(value);
}
function sql_int(value) {
  return value == "" ? "NULL" : value + 0;
}
BEGIN {
  sq = sprintf("%c", 39);
  prefix = "INSERT INTO nodes_current (hostname, arch, ncpu, nsoc, ncor, nthr, load_raw, memtot_raw, memuse_raw, status, last_seen_at) VALUES\n";
  batch_size = 500;
  count = 0;
}
NF {
  row = "  (" quote($1) ", " sql_string($2) ", " sql_int($3) ", " sql_int($4) ", " sql_int($5) ", " sql_int($6) ", " sql_string($7) ", " sql_string($8) ", " sql_string($9) ", " quote($10) ", " quote($11) ")";
  if (count == 0) {
    printf "%s%s", prefix, row;
  } else {
    printf ",\n%s", row;
  }
  count++;
  if (count >= batch_size) {
    printf ";\n";
    count = 0;
  }
}
END {
  if (count > 0) printf ";\n";
}
' "$nodes_tsv" >> "$sql_file"

awk -F'\t' -v recorded_at="$recorded_at" '
function esc(value) {
  gsub(/\\/, "\\\\", value);
  gsub(/\047/, "\047\047", value);
  return value;
}
function quote(value) {
  return sq esc(value) sq;
}
function sql_string(value) {
  return value == "" ? "NULL" : quote(value);
}
BEGIN {
  sq = sprintf("%c", 39);
  prefix = "INSERT INTO queues_current (queue_name, used_slots, reserved_slots, free_slots, total_slots, state, last_seen_at) VALUES\n";
  batch_size = 500;
  count = 0;
}
NF {
  row = "  (" quote($1) ", " ($2 + 0) ", " ($3 + 0) ", " ($4 + 0) ", " ($5 + 0) ", " sql_string($6) ", " quote(recorded_at) ")";
  if (count == 0) {
    printf "%s%s", prefix, row;
  } else {
    printf ",\n%s", row;
  }
  count++;
  if (count >= batch_size) {
    printf ";\n";
    count = 0;
  }
}
END {
  if (count > 0) printf ";\n";
}
' "$queues_tsv" >> "$sql_file"

cat >> "$sql_file" <<'SQL'
COMMIT;
SQL

mysql_file "$sql_file"
echo "live snapshot loaded: ${recorded_at}"
