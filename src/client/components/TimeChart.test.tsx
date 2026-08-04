import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { chartPoints, TimeChart } from "./TimeChart";

const start = Date.parse("2026-08-03T00:00:00.000Z");
const end = Date.parse("2026-08-04T00:00:00.000Z");

test("chart points preserve time gaps and clamp values", () => {
  expect(chartPoints([
    { recordedAt: "2026-08-03T00:00:00.000Z", value: 0 },
    { recordedAt: "2026-08-03T06:00:00.000Z", value: 50 },
    { recordedAt: "2026-08-04T00:00:00.000Z", value: 120 },
  ], 100, start, end)).toBe("0,160 160,80 640,0");
});

test("time chart renders an accessible SVG and value list", () => {
  const html = renderToStaticMarkup(
    <TimeChart
      title="Utilization"
      rangeLabel="Last 24 hours"
      ariaLabel="Utilization over time"
      noDataLabel="No data"
      latestLabel="Latest:"
      points={[{ recordedAt: "2026-08-03T08:00:00.000Z", value: 25 }]}
      tone="blue"
      domainStart={start}
      domainEnd={end}
      maxValue={100}
      formatValue={(value) => `${value}%`}
      formatTime={(value) => value}
    />,
  );

  expect(html).toContain('role="img"');
  expect(html).toContain('aria-label="Utilization over time"');
  expect(html).toContain("<polyline");
  expect(html).toContain("<circle");
  expect(html).toContain("2026-08-03T08:00:00.000Z: 25%");
});
