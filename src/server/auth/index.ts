import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth } from "better-auth/plugins";
import { desc, eq } from "drizzle-orm";

import { env } from "../config/env";
import { db } from "../db";
import * as authSchema from "../db/schema/auth";

function normalizeHpcUsername(value: string) {
  return value.split("@")[0]?.trim().toLowerCase() ?? "";
}

function readPreferredUsernameClaim(idToken?: string | null) {
  const payload = idToken?.split(".")[1];
  if (!payload) return "";

  try {
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const claims = JSON.parse(json) as { preferred_username?: string };
    return claims.preferred_username ?? "";
  } catch {
    return "";
  }
}

function hpcUsernameFor(user: { email?: string | null }, hpcLogin?: string) {
  return user.email ? normalizeHpcUsername(hpcLogin || user.email) : null;
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
  database: drizzleAdapter(db, {
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

export async function getHpcUsername(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return null;

  const [account] = session.user.id
    ? await db
      .select({ idToken: authSchema.account.idToken })
      .from(authSchema.account)
      .where(eq(authSchema.account.userId, session.user.id))
      .orderBy(desc(authSchema.account.updatedAt))
      .limit(1)
    : [];

  return hpcUsernameFor(session.user, readPreferredUsernameClaim(account?.idToken));
}

export function handleAuthRequest(request: Request) {
  return auth.handler(request);
}
