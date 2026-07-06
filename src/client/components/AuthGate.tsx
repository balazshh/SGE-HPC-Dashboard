import type { ReactNode } from "react";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

import { authClient } from "../lib/auth-client";

export function AuthGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const session = authClient.useSession();

  useEffect(() => {
    if (!session.isPending && !session.data?.user) {
      navigate({ to: "/login", replace: true });
    }
  }, [navigate, session.data?.user, session.isPending]);

  if (session.isPending || !session.data?.user) {
    return <main className="page"><section className="surface">Checking session…</section></main>;
  }

  return <>{children}</>;
}
