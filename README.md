# SGE HPC Dashboard

This app shows SGE cluster status, nodes, your jobs, and your job history.

It has 2 parts:

1. **Web app** on the web VM
2. **Collectors** on the HPC side

The web app reads MySQL.
The collectors fill MySQL.

If the collectors do not run, the dashboard will be empty.

---

## What you need

### On the web VM

- Docker
- MySQL 8+
- Nginx
- a public URL for the app
- Entra ID app credentials

### On the HPC side

- `qstat -g c`
- `qstat -u '*'`
- `qhost`
- `qacct`
- cron
- network access to the same MySQL database

---

## 1. Copy the repo

```bash
cd /d
git clone https://github.com/balazshh/SGE-HPC-Dashboard.git hpc-dashboard-test
cd /d/hpc-dashboard-test
cp .env.example /d/.env
```

---

## 2. Fill `.env`

Open `/d/.env` and set real values:

```env
APP_BASE_URL=https://your-dashboard.example.com
PORT=3001
BETTER_AUTH_SECRET=put-a-long-random-secret-here
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=hpc_dashboard
DB_USER=hpc_dashboard
DB_PASSWORD=change-me
ENTRA_CLIENT_ID=your-client-id
ENTRA_TENANT_ID=your-tenant-id
ENTRA_CLIENT_SECRET=your-client-secret
```

Rules:

- `APP_BASE_URL` must be the final HTTPS URL
- Entra values are required
- the app will not work without MySQL

---

## 3. Create the database

Do this once on the web VM.

```bash
cd /d/hpc-dashboard-test
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p <<SQL
DROP DATABASE IF EXISTS \`$DB_NAME\`;
CREATE DATABASE \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SQL

mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < drizzle/0000_initial.sql
```

This is the easiest safe path for a fresh test deploy.

---

## 4. Build the Docker image

Without proxy:

```bash
cd /d/hpc-dashboard-test
docker build --network=host -t hpc-dashboard-test -f Containerfile .
```

With proxy:

```bash
cd /d/hpc-dashboard-test
docker build --network=host \
  --build-arg http_proxy=http://<proxy-host>:<proxy-port> \
  --build-arg https_proxy=http://<proxy-host>:<proxy-port> \
  -t hpc-dashboard-test \
  -f Containerfile .
```

---

## 5. Start the app

```bash
docker rm -f hpc-dashboard-test 2>/dev/null || true && docker run -d --name hpc-dashboard-test --env-file /d/.env -p 127.0.0.1:3001:3001 --restart unless-stopped hpc-dashboard-test
```

Check it:

```bash
curl http://127.0.0.1:3001/api/health
```

You should get:

```json
{"ok":true,"authMode":"entra"}
```

---

## 6. Put Nginx in front

Create `/etc/nginx/conf.d/hpc-dashboard.conf`:

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

server {
    listen 80;
    server_name your-dashboard.example.com;
    return 301 https://$host$request_uri;
}
```

Reload Nginx:

```bash
nginx -t
systemctl reload nginx
```

---

## 7. Set up the HPC collectors

Do this on the HPC side, not on the web VM.

### 7.1 Copy the collector env file

```bash
cd /path/to/SGE-HPC-Dashboard
cp scripts/hpc/collector.env.example scripts/hpc/collector.env
```

### 7.2 Fill `scripts/hpc/collector.env`

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=hpc_dashboard
DB_USER=hpc_dashboard
DB_PASSWORD=change-me
HPC_TZ=Europe/Budapest
QSTAT_CLUSTER_COMMAND='qstat -g c'
QSTAT_JOBS_COMMAND="qstat -u '*'"
QHOST_COMMAND='qhost'
QACCT_COMMAND='qacct'
```

### 7.3 Run the collectors once by hand

```bash
./scripts/hpc/collect-live.sh
./scripts/hpc/collect-history.sh
./scripts/hpc/aggregate-rollups.sh
./scripts/hpc/cleanup-old-data.sh
```

If these work, cron will work too.

### 7.4 Add cron

```cron
* * * * * cd /path/to/SGE-HPC-Dashboard && ./scripts/hpc/collect-live.sh >> /var/log/hpc-dashboard-live.log 2>&1
*/10 * * * * cd /path/to/SGE-HPC-Dashboard && ./scripts/hpc/collect-history.sh >> /var/log/hpc-dashboard-history.log 2>&1
*/15 * * * * cd /path/to/SGE-HPC-Dashboard && ./scripts/hpc/aggregate-rollups.sh >> /var/log/hpc-dashboard-rollups.log 2>&1
30 2 * * * cd /path/to/SGE-HPC-Dashboard && ./scripts/hpc/cleanup-old-data.sh >> /var/log/hpc-dashboard-cleanup.log 2>&1
```

---

## 8. Open the site

Open:

```txt
https://your-dashboard.example.com
```

Sign in with Entra ID.

If login works and collectors are writing data, the dashboard, nodes page, jobs page, and history page are ready.

---

## Update later

When you want a new version:

```bash
cd /d/hpc-dashboard-test
git pull
docker build --network=host -t hpc-dashboard-test -f Containerfile .
docker rm -f hpc-dashboard-test 2>/dev/null || true && docker run -d --name hpc-dashboard-test --env-file /d/.env -p 127.0.0.1:3001:3001 --restart unless-stopped hpc-dashboard-test
```

If you need proxy on update too:

```bash
cd /d/hpc-dashboard-test
git pull
docker build --network=host \
  --build-arg http_proxy=http://<proxy-host>:<proxy-port> \
  --build-arg https_proxy=http://<proxy-host>:<proxy-port> \
  -t hpc-dashboard-test \
  -f Containerfile .
docker rm -f hpc-dashboard-test 2>/dev/null || true && docker run -d --name hpc-dashboard-test --env-file /d/.env -p 127.0.0.1:3001:3001 --restart unless-stopped hpc-dashboard-test
```

If the app schema changes in the future, load the matching SQL before starting the new container.

---

## Very short troubleshooting

### The app does not open

Check:

```bash
curl http://127.0.0.1:3001/api/health
docker logs hpc-dashboard-test
nginx -t
```

### Login fails

Check these values in `.env`:

- `APP_BASE_URL`
- `BETTER_AUTH_SECRET`
- `ENTRA_CLIENT_ID`
- `ENTRA_TENANT_ID`
- `ENTRA_CLIENT_SECRET`

### The page opens but shows no data

That usually means the collectors are not running or cannot write to MySQL.

Run these again on the HPC side:

```bash
./scripts/hpc/collect-live.sh
./scripts/hpc/collect-history.sh
./scripts/hpc/aggregate-rollups.sh
```
