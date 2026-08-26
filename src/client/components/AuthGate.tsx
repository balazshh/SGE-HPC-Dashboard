import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";

import { authClient, clearAuthPreload } from "../lib/auth-client";
import type { ClientSession } from "../lib/auth-client";
import { navigate } from "../lib/navigation";
import { clearLoginIntroRequest, LoginIntro, loginIntroRequested } from "./LoginIntro";

export function AuthGate({
  children,
  preloadedSession,
}: {
  children: ReactNode;
  preloadedSession?: ClientSession | null;
}) {
  const session = authClient.useSession();
  const user = preloadedSession === undefined ? session.data?.user : preloadedSession?.user;
  const isPending = preloadedSession === undefined && session.isPending;
  const [showIntro, setShowIntro] = useState(() => loginIntroRequested()
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const finishIntro = useCallback(() => setShowIntro(false), []);

  useEffect(() => {
    if (!isPending && !user) {
      clearAuthPreload();
      navigate("/login", { replace: true });
    }
    if (user) clearLoginIntroRequest();
  }, [isPending, user]);

  useEffect(() => {
    const chrome = document.querySelectorAll<HTMLElement>(".site-header, .site-sidebar");
    chrome.forEach((element) => { element.inert = showIntro; });
    return () => chrome.forEach((element) => { element.inert = false; });
  }, [showIntro]);

  if (showIntro) {
    return <LoginIntro playing={!isPending && Boolean(user)} onComplete={finishIntro} />;
  }
  if (isPending || !user) return null;

  return children;
}
