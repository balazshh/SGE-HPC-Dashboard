import { authClient, clearAuthPreload } from "../lib/auth-client";
import { navigate } from "../lib/navigation";
import { languageOptions, useUi } from "../lib/ui";

export function UserMenu() {
  const session = authClient.useSession();
  const { language, setLanguage, theme, toggleTheme, t } = useUi();
  const user = session.data?.user;

  async function signOut() {
    await authClient.signOut();
    clearAuthPreload();
    navigate("/login", { replace: true });
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
      {user && (
        <>
          <strong className="user-menu__name" title={user.email}>{user.name}</strong>
          <button className="btn btn-quiet" type="button" onClick={signOut}>
            {t("signOut")}
          </button>
        </>
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
