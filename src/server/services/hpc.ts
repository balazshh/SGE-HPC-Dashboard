import { and, desc, eq, gte, sql } from "drizzle-orm";

import type {
  Capacity,
  ClusterHistoryPoint,
  ClusterSummary,
  DashboardOperations,
  DashboardOverview,
  HistoryBucket,
  HistoryPreset,
  JobRecord,
  JobsFilterInput,
  NodeRecord,
  PaginatedJobs,
  SolverLoad,
} from "../../shared/types/hpc";
import { db } from "../db";
import {
  clusterSnapshots,
  jobsCurrent,
  jobsHistory,
  nodesCurrent,
  queuesCurrent,
} from "../db/schema/hpc";

function mapCurrentJob(job: typeof jobsCurrent.$inferSelect): JobRecord {
  return {
    jobId: job.jobId,
    name: job.name,
    state: job.stateGroup,
    submittedAt: job.submittedAt?.toISOString() ?? null,
    startedAt: job.startedAt?.toISOString(),
    slots: job.slots,
  };
}

export const KNOWN_SOLVERS = ["ANSYS Mechanical", "ANSYS Fluent", "ANSYS LS-DYNA", "ANSYS CFX", "ABAQUS", "COMSOL"] as const;

const SOLVER_PREFIXES: Array<[prefix: string, solver: string]> = [
  ["mechanical_", "ANSYS Mechanical"],
  ["fluent_", "ANSYS Fluent"],
  ["lsdyna_", "ANSYS LS-DYNA"],
  ["cfx_", "ANSYS CFX"],
  ["abaqus_", "ABAQUS"],
  ["comsol_", "COMSOL"],
];

export function classifySolver(jobName: string): string {
  const name = jobName.toLowerCase();
  const match = SOLVER_PREFIXES.find(([prefix]) => name.startsWith(prefix));
  return match ? match[1] : "Other";
}

export function aggregateSolverLoads(jobs: Array<{ name: string; state: string; slots: number }>): SolverLoad[] {
  const empty = { runningJobs: 0, runningSlots: 0, queuedJobs: 0, queuedSlots: 0 };
  const counts = new Map<string, typeof empty>();

  for (const job of jobs) {
    if (job.state !== "running" && job.state !== "queued") continue;
    const solver = classifySolver(job.name);
    const entry = counts.get(solver) ?? { ...empty };
    if (job.state === "running") {
      entry.runningJobs += 1;
      entry.runningSlots += job.slots;
    } else {
      entry.queuedJobs += 1;
      entry.queuedSlots += job.slots;
    }
    counts.set(solver, entry);
  }

  const loads: SolverLoad[] = KNOWN_SOLVERS.map((solver) => ({ solver, ...counts.get(solver) ?? { ...empty } }));
  const other = counts.get("Other");
  if (other) loads.push({ solver: "Other", ...other });
  return loads;
}

const EMPTY_CAPACITY: Capacity = {
  allocated: 0,
  available: 0,
  reserved: null,
  unavailable: 0,
  total: 0,
};

function mapOverviewSolverLoads(loads: SolverLoad[]) {
  return loads.map((load) => ({
    solver: load.solver,
    runningJobs: load.runningJobs,
    runningResources: load.runningSlots,
    pendingJobs: load.queuedJobs,
    pendingResources: load.queuedSlots,
  }));
}

export function capacityFromSlots(
  allocated: number,
  available: number,
  total: number,
  reserved: number | null = null,
): Capacity {
  const values = [allocated, available, total, reserved].filter((value): value is number => value !== null);
  if (values.some((value) => !Number.isInteger(value) || value < 0)) {
    throw new Error("Invalid capacity values");
  }

  const unavailable = total - allocated - available - (reserved ?? 0);
  if (unavailable < 0) throw new Error("Capacity values exceed total");

  return { allocated, available, reserved, unavailable, total };
}

function mapNode(node: typeof nodesCurrent.$inferSelect): NodeRecord {
  return {
    hostname: node.hostname,
    arch: node.arch,
    ncpu: node.ncpu,
    nsoc: node.nsoc,
    ncor: node.ncor,
    nthr: node.nthr,
    loadRaw: node.loadRaw,
    memtotRaw: node.memtotRaw,
    memuseRaw: node.memuseRaw,
    status: node.status,
    lastSeenAt: node.lastSeenAt.toISOString(),
  };
}

function mapHistoryJob(job: typeof jobsHistory.$inferSelect): JobRecord {
  return {
    jobId: job.jobId,
    name: job.name,
    state: job.stateFinal,
    submittedAt: job.submittedAt.toISOString(),
    startedAt: job.startedAt?.toISOString(),
    finishedAt: job.finishedAt.toISOString(),
  };
}

const presetDays = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "1y": 365,
} as const;

function sinceForPreset(preset: HistoryPreset, now = Date.now()) {
  return new Date(now - presetDays[preset] * 24 * 60 * 60 * 1000);
}

export function historyCutoff(preset: HistoryPreset, now = Date.now()) {
  const bucketMs = (preset === "24h" || preset === "7d" ? 60 * 60 : 24 * 60 * 60) * 1000;
  return new Date(Math.ceil(sinceForPreset(preset, now).getTime() / bucketMs) * bucketMs);
}

function matchesQuery(job: JobRecord, query?: string) {
  if (!query) return true;
  const normalized = query.trim().toLowerCase();
  return job.jobId.includes(normalized) || job.name.toLowerCase().includes(normalized);
}

export async function getDashboardSummary(owner: string): Promise<ClusterSummary> {
  const [[latest], myJobs] = await Promise.all([
    db
      .select()
      .from(clusterSnapshots)
      .orderBy(desc(clusterSnapshots.recordedAt), desc(clusterSnapshots.id))
      .limit(1),
    db
      .select()
      .from(jobsCurrent)
      .where(eq(jobsCurrent.owner, owner)),
  ]);

  if (!latest) {
    return {
      updatedAt: null,
      totalSlots: 0,
      usedSlots: 0,
      freeSlots: 0,
      runningJobs: 0,
      queuedJobs: 0,
      failedJobs: 0,
      holdJobs: 0,
      healthStatus: "down",
      offlineNodeCount: 0,
      myActiveJobsCount: myJobs.length,
    };
  }

  return {
    updatedAt: latest.recordedAt.toISOString(),
    totalSlots: latest.totalSlots,
    usedSlots: latest.usedSlots,
    freeSlots: latest.freeSlots,
    runningJobs: latest.runningJobs,
    queuedJobs: latest.queuedJobs,
    failedJobs: latest.failedJobs,
    holdJobs: latest.holdJobs,
    healthStatus: latest.healthStatus,
    offlineNodeCount: latest.offlineNodeCount,
    myActiveJobsCount: myJobs.length,
  };
}

export async function getClusterHistory(): Promise<ClusterHistoryPoint[]> {
  const bucket = sql<string>`DATE_FORMAT(DATE_SUB(${clusterSnapshots.recordedAt}, INTERVAL MOD(MINUTE(${clusterSnapshots.recordedAt}), 15) MINUTE), '%Y-%m-%dT%H:%i:00.000Z')`;

  return db
    .select({
      recordedAt: bucket,
      utilizationPercent: sql<number>`ROUND(AVG(CASE WHEN ${clusterSnapshots.totalSlots} > 0 THEN ${clusterSnapshots.usedSlots} * 100 / ${clusterSnapshots.totalSlots} ELSE 0 END))`.mapWith(Number),
      jobCount: sql<number>`ROUND(AVG(${clusterSnapshots.jobCount}))`.mapWith(Number),
    })
    .from(clusterSnapshots)
    .where(gte(clusterSnapshots.recordedAt, new Date(Date.now() - 24 * 60 * 60 * 1000)))
    .groupBy(bucket)
    .orderBy(bucket);
}

export async function getNodes() {
  const rows = await db
    .select()
    .from(nodesCurrent)
    .orderBy(nodesCurrent.hostname);

  return rows.map(mapNode);
}

export async function getActiveJobs(owner: string) {
  const rows = await db
    .select()
    .from(jobsCurrent)
    .where(eq(jobsCurrent.owner, owner))
    .orderBy(desc(jobsCurrent.submittedAt));

  return rows.map(mapCurrentJob);
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  return db.transaction(async (tx) => {
    const [latest] = await tx
      .select()
      .from(clusterSnapshots)
      .orderBy(desc(clusterSnapshots.recordedAt), desc(clusterSnapshots.id))
      .limit(1);
    const queues = await tx.select().from(queuesCurrent).orderBy(queuesCurrent.queueName);
    const jobs = await tx.select().from(jobsCurrent);
    const solverLoads = aggregateSolverLoads(
      jobs.map((job) => ({ name: job.name, state: job.stateGroup, slots: job.slots })),
    );

    if (!latest) {
      return {
        snapshotId: null,
        snapshotAt: null,
        scheduler: "sge",
        resourceUnit: "scheduler-slot",
        sourceStatus: "no-data",
        capacity: { ...EMPTY_CAPACITY },
        jobs: {
          running: 0,
          pending: 0,
          held: 0,
          activeErrors: 0,
          pendingResources: 0,
          oldestPendingAt: null,
        },
        unavailableNodeCount: 0,
        queues: [],
        solverLoads: mapOverviewSolverLoads(solverLoads),
      };
    }

    const queued = jobs.filter((job) => job.stateGroup === "queued");
    const queuedWithSubmission = queued.filter((job) => job.submittedAt !== null);
    const oldestPendingAt = queuedWithSubmission.length
      ? queuedWithSubmission
          .map((job) => job.submittedAt as Date)
          .reduce((oldest, value) => (value < oldest ? value : oldest))
          .toISOString()
      : null;

    return {
      snapshotId: latest.id,
      snapshotAt: latest.recordedAt.toISOString(),
      scheduler: "sge",
      resourceUnit: "scheduler-slot",
      sourceStatus: latest.healthStatus,
      capacity: capacityFromSlots(latest.usedSlots, latest.freeSlots, latest.totalSlots, latest.reservedSlots),
      jobs: {
        running: jobs.filter((job) => job.stateGroup === "running").length,
        pending: queued.length,
        held: jobs.filter((job) => job.stateGroup === "hold").length,
        activeErrors: jobs.filter((job) => job.stateGroup === "error").length,
        pendingResources: queued.reduce((sum, job) => sum + job.slots, 0),
        oldestPendingAt,
      },
      unavailableNodeCount: latest.offlineNodeCount,
      queues: queues.map((queue) => ({
        name: queue.queueName,
        kind: "queue" as const,
        state: queue.state,
        ...capacityFromSlots(queue.usedSlots, queue.freeSlots, queue.totalSlots, queue.reservedSlots),
      })),
      solverLoads: mapOverviewSolverLoads(solverLoads),
    };
  });
}

export async function getDashboardOperations(): Promise<DashboardOperations> {
  const [queues, jobs] = await Promise.all([
    db.select().from(queuesCurrent).orderBy(queuesCurrent.queueName),
    db.select().from(jobsCurrent),
  ]);

  const queued = jobs.filter((job) => job.stateGroup === "queued");
  const queuedWithSubmission = queued.filter((job) => job.submittedAt !== null);
  const oldestQueuedAt = queuedWithSubmission.length
    ? queuedWithSubmission
        .map((job) => job.submittedAt as Date)
        .reduce((oldest, value) => (value < oldest ? value : oldest))
        .toISOString()
    : null;

  return {
    queues: queues.map((queue) => ({
      queueName: queue.queueName,
      usedSlots: queue.usedSlots,
      reservedSlots: queue.reservedSlots,
      freeSlots: queue.freeSlots,
      totalSlots: queue.totalSlots,
    })),
    queuePressure: {
      queuedJobs: queued.length,
      queuedSlots: queued.reduce((sum, job) => sum + job.slots, 0),
      oldestQueuedAt,
    },
    solverLoads: aggregateSolverLoads(
      jobs.map((job) => ({ name: job.name, state: job.stateGroup, slots: job.slots }))
    ),
  };
}

export async function getJobHistory(owner: string, input: JobsFilterInput = {}): Promise<PaginatedJobs> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, input.pageSize ?? 10));
  const state = input.state ?? "all";
  const preset = input.preset ?? "30d";
  const since = sinceForPreset(preset);

  const rows = await db
    .select()
    .from(jobsHistory)
    .where(and(eq(jobsHistory.owner, owner), gte(jobsHistory.finishedAt, since)))
    .orderBy(desc(jobsHistory.finishedAt));

  const items = rows.map(mapHistoryJob);

  const filtered = items.filter((job) =>
    (state === "all" || job.state === state) && matchesQuery(job, input.query)
  );

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export async function getHistory(owner: string, preset: HistoryPreset): Promise<HistoryBucket[]> {
  const bucket = preset === "24h" || preset === "7d"
    ? sql<string>`DATE_FORMAT(${jobsHistory.finishedAt}, '%Y-%m-%dT%H:00:00.000Z')`
    : sql<string>`DATE_FORMAT(${jobsHistory.finishedAt}, '%Y-%m-%dT00:00:00.000Z')`;

  return db
    .select({
      bucketStart: bucket,
      submittedCount: sql<number>`COUNT(*)`.mapWith(Number),
      startedCount: sql<number>`SUM(${jobsHistory.startedAt} IS NOT NULL)`.mapWith(Number),
      finishedCount: sql<number>`SUM(${jobsHistory.stateFinal} = 'finished')`.mapWith(Number),
      failedCount: sql<number>`SUM(${jobsHistory.stateFinal} = 'error')`.mapWith(Number),
    })
    .from(jobsHistory)
    .where(and(eq(jobsHistory.owner, owner), gte(jobsHistory.finishedAt, historyCutoff(preset))))
    .groupBy(bucket)
    .orderBy(bucket);
}
