import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import {
  LOGIN_INTRO_DURATION,
  LoginIntro,
  loginIntroFrame,
  LOGO_EXTRUDE_OPTIONS,
} from "./LoginIntro";

test("login intro spins once, then morphs into the header logo", () => {
  const start = loginIntroFrame(0);
  const spun = loginIntroFrame(LOGIN_INTRO_DURATION * 0.65);
  const end = loginIntroFrame(LOGIN_INTRO_DURATION);

  expect(start.angle).toBe(0);
  expect(start.tilt).toBe(0);
  expect(start.roll).toBe(0);
  expect(start.morph).toBe(0);
  expect(start.opacity).toBe(1);
  expect(spun.angle).toBeCloseTo(Math.PI * 2);
  expect(spun.morph).toBe(0);
  expect(end.morph).toBe(1);
  expect(end.opacity).toBe(0);
  expect(end.done).toBe(true);
});

test("login intro uses smooth beveled vector extrusion", () => {
  expect(LOGO_EXTRUDE_OPTIONS.depth).toBe(14);
  expect(LOGO_EXTRUDE_OPTIONS.curveSegments).toBe(64);
  expect(LOGO_EXTRUDE_OPTIONS.bevelEnabled).toBe(true);
  expect(LOGO_EXTRUDE_OPTIONS.bevelSegments).toBe(12);
});

test("login intro canvas is decorative", () => {
  const html = renderToStaticMarkup(<LoginIntro onComplete={() => {}} />);

  expect(html).toContain("login-intro__backdrop");
  expect(html).toContain("login-intro__canvas");
  expect(html).toContain('aria-hidden="true"');
});
