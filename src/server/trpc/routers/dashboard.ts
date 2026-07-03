import { publicProcedure, protectedProcedure, router } from "../index";
import { getFreshnessLabel, getFreshnessLevel } from "../../../client/lib/freshness";
import { getActiveJobsPreview, getDashboardSummary } from "../../services/hpc";

export const dashboardRouter = router({
  getSummary: protectedProcedure.query(async ({ ctx }) => {
    return getDashboardSummary(ctx.session.user!.hpcUsername);
  }),
  getFreshness: protectedProcedure.query(async ({ ctx }) => {
    const summary = await getDashboardSummary(ctx.session.user!.hpcUsername);
    const level = getFreshnessLevel(summary.updatedAt);
    return {
      updatedAt: summary.updatedAt,
      level,
      label: getFreshnessLabel(level),
    };
  }),
  getMyActiveJobsPreview: protectedProcedure.query(async ({ ctx }) => {
    return getActiveJobsPreview(ctx.session.user!.hpcUsername);
  }),
  getPublicStatus: publicProcedure.query(() => ({ ok: true })),
});
