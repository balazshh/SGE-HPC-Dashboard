# HPC Dashboard v2

Single-app rewrite of the HPC dashboard from `agent-build-plan.md`.

## What is included

- Bosch-branded SPA
- `/dashboard`
- `/jobs`
- `/history`
- Bun API server
- tRPC routers for auth, dashboard, jobs, history
- demo auth fallback for local use
- Microsoft Entra / Better Auth wiring when env is configured
- Drizzle schema and initial SQL
- collector scripts for live data, history, rollups, cleanup
- health endpoint: `/api/health`

## Local run

Terminal 1:

```bash
npm install
cp .env.example .env
npm run dev:server
```

Terminal 2:

```bash
npm run dev
```

Open `http://localhost:5173`.

If Entra is not configured, use the demo sign-in form.

## Production run

```bash
npm install
cp .env.example .env
npm run build
npm run start
```

The Bun server serves `dist/` after the build.

## Environment

See `.env.example`.

Important values:

- `APP_BASE_URL` — public app URL
- `PORT` — Bun server port, default `3001`
- `BETTER_AUTH_SECRET` — required for Entra auth
- `ENTRA_CLIENT_ID`
- `ENTRA_CLIENT_SECRET`
- `ENTRA_TENANT_ID`
- `DB_*` — MySQL connection settings

Redirect URI for Entra:

```txt
https://<domain>/api/auth/oauth2/callback/microsoft-entra-id
```

## Collectors

Default behavior uses fixture files so the app works locally.

To use real cluster commands, set env vars before running the scripts:

- `QSTAT_CLUSTER_COMMAND="qstat -g c"`
- `QSTAT_JOBS_COMMAND="qstat -u '*'"`
- `QACCT_COMMAND="qacct"`

To write parsed data into MySQL, also set:

```bash
DB_WRITE=1
```

Useful commands:

```bash
npm run check:parsers
./scripts/collect-live.sh
./scripts/collect-history.sh
./scripts/aggregate-rollups.sh
./scripts/cleanup-old-data.sh
```

## Deployment notes

- Container image: `Containerfile`
- Nginx sample: `docs/deploy/nginx.conf.sample`
- Cron examples: `docs/deploy/cron.md`
