import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";

import { authClient } from "../lib/auth-client";
import { useTRPC } from "../lib/trpc";

export function UserMenu() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const session = useQuery(trpc.auth.getSessionInfo.queryOptions());

  if (!session.data?.user) {
    return (
      <Link to="/login" className="btn btn-secondary">
        Sign in
      </Link>
    );
  }

  async function signOut() {
    if (session.data?.authMode === "demo") {
      await fetch("/api/demo-logout", { method: "POST", credentials: "include" });
    } else {
      await authClient.signOut();
    }

    await queryClient.invalidateQueries();
    navigate({ to: "/login" });
  }

  return (
    <div className="user-menu">
      <div className="user-menu__identity">
        <strong>{session.data.user.name}</strong>
        <span className="muted">{session.data.user.email}</span>
      </div>
      <button className="btn btn-secondary" onClick={signOut}>
        Sign out
      </button>
    </div>
  );
}
