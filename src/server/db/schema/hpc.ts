import {
  date,
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  serial,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

const healthStatus = mysqlEnum("health_status", ["healthy", "degraded", "down"]);
const jobStateGroup = mysqlEnum("state_group", [
  "queued",
  "running",
  "hold",
  "suspended",
  "error",
  "finished",
  "deleted",
]);

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
    healthStatus: healthStatus.notNull(),
    offlineNodeCount: int("offline_node_count").notNull().default(0),
  },
  (table) => ({
    recordedAtIdx: index("cluster_snapshots_recorded_at_idx").on(table.recordedAt),
  }),
);

export const jobsCurrent = mysqlTable(
  "jobs_current",
  {
    id: serial("id").primaryKey(),
    jobId: varchar("job_id", { length: 64 }).notNull(),
    owner: varchar("owner", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    stateRaw: varchar("state_raw", { length: 32 }).notNull(),
    stateGroup: jobStateGroup.notNull(),
    submittedAt: datetime("submitted_at", { mode: "date" }).notNull(),
    startedAt: datetime("started_at", { mode: "date" }),
    slots: int("slots").notNull().default(1),
    lastSeenAt: datetime("last_seen_at", { mode: "date" }).notNull(),
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
    stateFinal: jobStateGroup.notNull(),
    submittedAt: datetime("submitted_at", { mode: "date" }).notNull(),
    startedAt: datetime("started_at", { mode: "date" }),
    finishedAt: datetime("finished_at", { mode: "date" }).notNull(),
    slots: int("slots").notNull().default(1),
    queue: varchar("queue", { length: 255 }),
  },
  (table) => ({
    ownerFinishedIdx: index("jobs_history_owner_finished_idx").on(table.owner, table.finishedAt),
    jobIdFinishedUnique: uniqueIndex("jobs_history_job_id_finished_unique").on(table.jobId, table.finishedAt),
  }),
);

export const userJobHourly = mysqlTable(
  "user_job_hourly",
  {
    id: serial("id").primaryKey(),
    owner: varchar("owner", { length: 255 }).notNull(),
    bucketStart: datetime("bucket_start", { mode: "date" }).notNull(),
    submittedCount: int("submitted_count").notNull().default(0),
    startedCount: int("started_count").notNull().default(0),
    finishedCount: int("finished_count").notNull().default(0),
    failedCount: int("failed_count").notNull().default(0),
  },
  (table) => ({
    ownerBucketUnique: uniqueIndex("user_job_hourly_owner_bucket_unique").on(table.owner, table.bucketStart),
    bucketIdx: index("user_job_hourly_bucket_start_idx").on(table.bucketStart),
  }),
);

export const userJobDaily = mysqlTable(
  "user_job_daily",
  {
    id: serial("id").primaryKey(),
    owner: varchar("owner", { length: 255 }).notNull(),
    bucketDate: date("bucket_date", { mode: "date" }).notNull(),
    submittedCount: int("submitted_count").notNull().default(0),
    startedCount: int("started_count").notNull().default(0),
    finishedCount: int("finished_count").notNull().default(0),
    failedCount: int("failed_count").notNull().default(0),
  },
  (table) => ({
    ownerBucketUnique: uniqueIndex("user_job_daily_owner_bucket_unique").on(table.owner, table.bucketDate),
    bucketIdx: index("user_job_daily_bucket_date_idx").on(table.bucketDate),
  }),
);
