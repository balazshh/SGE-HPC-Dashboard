# Cron examples

Run on the Docker host or another machine with SGE access.

```cron
* * * * * cd /opt/hpc-dashboard && DB_WRITE=1 ./scripts/collect-live.sh >> /var/log/hpc-dashboard-live.log 2>&1
*/10 * * * * cd /opt/hpc-dashboard && DB_WRITE=1 ./scripts/collect-history.sh >> /var/log/hpc-dashboard-history.log 2>&1
*/15 * * * * cd /opt/hpc-dashboard && DB_WRITE=1 ./scripts/aggregate-rollups.sh >> /var/log/hpc-dashboard-rollups.log 2>&1
30 2 * * * cd /opt/hpc-dashboard && DB_WRITE=1 ./scripts/cleanup-old-data.sh >> /var/log/hpc-dashboard-cleanup.log 2>&1
```

Set these when using real cluster commands:

- `QSTAT_CLUSTER_COMMAND="qstat -g c"`
- `QSTAT_JOBS_COMMAND="qstat -u '*'"`
- `QACCT_COMMAND="qacct"`
