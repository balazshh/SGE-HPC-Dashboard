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

  return (
    <section
      className={`freshness freshness--${level}`}
      aria-live="polite"
      aria-label={t("freshnessBanner", { label, time })}
    >
      <span className="freshness__signal" aria-hidden="true" />
      <strong>{label}</strong>
      <span className="muted">{t("lastUpdated")}: {time}</span>
    </section>
  );
}
