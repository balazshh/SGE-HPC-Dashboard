import { expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

const storage = new Map([["play-login-intro", "1"]]);
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
    useSession: () => ({ data: null, isPending: true }),
  },
}));

const { AuthGate } = await import("./AuthGate");

test("login intro covers the dashboard while the session loads", () => {
  const html = renderToStaticMarkup(<AuthGate><main data-dashboard /></AuthGate>);

  expect(html).toContain("login-intro");
  expect(html).not.toContain("data-dashboard");
});
