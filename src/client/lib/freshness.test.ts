import { expect, test } from "bun:test";

import { getFreshnessLevel } from "./freshness";

test("invalid and future timestamps are broken", () => {
  const now = new Date("2026-09-02T10:00:00.000Z");

  expect(getFreshnessLevel("not-a-date", now)).toBe("broken");
  expect(getFreshnessLevel("2026-09-02T10:01:00.000Z", now)).toBe("broken");
});
