import { mapSgeState } from "./sge.mjs";
import { parseQstatDate } from "./time.mjs";

function parseClusterLine(line) {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 7) {
    throw new Error(`Bad qstat -g c line: ${line}`);
  }

  const [queueName, , used, , avail, total, aoACDS] = parts;
  return {
    queueName,
    usedSlots: Number(used),
    freeSlots: Number(avail),
    totalSlots: Number(total),
    offlineNodeCount: Number(aoACDS),
  };
}

export function parseQstatClusterSummary(text) {
  const dataLine = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("CLUSTER") && !line.startsWith("---"));

  if (!dataLine) {
    throw new Error("No cluster summary line found");
  }

  return parseClusterLine(dataLine);
}

export function parseQstatJobs(text, recordedAt = new Date().toISOString()) {
  const lines = text
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line && !line.startsWith("job-ID") && !line.startsWith("---"));

  return lines.map((line) => {
    const parts = line.trim().split(/\s+/);
    const [jobId, , name, owner, state, submittedDate, submittedTime] = parts;
    const slots = Number(parts.at(-1));
    const hasQueue = parts.length >= 9;
    const submittedAt = parseQstatDate(`${submittedDate} ${submittedTime}`);

    return {
      jobId,
      owner,
      name,
      stateRaw: state,
      stateGroup: mapSgeState(state),
      submittedAt,
      startedAt: state === "r" || state === "t" ? submittedAt : null,
      slots,
      lastSeenAt: recordedAt,
      hasQueue,
    };
  });
}

export function buildLiveSnapshot(clusterSummary, jobs) {
  const counts = {
    runningJobs: 0,
    queuedJobs: 0,
    failedJobs: 0,
    holdJobs: 0,
  };

  for (const job of jobs) {
    if (job.stateGroup === "running") counts.runningJobs += 1;
    if (job.stateGroup === "queued") counts.queuedJobs += 1;
    if (job.stateGroup === "error") counts.failedJobs += 1;
    if (job.stateGroup === "hold") counts.holdJobs += 1;
  }

  return {
    totalSlots: clusterSummary.totalSlots,
    usedSlots: clusterSummary.usedSlots,
    freeSlots: clusterSummary.freeSlots,
    offlineNodeCount: clusterSummary.offlineNodeCount,
    healthStatus: clusterSummary.offlineNodeCount > 0 ? "degraded" : "healthy",
    ...counts,
  };
}
