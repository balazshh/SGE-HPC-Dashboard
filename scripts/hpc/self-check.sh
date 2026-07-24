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
cat > "$MYSQL_CAPTURE"
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
101 0.555 train-a alice r 07/08/2026 10:00:00 all.q@n001 4
102 0.500 wait-b alice qw 07/08/2026 11:00:00 8
103 0.400 hold-c alice hqw 07/08/2026 11:30:00 2
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
export HPC_TZ=UTC
export QSTAT_CLUSTER_FILE="$workdir/qstat-cluster.txt"
export QSTAT_JOBS_FILE="$workdir/qstat-jobs.txt"
export QHOST_FILE="$workdir/qhost.txt"
export QACCT_FILE="$workdir/qacct.txt"

"$SCRIPT_DIR/collect-live.sh" >/dev/null
grep -q "16, 4, 12" "$mysql_capture"
grep -q "'running'" "$mysql_capture"
grep -q "'hold'" "$mysql_capture"
grep -q "'missing'" "$mysql_capture"
grep -q 'INSERT INTO jobs_current (job_id, owner, name, state_group, submitted_at, started_at)' "$mysql_capture"
! grep -q 'state_raw\|swapto_raw\|swapus_raw' "$mysql_capture"

"$SCRIPT_DIR/collect-history.sh" >/dev/null
grep -q "'finished'" "$mysql_capture"
grep -q "'error'" "$mysql_capture"
grep -q 'INSERT INTO jobs_history (job_id, owner, name, state_final, submitted_at, started_at, finished_at)' "$mysql_capture"
! grep -q 'slots\|queue' "$mysql_capture"

echo "self-check ok"
