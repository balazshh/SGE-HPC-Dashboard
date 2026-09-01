import type { ClusterSummary, DashboardOperations } from "../../shared/types/hpc";
import { MetricCard } from "../components/MetricCard";
import { useApi } from "../lib/api";
import { formatNumber } from "../lib/format";
import { useUi } from "../lib/ui";

function formatWaitAge(oldestQueuedAt: string, now = Date.now()) {
  const ageMs = Math.max(0, now - new Date(oldestQueuedAt).getTime());
  const minutes = Math.floor(ageMs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

export function DashboardPage() {
  const summary = useApi<ClusterSummary>("/api/dashboard/summary");
  const operations = useApi<DashboardOperations>("/api/dashboard/operations");
  const { t } = useUi();

  if (summary.loading || operations.loading) {
    return <main className="page"><section className="surface">{t("loadingDashboard")}</section></main>;
  }

  if (summary.error || operations.error || !summary.data || !operations.data) {
    return <main className="page"><section className="surface">{t("failedDashboard")}</section></main>;
  }

  const utilizationPercent = summary.data.totalSlots > 0
    ? Math.max(0, Math.min(100, Math.round((summary.data.usedSlots / summary.data.totalSlots) * 100)))
    : 0;
  const pressure = operations.data.queuePressure;
  const oldestWaiting = pressure.queuedJobs > 0 && pressure.oldestQueuedAt
    ? formatWaitAge(pressure.oldestQueuedAt)
    : null;

  return (
    <main className="page">
      <section className="metric-grid metric-grid--dashboard" aria-label={t("dashboard")}>
        <article className="surface metric-card metric-card--featured">
          <div>
            <p className="metric-card__label">{t("clusterUtilization")}</p>
            <p className="metric-card__value">{utilizationPercent}%</p>
            <p className="muted">{t("usedOfTotalSlots", { used: summary.data.usedSlots, total: summary.data.totalSlots })}</p>
          </div>
          <progress
            className="utilization-progress"
            max="100"
            value={utilizationPercent}
            aria-label={`${t("clusterUtilization")}: ${utilizationPercent}%`}
          >
            {utilizationPercent}%
          </progress>
        </article>
        <MetricCard label={t("runningJobs")} value={summary.data.runningJobs} />
        <MetricCard label={t("queuedJobs")} value={summary.data.queuedJobs} />
        <MetricCard label={t("failedJobs")} value={summary.data.failedJobs} />
        <MetricCard label={t("jobsOnHold")} value={summary.data.holdJobs} />
      </section>

      <section className="operations-grid" aria-label={t("operationsOverview")}>
        <section className="surface operations-block" aria-label={t("capacityByQueue")}>
          <div>
            <h2>{t("capacityByQueue")}</h2>
          </div>
          {operations.data.queues.length ? (
            <ul className="queue-capacity-list">
              {operations.data.queues.map((queue) => {
                const percent = queue.totalSlots > 0
                  ? Math.max(0, Math.min(100, Math.round((queue.usedSlots / queue.totalSlots) * 100)))
                  : 0;
                const unavailable = Math.max(0, queue.totalSlots - queue.usedSlots - queue.reservedSlots - queue.freeSlots);
                const usedLabel = t("usedOfTotalSlots", { used: queue.usedSlots, total: queue.totalSlots });

                return (
                  <li key={queue.queueName} className="queue-capacity">
                    <div className="queue-capacity__header">
                      <span className="queue-capacity__name">{queue.queueName}</span>
                      <span className="muted">{usedLabel}</span>
                    </div>
                    <progress
                      className="queue-capacity__progress"
                      max="100"
                      value={percent}
                      aria-label={`${queue.queueName}: ${usedLabel}, ${percent}%`}
                    >
                      {percent}%
                    </progress>
                    <p className="muted queue-capacity__numbers">
                      {t("freeSlots", { count: queue.freeSlots })} · {t("reservedSlots", { count: queue.reservedSlots })} · {t("unavailableSlots", { count: unavailable })}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">{t("noQueueData")}</p>
          )}
        </section>

        <section className="surface operations-block" aria-label={t("queuePressureTitle")}>
          <div className="section-title-row section-title-row--stack">
            <div>
              <h2>{t("queuePressureTitle")}</h2>
              {oldestWaiting && (
                <p className="muted">{t("oldestQueuedAt")}: {oldestWaiting}</p>
              )}
            </div>
            <a className="btn btn-secondary" href="/jobs">{t("openMyJobs")}</a>
          </div>
          <dl className="pressure-stats">
            <div className="pressure-stat">
              <dt>{t("queuedJobs")}</dt>
              <dd>{formatNumber(pressure.queuedJobs)}</dd>
            </div>
            <div className="pressure-stat">
              <dt>{t("requestedSlots")}</dt>
              <dd>{formatNumber(pressure.queuedSlots)}</dd>
            </div>
            <div className="pressure-stat">
              <dt>{t("oldestQueuedAt")}</dt>
              <dd>{oldestWaiting ?? "—"}</dd>
            </div>
          </dl>
          {pressure.queuedJobs === 0 && <p className="muted">{t("noQueuedJobs")}</p>}
        </section>

        <section className="surface operations-block" aria-label={t("solverLoad")}>
          <div>
            <h2>{t("solverLoad")}</h2>
          </div>
          <div className="table-wrap">
            <table className="solver-load-table">
              <caption className="sr-only">{t("solverLoad")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("solver")}</th>
                  <th scope="col">{t("runningSlots")}</th>
                  <th scope="col">{t("queuedSlots")}</th>
                </tr>
              </thead>
              <tbody>
                {operations.data.solverLoads.map((load) => (
                  <tr key={load.solver}>
                    <th scope="row">{load.solver}</th>
                    <td>{load.runningSlots} <span className="muted">({load.runningJobs} {t(load.runningJobs === 1 ? "job" : "jobsUnit")})</span></td>
                    <td>{load.queuedSlots} <span className="muted">({load.queuedJobs} {t(load.queuedJobs === 1 ? "job" : "jobsUnit")})</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
