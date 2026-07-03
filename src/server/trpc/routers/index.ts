import { router } from "../index";
import { authRouter } from "./auth";
import { dashboardRouter } from "./dashboard";
import { historyRouter } from "./history";
import { jobsRouter } from "./jobs";

export const appRouter = router({
  auth: authRouter,
  dashboard: dashboardRouter,
  jobs: jobsRouter,
  history: historyRouter,
});

export type AppRouter = typeof appRouter;
