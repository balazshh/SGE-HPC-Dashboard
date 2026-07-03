import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { authClient } from "../lib/auth-client";
import { useTRPC } from "../lib/trpc";

export function LoginPage() {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const session = useQuery(trpc.auth.getSessionInfo.queryOptions());

  useEffect(() => {
    if (session.data?.user) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [navigate, session.data?.user]);

  if (session.isLoading) {
    return <main className="page page--centered"><section className="surface auth-card">Loading sign-in…</section></main>;
  }

  return (
    <main className="page page--centered">
      <section className="surface auth-card">
        <p className="eyebrow">HPC Dashboard v2</p>
        <h1>Sign in</h1>
        <p className="lede">
          Sign in to access cluster status, your active jobs, and your personal history.
        </p>

        <button
          className="btn btn-primary"
          onClick={() => {
            authClient.signIn.social({
              provider: "microsoft-entra-id" as "github",
              callbackURL: "/dashboard",
            });
          }}
        >
          Sign in with Microsoft Entra ID
        </button>
      </section>
    </main>
  );
}
