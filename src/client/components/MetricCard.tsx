import { formatNumber } from "../lib/format";

interface MetricCardProps {
  label: string;
  value: number | string;
  detail: string;
}

export function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <article className="surface metric-card">
      <p className="eyebrow">{label}</p>
      <p className="metric-card__value">{typeof value === "number" ? formatNumber(value) : value}</p>
      <p className="muted">{detail}</p>
    </article>
  );
}
