import {
  ACTIVE_JOBS,
  DASHBOARD_SUMMARY,
  DEMO_USER,
  HISTORY_BY_PRESET,
  JOB_HISTORY,
} from "../../shared/constants/mock-data";
import type { HistoryPreset } from "../../shared/types/hpc";

// ponytail: mock API keeps the shell honest until Better Auth, tRPC, and collectors land.
export async function getSession() {
  return DEMO_USER;
}

export async function getDashboardSummary() {
  return DASHBOARD_SUMMARY;
}

export async function getMyActiveJobs() {
  return ACTIVE_JOBS;
}

export async function getMyJobHistory() {
  return JOB_HISTORY;
}

export async function getMyHistory(preset: HistoryPreset) {
  return HISTORY_BY_PRESET[preset];
}
