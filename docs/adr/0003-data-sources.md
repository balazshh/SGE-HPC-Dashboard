# ADR 0003: Scheduler data boundaries and time handling

- Status: accepted
- Date: 2026-07-03

## Context

The old system mixed concerns between live scheduler state, historical accounting, and user-facing time display.

## Decision

Use strict source boundaries:

- `qstat` is the source of live state
- `qacct` is the source of historical finished job data

Data handling rules:

- store timestamps in UTC
- display timestamps in `Europe/Budapest`
- map HPC usernames from the lowercase email local-part
- normalize raw SGE states into canonical UI states

Collector split:

- `scripts/collect-live.mjs` reads `qstat`
- `scripts/collect-history.mjs` reads `qacct`
- `scripts/aggregate-rollups.mjs` builds hourly/daily rollups from history
- `scripts/cleanup-old-data.mjs` enforces retention

## Consequences

- Live freshness logic stays trustworthy.
- Historical imports can rerun without pretending to be live telemetry.
- User-facing time display remains consistent across DST changes.
