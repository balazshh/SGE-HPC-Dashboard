import type { KeyboardEvent, PointerEvent } from "react";
import { useId, useState } from "react";

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
  interactionLabel: string;
  points: TimeChartPoint[];
  tone: "blue" | "purple";
  domainStart: number;
  domainEnd: number;
  maxValue?: number;
  formatValue: (value: number) => string;
  formatTime: (value: string) => string;
}

const WIDTH = 720;
const HEIGHT = 248;
const LEFT = 56;
const RIGHT = 16;
const TOP = 16;
const BOTTOM = 36;
const PLOT_WIDTH = WIDTH - LEFT - RIGHT;
const PLOT_HEIGHT = HEIGHT - TOP - BOTTOM;

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

export function chartScale(value: number) {
  const valueMaximum = Math.max(1, value);
  const roughStep = valueMaximum / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const fraction = roughStep / magnitude;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  const step = Math.max(1, niceFraction * magnitude);
  const maximum = Math.ceil(valueMaximum / step) * step;
  return {
    maximum,
    ticks: Array.from({ length: Math.round(maximum / step) + 1 }, (_, index) => index * step),
  };
}

export function niceMaximum(value: number) {
  return chartScale(value).maximum;
}

export function TimeChart({
  title,
  rangeLabel,
  ariaLabel,
  noDataLabel,
  latestLabel,
  interactionLabel,
  points,
  tone,
  domainStart,
  domainEnd,
  maxValue,
  formatValue,
  formatTime,
}: TimeChartProps) {
  const automaticScale = chartScale(Math.max(1, ...points.map((point) => point.value)));
  const ceiling = maxValue ?? automaticScale.maximum;
  const latest = points.at(-1);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const id = useId().replaceAll(":", "");
  const coordinates = chartCoordinates(points, ceiling, domainStart, domainEnd, PLOT_WIDTH, PLOT_HEIGHT)
    .map((coordinate, index) => ({ ...coordinate, x: coordinate.x + LEFT, y: coordinate.y + TOP, index }));
  const selectedIndex = activeIndex === null || !coordinates.length ? null : Math.min(activeIndex, coordinates.length - 1);
  const active = selectedIndex === null ? null : coordinates[selectedIndex];
  const latestCoordinate = coordinates.at(-1);
  const linePoints = coordinates.map(({ x, y }) => `${x},${y}`).join(" ");
  const areaPoints = coordinates.length
    ? `${coordinates[0].x},${TOP + PLOT_HEIGHT} ${linePoints} ${coordinates.at(-1)!.x},${TOP + PLOT_HEIGHT}`
    : "";
  const yTicks = maxValue === undefined
    ? automaticScale.ticks
    : Array.from({ length: 5 }, (_, index) => ceiling * index / 4);
  const xTicks = Array.from({ length: 5 }, (_, index) => domainStart + (domainEnd - domainStart) * index / 4);

  function selectFromPointer(event: PointerEvent<SVGSVGElement>) {
    if (!coordinates.length) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const pointerX = (event.clientX - bounds.left) * WIDTH / bounds.width;
    let closest = 0;
    for (let index = 1; index < coordinates.length; index += 1) {
      if (Math.abs(coordinates[index].x - pointerX) < Math.abs(coordinates[closest].x - pointerX)) closest = index;
    }
    setActiveIndex(closest);
  }

  function navigate(event: KeyboardEvent<SVGSVGElement>) {
    if (!coordinates.length) return;
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") return setActiveIndex(0);
    if (event.key === "End") return setActiveIndex(coordinates.length - 1);
    setActiveIndex((current) => {
      const index = current ?? coordinates.length - 1;
      return Math.max(0, Math.min(coordinates.length - 1, index + (event.key === "ArrowRight" ? 1 : -1)));
    });
  }

  return (
    <article className={`surface time-chart time-chart--${tone}`}>
      <div className="time-chart__header">
        <div>
          <p className="chart-range">{rangeLabel}</p>
          <h2>{title}</h2>
        </div>
        {latest && <p className="time-chart__latest"><span className="muted">{latestLabel}</span> <strong>{formatValue(latest.value)}</strong></p>}
      </div>
      {points.length ? (
        <>
          <div className="time-chart__plot">
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              role="img"
              aria-label={ariaLabel}
              aria-describedby={`${id}-hint`}
              tabIndex={0}
              onPointerMove={selectFromPointer}
              onPointerDown={selectFromPointer}
              onPointerLeave={(event) => {
                if (event.pointerType !== "touch") setActiveIndex(null);
              }}
              onFocus={() => setActiveIndex((current) => current ?? coordinates.length - 1)}
              onBlur={() => setActiveIndex(null)}
              onKeyDown={navigate}
            >
              {yTicks.map((value) => {
                const y = TOP + PLOT_HEIGHT - value / ceiling * PLOT_HEIGHT;
                return (
                  <g key={value}>
                    <line className="time-chart__grid" x1={LEFT} y1={y} x2={WIDTH - RIGHT} y2={y} />
                    <text className="time-chart__axis-label" x={LEFT - 10} y={y + 4} textAnchor="end">{formatValue(value)}</text>
                  </g>
                );
              })}

              {xTicks.map((value, index) => {
                const x = LEFT + index * PLOT_WIDTH / 4;
                return (
                  <text key={value} className="time-chart__axis-label" x={x} y={HEIGHT - 7} textAnchor={index === 0 ? "start" : index === 4 ? "end" : "middle"}>
                    {formatTime(new Date(value).toISOString())}
                  </text>
                );
              })}

              <polygon className="time-chart__area" points={areaPoints} />
              <polyline className={`time-chart__line time-chart__line--${tone}`} points={linePoints} />

              {latestCoordinate && (
                <circle className={`time-chart__point time-chart__point--${tone}`} cx={latestCoordinate.x} cy={latestCoordinate.y} r="5" />
              )}

              {active && (
                <g className="time-chart__active">
                  <line className="time-chart__crosshair" x1={active.x} y1={TOP} x2={active.x} y2={TOP + PLOT_HEIGHT} />
                  <circle className={`time-chart__active-point time-chart__point--${tone}`} cx={active.x} cy={active.y} r="7" />
                  <g transform={`translate(${active.x > WIDTH / 2 ? active.x - 156 : active.x + 12} ${Math.max(8, Math.min(HEIGHT - 64, active.y - 54))})`}>
                    <rect className="time-chart__tooltip" width="144" height="52" rx="10" />
                    <text className="time-chart__tooltip-time" x="12" y="20">{formatTime(points[active.index].recordedAt)}</text>
                    <text className="time-chart__tooltip-value" x="12" y="41">{formatValue(points[active.index].value)}</text>
                  </g>
                </g>
              )}
            </svg>
          </div>
          <p id={`${id}-hint`} className="chart-interaction-hint muted">{interactionLabel}</p>
          <p className="sr-only" aria-live="polite">
            {active ? `${formatTime(points[active.index].recordedAt)}: ${formatValue(points[active.index].value)}` : ""}
          </p>
        </>
      ) : <p className="chart-empty muted">{noDataLabel}</p>}
    </article>
  );
}
