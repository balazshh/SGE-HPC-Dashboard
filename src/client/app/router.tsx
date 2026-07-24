import type { ComponentType, ReactNode } from "react";

import { AuthGate } from "../components/AuthGate";
import { BoschLogo } from "../components/BoschLogo";
import { UserMenu } from "../components/UserMenu";
import { useUi } from "../lib/ui";
import { DashboardPage } from "../pages/DashboardPage";
import { HistoryPage } from "../pages/HistoryPage";
import { JobsPage } from "../pages/JobsPage";
import { LoginPage } from "../pages/LoginPage";
import { NodesPage } from "../pages/NodesPage";
import { NotFoundPage } from "../pages/NotFoundPage";

const routes: Record<string, ComponentType> = {
  "/": DashboardPage,
  "/login": LoginPage,
  "/nodes": NodesPage,
  "/jobs": JobsPage,
  "/history": HistoryPage,
};

function AppShell({ children, pathname }: { children: ReactNode; pathname: string }) {
  const { t } = useUi();
  const navItems = [
    ["/", t("navDashboard")],
    ["/nodes", t("navNodes")],
    ["/jobs", t("navJobs")],
    ["/history", t("navHistory")],
  ];

  return (
    <>
      <header className="site-header">
        <div className="site-header__supergraphic" aria-hidden="true" />
        <div className="site-header__bar">
          <div className="site-header__inner">
            <div className="site-header__left">
              <BoschLogo />
              <nav className="site-nav" aria-label={t("navPrimary")}>
                {navItems.map(([href, label]) => {
                  const active = pathname === href;
                  return (
                    <a
                      key={href}
                      href={href}
                      className={`site-nav__link${active ? " is-active" : ""}`}
                      aria-current={active ? "page" : undefined}
                    >
                      {label}
                    </a>
                  );
                })}
              </nav>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>
      {children}
    </>
  );
}

export function AppRouter() {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const Page = routes[pathname] ?? NotFoundPage;
  const content = pathname in routes && pathname !== "/login"
    ? <AuthGate><Page /></AuthGate>
    : <Page />;

  return <AppShell pathname={pathname}>{content}</AppShell>;
}
