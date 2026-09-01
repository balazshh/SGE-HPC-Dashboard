#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

mysql_capture="$workdir/mysql.sql"
bindir="$workdir/bin"
mkdir -p "$bindir"
cat > "$bindir/mysql" <<'SH'
#!/usr/bin/env bash
while (( $# )); do
  if [[ "$1" == -h ]]; then
    host="$2"
    break
  fi
  shift
done
cat >> "${MYSQL_CAPTURE}__${host}"
SH
chmod +x "$bindir/mysql"

cat > "$workdir/qstat-cluster.txt" <<'EOF'
CLUSTER QUEUE CQLOAD USED RES AVAIL TOTAL aoACDS cdsuE
------------------------------------------------------
all.q 0.00 4 0 12 16 0 0
EOF

cat > "$workdir/qstat-jobs.txt" <<'EOF'
job-ID prior name user state submit/start at queue slots ja-task-ID
-------------------------------------------------------------------
101 0.555 train-a alice r 07/08/26 10:00:00 all.q@n001 4
102 0.500 wait-b alice qw 07/08/2026 11:00:00 8
103 0.400 hold-c alice hqw 07/08/2026 11:30:00 2
104 0.300 pause-d alice s 07/08/2026 11:45:00 all.q@n001 1
105 0.250 noload-f alice s 07/08/2026 12:00:00
EOF

cat > "$workdir/qhost.txt" <<'EOF'
HOSTNAME ARCH NCPU NSOC NCOR NTHR LOAD MEMTOT MEMUSE SWAPTO SWAPUS
------------------------------------------------------------------
n001 lx-amd64 16 2 8 16 3.25 64G 8G 8G 1G
n002 - - - - - - - - - -
EOF

cat > "$workdir/qacct.txt" <<'EOF'
==============================================================
owner        alice
jobname      train-a
jobnumber    101
qsub_time    Tue Jul 8 10:00:00 2026
start_time   Tue Jul 8 10:05:00 2026
end_time     Tue Jul 8 11:15:00 2026
failed       0
exit_status  0
==============================================================
owner        alice
jobname      fail-b
jobnumber    104
qsub_time    Tue Jul 8 09:00:00 2026
start_time   Tue Jul 8 09:05:00 2026
end_time     Tue Jul 8 09:10:00 2026
failed       1
exit_status  1
EOF

export PATH="$bindir:$PATH"
export MYSQL_CAPTURE="$mysql_capture"
export DB_HOST=stub
export DB_NAME=stub
export DB_USER=stub
export DB_PASSWORD=stub
export DB2_HOST=stub2
export DB2_NAME=stub2
export DB2_USER=stub2
export DB2_PASSWORD=stub2
export HPC_TZ=Europe/Budapest
export QSTAT_CLUSTER_FILE="$workdir/qstat-cluster.txt"
export QSTAT_JOBS_FILE="$workdir/qstat-jobs.txt"
export QHOST_FILE="$workdir/qhost.txt"
export QACCT_FILE="$workdir/qacct.txt"

"$SCRIPT_DIR/collect-live.sh" >/dev/null
primary_capture="${mysql_capture}__stub"
second_capture="${mysql_capture}__stub2"
grep -q "16, 4, 12" "$primary_capture"
grep -q "'degraded', 1);" "$primary_capture"
grep -q "'running'" "$primary_capture"
grep -q "'hold'" "$primary_capture"
grep -q "'2026-07-08 08:00:00'" "$primary_capture"
grep -q "'missing'" "$primary_capture"
! grep -q 'DELETE FROM cluster_snapshots' "$primary_capture"
grep -q 'free_slots, job_count, running_jobs' "$primary_capture"
grep -q '12, 5, 1, 1, 0, 1' "$primary_capture"
grep -q 'INSERT INTO jobs_current (job_id, owner, name, state_group, submitted_at, started_at, slots)' "$primary_capture"
grep -qF "'train-a', 'running', '2026-07-08 08:00:00', '2026-07-08 08:00:00', 4)" "$primary_capture"
grep -qF "'wait-b', 'queued', '2026-07-08 09:00:00', NULL, 8)" "$primary_capture"
grep -qF "'noload-f', 'suspended', '2026-07-08 10:00:00', NULL, 1)" "$primary_capture"
grep -q 'DELETE FROM queues_current' "$primary_capture"
grep -q 'INSERT INTO queues_current (queue_name, used_slots, reserved_slots, free_slots, total_slots, last_seen_at)' "$primary_capture"
grep -qF "'all.q', 4, 0, 12, 16" "$primary_capture"
! grep -q 'state_raw\|swapto_raw\|swapus_raw' "$primary_capture"
[[ -s "$second_capture" ]]
grep -q 'INSERT INTO cluster_snapshots' "$second_capture"
grep -q 'INSERT INTO jobs_current (job_id, owner, name, state_group, submitted_at, started_at, slots)' "$second_capture"
grep -q 'INSERT INTO queues_current' "$second_capture"

history_capture="$workdir/mysql-history.sql"
export MYSQL_CAPTURE="$history_capture"
history_primary="${history_capture}__stub"
history_second="${history_capture}__stub2"

"$SCRIPT_DIR/collect-history.sh" >/dev/null
grep -q "'finished'" "$history_primary"
grep -q "'error'" "$history_primary"
grep -q "'2026-07-08 08:00:00'" "$history_primary"
grep -q 'INSERT INTO jobs_history (job_id, owner, name, state_final, submitted_at, started_at, finished_at)' "$history_primary"
! grep -q 'slots\|queue' "$history_primary"
grep -q 'INSERT INTO jobs_history' "$history_second"

echo "self-check ok"
