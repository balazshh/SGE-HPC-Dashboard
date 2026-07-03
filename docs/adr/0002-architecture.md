# ADR 0002: Single-app architecture

- Status: accepted
- Date: 2026-07-03

## Context

The rewrite must be easier to deploy, understand, and maintain than the old application.

## Decision

Use one flat application repo instead of a workspace or monorepo.

Target shape:

```txt
src/
  client/
  server/
  shared/
scripts/
docs/
```

Architecture rules:

- no SSR
- no monorepo packages
- no generic repository/service/factory layers with one implementation
- keep page APIs small and page-oriented
- prefer direct, readable modules over framework games

Operational assumptions:

- one Docker host
- one MySQL server
- one HPC server
- Nginx in front
- limited outbound internet

## Consequences

- A new developer can follow the code without jumping across packages.
- Frontend and backend stay in one repo, but without workspace sprawl.
- Deployment stays compatible with a simple container + reverse proxy setup.
