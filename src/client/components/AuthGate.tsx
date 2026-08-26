import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";

import { authClient } from "../lib/auth-client";
import { clearLoginIntroRequest, LoginIntro, loginIntroRequested } from "./LoginIntro";

export function AuthGate({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  const [showIntro, setShowIntro] = useState(() => loginIntroRequested()
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const finishIntro = useCallback(() => setShowIntro(false), []);

  useEffect(() => {
    if (!session.isPending && !session.data?.user) {
      window.location.replace("/login");
    }
    if (session.data?.user) clearLoginIntroRequest();
  }, [session.data?.user, session.isPending]);

  useEffect(() => {
    const chrome = document.querySelectorAll<HTMLElement>(".site-header, .site-sidebar");
    chrome.forEach((element) => { element.inert = showIntro; });
    return () => chrome.forEach((element) => { element.inert = false; });
  }, [showIntro]);

  if (showIntro) return <LoginIntro onComplete={finishIntro} />;
  if (session.isPending || !session.data?.user) return null;

  return children;
}
