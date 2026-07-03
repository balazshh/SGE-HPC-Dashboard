import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";

import { useTRPC } from "../lib/trpc";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const location = useLocation();
  const session = useQuery(trpc.auth.getSessionInfo.queryOptions());

  useEffect(() => {
    if (!session.isLoading && !session.data?.user) {
      navigate({
        to: "/login",
        search: {
          redirect: location.pathname,
        },
        replace: true,
      });
    }
  }, [location.pathname, navigate, session.data?.user, session.isLoading]);

  if (session.isLoading || !session.data?.user) {
    return <main className="page"><section className="surface">Checking session…</section></main>;
  }

  return <>{children}</>;
}
