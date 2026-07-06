import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

import { authClient } from "../lib/auth-client";
import { useUi } from "../lib/ui";

export function LoginPage() {
  const navigate = useNavigate();
  const session = authClient.useSession();
  const { t } = useUi();

  useEffect(() => {
    if (session.data?.user) {
      navigate({ to: "/", replace: true });
    }
  }, [navigate, session.data?.user]);

  if (session.isPending) {
    return <main className="page page--centered"><section className="surface auth-card">{t("loadingSignIn")}</section></main>;
  }

  return (
    <main className="page page--centered">
      <section className="surface auth-card">
        <p className="eyebrow">SGE HPC Dashboard</p>
        <h1>{t("signInTitle")}</h1>
        <p className="lede">{t("signInDescription")}</p>

        <button
          className="btn btn-primary"
          onClick={() => {
            authClient.signIn.social({
              provider: "microsoft-entra-id" as "github",
              callbackURL: "/",
            });
          }}
        >
          {t("signInWithEntra")}
        </button>
      </section>
    </main>
  );
}
