import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { authClient } from "../lib/auth-client";
import { useTRPC } from "../lib/trpc";

export function LoginPage() {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useQuery(trpc.auth.getSessionInfo.queryOptions());
  const [name, setName] = useState("Jane Doe");
  const [email, setEmail] = useState("jane.doe@bosch.com");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (session.data?.user) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [navigate, session.data?.user]);

  if (session.isLoading) {
    return <main className="page page--centered"><section className="surface auth-card">Loading sign-in…</section></main>;
  }

  async function signInDemo() {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/demo-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email }),
      });

      if (!response.ok) {
        throw new Error("Demo sign-in failed");
      }

      await queryClient.invalidateQueries();
      navigate({ to: "/dashboard" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page page--centered">
      <section className="surface auth-card">
        <p className="eyebrow">HPC Dashboard v2</p>
        <h1>Sign in</h1>
        <p className="lede">
          Sign in to access cluster status, your active jobs, and your personal history.
        </p>

        {session.data?.hasEntraConfigured ? (
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
        ) : (
          <>
            <label>
              <span>Name</span>
              <input className="form-input" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label>
              <span>Email</span>
              <input className="form-input" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <button className="btn btn-primary" disabled={isSubmitting} onClick={signInDemo}>
              {isSubmitting ? "Signing in…" : "Sign in with demo session"}
            </button>
            <p className="muted">
              ponytail: demo login exists for local use when Entra credentials are not configured.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
