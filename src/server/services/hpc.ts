import { and, desc, eq, gte } from "drizzle-orm";

import {
  ACTIVE_JOBS,
  DASHBOARD_SUMMARY,
  HISTORY_BY_PRESET,
  JOB_HISTORY,
} from "../../shared/constants/mock-data";
import type {
  ClusterSummary,
  HistoryBucket,
  HistoryPreset,
  JobRecord,
  JobsFilterInput,
  PaginatedJobs,
} from "../../shared/types/hpc";
import { createDb } from "../db";
import {
  clusterSnapshots,
  jobsCurrent,
  jobsHistory,
  userJobDaily,
  userJobHourly,
} from "../db/schema";

function mapCurrentJob(job: typeof jobsCurrent.$inferSelect): JobRecord {
  return {
    jobId: job.jobId,
    owner: job.owner,
    name: job.name,
    state: job.stateGroup,
    submittedAt: job.submittedAt.toISOString(),
    startedAt: job.startedAt?.toISOString(),
  };
}

function mapHistoryJob(job: typeof jobsHistory.$inferSelect): JobRecord {
  return {
    jobId: job.jobId,
    owner: job.owner,
    name: job.name,
    state: job.stateFinal,
    submittedAt: job.submittedAt.toISOString(),
    startedAt: job.startedAt?.toISOString(),
    finishedAt: job.finishedAt.toISOString(),
  };
}

function presetDays(preset: Exclude<HistoryPreset, "24h">) {
  if (preset === "7d") return 7;
  if (preset === "30d") return 30;
  return 365;
}

function sinceForPreset(preset: HistoryPreset) {
  const now = Date.now();
  if (preset === "24h") return new Date(now - 24 * 60 * 60 * 1000);
  if (preset === "7d") return new Date(now - 7 * 24 * 60 * 60 * 1000);
  if (preset === "30d") return new Date(now - 30 * 24 * 60 * 60 * 1000);
  return new Date(now - 365 * 24 * 60 * 60 * 1000);
}

function matchesQuery(job: JobRecord, query?: string) {
  if (!query) return true;
  const normalized = query.trim().toLowerCase();
  return job.jobId.includes(normalized) || job.name.toLowerCase().includes(normalized);
}

function formatHourlyLabel(value: Date, preset: HistoryPreset) {
  return new Intl.DateTimeFormat("en-GB", {
    month: preset === "24h" ? undefined : "short",
    day: preset === "24h" ? undefined : "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Budapest",
  }).format(value);
}

function formatDailyLabel(value: Date, preset: HistoryPreset) {
  return new Intl.DateTimeFormat("en-GB", {
    month: preset === "1y" ? "short" : "short",
    day: preset === "1y" ? undefined : "2-digit",
    timeZone: "Europe/Budapest",
  }).format(value);
}

async function withDbFallback<T>(query: () => Promise<T>, fallback: () => T | Promise<T>) {
  try {
    return await query();
  } catch {
    return fallback();
  }
}

export async function getDashboardSummary(owner: string): Promise<ClusterSummary> {
  return withDbFallback(async () => {
    const db = createDb();
    const [latest] = await db
      .select()
      .from(clusterSnapshots)
      .orderBy(desc(clusterSnapshots.recordedAt))
      .limit(1);

    if (!latest) {
      throw new Error("No cluster snapshot rows");
    }

    const myJobs = await db
      .select()
      .from(jobsCurrent)
      .where(eq(jobsCurrent.owner, owner));

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
  }, async () => {
    const myActiveJobs = await getActiveJobs(owner);
    return {
      ...DASHBOARD_SUMMARY,
      myActiveJobsCount: myActiveJobs.length,
    };
  });
}

export async function getActiveJobs(owner: string) {
  return withDbFallback(async () => {
    const db = createDb();
    const rows = await db
      .select()
      .from(jobsCurrent)
      .where(eq(jobsCurrent.owner, owner))
      .orderBy(desc(jobsCurrent.submittedAt));

    return rows.map(mapCurrentJob);
  }, () => ACTIVE_JOBS.filter((job) => job.owner === owner));
}

export async function getActiveJobsPreview(owner: string) {
  const jobs = await getActiveJobs(owner);
  return jobs.slice(0, 5);
}

export async function getJobHistory(owner: string, input: JobsFilterInput = {}): Promise<PaginatedJobs> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, input.pageSize ?? 10));
  const state = input.state ?? "all";
  const preset = input.preset ?? "30d";
  const since = new Date(Date.now() - presetDays(preset) * 24 * 60 * 60 * 1000);

  const items = await withDbFallback(async () => {
    const db = createDb();
    const rows = await db
      .select()
      .from(jobsHistory)
      .where(and(eq(jobsHistory.owner, owner), gte(jobsHistory.finishedAt, since)))
      .orderBy(desc(jobsHistory.finishedAt));

    return rows.map(mapHistoryJob);
  }, () => JOB_HISTORY.filter((job) => job.owner === owner));

  const filtered = items.filter((job) => {
    const finishedDate = new Date(job.finishedAt ?? job.submittedAt);
    const matchesState = state === "all" || job.state === state;
    const matchesPreset = finishedDate >= since;
    return matchesState && matchesPreset && matchesQuery(job, input.query);
  });

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
  return withDbFallback(async () => {
    const db = createDb();
    const since = sinceForPreset(preset);

    if (preset === "24h" || preset === "7d") {
      const rows = await db
        .select()
        .from(userJobHourly)
        .where(and(eq(userJobHourly.owner, owner), gte(userJobHourly.bucketStart, since)))
        .orderBy(userJobHourly.bucketStart);

      if (!rows.length) throw new Error("No hourly rollups");

      return rows.map((row) => ({
        label: formatHourlyLabel(row.bucketStart, preset),
        submittedCount: row.submittedCount,
        startedCount: row.startedCount,
        finishedCount: row.finishedCount,
        failedCount: row.failedCount,
      }));
    }

    const rows = await db
      .select()
      .from(userJobDaily)
      .where(and(eq(userJobDaily.owner, owner), gte(userJobDaily.bucketDate, since)))
      .orderBy(userJobDaily.bucketDate);

    if (!rows.length) throw new Error("No daily rollups");

    return rows.map((row) => ({
      label: formatDailyLabel(row.bucketDate, preset),
      submittedCount: row.submittedCount,
      startedCount: row.startedCount,
      finishedCount: row.finishedCount,
      failedCount: row.failedCount,
    }));
  }, () => HISTORY_BY_PRESET[preset]);
}
