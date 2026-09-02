import { expect, test } from "bun:test";

import { capacityFromSlots, historyCutoff } from "./hpc";

const now = Date.UTC(2026, 6, 24, 10, 30);

test("history starts at complete bucket boundaries", () => {
  expect(historyCutoff("24h", now).toISOString()).toBe("2026-07-23T11:00:00.000Z");
  expect(historyCutoff("30d", now).toISOString()).toBe("2026-06-25T00:00:00.000Z");
});

test("capacity reports unavailable resources without hiding invalid input", () => {
  expect(capacityFromSlots(4, 8, 16, 2)).toEqual({
    allocated: 4,
    available: 8,
    reserved: 2,
    unavailable: 2,
    total: 16,
  });
  expect(() => capacityFromSlots(4, 13, 16)).toThrow("Capacity values exceed total");
});
