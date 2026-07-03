import assert from "node:assert/strict";
import fs from "node:fs";

import { aggregateDaily, aggregateHourly, parseQacct } from "./lib/parse-history.mjs";
import { buildLiveSnapshot, parseQstatClusterSummary, parseQstatJobs } from "./lib/parse-live.mjs";
import { mapSgeState, normalizeHpcUsername } from "./lib/sge.mjs";

const qstatCluster = fs.readFileSync(new URL("./fixtures/qstat-g-c.sample.txt", import.meta.url), "utf8");
const qstatJobs = fs.readFileSync(new URL("./fixtures/qstat-u-all.sample.txt", import.meta.url), "utf8");
const qacct = fs.readFileSync(new URL("./fixtures/qacct.sample.txt", import.meta.url), "utf8");

const clusterSummary = parseQstatClusterSummary(qstatCluster);
assert.equal(clusterSummary.totalSlots, 2048);
assert.equal(clusterSummary.usedSlots, 1536);
assert.equal(clusterSummary.offlineNodeCount, 2);

const liveJobs = parseQstatJobs(qstatJobs, "2026-07-03T08:14:00Z");
assert.equal(liveJobs.length, 5);
assert.equal(liveJobs[0].stateGroup, "running");
assert.equal(liveJobs[2].stateGroup, "queued");
assert.equal(liveJobs[3].stateGroup, "error");
assert.equal(liveJobs[4].stateGroup, "hold");

const snapshot = buildLiveSnapshot(clusterSummary, liveJobs);
assert.deepEqual(
  {
    runningJobs: snapshot.runningJobs,
    queuedJobs: snapshot.queuedJobs,
    failedJobs: snapshot.failedJobs,
    holdJobs: snapshot.holdJobs,
    healthStatus: snapshot.healthStatus,
  },
  {
    runningJobs: 2,
    queuedJobs: 1,
    failedJobs: 1,
    holdJobs: 1,
    healthStatus: "degraded",
  },
);

const history = parseQacct(qacct);
assert.equal(history.length, 2);
assert.equal(history[0].stateFinal, "finished");
assert.equal(history[1].stateFinal, "error");

const hourly = aggregateHourly(history);
const daily = aggregateDaily(history);
assert.equal(hourly.length, 2);
assert.equal(daily.length, 2);
assert.equal(normalizeHpcUsername("Jane.Doe@bosch.com"), "jane.doe");
assert.equal(mapSgeState("Eqw"), "error");

console.log("parser checks passed");
