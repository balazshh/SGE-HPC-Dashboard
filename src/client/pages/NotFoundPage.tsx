import { useUi } from "../lib/ui";

export function NotFoundPage() {
  const { t } = useUi();

  return (
    <main className="page page--centered">
      <section className="surface auth-card">
        <p className="eyebrow">404</p>
        <h1>{t("pageNotFound")}</h1>
        <p className="lede">{t("pageNotFoundLede")}</p>
        <a className="btn btn-primary" href="/">{t("backToDashboard")}</a>
      </section>
    </main>
  );
}
