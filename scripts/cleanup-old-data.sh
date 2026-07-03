#!/usr/bin/env bash
set -euo pipefail

node --input-type=module <<'NODE'
import { cleanupOldData, shouldWriteDb } from './scripts/lib/store.mjs';

if (shouldWriteDb()) {
  await cleanupOldData();
  console.log('cleanup complete');
} else {
  console.log('cleanup plan');
  console.log('- cluster_snapshots: keep 90 days');
  console.log('- jobs_current: delete rows not seen in current refresh');
  console.log('- jobs_history: keep 365 days');
  console.log('- user_job_hourly/user_job_daily: keep at least 365 days');
}
NODE
