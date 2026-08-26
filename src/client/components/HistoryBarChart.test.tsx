import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { HistoryBarChart, historyChartWidth } from "./HistoryBarChart";

test("history chart stays readable for long ranges", () => {
  expect(historyChartWidth(7)).toBe(720);
  expect(historyChartWidth(365)).toBeGreaterThan(4_000);
});

test("history chart renders accessible keyboard-interactive grouped bars", () => {
  const html = renderToStaticMarkup(
    <HistoryBarChart
      data={[{
        bucketStart: "2026-08-03T00:00:00.000Z",
        submittedCount: 8,
        startedCount: 7,
        finishedCount: 6,
        failedCount: 1,
      }]}
      ariaLabel="Job history"
      noDataLabel="No data"
      interactionLabel="Use arrow keys"
      finishedLabel="Finished"
      failedLabel="Failed"
      formatTime={(value) => value}
    />,
  );

  expect(html).toContain('role="img"');
  expect(html).toContain('aria-label="Job history"');
  expect(html).toContain('tabindex="0"');
  expect(html).not.toContain("<linearGradient");
  expect(html).toContain("history-bar-chart__bar--finished");
  expect(html).toContain("history-bar-chart__bar--failed");
  expect(html).toContain('aria-live="polite"');
  expect(html).not.toContain("<ul");
});
