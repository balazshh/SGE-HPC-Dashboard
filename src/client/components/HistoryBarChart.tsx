import type { KeyboardEvent, PointerEvent } from "react";
import { useId, useState } from "react";

import type { HistoryBucket } from "../../shared/types/hpc";
import { chartScale } from "./TimeChart";

interface HistoryBarChartProps {
  data: HistoryBucket[];
  ariaLabel: string;
  noDataLabel: string;
  interactionLabel: string;
  finishedLabel: string;
  failedLabel: string;
  formatTime: (value: string) => string;
}

const HEIGHT = 280;
const LEFT = 56;
const RIGHT = 18;
const TOP = 18;
const BOTTOM = 42;
const PLOT_HEIGHT = HEIGHT - TOP - BOTTOM;

export function historyChartWidth(bucketCount: number) {
  const widthPerBucket = bucketCount > 60 ? 12 : 30;
  return Math.max(720, LEFT + RIGHT + bucketCount * widthPerBucket);
}

export function HistoryBarChart({
  data,
  ariaLabel,
  noDataLabel,
  interactionLabel,
  finishedLabel,
  failedLabel,
  formatTime,
}: HistoryBarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const id = useId().replaceAll(":", "");

  if (!data.length) return <p className="chart-empty muted">{noDataLabel}</p>;

  const width = historyChartWidth(data.length);
  const plotWidth = width - LEFT - RIGHT;
  const groupWidth = plotWidth / data.length;
  const barWidth = Math.max(2, Math.min(16, (groupWidth - 4) / 2));
  const scale = chartScale(Math.max(1, ...data.flatMap((bucket) => [bucket.finishedCount, bucket.failedCount])));
  const ceiling = scale.maximum;
  const yTicks = scale.ticks;
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));
  const selectedIndex = activeIndex === null ? null : Math.min(activeIndex, data.length - 1);
  const active = selectedIndex === null ? null : data[selectedIndex];

  function selectFromPointer(event: PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const pointerX = (event.clientX - bounds.left) * width / bounds.width;
    const index = Math.floor((pointerX - LEFT) / groupWidth);
    setActiveIndex(Math.max(0, Math.min(data.length - 1, index)));
  }

  function navigate(event: KeyboardEvent<SVGSVGElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") return setActiveIndex(0);
    if (event.key === "End") return setActiveIndex(data.length - 1);
    setActiveIndex((current) => {
      const index = current ?? data.length - 1;
      return Math.max(0, Math.min(data.length - 1, index + (event.key === "ArrowRight" ? 1 : -1)));
    });
  }

  return (
    <div className="history-bar-chart">
      <div className="history-bar-chart__legend" aria-hidden="true">
        <span><i className="history-bar-chart__swatch history-bar-chart__swatch--finished" />{finishedLabel}</span>
        <span><i className="history-bar-chart__swatch history-bar-chart__swatch--failed" />{failedLabel}</span>
      </div>
      <div className="history-bar-chart__viewport">
        <svg
          style={{ minWidth: `${width}px` }}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={ariaLabel}
          aria-describedby={`${id}-hint`}
          tabIndex={0}
          onPointerMove={selectFromPointer}
          onPointerDown={selectFromPointer}
          onPointerLeave={(event) => {
            if (event.pointerType !== "touch") setActiveIndex(null);
          }}
          onFocus={() => setActiveIndex((current) => current ?? data.length - 1)}
          onBlur={() => setActiveIndex(null)}
          onKeyDown={navigate}
        >
          {yTicks.map((value) => {
            const y = TOP + PLOT_HEIGHT - value / ceiling * PLOT_HEIGHT;
            return (
              <g key={value}>
                <line className="history-bar-chart__grid" x1={LEFT} y1={y} x2={width - RIGHT} y2={y} />
                <text className="history-bar-chart__axis-label" x={LEFT - 10} y={y + 4} textAnchor="end">{value}</text>
              </g>
            );
          })}

          {selectedIndex !== null && (
            <rect className="history-bar-chart__active-band" x={LEFT + selectedIndex * groupWidth} y={TOP} width={groupWidth} height={PLOT_HEIGHT} rx="6" />
          )}

          {data.map((bucket, index) => {
            const center = LEFT + groupWidth * (index + 0.5);
            const finishedHeight = bucket.finishedCount / ceiling * PLOT_HEIGHT;
            const failedHeight = bucket.failedCount / ceiling * PLOT_HEIGHT;
            const showLabel = index === 0 || index === data.length - 1 || index % labelEvery === 0;
            return (
              <g key={bucket.bucketStart}>
                <rect
                  className="history-bar-chart__bar history-bar-chart__bar--finished"
                  x={center - barWidth - 1}
                  y={TOP + PLOT_HEIGHT - finishedHeight}
                  width={barWidth}
                  height={finishedHeight}
                  rx="3"
                />
                <rect
                  className="history-bar-chart__bar history-bar-chart__bar--failed"
                  x={center + 1}
                  y={TOP + PLOT_HEIGHT - failedHeight}
                  width={barWidth}
                  height={failedHeight}
                  rx="3"
                />
                {showLabel && (
                  <text className="history-bar-chart__axis-label" x={center} y={HEIGHT - 10} textAnchor="middle">
                    {formatTime(bucket.bucketStart)}
                  </text>
                )}
              </g>
            );
          })}

          {active && selectedIndex !== null && (() => {
            const center = LEFT + groupWidth * (selectedIndex + 0.5);
            const tooltipX = center > width / 2 ? center - 190 : center + 10;
            return (
              <g className="history-bar-chart__tooltip-group" transform={`translate(${tooltipX} 12)`}>
                <rect className="history-bar-chart__tooltip" width="180" height="68" rx="10" />
                <text className="history-bar-chart__tooltip-time" x="12" y="20">{formatTime(active.bucketStart)}</text>
                <text className="history-bar-chart__tooltip-value" x="12" y="41">{finishedLabel}: {active.finishedCount}</text>
                <text className="history-bar-chart__tooltip-value" x="12" y="59">{failedLabel}: {active.failedCount}</text>
              </g>
            );
          })()}
        </svg>
      </div>
      <p id={`${id}-hint`} className="chart-interaction-hint muted">{interactionLabel}</p>
      <p className="sr-only" aria-live="polite">
        {active ? `${formatTime(active.bucketStart)}. ${finishedLabel}: ${active.finishedCount}. ${failedLabel}: ${active.failedCount}.` : ""}
      </p>
    </div>
  );
}
