# Cron examples

Run on the app host or another machine with SGE access and Bun installed.

```cron
* * * * * cd /opt/hpc-dashboard && DB_WRITE=1 bun run collect:live >> /var/log/hpc-dashboard-live.log 2>&1
*/10 * * * * cd /opt/hpc-dashboard && DB_WRITE=1 bun run collect:history >> /var/log/hpc-dashboard-history.log 2>&1
*/15 * * * * cd /opt/hpc-dashboard && DB_WRITE=1 bun run collect:rollups >> /var/log/hpc-dashboard-rollups.log 2>&1
30 2 * * * cd /opt/hpc-dashboard && DB_WRITE=1 bun run cleanup:data >> /var/log/hpc-dashboard-cleanup.log 2>&1
```

Set these when using real cluster commands:

- `QSTAT_CLUSTER_COMMAND="qstat -g c"`
- `QSTAT_JOBS_COMMAND="qstat -u '*'"`
- `QACCT_COMMAND="qacct"`
