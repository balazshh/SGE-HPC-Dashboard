# HPC Dashboard v2

Single-repo HPC dashboard: React SPA + Bun API server + optional MySQL persistence.

The app runs in two modes:

- **demo mode**: no Entra, no MySQL, fixture data only
- **production mode**: Entra auth enabled, shell collectors running on the HPC side write into MySQL, reverse proxy in front

## What is in the repo

- `src/client` — SPA pages, routing, auth UI
- `src/server` — Bun server, tRPC routes, auth, data access
- `src/shared` — shared types and mock data
- `scripts` — Bun collector/maintenance jobs
- `drizzle` — SQL used to create the database schema
- `docs/deploy` — small deploy helpers
- `docs/adr` — architecture decisions

## Requirements

### Local demo

- Bun 1.2+

### Full production

- Bun 1.2+
- MySQL 8+
- reverse proxy such as Nginx
- optional Microsoft Entra app registration
- access to SGE commands if you want real HPC data:
  - `qstat -g c`
  - `qstat -u '*'`
  - `qacct`

## Quick start

### Local demo mode

```bash
cp .env.example .env
bun install
bun run dev:server
```

In a second terminal:

```bash
bun run dev
```

Open `http://localhost:5173`.

Notes:

- API server runs on `PORT` from `.env`.
- Vite proxies `/api` to the Bun server.
- If Entra is not configured, the login page uses the demo sign-in form.
- If MySQL is not available, the app falls back to bundled mock data.

### Local production-like run

```bash
cp .env.example .env
bun install
bun run build
bun run start
```

Open `http://localhost:3001` unless you changed `PORT`.

## Package management

This repo uses **Bun only**.

Common commands:

```bash
bun install
bun run dev
bun run dev:server
bun run build
bun run start
bun run check:parsers
bun run collect:live
bun run collect:history
bun run collect:rollups
bun run cleanup:data
```

## Environment

Copy `.env.example` to `.env` and set what you need.

### Core app

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_BASE_URL` | yes | Public base URL used by auth callbacks |
| `PORT` | yes | Bun server port |
| `BETTER_AUTH_SECRET` | only with Entra | Better Auth secret |

### Database

| Variable | Required | Purpose |
| --- | --- | --- |
| `DB_WRITE` | no | `1` enables collector writes, `0` keeps dry-run behavior |
| `DB_HOST` | only with MySQL | MySQL host |
| `DB_PORT` | only with MySQL | MySQL port |
| `DB_NAME` | only with MySQL | Database name |
| `DB_USER` | only with MySQL | Database user |
| `DB_PASSWORD` | only with MySQL | Database password |

### Entra

| Variable | Required | Purpose |
| --- | --- | --- |
| `ENTRA_CLIENT_ID` | only with Entra | OAuth client id |
| `ENTRA_TENANT_ID` | only with Entra | Entra tenant id |
| `ENTRA_CLIENT_SECRET` | only with Entra | OAuth client secret |

### HPC collectors

These variables are mainly for the local Bun test collectors. Real production collection should use the shell scripts under `scripts/hpc/` on the HPC side.

| Variable | Required | Purpose |
| --- | --- | --- |
| `QSTAT_CLUSTER_COMMAND` | no | Real cluster summary command |
| `QSTAT_JOBS_COMMAND` | no | Real active jobs command |
| `QACCT_COMMAND` | no | Real accounting/history command |

If the HPC command variables are empty, the local Bun collectors use sample fixture files.

## Database setup

1. Create a MySQL database.
2. Create a user with read/write access to that database.
3. Set the `DB_*` variables in `.env`.
4. Apply `drizzle/0000_initial.sql`.

Example:

```sql
CREATE DATABASE hpc_dashboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'hpc_dashboard'@'%' IDENTIFIED BY 'change-me';
GRANT ALL PRIVILEGES ON hpc_dashboard.* TO 'hpc_dashboard'@'%';
FLUSH PRIVILEGES;
```

Then load the schema:

```bash
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < drizzle/0000_initial.sql
```

## Authentication modes

### Demo mode

Used automatically when Entra env variables are missing.

- login is handled by `/api/demo-login`
- a demo session cookie is issued by the Bun server
- good for local testing and UI review

### Entra mode

Enabled when all of these are set:

- `BETTER_AUTH_SECRET`
- `ENTRA_CLIENT_ID`
- `ENTRA_CLIENT_SECRET`
- `ENTRA_TENANT_ID`

Redirect URI:

```txt
https://<your-domain>/api/auth/oauth2/callback/microsoft-entra-id
```

Set `APP_BASE_URL` to the same public URL users will open in the browser.

## Collector jobs

There are two collector paths:

- `scripts/hpc/*.sh` — production path, runs on the HPC side and writes directly to MySQL
- `scripts/*.mjs` — local/dev path, useful for parser checks and fixture-based testing

The web app VM does not need direct HPC access. It only needs MySQL access.

### Production collector flow

1. Put a checkout of this repo on a machine where `qstat` and `qacct` already work.
2. Copy `scripts/hpc/collector.env.example` to `scripts/hpc/collector.env`.
3. Set the app MySQL credentials there.
4. Run the shell collectors from cron.
5. The app reads the loaded rows from MySQL.

Shell collectors:

```bash
cp scripts/hpc/collector.env.example scripts/hpc/collector.env
vi scripts/hpc/collector.env
./scripts/hpc/collect-live.sh
./scripts/hpc/collect-history.sh
./scripts/hpc/aggregate-rollups.sh
./scripts/hpc/cleanup-old-data.sh
```

### Validate parsers

```bash
bun run check:parsers
```

### Local/dev collector commands

```bash
DB_WRITE=1 bun run collect:live
DB_WRITE=1 bun run collect:history
DB_WRITE=1 bun run collect:rollups
DB_WRITE=1 bun run cleanup:data
```

Cron examples for the real HPC-side shell collectors live in `docs/deploy/cron.md`.

## Production deployment

This is the recommended deployment shape for the current Bosch test VM setup:

- app checkout lives under `/d/hpc-dashboard-test`
- Bun server listens on `127.0.0.1:3001`
- Nginx terminates TLS and proxies to Bun
- the web VM does **not** connect to HPC directly
- shell collectors run on the HPC side and write into MySQL

### 1. Deploy the app on the VM

```bash
cd /d
git clone https://github.com/balazshh/SGE-HPC-Dashboard.git hpc-dashboard-test
cd /d/hpc-dashboard-test
cp .env.example .env
```

Set `/d/hpc-dashboard-test/.env` like this:

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

- `DB_WRITE=0` is fine on the web VM. This VM only reads MySQL.
- if Entra is not configured, the app stays in demo-auth mode
- real HPC data still appears as long as the HPC-side collectors write into MySQL

### 2. Install dependencies and build

```bash
cd /d/hpc-dashboard-test
bun install
bun run build
```

This creates `dist/`, which the Bun server serves directly.

### 3. Run under systemd

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

If Bun is not in `/usr/local/bin/bun`, check it first:

```bash
which bun
```

Then enable the service:

```bash
systemctl daemon-reload
systemctl enable --now hpc-dashboard
systemctl status hpc-dashboard
```

### 4. Nginx reverse proxy on the VM

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

Then reload Nginx:

```bash
nginx -t
systemctl reload nginx
```

Notes:

- do not use a separate `/assets` alias for this app; Bun already serves `dist/`
- ignore unrelated terminal websocket routes from other configs unless you really need them here

### 5. HPC-side collectors

This VM does not need direct SSH or scheduler access.
Run the shell collectors on the HPC side: login node, submit host, or any machine where `qstat` and `qacct` already work.

```bash
cp scripts/hpc/collector.env.example scripts/hpc/collector.env
vi scripts/hpc/collector.env
./scripts/hpc/collect-live.sh
./scripts/hpc/collect-history.sh
./scripts/hpc/aggregate-rollups.sh
./scripts/hpc/cleanup-old-data.sh
```

Those scripts write directly into MySQL. The web app only reads the resulting tables.

Cron examples for the HPC side live in `docs/deploy/cron.md`.

### 6. Container deployment

A Bun-only container build is still available in `Containerfile`, but for the current VM the `systemd + nginx` setup above is the intended path.

## Recommended production checklist

- [ ] app checkout exists at `/d/hpc-dashboard-test`
- [ ] `APP_BASE_URL=https://bp-hpc-dashboard-test.emea.bosch.com`
- [ ] `PORT=3001`
- [ ] Bun service is running under systemd
- [ ] Nginx proxies `443 -> 127.0.0.1:3001`
- [ ] Entra secrets are present if SSO is required
- [ ] MySQL schema from `drizzle/0000_initial.sql` is applied
- [ ] `scripts/hpc/collector.env` exists on the HPC side
- [ ] MySQL is reachable from the HPC-side collector host
- [ ] collector cron jobs are installed on the HPC side
- [ ] reverse proxy forwards `Host` and `X-Forwarded-Proto`
- [ ] health check `/api/health` is monitored
- [ ] `.env` is not committed

## Health checks and smoke tests

Health endpoint:

```bash
curl http://127.0.0.1:3001/api/health
```

Expected response:

```json
{"ok":true,"authMode":"demo"}
```

Basic smoke test:

1. open the site
2. sign in with the demo form if Entra is off
3. verify `/dashboard`, `/jobs`, and `/history` load
4. if MySQL is enabled, run one collector and refresh the pages

## Repo cleanup already applied

Removed from the runtime path:

- legacy lockfile usage
- old package-manager commands in docs and container build
- shell wrapper collector scripts replaced by direct Bun entrypoints
- committed build output is no longer needed in git

## Troubleshooting

### App says frontend build not found

Run:

```bash
bun run build
```

### App starts but pages show fixture data

That is expected unless both are true:

- MySQL is reachable
- collector jobs have written real rows

### Entra login does not redirect back correctly

Usually one of these is wrong:

- `APP_BASE_URL`
- Entra redirect URI
- proxy headers

### Collector commands fail on the HPC side

Test them manually on the machine running the shell collectors:

```bash
qstat -g c
qstat -u '*'
qacct
```

Then fix `scripts/hpc/collector.env` and rerun the shell collectors.

### Site opens but still shows fixture data

That means the app could not read real rows from MySQL yet.
Check these first:

- `jobs_current` has rows
- `cluster_snapshots` has rows
- `jobs_history` has rows
- HPC-side cron actually ran
- the web VM can reach the MySQL server

### Nginx serves errors but Bun health is fine

Usually one of these is wrong:

- wrong `server_name`
- wrong TLS cert path
- nginx config still contains unrelated routes
- proxy target is not `127.0.0.1:3001`

## File map

```txt
src/
  client/
  server/
  shared/
scripts/
  fixtures/
  lib/
docs/
  adr/
  deploy/
drizzle/
```
