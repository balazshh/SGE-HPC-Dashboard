#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
export QSTAT_CLUSTER_SAMPLE="${QSTAT_CLUSTER_SAMPLE:-$ROOT_DIR/scripts/fixtures/qstat-g-c.sample.txt}"
export QSTAT_JOBS_SAMPLE="${QSTAT_JOBS_SAMPLE:-$ROOT_DIR/scripts/fixtures/qstat-u-all.sample.txt}"

node --input-type=module <<'NODE'
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { buildLiveSnapshot, parseQstatClusterSummary, parseQstatJobs } from './scripts/lib/parse-live.mjs';
import { storeLiveSnapshot } from './scripts/lib/store.mjs';

const clusterText = process.env.QSTAT_CLUSTER_COMMAND
  ? execSync(process.env.QSTAT_CLUSTER_COMMAND, { encoding: 'utf8' })
  : fs.readFileSync(process.env.QSTAT_CLUSTER_SAMPLE, 'utf8');
const jobsText = process.env.QSTAT_JOBS_COMMAND
  ? execSync(process.env.QSTAT_JOBS_COMMAND, { encoding: 'utf8' })
  : fs.readFileSync(process.env.QSTAT_JOBS_SAMPLE, 'utf8');
const recordedAt = new Date().toISOString();
const summary = parseQstatClusterSummary(clusterText);
const jobs = parseQstatJobs(jobsText, recordedAt);
const snapshot = buildLiveSnapshot(summary, jobs);
await storeLiveSnapshot({ recordedAt, snapshot, jobs });
console.log(JSON.stringify({ recordedAt, snapshot, jobs }, null, 2));
NODE
