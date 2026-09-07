import type { OverviewSourceStatus } from "../../shared/types/hpc";
import { getFreshnessLevel } from "../lib/freshness";
import { formatCompactDateTime, formatDateTime } from "../lib/format";
import { useUi } from "../lib/ui";

interface FreshnessBannerProps {
  updatedAt: string | null;
  sourceStatus?: OverviewSourceStatus;
  refreshing?: boolean;
  compact?: boolean;
}

export function FreshnessBanner({ updatedAt, sourceStatus, refreshing = false, compact = false }: FreshnessBannerProps) {
  const { freshnessLabel, language, statusLabel, t } = useUi();
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
  const detailedTime = updatedAt ? formatDateTime(updatedAt, language) : t("noSnapshot");
  const time = updatedAt
    ? compact ? formatCompactDateTime(updatedAt, language) : detailedTime
    : t("noSnapshot");
  const description = updatedAt
    ? t("freshnessBanner", { label, time: detailedTime })
    : t("noDataSource");

  return (
    <span
      className={`freshness freshness--${level}${compact ? " freshness--compact" : ""}`}
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
