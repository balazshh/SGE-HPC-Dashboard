import { formatNumber } from "../lib/format";
import { useUi } from "../lib/ui";

interface MetricCardProps {
  label: string;
  value: number | string;
  detail?: string;
}

export function MetricCard({ label, value, detail }: MetricCardProps) {
  const { language } = useUi();

  return (
    <article className="surface metric-card">
      <p className="metric-card__label">{label}</p>
      <p className="metric-card__value">{typeof value === "number" ? formatNumber(value, language) : value}</p>
      {detail && <p className="muted">{detail}</p>}
    </article>
  );
}
