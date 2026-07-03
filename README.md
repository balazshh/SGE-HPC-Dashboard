# HPC Dashboard v2

Single-repo HPC dashboard: React SPA + Bun API server + optional MySQL persistence.

The app runs in two modes:

- **demo mode**: no Entra, no MySQL, fixture data only
- **production mode**: Entra auth enabled, collectors writing to MySQL, reverse proxy in front

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

| Variable | Required | Purpose |
| --- | --- | --- |
| `QSTAT_CLUSTER_COMMAND` | no | Real cluster summary command |
| `QSTAT_JOBS_COMMAND` | no | Real active jobs command |
| `QACCT_COMMAND` | no | Real accounting/history command |

If the HPC command variables are empty, the collectors use sample fixture files.

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

The web app itself can run without MySQL because reads fall back to mock data.
Real dashboards need the collectors plus `DB_WRITE=1`.

### Validate parsers

```bash
bun run check:parsers
```

### Collect live queue state

```bash
DB_WRITE=1 bun run collect:live
```

### Collect job history

```bash
DB_WRITE=1 bun run collect:history
```

### Build hourly and daily rollups

```bash
DB_WRITE=1 bun run collect:rollups
```

### Cleanup old data

```bash
DB_WRITE=1 bun run cleanup:data
```

Cron examples live in `docs/deploy/cron.md`.

## Production deployment

### 1. Build the app

```bash
bun install
bun run build
```

This creates `dist/`, which the Bun server serves directly.

### 2. Minimal single-host deployment

Copy the repo to the server, install deps, build, and run:

```bash
cp .env.example .env
bun install
bun run build
bun run start
```

For a real deployment, run it under `systemd` or in a container.

### 3. systemd example

Create `/etc/systemd/system/hpc-dashboard.service`:

```ini
[Unit]
Description=HPC Dashboard
After=network.target

[Service]
Type=simple
User=hpc-dashboard
WorkingDirectory=/opt/hpc-dashboard
Environment=NODE_ENV=production
EnvironmentFile=/opt/hpc-dashboard/.env
ExecStart=/usr/local/bin/bun src/server/index.ts
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now hpc-dashboard
sudo systemctl status hpc-dashboard
```

### 4. Nginx reverse proxy

Sample config: `docs/deploy/nginx.conf.sample`

Typical flow:

- Nginx listens on `80/443`
- Bun app listens on `127.0.0.1:3001`
- `APP_BASE_URL` matches the public HTTPS URL

### 5. Container deployment

A Bun-only container build is provided in `Containerfile`.

Build:

```bash
docker build -t hpc-dashboard -f Containerfile .
```

Run:

```bash
docker run --rm -p 3001:3001 --env-file .env hpc-dashboard
```

## Recommended production checklist

- [ ] `APP_BASE_URL` points to the final HTTPS URL
- [ ] `PORT` is set to the internal Bun port
- [ ] Entra secrets are present if SSO is required
- [ ] MySQL schema from `drizzle/0000_initial.sql` is applied
- [ ] `DB_WRITE=1` is set for collector jobs
- [ ] collector cron jobs are installed
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

### Collector commands fail on the server

Test them manually first:

```bash
qstat -g c
qstat -u '*'
qacct
```

Then export the matching env vars and rerun the Bun collector commands.

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
