import { authClient } from "../lib/auth-client";
import { languageOptions, useUi } from "../lib/ui";

export function UserMenu() {
  const session = authClient.useSession();
  const { language, setLanguage, theme, toggleTheme, t } = useUi();
  const user = session.data?.user;

  async function signOut() {
    await authClient.signOut();
    window.location.assign("/login");
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
      {user ? (
        <>
          <div className="user-menu__identity">
            <strong>{user.name}</strong>
            <span className="muted">{user.email}</span>
          </div>
          <button className="btn btn-secondary" type="button" onClick={signOut}>
            {t("signOut")}
          </button>
        </>
      ) : (
        <a href="/login" className="btn btn-secondary">{t("signIn")}</a>
      )}
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
