import type { HistoryPreset, JobsFilterInput } from "../shared/types/hpc";
import { env } from "./config/env";
import { getSessionInfo, handleAuthRequest } from "./auth";
import {
  getActiveJobs,
  getActiveJobsPreview,
  getDashboardSummary,
  getHistory,
  getJobHistory,
} from "./services/hpc";

const distPath = `${process.cwd()}/dist`;
const jobStates = ["all", "queued", "running", "hold", "suspended", "error", "finished", "deleted"];
const jobPresets = ["7d", "30d", "1y"];
const historyPresets = ["24h", "7d", "30d", "1y"];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function readInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

async function requireUser(request: Request) {
  return (await getSessionInfo(request)).user;
}

function serveSpa(pathname: string) {
  const target = pathname === "/" ? "/index.html" : pathname;
  const file = Bun.file(`${distPath}${target}`);
  if (file.size > 0) return new Response(file);

  const indexFile = Bun.file(`${distPath}/index.html`);
  if (indexFile.size > 0) {
    return new Response(indexFile, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  return json({ error: "Frontend build not found. Run bun run build or use Vite on :5173." }, 404);
}

Bun.serve({
  hostname: "0.0.0.0",
  port: env.port,
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/auth")) {
      return handleAuthRequest(request);
    }

    if (url.pathname === "/api/health") {
      return json({ ok: true, authMode: "entra" });
    }

    if (url.pathname === "/api/dashboard/summary") {
      const user = await requireUser(request);
      if (!user) return json({ error: "Authentication required" }, 401);
      return json(await getDashboardSummary(user.hpcUsername));
    }

    if (url.pathname === "/api/dashboard/jobs-preview") {
      const user = await requireUser(request);
      if (!user) return json({ error: "Authentication required" }, 401);
      return json(await getActiveJobsPreview(user.hpcUsername));
    }

    if (url.pathname === "/api/jobs/active") {
      const user = await requireUser(request);
      if (!user) return json({ error: "Authentication required" }, 401);
      return json(await getActiveJobs(user.hpcUsername));
    }

    if (url.pathname === "/api/jobs/history") {
      const user = await requireUser(request);
      if (!user) return json({ error: "Authentication required" }, 401);

      const state = url.searchParams.get("state");
      const preset = url.searchParams.get("preset");
      const input: JobsFilterInput = {
        query: url.searchParams.get("query")?.trim() || undefined,
        state: state && jobStates.includes(state) ? state as JobsFilterInput["state"] : undefined,
        preset: preset && jobPresets.includes(preset) ? preset as JobsFilterInput["preset"] : undefined,
        page: readInt(url.searchParams.get("page"), 1, 1, Number.MAX_SAFE_INTEGER),
        pageSize: readInt(url.searchParams.get("pageSize"), 10, 1, 100),
      };

      return json(await getJobHistory(user.hpcUsername, input));
    }

    if (url.pathname === "/api/history") {
      const user = await requireUser(request);
      if (!user) return json({ error: "Authentication required" }, 401);

      const preset = url.searchParams.get("preset");
      const safePreset = preset && historyPresets.includes(preset) ? preset as HistoryPreset : "7d";
      return json(await getHistory(user.hpcUsername, safePreset));
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "Not found" }, 404);
    }

    return serveSpa(url.pathname);
  },
});

console.log(`HPC dashboard server running on http://localhost:${env.port}`);
