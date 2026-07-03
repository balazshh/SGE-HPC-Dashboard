import { floorUtcDay, floorUtcHour, parseQacctDate } from "./time.mjs";

function parseRecord(block) {
  const fields = Object.fromEntries(
    block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [key, ...rest] = line.split(/\s+/);
        return [key, rest.join(" ")];
      }),
  );

  const failed = Number(fields.failed ?? 0);
  const exitStatus = Number(fields.exit_status ?? 0);
  const stateFinal = failed > 0 || exitStatus > 0 ? "error" : "finished";

  return {
    jobId: fields.jobnumber,
    owner: fields.owner,
    name: fields.jobname,
    stateFinal,
    submittedAt: parseQacctDate(fields.qsub_time),
    startedAt: fields.start_time ? parseQacctDate(fields.start_time) : null,
    finishedAt: parseQacctDate(fields.end_time),
    slots: Number(fields.slots ?? 1),
    queue: fields.qname ?? null,
  };
}

export function parseQacct(text) {
  return text
    .split(/^=+$/m)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(parseRecord);
}

export function aggregateHourly(records) {
  const buckets = new Map();

  for (const record of records) {
    const key = `${record.owner}:${floorUtcHour(record.finishedAt)}`;
    const bucket = buckets.get(key) ?? {
      owner: record.owner,
      bucketStart: floorUtcHour(record.finishedAt),
      submittedCount: 0,
      startedCount: 0,
      finishedCount: 0,
      failedCount: 0,
    };

    bucket.submittedCount += 1;
    if (record.startedAt) bucket.startedCount += 1;
    if (record.stateFinal === "finished") bucket.finishedCount += 1;
    if (record.stateFinal === "error") bucket.failedCount += 1;
    buckets.set(key, bucket);
  }

  return [...buckets.values()];
}

export function aggregateDaily(records) {
  const buckets = new Map();

  for (const record of records) {
    const key = `${record.owner}:${floorUtcDay(record.finishedAt)}`;
    const bucket = buckets.get(key) ?? {
      owner: record.owner,
      bucketDate: floorUtcDay(record.finishedAt),
      submittedCount: 0,
      startedCount: 0,
      finishedCount: 0,
      failedCount: 0,
    };

    bucket.submittedCount += 1;
    if (record.startedAt) bucket.startedCount += 1;
    if (record.stateFinal === "finished") bucket.finishedCount += 1;
    if (record.stateFinal === "error") bucket.failedCount += 1;
    buckets.set(key, bucket);
  }

  return [...buckets.values()];
}
