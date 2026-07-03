import { getFreshnessLabel, getFreshnessLevel } from "../lib/freshness";
import { formatBudapestDateTime } from "../lib/format";

interface FreshnessBannerProps {
  updatedAt: string;
}

export function FreshnessBanner({ updatedAt }: FreshnessBannerProps) {
  const level = getFreshnessLevel(updatedAt);

  return (
    <section className={`banner banner--${level}`} aria-live="polite">
      <div>
        <strong>{getFreshnessLabel(level)}.</strong> Last collector update {formatBudapestDateTime(updatedAt)}.
      </div>
      <span className="banner__pill">5 / 15 / 60 minute thresholds</span>
    </section>
  );
}
