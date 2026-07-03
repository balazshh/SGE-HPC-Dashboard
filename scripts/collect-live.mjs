import fs from "node:fs";
import { execSync } from "node:child_process";

import { buildLiveSnapshot, parseQstatClusterSummary, parseQstatJobs } from "./lib/parse-live.mjs";
import { storeLiveSnapshot } from "./lib/store.mjs";

const clusterSamplePath = process.env.QSTAT_CLUSTER_SAMPLE ?? new URL("./fixtures/qstat-g-c.sample.txt", import.meta.url);
const jobsSamplePath = process.env.QSTAT_JOBS_SAMPLE ?? new URL("./fixtures/qstat-u-all.sample.txt", import.meta.url);

const clusterText = process.env.QSTAT_CLUSTER_COMMAND
  ? execSync(process.env.QSTAT_CLUSTER_COMMAND, { encoding: "utf8" })
  : fs.readFileSync(clusterSamplePath, "utf8");
const jobsText = process.env.QSTAT_JOBS_COMMAND
  ? execSync(process.env.QSTAT_JOBS_COMMAND, { encoding: "utf8" })
  : fs.readFileSync(jobsSamplePath, "utf8");
const recordedAt = new Date().toISOString();
const summary = parseQstatClusterSummary(clusterText);
const jobs = parseQstatJobs(jobsText, recordedAt);
const snapshot = buildLiveSnapshot(summary, jobs);

await storeLiveSnapshot({ recordedAt, snapshot, jobs });
console.log(JSON.stringify({ recordedAt, snapshot, jobs }, null, 2));
