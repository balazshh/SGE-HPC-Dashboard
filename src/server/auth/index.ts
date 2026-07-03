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

function mapAuthUser(user: { name?: string | null; email?: string | null }) {
  if (!user.email) return null;

  return {
    name: user.name || user.email,
    email: user.email,
    hpcUsername: normalizeHpcUsername(user.email),
  } satisfies SessionUser;
}

const missingEntraEnv = [
  ["BETTER_AUTH_SECRET", env.betterAuthSecret],
  ["ENTRA_CLIENT_ID", env.entraClientId],
  ["ENTRA_CLIENT_SECRET", env.entraClientSecret],
  ["ENTRA_TENANT_ID", env.entraTenantId],
].filter(([, value]) => !value);

if (missingEntraEnv.length) {
  throw new Error(`Missing Entra SSO environment variables: ${missingEntraEnv.map(([name]) => name).join(", ")}`);
}

const auth = betterAuth({
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
});

export async function getSessionInfo(request: Request): Promise<SessionInfo> {
  const session = await auth.api.getSession({ headers: request.headers });
  return {
    user: session?.user ? mapAuthUser(session.user) : null,
    authMode: "entra",
  };
}

export async function handleAuthRequest(request: Request) {
  return auth.handler(request);
}
