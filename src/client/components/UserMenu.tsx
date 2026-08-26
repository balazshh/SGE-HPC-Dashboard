import { authClient } from "../lib/auth-client";
import { languageOptions, useUi } from "../lib/ui";

export function UserMenu() {
  const session = authClient.useSession();
  const { language, setLanguage, t } = useUi();
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
      {user && (
        <>
          <strong className="user-menu__name" title={user.email}>{user.name}</strong>
          <button className="btn btn-quiet" type="button" onClick={signOut}>
            {t("signOut")}
          </button>
        </>
      )}
    </div>
  );
}
