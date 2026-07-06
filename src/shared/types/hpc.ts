export type HealthStatus = "healthy" | "degraded" | "down";
export type NodeStatus = "ok" | "partial" | "missing";
export type CanonicalJobState =
  | "queued"
  | "running"
  | "hold"
  | "suspended"
  | "error"
  | "finished"
  | "deleted";

export type FreshnessLevel = "fresh" | "warn" | "stale" | "broken";
export type HistoryPreset = "24h" | "7d" | "30d" | "1y";
export type AuthMode = "entra";

export interface SessionUser {
  name: string;
  email: string;
  hpcUsername: string;
}

export interface SessionInfo {
  user: SessionUser | null;
  authMode: AuthMode;
}

export interface ClusterSummary {
  updatedAt: string;
  totalSlots: number;
  usedSlots: number;
  freeSlots: number;
  runningJobs: number;
  queuedJobs: number;
  failedJobs: number;
  holdJobs: number;
  healthStatus: HealthStatus;
  offlineNodeCount: number;
  myActiveJobsCount: number;
}

export interface NodeRecord {
  hostname: string;
  arch: string | null;
  ncpu: number | null;
  nsoc: number | null;
  ncor: number | null;
  nthr: number | null;
  loadRaw: string | null;
  memtotRaw: string | null;
  memuseRaw: string | null;
  swaptoRaw: string | null;
  swapusRaw: string | null;
  status: NodeStatus;
  lastSeenAt: string;
}

export interface JobRecord {
  jobId: string;
  owner: string;
  name: string;
  state: CanonicalJobState;
  submittedAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface JobsFilterInput {
  query?: string;
  state?: CanonicalJobState | "all";
  preset?: Exclude<HistoryPreset, "24h">;
  page?: number;
  pageSize?: number;
}

export interface PaginatedJobs {
  items: JobRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface HistoryBucket {
  label: string;
  submittedCount: number;
  startedCount: number;
  finishedCount: number;
  failedCount: number;
}
