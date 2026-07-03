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

- `scripts/hpc/collect-live.sh` reads `qstat` on the HPC side and loads MySQL
- `scripts/hpc/collect-history.sh` reads `qacct` on the HPC side and loads MySQL
- `scripts/hpc/aggregate-rollups.sh` builds hourly/daily rollups in MySQL
- `scripts/hpc/cleanup-old-data.sh` enforces retention

## Consequences

- Live freshness logic stays trustworthy.
- Historical imports can rerun without pretending to be live telemetry.
- User-facing time display remains consistent across DST changes.
