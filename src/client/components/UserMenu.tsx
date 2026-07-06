import { Link, useNavigate } from "@tanstack/react-router";

import { authClient } from "../lib/auth-client";

export function UserMenu() {
  const navigate = useNavigate();
  const session = authClient.useSession();

  if (!session.data?.user) {
    return (
      <Link to="/login" className="btn btn-secondary">
        Sign in
      </Link>
    );
  }

  async function signOut() {
    await authClient.signOut();
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
