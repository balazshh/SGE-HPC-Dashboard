import { getSessionInfo } from "../auth";

export async function createContext({ req }: { req: Request }) {
  const session = await getSessionInfo(req);
  return {
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
