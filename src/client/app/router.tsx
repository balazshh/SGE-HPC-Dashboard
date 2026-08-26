import type { ComponentType, ReactNode } from "react";
import { useEffect, useState } from "react";

import { AuthGate } from "../components/AuthGate";
import { BoschLogo } from "../components/BoschLogo";
import { UserMenu } from "../components/UserMenu";
import { CLIENT_NAVIGATION_EVENT, navigate } from "../lib/navigation";
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

function currentPathname() {
  return window.location.pathname.replace(/\/+$/, "") || "/";
}

export function clientRoute(href: string, currentHref: string) {
  const current = new URL(currentHref);
  const next = new URL(href, current);
  if (next.origin !== current.origin) return null;
  if (next.pathname === current.pathname && next.search === current.search && next.hash) return null;
  return next;
}

function usePathname() {
  const [pathname, setPathname] = useState(currentPathname);

  useEffect(() => {
    const update = () => setPathname(currentPathname());
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;

      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;

      const next = clientRoute(link.href, window.location.href);
      if (!next) return;

      event.preventDefault();
      if (next.href === window.location.href) return;

      navigate(next.href);
    };

    window.addEventListener("popstate", update);
    window.addEventListener(CLIENT_NAVIGATION_EVENT, update);
    document.addEventListener("click", handleClick);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener(CLIENT_NAVIGATION_EVENT, update);
      document.removeEventListener("click", handleClick);
    };
  }, []);

  return pathname;
}

function AppShell({ children, pathname }: { children: ReactNode; pathname: string }) {
  const { t } = useUi();
  const navItems = [
    ["/", t("navDashboard")],
    ["/nodes", t("navNodes")],
    ["/jobs", t("navJobs")],
    ["/history", t("navHistory")],
  ];

  const showNavigation = pathname !== "/login";

  return (
    <>
      <a className="skip-link" href="#main-content">{t("skipToContent")}</a>
      <header className="site-header">
        <div className="site-header__supergraphic" aria-hidden="true" />
        <div className="site-header__bar">
          <div className="site-header__inner">
            <div className="site-header__left">
              <BoschLogo />
              <span className="site-header__product">SGE HPC</span>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>
      <div className={`app-frame${showNavigation ? "" : " app-frame--single"}`}>
        {showNavigation && (
          <aside className="site-sidebar">
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
          </aside>
        )}
        <div id="main-content" tabIndex={-1}>{children}</div>
      </div>
    </>
  );
}

export function AppRouter() {
  const pathname = usePathname();
  const Page = routes[pathname] ?? NotFoundPage;
  const content = pathname in routes && pathname !== "/login"
    ? <AuthGate><Page /></AuthGate>
    : <Page />;

  return <AppShell pathname={pathname}>{content}</AppShell>;
}
