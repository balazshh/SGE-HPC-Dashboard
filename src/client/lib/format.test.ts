import { expect, test } from "bun:test";

import { formatBudapestDateTime } from "./format";

test("dates use the browser timezone", () => {
  const value = "2026-08-03T08:10:18.000Z";
  const expected = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

  expect(formatBudapestDateTime(value)).toBe(expected);
});
