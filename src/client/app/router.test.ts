import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { clientRoute } from "./router";

test("client routing keeps internal navigation in the document", () => {
  const current = "https://dashboard.example/nodes";

  expect(clientRoute("/jobs", current)?.pathname).toBe("/jobs");
  expect(clientRoute("https://other.example/jobs", current)).toBeNull();
  expect(clientRoute("#main-content", current)).toBeNull();
});

test("compact feed health lives in the header and page intros stay removed", () => {
  const router = readFileSync(new URL("./router.tsx", import.meta.url), "utf8");
  const freshness = readFileSync(new URL("../components/FreshnessBanner.tsx", import.meta.url), "utf8");
  const userMenu = readFileSync(new URL("../components/UserMenu.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("./app.css", import.meta.url), "utf8");
  const pages = ["DashboardPage", "NodesPage", "JobsPage", "HistoryPage"]
    .map((name) => readFileSync(new URL(`../pages/${name}.tsx`, import.meta.url), "utf8"))
    .join("\n");

  expect(router).toContain("<HeaderFreshness />");
  expect(freshness).toContain('<span className="freshness__label">{time}</span>');
  expect(freshness).not.toContain('<span className="freshness__label">{label}</span>');
  expect(userMenu).toContain('<strong className="user-menu__email">{user.email}</strong>');
  expect(userMenu).not.toContain("{user.name}");
  expect(css).not.toContain("text-overflow: ellipsis");
  for (const key of ["dashboardLede", "liveNodeInventory", "nodesPageLede", "activeJobsAndHistory", "jobsPageLede", "personalHistoricalTrends", "historyPageLede"]) {
    expect(pages).not.toContain(`t("${key}")`);
  }
});

test("post-auth HTML masks the app until WebGL renders frame zero", () => {
  const html = readFileSync(new URL("../../../index.html", import.meta.url), "utf8");
  const intro = readFileSync(new URL("../components/LoginIntro.tsx", import.meta.url), "utf8");

  expect(html).toContain('sessionStorage.getItem("play-login-intro")');
  expect(html).toContain('id="login-intro-boot"');
  expect(html.match(/data:image\/webp;base64/g)).toHaveLength(2);
  expect(html).not.toContain("<svg");
  expect(html.indexOf('<div id="login-intro-boot"')).toBeLessThan(html.indexOf('<div id="root"'));
  expect(html.indexOf('<div id="login-intro-boot"')).toBeLessThan(html.indexOf('src="/src/client/main.tsx"'));
  expect(intro).toContain('classList.remove("login-intro-pending")');
  expect(intro).toContain("startAnimationRef");
  expect(intro).toContain("renderFrame(loginIntroFrame(0))");
  expect(intro).not.toContain("if (!playing) return;");
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
