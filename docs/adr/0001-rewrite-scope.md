# ADR 0001: Rewrite scope

- Status: accepted
- Date: 2026-07-03

## Context

The old HPC dashboard grew into a harder-to-deploy and harder-to-maintain application than needed for normal authenticated HPC users.

## Decision

Build a new v2 as one boring application with these v1 goals:

- Entra login
- `/dashboard` with summary cards, health, freshness, and my active jobs preview
- `/jobs` with active jobs and 1-year personal history
- `/history` with personal historical trends

Explicit removals from v2:

- no SSH terminal
- no SSR
- no monorepo/workspaces
- no admin pages
- no top-user comparison views
- no deep per-node hardware dashboards
- no mobile-first optimization target for v1

## Consequences

- The product stays focused on normal users instead of platform breadth.
- Work is done page-by-page, not framework-first.
- Old code is reference material only, not an architectural template.
