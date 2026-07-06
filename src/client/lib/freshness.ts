import type { FreshnessLevel } from "../../shared/types/hpc";

export const FRESHNESS_THRESHOLDS = {
  warnMinutes: 5,
  staleMinutes: 15,
  brokenMinutes: 60,
} as const;

export function getFreshnessLevel(updatedAt: string, now = new Date()): FreshnessLevel {
  const updated = new Date(updatedAt);
  const diffMinutes = (now.getTime() - updated.getTime()) / 60000;

  if (diffMinutes >= FRESHNESS_THRESHOLDS.brokenMinutes) return "broken";
  if (diffMinutes >= FRESHNESS_THRESHOLDS.staleMinutes) return "stale";
  if (diffMinutes >= FRESHNESS_THRESHOLDS.warnMinutes) return "warn";
  return "fresh";
}

