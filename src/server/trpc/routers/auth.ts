import { publicProcedure, router } from "../index";

export const authRouter = router({
  getSessionInfo: publicProcedure.query(({ ctx }) => ctx.session),
});
