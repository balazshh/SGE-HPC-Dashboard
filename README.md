# SGE HPC Dashboard

Dashboard for SGE cluster status, nodes, active jobs, and one year of per-user job history.

- The Bun web app runs on the web VM and reads MySQL.
- Shell collectors run beside SGE and write MySQL.
- Microsoft Entra ID supplies the signed-in user's HPC login.

## Requirements

**Web VM:** Docker, MySQL 8+, Nginx, HTTPS URL, and Entra app credentials.

**SGE host:** `qstat`, `qhost`, `qacct`, cron, and network access to the same MySQL database.

## Web app

```bash
git clone https://github.com/balazshh/SGE-HPC-Dashboard.git hpc-dashboard
cd hpc-dashboard
cp .env.example .env
```

Fill `.env`; `APP_BASE_URL` must be the final HTTPS URL and all Entra values are required.

### Database

For a fresh database, create the database/user, then apply the schema files in order:

```sql
CREATE DATABASE hpc_dashboard_test_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'hpc_dashboard_test_db_user'@'%' IDENTIFIED BY 'change-me';
GRANT ALL PRIVILEGES ON hpc_dashboard_test_db.* TO 'hpc_dashboard_test_db_user'@'%';
USE hpc_dashboard_test_db;
SOURCE drizzle/0000_initial.sql;
SOURCE drizzle/0001_ponytail_cleanup.sql;
SOURCE drizzle/0002_cluster_history.sql;
```

Keep these database names aligned with `.env` and `scripts/hpc/collector.env`. `0001_ponytail_cleanup.sql` removes obsolete collector columns and rollup tables. Existing installations must follow the coordinated upgrade below before applying it.

### Build and run

```bash
docker build --network=host -t hpc-dashboard -f Containerfile .
docker rm -f hpc-dashboard 2>/dev/null || true
docker run -d \
  --name hpc-dashboard \
  --env-file .env \
  -p 127.0.0.1:3001:3001 \
  --restart unless-stopped \
  hpc-dashboard
curl http://127.0.0.1:3001/api/health
```

Expected response:

```json
{"ok":true}
```

For a proxied build, add the required `--build-arg http_proxy=...` and `--build-arg https_proxy=...` flags to `docker build`.

### Nginx

```nginx
server {
    listen 443 ssl;
    server_name your-dashboard.example.com;

    ssl_certificate /path/to/your.crt;
    ssl_certificate_key /path/to/your.key;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Validate and reload with `nginx -t && systemctl reload nginx`.

## SGE collectors

On the SGE host:

```bash
cp scripts/hpc/collector.env.example scripts/hpc/collector.env
# Fill the database values, then verify parser/SQL generation:
./scripts/hpc/self-check.sh
./scripts/hpc/collect-live.sh
./scripts/hpc/collect-history.sh
./scripts/hpc/cleanup-old-data.sh
```

Install only these cron jobs:

```cron
* * * * * cd /opt/hpc-dashboard && ./scripts/hpc/collect-live.sh >> /var/log/hpc-dashboard-live.log 2>&1
*/10 * * * * cd /opt/hpc-dashboard && ./scripts/hpc/collect-history.sh >> /var/log/hpc-dashboard-history.log 2>&1
30 2 * * * cd /opt/hpc-dashboard && ./scripts/hpc/cleanup-old-data.sh >> /var/log/hpc-dashboard-cleanup.log 2>&1
```

The dashboard's utilization and active-job charts fill from live snapshots over the next 24 hours after deployment. Cleanup retains two days of snapshots.

History charts group the indexed `jobs_history` table directly; there is no rollup job.

## Existing-install upgrade

`0001_ponytail_cleanup.sql` is destructive. Back up MySQL first; restoring removed columns requires that backup.

1. Disable the old live, history, rollup, and cleanup cron entries; wait for running collectors to finish.
2. Apply each migration that has not already been applied (`0001` only for installations that still need the cleanup):

   ```sql
   USE hpc_dashboard_test_db;
   SOURCE drizzle/0001_ponytail_cleanup.sql;
   SOURCE drizzle/0002_cluster_history.sql;
   ```

3. Build and deploy the new web image, then install the new collector scripts.
4. Run `self-check.sh`, `collect-live.sh`, `collect-history.sh`, and `cleanup-old-data.sh` once.
5. Restore only the three cron entries shown above.

Do not run old collectors after `0001`; they still target the removed columns.

## Normal update

```bash
git pull
# Apply every new numbered SQL migration now, before restarting the app or collectors.
docker build --network=host -t hpc-dashboard -f Containerfile .
docker rm -f hpc-dashboard 2>/dev/null || true
docker run -d --name hpc-dashboard --env-file .env -p 127.0.0.1:3001:3001 --restart unless-stopped hpc-dashboard
```

Apply each numbered SQL migration exactly once, in filename order.

## Troubleshooting

```bash
curl http://127.0.0.1:3001/api/health
docker logs hpc-dashboard
nginx -t
```

- Login failure: check `APP_BASE_URL`, `BETTER_AUTH_SECRET`, and all `ENTRA_*` values.
- Empty/stale pages: run the collectors manually and check their MySQL access.
- Collector failure after upgrade: confirm all numbered migrations and the matching collector scripts were deployed together.
