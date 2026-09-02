import type { OverviewSourceStatus } from "../../shared/types/hpc";
import { getFreshnessLevel } from "../lib/freshness";
import { formatBudapestDateTime } from "../lib/format";
import { useUi } from "../lib/ui";

interface FreshnessBannerProps {
  updatedAt: string | null;
  sourceStatus?: OverviewSourceStatus;
  refreshing?: boolean;
}

export function FreshnessBanner({ updatedAt, sourceStatus, refreshing = false }: FreshnessBannerProps) {
  const { freshnessLabel, statusLabel, t } = useUi();
  const timestampLevel = updatedAt ? getFreshnessLevel(updatedAt) : "broken";
  const level = sourceStatus === "down" || sourceStatus === "no-data"
    ? "broken"
    : sourceStatus === "degraded" && timestampLevel === "fresh"
      ? "warn"
      : timestampLevel;
  const label = refreshing
    ? t("refreshing")
    : sourceStatus === "no-data"
      ? t("noSnapshot")
      : sourceStatus === "down"
        ? statusLabel(sourceStatus)
        : sourceStatus === "degraded" && timestampLevel === "fresh"
          ? statusLabel(sourceStatus)
          : freshnessLabel(level);
  const time = updatedAt ? formatBudapestDateTime(updatedAt) : t("noSnapshot");
  const description = updatedAt
    ? t("freshnessBanner", { label, time })
    : t("noDataSource");

  return (
    <span
      className={`freshness freshness--${level}`}
      role="status"
      aria-label={description}
      title={description}
    >
      <span className="freshness__signal" aria-hidden="true" />
      <span className="freshness__label">{label}</span>
      <span aria-hidden="true">·</span>
      <span>{time}</span>
    </span>
  );
}
