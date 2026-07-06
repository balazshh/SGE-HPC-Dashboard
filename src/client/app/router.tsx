import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

import { BoschLogo } from "../components/BoschLogo";
import { UserMenu } from "../components/UserMenu";
import { DashboardPage } from "../pages/DashboardPage";
import { HistoryPage } from "../pages/HistoryPage";
import { JobsPage } from "../pages/JobsPage";
import { LoginPage } from "../pages/LoginPage";
import { NotFoundPage } from "../pages/NotFoundPage";

function AppShell() {
  return (
    <>
      <header className="site-header">
        <div className="site-header__supergraphic" aria-hidden="true" />
        <div className="site-header__bar">
          <div className="site-header__inner">
            <div className="site-header__left">
              <BoschLogo />
              <nav className="site-nav" aria-label="Primary">
                <Link to="/" activeProps={{ className: "site-nav__link is-active" }} className="site-nav__link">
                  Dashboard
                </Link>
                <Link to="/jobs" activeProps={{ className: "site-nav__link is-active" }} className="site-nav__link">
                  My Jobs
                </Link>
                <Link to="/history" activeProps={{ className: "site-nav__link is-active" }} className="site-nav__link">
                  My History
                </Link>
              </nav>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>
      <Outlet />
    </>
  );
}

const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: NotFoundPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const jobsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/jobs",
  component: JobsPage,
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history",
  component: HistoryPage,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  loginRoute,
  jobsRoute,
  historyRoute,
]);

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultNotFoundComponent: NotFoundPage,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
