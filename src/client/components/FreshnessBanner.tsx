import { getFreshnessLevel } from "../lib/freshness";
import { formatBudapestDateTime } from "../lib/format";
import { useUi } from "../lib/ui";

interface FreshnessBannerProps {
  updatedAt: string;
}

export function FreshnessBanner({ updatedAt }: FreshnessBannerProps) {
  const level = getFreshnessLevel(updatedAt);
  const { freshnessLabel, t } = useUi();

  const label = freshnessLabel(level);
  const time = formatBudapestDateTime(updatedAt);

  const description = t("freshnessBanner", { label, time });

  return (
    <span
      className={`freshness freshness--${level}`}
      role="status"
      aria-label={description}
      title={description}
    >
      <span className="freshness__signal" aria-hidden="true" />
      <span className="freshness__label">{time}</span>
    </span>
  );
}
