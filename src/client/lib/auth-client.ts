import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
});

export type ClientSession = NonNullable<ReturnType<typeof authClient.useSession>["data"]>;

let authPreload: Promise<ClientSession | null> | null = null;

export function preloadAuth() {
  return authPreload ??= authClient.getSession()
    .then(({ data }) => data ?? null)
    .catch(() => null);
}

export function clearAuthPreload() {
  authPreload = null;
}
