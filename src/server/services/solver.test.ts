import { expect, test } from "bun:test";

import { aggregateSolverLoads, classifySolver, KNOWN_SOLVERS } from "./hpc";

test("classifySolver maps all six solver prefixes case-insensitively", () => {
  expect(classifySolver("mechanical_beam_v2")).toBe("ANSYS Mechanical");
  expect(classifySolver("Mechanical_L_1")).toBe("ANSYS Mechanical");
  expect(classifySolver("Fluent_case")).toBe("ANSYS Fluent");
  expect(classifySolver("FLUENT_hot")).toBe("ANSYS Fluent");
  expect(classifySolver("lsdyna_impact")).toBe("ANSYS LS-DYNA");
  expect(classifySolver("LSDYNA_steady")).toBe("ANSYS LS-DYNA");
  expect(classifySolver("cfx_rotor")).toBe("ANSYS CFX");
  expect(classifySolver("CFX_pump")).toBe("ANSYS CFX");
  expect(classifySolver("abaqus_crash")).toBe("ABAQUS");
  expect(classifySolver("Abaqus_CRASH")).toBe("ABAQUS");
  expect(classifySolver("comsol_thermal")).toBe("COMSOL");
  expect(classifySolver("COMSOL_wave")).toBe("COMSOL");
});

test("classifySolver falls back to Other for unknown names", () => {
  expect(classifySolver("random_job")).toBe("Other");
  expect(classifySolver("fluent")).toBe("Other");
  expect(classifySolver("")).toBe("Other");
});

test("aggregateSolverLoads sums running and queued jobs and slots", () => {
  const loads = aggregateSolverLoads([
    { name: "fluent_a", state: "running", slots: 8 },
    { name: "Fluent_b", state: "running", slots: 4 },
    { name: "fluent_c", state: "queued", slots: 16 },
    { name: "abaqus_x", state: "queued", slots: 2 },
    { name: "misc_job", state: "queued", slots: 3 },
    { name: "fluent_held", state: "hold", slots: 10 },
    { name: "fluent_done", state: "finished", slots: 10 },
  ]);

  expect(loads.find((load) => load.solver === "ANSYS Fluent")).toEqual({
    solver: "ANSYS Fluent",
    runningJobs: 2,
    runningSlots: 12,
    queuedJobs: 1,
    queuedSlots: 16,
  });
  expect(loads.find((load) => load.solver === "ABAQUS")).toEqual({
    solver: "ABAQUS",
    runningJobs: 0,
    runningSlots: 0,
    queuedJobs: 1,
    queuedSlots: 2,
  });
  expect(loads.find((load) => load.solver === "Other")).toEqual({
    solver: "Other",
    runningJobs: 0,
    runningSlots: 0,
    queuedJobs: 1,
    queuedSlots: 3,
  });
  expect(loads).toHaveLength(KNOWN_SOLVERS.length + 1);
});

test("aggregateSolverLoads always lists the six known solvers and omits empty Other", () => {
  const loads = aggregateSolverLoads([{ name: "comsol_x", state: "running", slots: 1 }]);

  for (const solver of KNOWN_SOLVERS) {
    expect(loads.some((load) => load.solver === solver)).toBe(true);
  }
  expect(loads.find((load) => load.solver === "COMSOL")?.runningJobs).toBe(1);
  expect(loads.some((load) => load.solver === "Other")).toBe(false);
  expect(loads).toHaveLength(KNOWN_SOLVERS.length);
});
