import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth } from "better-auth/plugins";

import type { SessionInfo, SessionUser } from "../../shared/types/hpc";
import { createDb } from "../db";
import * as authSchema from "../db/schema/auth";
import { env } from "../config/env";

function normalizeHpcUsername(email: string) {
  return email.split("@")[0]?.trim().toLowerCase() ?? "";
}

function parseCookieHeader(cookieHeader: string | null) {
  return Object.fromEntries(
    (cookieHeader ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [key, ...rest] = part.split("=");
        return [key, decodeURIComponent(rest.join("="))];
      }),
  );
}

function toDemoCookie(user: SessionUser) {
  return Buffer.from(JSON.stringify(user)).toString("base64url");
}

function fromDemoCookie(value?: string) {
  if (!value) return null;

  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as SessionUser;
  } catch {
    return null;
  }
}

function mapAuthUser(user: { name?: string | null; email?: string | null }) {
  if (!user.email) return null;

  return {
    name: user.name || user.email,
    email: user.email,
    hpcUsername: normalizeHpcUsername(user.email),
  } satisfies SessionUser;
}

export const hasEntraConfigured = Boolean(
  env.betterAuthSecret && env.entraClientId && env.entraClientSecret && env.entraTenantId,
);

const auth = hasEntraConfigured
  ? betterAuth({
      database: drizzleAdapter(createDb(), {
        provider: "mysql",
        schema: authSchema,
      }),
      trustedOrigins: [env.appBaseUrl],
      emailAndPassword: {
        enabled: false,
      },
      secret: env.betterAuthSecret,
      baseURL: env.appBaseUrl,
      plugins: [
        genericOAuth({
          config: [
            {
              providerId: "microsoft-entra-id",
              discoveryUrl: `https://login.microsoftonline.com/${env.entraTenantId}/v2.0/.well-known/openid-configuration`,
              clientId: env.entraClientId,
              clientSecret: env.entraClientSecret,
              scopes: ["openid", "profile", "email"],
            },
          ],
        }),
      ],
    })
  : null;

export async function getSessionInfo(request: Request): Promise<SessionInfo> {
  const demoUser = fromDemoCookie(parseCookieHeader(request.headers.get("cookie")).hpc_demo_session);
  if (demoUser) {
    return {
      user: demoUser,
      authMode: "demo",
      hasEntraConfigured,
    };
  }

  if (!auth) {
    return {
      user: null,
      authMode: "demo",
      hasEntraConfigured: false,
    };
  }

  const session = await auth.api.getSession({ headers: request.headers });
  return {
    user: session?.user ? mapAuthUser(session.user) : null,
    authMode: "entra",
    hasEntraConfigured,
  };
}

export async function handleAuthRequest(request: Request) {
  if (!auth) {
    return new Response("Entra auth is not configured", { status: 404 });
  }

  return auth.handler(request);
}

export async function handleDemoLogin(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { name?: string; email?: string }
    | null;

  const email = body?.email?.trim().toLowerCase();
  const name = body?.name?.trim() || email;

  if (!email || !email.includes("@")) {
    return Response.json({ error: "Valid email is required" }, { status: 400 });
  }

  const safeEmail = email;

  const user: SessionUser = {
    name: name || safeEmail,
    email: safeEmail,
    hpcUsername: normalizeHpcUsername(safeEmail),
  };

  return new Response(JSON.stringify({ ok: true, user }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": `hpc_demo_session=${encodeURIComponent(toDemoCookie(user))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`,
    },
  });
}

export function handleDemoLogout() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": "hpc_demo_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    },
  });
}
