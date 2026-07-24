import { expect, test } from "bun:test";

import { historyCutoff } from "./hpc";

const now = Date.UTC(2026, 6, 24, 10, 30);

test("history starts at complete bucket boundaries", () => {
  expect(historyCutoff("24h", now).toISOString()).toBe("2026-07-23T11:00:00.000Z");
  expect(historyCutoff("30d", now).toISOString()).toBe("2026-06-25T00:00:00.000Z");
});
