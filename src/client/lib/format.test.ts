import { expect, test } from "bun:test";

import { formatCompactDateTime, formatDateTime } from "./format";

test("dates use the browser timezone", () => {
  const value = "2026-08-03T08:10:18.000Z";
  const expected = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

  expect(formatDateTime(value)).toBe(expected);
});

test("compact timestamps use the selected locale", () => {
  const value = "2026-08-03T08:10:18.000Z";
  const expected = new Intl.DateTimeFormat("de-DE", {
    timeStyle: "short",
  }).format(new Date(value));

  expect(formatCompactDateTime(value, "de")).toBe(expected);
});
