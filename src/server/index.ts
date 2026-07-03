import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { env } from "./config/env";
import { handleAuthRequest, handleDemoLogin, handleDemoLogout, hasEntraConfigured } from "./auth";
import { createContext } from "./trpc/context";
import { appRouter } from "./trpc/routers";

const distPath = `${process.cwd()}/dist`;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function serveSpa(pathname: string) {
  const target = pathname === "/" ? "/index.html" : pathname;
  const file = Bun.file(`${distPath}${target}`);
  if (file.size > 0) return new Response(file);

  const indexFile = Bun.file(`${distPath}/index.html`);
  if (indexFile.size > 0) return new Response(indexFile, { headers: { "content-type": "text/html; charset=utf-8" } });

  return json({ error: "Frontend build not found. Run bun run build or use Vite on :5173." }, 404);
}

Bun.serve({
  hostname: "0.0.0.0",
  port: env.port,
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/trpc")) {
      return fetchRequestHandler({
        endpoint: "/api/trpc",
        req: request,
        router: appRouter,
        createContext,
      });
    }

    if (url.pathname.startsWith("/api/auth")) {
      return handleAuthRequest(request);
    }

    if (url.pathname === "/api/demo-login" && request.method === "POST") {
      return handleDemoLogin(request);
    }

    if (url.pathname === "/api/demo-logout" && request.method === "POST") {
      return handleDemoLogout();
    }

    if (url.pathname === "/api/health") {
      return json({ ok: true, authMode: hasEntraConfigured ? "entra" : "demo" });
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "Not found" }, 404);
    }

    return serveSpa(url.pathname);
  },
});

console.log(`HPC dashboard server running on http://localhost:${env.port}`);
