interface TimeChartPoint {
  recordedAt: string;
  value: number;
}

interface TimeChartProps {
  title: string;
  rangeLabel: string;
  ariaLabel: string;
  noDataLabel: string;
  latestLabel: string;
  points: TimeChartPoint[];
  tone: "blue" | "purple";
  domainStart: number;
  domainEnd: number;
  maxValue?: number;
  formatValue: (value: number) => string;
  formatTime: (value: string) => string;
}

function chartCoordinates(points: TimeChartPoint[], maxValue: number, domainStart: number, domainEnd: number, width = 640, height = 160) {
  const ceiling = Math.max(1, maxValue);
  const duration = Math.max(1, domainEnd - domainStart);
  return points.map((point) => ({
    x: Math.max(0, Math.min(Date.parse(point.recordedAt) - domainStart, duration)) * width / duration,
    y: height - Math.max(0, Math.min(point.value, ceiling)) * height / ceiling,
  }));
}

export function chartPoints(points: TimeChartPoint[], maxValue: number, domainStart: number, domainEnd: number) {
  return chartCoordinates(points, maxValue, domainStart, domainEnd).map(({ x, y }) => `${x},${y}`).join(" ");
}

export function TimeChart({
  title,
  rangeLabel,
  ariaLabel,
  noDataLabel,
  latestLabel,
  points,
  tone,
  domainStart,
  domainEnd,
  maxValue,
  formatValue,
  formatTime,
}: TimeChartProps) {
  const ceiling = maxValue ?? Math.max(1, ...points.map((point) => point.value));
  const latest = points.at(-1);
  const latestCoordinates = latest ? chartCoordinates([latest], ceiling, domainStart, domainEnd)[0] : null;

  return (
    <article className="surface time-chart">
      <div className="time-chart__header">
        <div>
          <p className="eyebrow">{rangeLabel}</p>
          <h2>{title}</h2>
        </div>
        {latest && <p><span className="muted">{latestLabel}</span> <strong>{formatValue(latest.value)}</strong></p>}
      </div>
      {points.length ? (
        <>
          <div className="time-chart__plot">
            <span className="time-chart__maximum">{formatValue(ceiling)}</span>
            <svg viewBox="0 0 640 160" role="img" aria-label={ariaLabel} preserveAspectRatio="none">
              <line className="time-chart__grid" x1="0" y1="0" x2="640" y2="0" />
              <line className="time-chart__grid" x1="0" y1="80" x2="640" y2="80" />
              <line className="time-chart__grid" x1="0" y1="160" x2="640" y2="160" />
              <polyline className={`time-chart__line time-chart__line--${tone}`} points={chartPoints(points, ceiling, domainStart, domainEnd)} />
              {latestCoordinates && <circle className={`time-chart__point time-chart__point--${tone}`} cx={latestCoordinates.x} cy={latestCoordinates.y} r="4" />}
            </svg>
            <span className="time-chart__minimum">{formatValue(0)}</span>
          </div>
          <div className="time-chart__times muted">
            <span>{formatTime(new Date(domainStart).toISOString())}</span>
            <span>{formatTime(new Date(domainEnd).toISOString())}</span>
          </div>
          <ul className="sr-only">
            {points.map((point) => <li key={point.recordedAt}>{formatTime(point.recordedAt)}: {formatValue(point.value)}</li>)}
          </ul>
        </>
      ) : <p className="muted">{noDataLabel}</p>}
    </article>
  );
}
