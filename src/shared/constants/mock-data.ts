import type {
  ClusterSummary,
  HistoryBucket,
  HistoryPreset,
  JobRecord,
  SessionUser,
} from "../types/hpc";

export const DEMO_USER: SessionUser = {
  name: "Jane Doe",
  email: "jane.doe@bosch.com",
  hpcUsername: "jane.doe",
};

export const DASHBOARD_SUMMARY: ClusterSummary = {
  updatedAt: "2026-07-03T08:14:00Z",
  totalSlots: 2048,
  usedSlots: 1536,
  freeSlots: 512,
  runningJobs: 184,
  queuedJobs: 39,
  failedJobs: 4,
  holdJobs: 7,
  healthStatus: "degraded",
  offlineNodeCount: 2,
  myActiveJobsCount: 3,
};

export const ACTIVE_JOBS: JobRecord[] = [
  {
    jobId: "741901",
    owner: "jane.doe",
    name: "cfd-thermal-sweep",
    state: "running",
    submittedAt: "2026-07-03T05:20:00Z",
    startedAt: "2026-07-03T05:24:00Z",
  },
  {
    jobId: "741955",
    owner: "jane.doe",
    name: "battery-aging-model",
    state: "running",
    submittedAt: "2026-07-03T06:45:00Z",
    startedAt: "2026-07-03T06:48:00Z",
  },
  {
    jobId: "742011",
    owner: "jane.doe",
    name: "mesh-refinement-check",
    state: "queued",
    submittedAt: "2026-07-03T07:51:00Z",
  },
];

export const JOB_HISTORY: JobRecord[] = [
  {
    jobId: "739112",
    owner: "jane.doe",
    name: "stress-postprocess",
    state: "finished",
    submittedAt: "2026-07-01T08:15:00Z",
    startedAt: "2026-07-01T08:19:00Z",
    finishedAt: "2026-07-01T10:07:00Z",
  },
  {
    jobId: "738904",
    owner: "jane.doe",
    name: "cooling-loop-trace",
    state: "error",
    submittedAt: "2026-06-30T12:00:00Z",
    startedAt: "2026-06-30T12:06:00Z",
    finishedAt: "2026-06-30T12:44:00Z",
  },
  {
    jobId: "738551",
    owner: "jane.doe",
    name: "gearbox-fatigue-run",
    state: "finished",
    submittedAt: "2026-06-28T06:45:00Z",
    startedAt: "2026-06-28T06:52:00Z",
    finishedAt: "2026-06-28T18:13:00Z",
  },
  {
    jobId: "737990",
    owner: "jane.doe",
    name: "ev-pack-solver",
    state: "deleted",
    submittedAt: "2026-06-24T09:03:00Z",
    startedAt: "2026-06-24T09:09:00Z",
    finishedAt: "2026-06-24T09:40:00Z",
  },
  {
    jobId: "736881",
    owner: "jane.doe",
    name: "airflow-optimization",
    state: "finished",
    submittedAt: "2026-06-19T13:10:00Z",
    startedAt: "2026-06-19T13:18:00Z",
    finishedAt: "2026-06-19T17:25:00Z",
  },
  {
    jobId: "735442",
    owner: "jane.doe",
    name: "motor-noise-analysis",
    state: "finished",
    submittedAt: "2026-06-12T04:20:00Z",
    startedAt: "2026-06-12T04:31:00Z",
    finishedAt: "2026-06-12T07:11:00Z",
  },
  {
    jobId: "733994",
    owner: "jane.doe",
    name: "mounting-vibration-pass",
    state: "error",
    submittedAt: "2026-05-30T10:20:00Z",
    startedAt: "2026-05-30T10:24:00Z",
    finishedAt: "2026-05-30T10:49:00Z",
  },
  {
    jobId: "730115",
    owner: "jane.doe",
    name: "thermal-boundary-study",
    state: "finished",
    submittedAt: "2026-05-04T15:10:00Z",
    startedAt: "2026-05-04T15:15:00Z",
    finishedAt: "2026-05-05T01:42:00Z",
  }
];

export const HISTORY_BY_PRESET: Record<HistoryPreset, HistoryBucket[]> = {
  "24h": [
    { label: "00", submittedCount: 1, startedCount: 1, finishedCount: 0, failedCount: 0 },
    { label: "04", submittedCount: 2, startedCount: 1, finishedCount: 1, failedCount: 0 },
    { label: "08", submittedCount: 3, startedCount: 2, finishedCount: 2, failedCount: 0 },
    { label: "12", submittedCount: 2, startedCount: 2, finishedCount: 1, failedCount: 0 },
    { label: "16", submittedCount: 1, startedCount: 1, finishedCount: 2, failedCount: 0 },
    { label: "20", submittedCount: 1, startedCount: 1, finishedCount: 1, failedCount: 1 }
  ],
  "7d": [
    { label: "Thu", submittedCount: 4, startedCount: 3, finishedCount: 3, failedCount: 0 },
    { label: "Fri", submittedCount: 6, startedCount: 5, finishedCount: 5, failedCount: 1 },
    { label: "Sat", submittedCount: 3, startedCount: 3, finishedCount: 2, failedCount: 0 },
    { label: "Sun", submittedCount: 5, startedCount: 4, finishedCount: 4, failedCount: 0 },
    { label: "Mon", submittedCount: 7, startedCount: 5, finishedCount: 5, failedCount: 1 },
    { label: "Tue", submittedCount: 4, startedCount: 4, finishedCount: 3, failedCount: 1 },
    { label: "Wed", submittedCount: 3, startedCount: 2, finishedCount: 1, failedCount: 0 }
  ],
  "30d": [
    { label: "W1", submittedCount: 18, startedCount: 17, finishedCount: 15, failedCount: 1 },
    { label: "W2", submittedCount: 14, startedCount: 14, finishedCount: 13, failedCount: 0 },
    { label: "W3", submittedCount: 21, startedCount: 20, finishedCount: 18, failedCount: 2 },
    { label: "W4", submittedCount: 16, startedCount: 15, finishedCount: 14, failedCount: 1 }
  ],
  "1y": [
    { label: "Jan", submittedCount: 42, startedCount: 40, finishedCount: 37, failedCount: 2 },
    { label: "Feb", submittedCount: 38, startedCount: 37, finishedCount: 35, failedCount: 1 },
    { label: "Mar", submittedCount: 51, startedCount: 49, finishedCount: 45, failedCount: 3 },
    { label: "Apr", submittedCount: 44, startedCount: 43, finishedCount: 41, failedCount: 1 },
    { label: "May", submittedCount: 57, startedCount: 56, finishedCount: 52, failedCount: 3 },
    { label: "Jun", submittedCount: 49, startedCount: 48, finishedCount: 44, failedCount: 2 }
  ]
};
