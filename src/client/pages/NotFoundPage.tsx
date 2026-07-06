export function NotFoundPage() {
  return (
    <main className="page page--centered">
      <section className="surface auth-card">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p className="lede">Use the main navigation to return to dashboard, jobs, or history.</p>
        <a className="btn btn-primary" href="/">Back to dashboard</a>
      </section>
    </main>
  );
}
