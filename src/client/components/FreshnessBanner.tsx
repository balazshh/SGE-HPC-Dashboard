import { getFreshnessLevel } from "../lib/freshness";
import { formatBudapestDateTime } from "../lib/format";
import { useUi } from "../lib/ui";

interface FreshnessBannerProps {
  updatedAt: string;
}

export function FreshnessBanner({ updatedAt }: FreshnessBannerProps) {
  const level = getFreshnessLevel(updatedAt);
  const { freshnessLabel, t } = useUi();

  return (
    <section className={`banner banner--${level}`} aria-live="polite">
      <div>{t("freshnessBanner", { label: freshnessLabel(level), time: formatBudapestDateTime(updatedAt) })}</div>
      <span className="banner__pill">{t("freshnessThresholds")}</span>
    </section>
  );
}
