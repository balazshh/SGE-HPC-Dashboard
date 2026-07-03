# Cron examples

Run these on the HPC side: login node, submit host, or any machine where `qstat` and `qacct` already work.
The web app VM does not need direct HPC access. It only reads MySQL.

1. Copy `scripts/hpc/collector.env.example` to `scripts/hpc/collector.env`
2. Fill in MySQL credentials for the app database
3. Install cron entries like this:

```cron
* * * * * cd /opt/hpc-dashboard && ./scripts/hpc/collect-live.sh >> /var/log/hpc-dashboard-live.log 2>&1
*/10 * * * * cd /opt/hpc-dashboard && ./scripts/hpc/collect-history.sh >> /var/log/hpc-dashboard-history.log 2>&1
*/15 * * * * cd /opt/hpc-dashboard && ./scripts/hpc/aggregate-rollups.sh >> /var/log/hpc-dashboard-rollups.log 2>&1
30 2 * * * cd /opt/hpc-dashboard && ./scripts/hpc/cleanup-old-data.sh >> /var/log/hpc-dashboard-cleanup.log 2>&1
```

Default commands on the HPC side:

- `QSTAT_CLUSTER_COMMAND="qstat -g c"`
- `QSTAT_JOBS_COMMAND="qstat -u '*'"`
- `QACCT_COMMAND="qacct"`
