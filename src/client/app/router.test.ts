import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { clientRoute } from "./router";

test("client routing keeps internal navigation in the document", () => {
  const current = "https://dashboard.example/nodes";

  expect(clientRoute("/jobs", current)?.pathname).toBe("/jobs");
  expect(clientRoute("https://other.example/jobs", current)).toBeNull();
  expect(clientRoute("#main-content", current)).toBeNull();
});

test("post-auth HTML paints the intro first frame before the app loads", () => {
  const html = readFileSync(new URL("../../../index.html", import.meta.url), "utf8");

  expect(html).toContain('sessionStorage.getItem("play-login-intro")');
  expect(html).toContain('id="login-intro-boot"');
  expect(html.indexOf('<div id="login-intro-boot"')).toBeLessThan(html.indexOf('src="/src/client/main.tsx"'));
});

test("dark mode applies before paint and chart scrollbars stay hidden", () => {
  const html = readFileSync(new URL("../../../index.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("./app.css", import.meta.url), "utf8");
  const intro = readFileSync(new URL("../components/LoginIntro.tsx", import.meta.url), "utf8");

  expect(html).toContain('localStorage.getItem("theme")');
  expect(html).toContain(':root[data-theme="dark"] #login-intro-boot');
  expect(css).toContain(':root[data-theme="dark"] .site-header');
  expect(css).toContain(':root[data-theme="dark"] .login-intro__backdrop');
  expect(intro).toContain('dataset.theme === "dark"');
  expect(css).toContain("scrollbar-width: none");
  expect(css).toContain(".history-bar-chart__viewport::-webkit-scrollbar");
  expect(css).not.toContain("scrollbar-width: thin");
});
