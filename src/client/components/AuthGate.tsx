import type { ReactNode } from "react";
import { useEffect } from "react";

import { authClient } from "../lib/auth-client";
import { useUi } from "../lib/ui";

export function AuthGate({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  const { t } = useUi();

  useEffect(() => {
    if (!session.isPending && !session.data?.user) {
      window.location.replace("/login");
    }
  }, [session.data?.user, session.isPending]);

  if (session.isPending || !session.data?.user) {
    return <main className="page"><section className="surface">{t("checkingSession")}</section></main>;
  }

  return <>{children}</>;
}
