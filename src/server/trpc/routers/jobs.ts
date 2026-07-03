import { z } from "zod";

import { getActiveJobs, getJobHistory } from "../../services/hpc";
import { protectedProcedure, router } from "../index";

const jobsHistoryInput = z.object({
  query: z.string().trim().optional(),
  state: z.enum(["all", "queued", "running", "hold", "suspended", "error", "finished", "deleted"]).optional(),
  preset: z.enum(["7d", "30d", "1y"]).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});

export const jobsRouter = router({
  getActiveJobs: protectedProcedure.query(async ({ ctx }) => {
    return getActiveJobs(ctx.session.user!.hpcUsername);
  }),
  getJobHistory: protectedProcedure.input(jobsHistoryInput).query(async ({ ctx, input }) => {
    return getJobHistory(ctx.session.user!.hpcUsername, input);
  }),
});
