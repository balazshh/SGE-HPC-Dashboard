import { Link, useNavigate } from "@tanstack/react-router";

import { authClient } from "../lib/auth-client";
import { languageOptions, useUi } from "../lib/ui";

export function UserMenu() {
  const navigate = useNavigate();
  const session = authClient.useSession();
  const { language, setLanguage, theme, toggleTheme, t } = useUi();

  if (!session.data?.user) {
    return (
      <div className="user-menu">
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
        <Link to="/login" className="btn btn-secondary">
          {t("signIn")}
        </Link>
        <button
          className="theme-toggle"
          type="button"
          aria-label={theme === "dark" ? t("lightMode") : t("darkMode")}
          title={theme === "dark" ? t("lightMode") : t("darkMode")}
          onClick={toggleTheme}
        >
          <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
        </button>
      </div>
    );
  }

  async function signOut() {
    await authClient.signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="user-menu">
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
      <div className="user-menu__identity">
        <strong>{session.data.user.name}</strong>
        <span className="muted">{session.data.user.email}</span>
      </div>
      <button className="btn btn-secondary" onClick={signOut}>
        {t("signOut")}
      </button>
      <button
        className="theme-toggle"
        type="button"
        aria-label={theme === "dark" ? t("lightMode") : t("darkMode")}
        title={theme === "dark" ? t("lightMode") : t("darkMode")}
        onClick={toggleTheme}
      >
        <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
      </button>
    </div>
  );
}
