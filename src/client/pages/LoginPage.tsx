import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

import { authClient } from "../lib/auth-client";

export function LoginPage() {
  const navigate = useNavigate();
  const session = authClient.useSession();

  useEffect(() => {
    if (session.data?.user) {
      navigate({ to: "/", replace: true });
    }
  }, [navigate, session.data?.user]);

  if (session.isPending) {
    return <main className="page page--centered"><section className="surface auth-card">Loading sign-in…</section></main>;
  }

  return (
    <main className="page page--centered">
      <section className="surface auth-card">
        <p className="eyebrow">SGE HPC Dashboard</p>
        <h1>Sign in</h1>
        <p className="lede">
          Sign in to access cluster status, your active jobs, and your personal history.
        </p>

        <button
          className="btn btn-primary"
          onClick={() => {
            authClient.signIn.social({
              provider: "microsoft-entra-id" as "github",
              callbackURL: "/",
            });
          }}
        >
          Sign in with Microsoft Entra ID
        </button>
      </section>
    </main>
  );
}
