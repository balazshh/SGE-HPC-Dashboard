import { Link, useNavigate } from "@tanstack/react-router";

import { authClient } from "../lib/auth-client";
import { languageOptions, useUi } from "../lib/ui";

export function UserMenu() {
  const navigate = useNavigate();
  const session = authClient.useSession();
  const { language, setLanguage, theme, toggleTheme, t } = useUi();

  const controls = (
    <>
      <select
        className="control-select"
        aria-label={t("language")}
        value={language}
        onChange={(event) => setLanguage(event.target.value as typeof language)}
      >
        {languageOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <button
        className="theme-toggle"
        type="button"
        aria-label={theme === "dark" ? t("lightMode") : t("darkMode")}
        title={theme === "dark" ? t("lightMode") : t("darkMode")}
        onClick={toggleTheme}
      >
        <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
      </button>
    </>
  );

  if (!session.data?.user) {
    return (
      <div className="user-menu">
        <div className="user-menu__controls">{controls}</div>
        <Link to="/login" className="btn btn-secondary">
          {t("signIn")}
        </Link>
      </div>
    );
  }

  async function signOut() {
    await authClient.signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="user-menu">
      <div className="user-menu__controls">{controls}</div>
      <div className="user-menu__identity">
        <strong>{session.data.user.name}</strong>
        <span className="muted">{session.data.user.email}</span>
      </div>
      <button className="btn btn-secondary" onClick={signOut}>
        {t("signOut")}
      </button>
    </div>
  );
}
