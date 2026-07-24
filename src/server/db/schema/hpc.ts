import {
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  serial,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

const healthStates = ["healthy", "degraded", "down"] as const;
const nodeStates = ["ok", "partial", "missing"] as const;
const jobStates = ["queued", "running", "hold", "suspended", "error", "finished", "deleted"] as const;

export const clusterSnapshots = mysqlTable(
  "cluster_snapshots",
  {
    id: serial("id").primaryKey(),
    recordedAt: datetime("recorded_at", { mode: "date" }).notNull(),
    totalSlots: int("total_slots").notNull(),
    usedSlots: int("used_slots").notNull(),
    freeSlots: int("free_slots").notNull(),
    runningJobs: int("running_jobs").notNull(),
    queuedJobs: int("queued_jobs").notNull(),
    failedJobs: int("failed_jobs").notNull(),
    holdJobs: int("hold_jobs").notNull(),
    healthStatus: mysqlEnum("health_status", healthStates).notNull(),
    offlineNodeCount: int("offline_node_count").notNull().default(0),
  },
  (table) => ({
    recordedAtIdx: index("cluster_snapshots_recorded_at_idx").on(table.recordedAt),
  }),
);

export const nodesCurrent = mysqlTable(
  "nodes_current",
  {
    id: serial("id").primaryKey(),
    hostname: varchar("hostname", { length: 255 }).notNull(),
    arch: varchar("arch", { length: 64 }),
    ncpu: int("ncpu"),
    nsoc: int("nsoc"),
    ncor: int("ncor"),
    nthr: int("nthr"),
    loadRaw: varchar("load_raw", { length: 32 }),
    memtotRaw: varchar("memtot_raw", { length: 32 }),
    memuseRaw: varchar("memuse_raw", { length: 32 }),
    status: mysqlEnum("status", nodeStates).notNull(),
    lastSeenAt: datetime("last_seen_at", { mode: "date" }).notNull(),
  },
  (table) => ({
    hostnameUnique: uniqueIndex("nodes_current_hostname_unique").on(table.hostname),
    statusIdx: index("nodes_current_status_idx").on(table.status),
  }),
);

export const jobsCurrent = mysqlTable(
  "jobs_current",
  {
    id: serial("id").primaryKey(),
    jobId: varchar("job_id", { length: 64 }).notNull(),
    owner: varchar("owner", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    stateGroup: mysqlEnum("state_group", jobStates).notNull(),
    submittedAt: datetime("submitted_at", { mode: "date" }).notNull(),
    startedAt: datetime("started_at", { mode: "date" }),
  },
  (table) => ({
    jobIdUnique: uniqueIndex("jobs_current_job_id_unique").on(table.jobId),
    ownerIdx: index("jobs_current_owner_idx").on(table.owner),
    stateIdx: index("jobs_current_state_group_idx").on(table.stateGroup),
  }),
);

export const jobsHistory = mysqlTable(
  "jobs_history",
  {
    id: serial("id").primaryKey(),
    jobId: varchar("job_id", { length: 64 }).notNull(),
    owner: varchar("owner", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    stateFinal: mysqlEnum("state_final", jobStates).notNull(),
    submittedAt: datetime("submitted_at", { mode: "date" }).notNull(),
    startedAt: datetime("started_at", { mode: "date" }),
    finishedAt: datetime("finished_at", { mode: "date" }).notNull(),
  },
  (table) => ({
    ownerFinishedIdx: index("jobs_history_owner_finished_idx").on(table.owner, table.finishedAt),
    jobIdFinishedUnique: uniqueIndex("jobs_history_job_id_finished_unique").on(table.jobId, table.finishedAt),
  }),
);
