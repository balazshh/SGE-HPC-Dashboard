# Agent Build Plan — HPC Dashboard Rewrite

## 1. Mission

Rebuild the old HPC dashboard from scratch as a simpler, maintainable v2 using the same general stack family, but removing unnecessary complexity.

### Old app reference
Use `../HPC-Dashboard/hpc-dashboard-test-main_old` only as a reference for:
- domain understanding
- existing collectors/scripts
- auth/provider details
- labels/i18n content
- existing SQL/schema ideas

Do **not** copy its architecture blindly.

## 2. Locked product decisions

These are already decided. Do not re-debate them.

### Audience
- Normal authenticated HPC users only

### Core goals
1. Simpler codebase
2. Easier deployment
3. Easier maintenance

### Required v1 features
1. Entra login
2. Dashboard cards + stale-data banner
3. My Jobs page with:
   - active jobs
   - 1-year personal job history
4. My History page

### Pages
- `/dashboard`
- `/jobs`
- `/history`

### Removed from v2
- SSH terminal
- SSR
- monorepo/workspaces
- top users view
- per-node deep metrics
- admin pages
- mobile optimization as a v1 target

### Data rules
- Active/live state comes from **`qstat`**
- Historical finished job data comes from **`qacct`**
- Store timestamps in **UTC**
- Display in **Europe/Budapest**
- HPC username mapping = **lowercase email local-part**
- No task arrays to model; **job ID only**
- Anonymous cluster stats are allowed, but no per-user comparisons

### Freshness thresholds
- warn after **5 min**
- stale after **15 min**
- broken after **60 min**

## 3. Target architecture

Build one boring app, not a platform.

### Frontend
- React
- Vite SPA
- TanStack Router
- TanStack Query
- Tailwind
- shadcn/ui
- Recharts
- i18n

### Backend
- Bun runtime
- tRPC
- Better Auth
- Drizzle
- MySQL

### Infra assumptions
- one Docker host
- one MySQL server
- one HPC server
- Nginx in front
- no Kubernetes
- limited outbound internet
- build may require proxy args

## 4. Product behavior to implement

### 4.1 Dashboard
Show:
- stale-data banner
- cluster utilization
- total running jobs
- total queued jobs
- total failed jobs
- total jobs on hold
- cluster health summary: `healthy | degraded | down`
- small “my active jobs” preview

#### Cluster health rules
- `healthy`: scheduler reachable, no offline-node issue
- `degraded`: some nodes offline
- `down`: whole cluster unavailable / scheduler query failed

### 4.2 Jobs page
Two sections:
1. **Active jobs**
2. **Past jobs / 1-year personal history**

#### Job fields
Keep only:
- job ID
- name
- state
- submitted at
- started at
- finished at

#### Filtering
Implement simple, useful filtering:
- search
- state filter
- date filter / preset
- pagination

Do **not** build a giant enterprise data grid.

### 4.3 History page
“My history” only.

Use:
- hourly buckets for short-range
- daily buckets for long-range

#### Presets
- 24h
- 7d
- 30d
- 1y

#### History content
“Detailed job history” should be interpreted as personal historical trends, not cluster-wide user comparisons.

## 5. Domain model the agent should use

Normalize raw scheduler state once. UI should not deal in raw SGE soup everywhere.

### Canonical job states
- queued
- running
- hold
- suspended
- error
- finished
- deleted

### Map raw SGE states into canonical groups
At minimum:
- `running`: `r`, `t`, `Rr`, `Rt`
- `queued`: `qw`
- `hold`: `hqw`, `hRwq`
- `suspended`: `s`, `ts`, `S`, `tS`, `T`, `tT`, `Rs`, `Rts`, `RS`, `RtS`, `RT`, `RtT`
- `error`: `Eqw`, `Ehqw`, `EhRqw`
- `deleted`: `dr`, `dt`, `dRr`, `dRt`, `ds`, `dS`, `dT`, `dRs`, `dRS`, `dRT`

For v1:
- “failed” cluster metric should come from the explicit scheduler error/failure interpretation used by the collector
- “hold” should come from hold states only

## 6. Repo shape to build

The new repo should be a single app, not `apps/*` + `packages/*`.

Recommended shape:

```txt
src/
  client/
    app/
    components/
    pages/
    hooks/
    lib/
    i18n/
  server/
    auth/
    db/
      schema/
    trpc/
      routers/
    services/
    lib/
  shared/
    types/
    constants/
    utils/
scripts/
drizzle/
docs/
package.json
tsconfig.json
vite.config.ts
```

Keep it flat and readable.

## 7. Data model to implement

The agent should create a minimal schema that matches the actual product.

### Required tables

#### `cluster_snapshots`
Purpose: current cluster-level snapshot every minute.

Suggested columns:
- `id`
- `recorded_at`
- `total_slots`
- `used_slots`
- `free_slots`
- `running_jobs`
- `queued_jobs`
- `failed_jobs`
- `hold_jobs`
- `health_status`
- `offline_node_count`

#### `jobs_current`
Purpose: current active jobs from `qstat`.

Suggested columns:
- `id`
- `job_id`
- `owner`
- `name`
- `state_raw`
- `state_group`
- `submitted_at`
- `started_at`
- `slots`
- `last_seen_at`

#### `jobs_history`
Purpose: completed/historical jobs from `qacct`.

Suggested columns:
- `id`
- `job_id`
- `owner`
- `name`
- `state_final`
- `submitted_at`
- `started_at`
- `finished_at`
- `slots`
- `queue`
- optional accounting metadata if reliable

#### `user_job_hourly`
Purpose: short-range history charts.

Suggested columns:
- `id`
- `owner`
- `bucket_start`
- `submitted_count`
- `started_count`
- `finished_count`
- `failed_count`

#### `user_job_daily`
Purpose: long-range history charts.

Suggested columns:
- `id`
- `owner`
- `bucket_date`
- `submitted_count`
- `started_count`
- `finished_count`
- `failed_count`

#### auth tables
Whatever Better Auth requires.

## 8. API surface to implement

Keep the API small and page-oriented.

### `auth`
- Better Auth routes only

### `dashboard`
- `getSummary`
- `getFreshness`
- `getMyActiveJobsPreview`

### `jobs`
- `getActiveJobs`
- `getJobHistory`
- accepts filters:
  - query
  - state
  - range/preset
  - page
  - pageSize

### `history`
- `getMyHistory`
- input:
  - preset: `24h | 7d | 30d | 1y`

No speculative APIs.

## 9. Collector boundaries to implement

The agent should not try to fake everything inside the web app.

### Live collector
Create `scripts/collect-live.sh`

#### Inputs
- `qstat -g c`
- `qstat -u '*'`
- minimal cluster/node health source

#### Outputs
- `cluster_snapshots`
- refresh `jobs_current`

#### Frequency
- every 1 minute

### History collector
Create `scripts/collect-history.sh`

#### Inputs
- `qacct`

#### Outputs
- `jobs_history`

#### Frequency
- every 5–15 minutes

### Rollup job
Create `scripts/aggregate-rollups.sh`

#### Inputs
- `jobs_history`

#### Outputs
- `user_job_hourly`
- `user_job_daily`

### Cleanup job
Create `scripts/cleanup-old-data.sh`

Retention suggestion:
- `cluster_snapshots`: 30–90 days
- `jobs_current`: active only / aggressively refreshed
- `jobs_history`: 1 year
- rollups: at least 1 year

## 10. Work order for the agent

Build in this order. Do not jump ahead.

### Phase 0 — Write the baseline docs

#### Goal
Create a lightweight spec inside the repo so future work has guardrails.

#### Tasks
- Create `docs/adr/0001-rewrite-scope.md`
- Create `docs/adr/0002-architecture.md`
- Create `docs/adr/0003-data-sources.md`

#### Must document
- no SSR
- no monorepo
- no SSH terminal
- qstat vs qacct boundary
- UTC storage / Budapest display
- email-local-part username mapping

#### Done when
- another developer can understand v2 without reading chat history

### Phase 1 — Scaffold the new app

#### Goal
Set up the new single-app codebase.

#### Tasks
- Initialize package.json for one app
- Install chosen stack pieces
- Set up Vite
- Set up React app shell
- Set up TanStack Router
- Set up TanStack Query
- Set up Tailwind + shadcn/ui
- Set up Better Auth
- Set up Drizzle
- Set up tRPC
- Set up i18n
- Add env validation

#### Deliverables
- login-capable shell app
- basic layout with nav
- working auth/session wiring
- clean folder structure

#### Done when
- app boots locally
- auth route wiring exists
- protected route pattern is in place

### Phase 2 — Implement DB schema and DB plumbing

#### Goal
Create the real schema early so collectors and pages can target it.

#### Tasks
- Add Drizzle schema files
- Add migration generation
- Add DB connection module
- Add indexes for:
  - owner
  - recorded_at
  - job_id
  - history time buckets
- Add seed/dev helper only if truly useful

#### Deliverables
- schema files
- migrations
- DB access layer

#### Done when
- fresh DB can be migrated from zero
- app starts cleanly against DB

### Phase 3 — Implement collectors first

#### Goal
Get real data flowing before polishing the UI.

#### Tasks
##### 3.1 Live collector
- Parse `qstat -g c`
- Parse `qstat -u '*'`
- Compute dashboard counts
- Compute cluster health
- Upsert/replace `jobs_current`
- Insert `cluster_snapshots`

##### 3.2 History collector
- Parse `qacct`
- Normalize completed job records
- Insert into `jobs_history`
- Prevent duplicate re-imports

##### 3.3 Rollup job
- Build hourly and daily aggregates from `jobs_history`

#### Important
Agent should create small fixture samples from real command outputs for local parsing tests:
- sample `qstat -g c`
- sample `qstat -u '*'`
- sample `qacct`

#### Deliverables
- `scripts/collect-live.sh`
- `scripts/collect-history.sh`
- `scripts/aggregate-rollups.sh`
- `scripts/cleanup-old-data.sh`

#### Done when
- DB fills with plausible live and historical data
- collector logs are readable
- no duplicate history rows on rerun

### Phase 4 — Build dashboard end to end

#### Goal
Ship the first useful page.

#### Tasks
- Implement `dashboard` tRPC router
- Add freshness service
- Add stale banner logic
- Add summary cards
- Add health summary
- Add “my active jobs” preview

#### UX rules
- Show last updated timestamp
- Show warning/stale/broken clearly
- Do not silently hide stale data

#### Deliverables
- `/dashboard`

#### Done when
- logged-in user sees real cluster summary
- stale thresholds work visually

### Phase 5 — Build Jobs page

#### Goal
Deliver the most important user-facing page.

#### Tasks
- Implement `jobs.getActiveJobs`
- Implement `jobs.getJobHistory`
- Add UI sections:
  - active jobs
  - past jobs
- Add filters:
  - search
  - state
  - preset/date filter
  - pagination

#### Important
Keep active and historical jobs clearly separated in the UI and code.

#### Deliverables
- `/jobs`

#### Done when
- user can view current jobs
- user can search/filter 1-year personal history

### Phase 6 — Build My History page

#### Goal
Provide personal historical trends, not cluster voyeurism.

#### Tasks
- Implement `history.getMyHistory`
- Add presets:
  - 24h
  - 7d
  - 30d
  - 1y
- Use:
  - hourly buckets for short windows
  - daily buckets for long windows
- Create simple charts only

#### Deliverables
- `/history`

#### Done when
- user can switch presets and see their own historical trends
- charts load fast and read clearly

### Phase 7 — Polish and simplify

#### Goal
Tighten the app without expanding scope.

#### Tasks
- Add empty states
- Add error states
- Improve translations
- Make terminology consistent
- Remove dead code
- Remove speculative abstractions
- Add minimal loading states
- Confirm accessibility basics

#### Deliverables
- cleaner UI
- less code
- no leftover terminal/SSR assumptions

#### Done when
- codebase feels boring and readable
- no feature creep landed

### Phase 8 — Production-readiness pass

#### Goal
Make the build easy to run and hand off.

#### Tasks
- Add `Containerfile` / Dockerfile
- Add `.env.example`
- Add startup docs
- Add Nginx sample config
- Add health endpoints if needed
- Add cron setup docs for collectors
- Add migration instructions
- Add backup/retention notes

#### Deliverables
- `README.md`
- deploy docs
- cron docs
- env docs

#### Done when
- someone else can deploy it without reverse-engineering the repo

## 11. Acceptance criteria for the whole project

The agent is done when all of these are true:
- One-app repo, no workspace sprawl
- Entra login works
- Dashboard works with real collector data
- Jobs page shows active + 1-year personal history
- History page works with presets
- No SSH/terminal code exists
- No SSR/TanStack Start asset-copy complexity exists
- Collectors are split correctly:
  - `qstat` for live
  - `qacct` for history
- Times are stored in UTC and displayed in Europe/Budapest
- Freshness logic matches:
  - 5 warn
  - 15 stale
  - 60 broken
- Code is documented enough to maintain

## 12. Explicit non-goals

The agent should reject or defer these unless explicitly asked:
- rebuilding terminal support
- adding admin dashboards
- reintroducing monorepo packages
- adding SSR
- exposing per-user aggregate comparisons
- deep per-node hardware dashboards
- speculative plugin systems
- generic repository/service/factory abstractions with one implementation

## 13. Guidance for the agent’s coding style

Tell the agent this explicitly:
- Prefer boring folders over architecture games
- Reuse the old app only for domain clues, not design
- Keep the number of files and abstractions low
- Build page-by-page, not framework-first
- Add only the minimum DB tables needed
- Write one small parsing check per non-trivial collector
- Favor deletion over compatibility shims

## 14. Best next command for the agent

Start with:
1. write the ADRs
2. scaffold the single-app repo
3. create the Drizzle schema
4. implement collectors before polishing UI
