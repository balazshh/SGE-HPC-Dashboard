import { z } from "zod";

import { getHistory } from "../../services/hpc";
import { protectedProcedure, router } from "../index";

export const historyRouter = router({
  getMyHistory: protectedProcedure
    .input(z.object({ preset: z.enum(["24h", "7d", "30d", "1y"]) }))
    .query(async ({ ctx, input }) => {
      return getHistory(ctx.session.user!.hpcUsername, input.preset);
    }),
});
