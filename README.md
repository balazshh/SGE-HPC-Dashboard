# HPC Dashboard v2

Production-only HPC dashboard.

What stays in this repo:
- Bun server
- React client
- MySQL schema
- HPC-side shell collectors
- deploy docs for the VM setup

What does not happen here:
- no direct HPC connection from the web VM
- no local fixture collectors
- no mock data path for production reads

## Runtime shape

- web app checkout: `/d/hpc-dashboard-test`
- Bun app: `127.0.0.1:3001`
- Nginx: TLS + reverse proxy
- HPC-side collectors: run where `qstat` and `qacct` already work
- MySQL: shared storage between collectors and web app

## Required components

- Bun 1.2+
- MySQL 8+
- Nginx
- SGE commands on the collector host:
  - `qstat -g c`
  - `qstat -u '*'`
  - `qacct`

## Web VM deployment

### 1. Checkout

```bash
cd /d
git clone https://github.com/balazshh/SGE-HPC-Dashboard.git hpc-dashboard-test
cd /d/hpc-dashboard-test
cp .env.example .env
```

### 2. Configure `.env`

```env
APP_BASE_URL=https://bp-hpc-dashboard-test.emea.bosch.com
PORT=3001

BETTER_AUTH_SECRET=
DB_WRITE=0
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=hpc_dashboard
DB_USER=hpc_dashboard
DB_PASSWORD=change-me

ENTRA_CLIENT_ID=
ENTRA_TENANT_ID=
ENTRA_CLIENT_SECRET=
```

Notes:
- `DB_WRITE=0` on the web VM is fine; this VM only reads
- if Entra is unset, demo auth still works
- real dashboard data depends on the HPC-side collectors filling MySQL

### 3. Build

```bash
bun install
bun run build
```

### 4. systemd service

Create `/etc/systemd/system/hpc-dashboard.service`:

```ini
[Unit]
Description=HPC Dashboard
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/d/hpc-dashboard-test
Environment=NODE_ENV=production
EnvironmentFile=/d/hpc-dashboard-test/.env
ExecStart=/usr/local/bin/bun src/server/index.ts
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

If needed:

```bash
which bun
```

Then:

```bash
systemctl daemon-reload
systemctl enable --now hpc-dashboard
systemctl status hpc-dashboard
```

### 5. Nginx

Use `/etc/nginx/conf.d/bp-hpc-dashboard-test.conf`:

```nginx
server {
    listen 443 ssl;
    server_name bp-hpc-dashboard-test.emea.bosch.com;

    ssl_certificate /etc/pki/tls/certs/bp0vm00090.crt;
    ssl_certificate_key /etc/ssl/private/bp0vm00090.key;

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
    server_name bp-hpc-dashboard-test.emea.bosch.com;
    return 301 https://$host$request_uri;
}
```

Reload:

```bash
nginx -t
systemctl reload nginx
```

Do not add a separate `/assets` alias. Bun serves `dist/` itself.

## HPC-side collectors

Run these on the HPC side, not on the web VM.

### 1. Collector env

```bash
cp scripts/hpc/collector.env.example scripts/hpc/collector.env
vi scripts/hpc/collector.env
```

Example:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=hpc_dashboard
DB_USER=hpc_dashboard
DB_PASSWORD=change-me

QSTAT_CLUSTER_COMMAND=qstat -g c
QSTAT_JOBS_COMMAND=qstat -u '*'
QACCT_COMMAND=qacct
```

### 2. Run collectors

```bash
./scripts/hpc/collect-live.sh
./scripts/hpc/collect-history.sh
./scripts/hpc/aggregate-rollups.sh
./scripts/hpc/cleanup-old-data.sh
```

### 3. Cron

See `docs/deploy/cron.md`.

## Database setup

Apply:

```bash
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < drizzle/0000_initial.sql
```

## Health check

```bash
curl http://127.0.0.1:3001/api/health
```

Expected shape:

```json
{"ok":true,"authMode":"demo"}
```

## Production checklist

- [ ] repo exists at `/d/hpc-dashboard-test`
- [ ] `APP_BASE_URL=https://bp-hpc-dashboard-test.emea.bosch.com`
- [ ] Bun service is up
- [ ] Nginx proxies to `127.0.0.1:3001`
- [ ] MySQL schema is loaded
- [ ] HPC-side `collector.env` is filled
- [ ] HPC-side cron is installed
- [ ] web VM can reach MySQL
- [ ] collectors can reach MySQL

## Repo layout

```txt
src/
  client/
  server/
  shared/
scripts/
  hpc/
docs/
  deploy/
drizzle/
```
