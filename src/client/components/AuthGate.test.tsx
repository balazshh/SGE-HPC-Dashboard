import { expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

const storage = new Map([["play-login-intro", "1"]]);
let session: { data: { user: { name: string } } | null; isPending: boolean } = {
  data: null,
  isPending: true,
};
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    matchMedia: () => ({ matches: false }),
    sessionStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
    },
  },
});

mock.module("../lib/auth-client", () => ({
  authClient: {
    useSession: () => session,
  },
  clearAuthPreload: () => {},
  preloadAuth: async () => null,
}));

const { AuthGate } = await import("./AuthGate");

test("login intro holds its first frame while the session loads", () => {
  const html = renderToStaticMarkup(<AuthGate><main data-dashboard /></AuthGate>);

  expect(html).toContain("login-intro");
  expect(html).toContain('data-playing="false"');
  expect(html).not.toContain("data-dashboard");
});

test("login intro starts from the route-preloaded session", () => {
  const preloadedSession = { user: { name: "Ada" } } as never;
  const html = renderToStaticMarkup(
    <AuthGate preloadedSession={preloadedSession}><main data-dashboard /></AuthGate>,
  );

  expect(html).toContain('data-playing="true"');
  expect(html).not.toContain("data-dashboard");
});
