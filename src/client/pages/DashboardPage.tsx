import type { Capacity, DashboardOverview } from "../../shared/types/hpc";
import { FreshnessBanner } from "../components/FreshnessBanner";
import { MetricCard } from "../components/MetricCard";
import { useApi } from "../lib/api";
import { formatBudapestDateTime, formatNumber } from "../lib/format";
import { useUi } from "../lib/ui";

const REFRESH_MS = 60_000;

function formatWaitAge(oldestPendingAt: string, now = Date.now()) {
  const ageMs = Math.max(0, now - new Date(oldestPendingAt).getTime());
  const minutes = Math.floor(ageMs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function capacityPercent(capacity: Capacity) {
  return capacity.total > 0 ? Math.round((capacity.allocated / capacity.total) * 100) : 0;
}

export function DashboardPage() {
  const overview = useApi<DashboardOverview>("/api/dashboard/overview", { refreshMs: REFRESH_MS });
  const { t } = useUi();

  if (overview.loading && !overview.data) {
    return <main className="page"><section className="surface" role="status">{t("loadingDashboard")}</section></main>;
  }

  if (!overview.data) {
    return (
      <main className="page">
        <section className="surface dashboard-empty" role="alert">
          <p>{t("failedDashboard")}</p>
          <button className="btn btn-primary" type="button" onClick={overview.refetch}>{t("retry")}</button>
        </section>
      </main>
    );
  }

  const data = overview.data;
  const unit = data.resourceUnit === "cpu" ? t("resourceUnitCpu") : t("resourceUnitSlots");
  const percent = capacityPercent(data.capacity);
  const oldestPendingAge = data.jobs.oldestPendingAt
    ? formatWaitAge(data.jobs.oldestPendingAt)
    : null;
  const noData = data.sourceStatus === "no-data" || data.snapshotAt === null;
  const refreshLabel = overview.error
    ? t("retry")
    : overview.refreshing
      ? t("refreshing")
      : t("refreshDashboard");

  return (
    <main className="page">
      <section className="surface dashboard-status" aria-busy={overview.refreshing}>
        <div className="dashboard-status__content">
          <div>
            <p className="dashboard-status__eyebrow">{data.scheduler.toUpperCase()} HPC</p>
            <h1>{t("dashboard")}</h1>
          </div>
          <FreshnessBanner
            updatedAt={data.snapshotAt}
            sourceStatus={data.sourceStatus}
            refreshing={overview.refreshing}
          />
          {data.unavailableNodeCount > 0 && (
            <span className="muted">{t("unavailableNodeCount", { count: data.unavailableNodeCount })}</span>
          )}
        </div>
        <button className="btn btn-secondary" type="button" onClick={overview.refetch} disabled={overview.refreshing}>
          {refreshLabel}
        </button>
      </section>

      {overview.error && (
        <p className="dashboard-alert" role="alert">{t("refreshError")} {overview.error}</p>
      )}

      {noData ? (
        <section className="surface dashboard-empty" role="status">
          <h2>{t("noSnapshot")}</h2>
          <p className="muted">{t("noOverviewData")}</p>
        </section>
      ) : (
        <>
          <section className="metric-grid metric-grid--dashboard" aria-label={t("dashboard")} aria-busy={overview.refreshing}>
            <article className="surface metric-card metric-card--featured">
              <div>
                <p className="metric-card__label">{t("resourceAllocated", { unit })}</p>
                <p className="metric-card__value">{formatNumber(data.capacity.allocated)} / {formatNumber(data.capacity.total)}</p>
                <p className="muted">{percent}% {t("resourceTotal", { unit })}</p>
              </div>
              <progress
                className="utilization-progress"
                max="100"
                value={percent}
                aria-label={`${t("resourceAllocated", { unit })}: ${formatNumber(data.capacity.allocated)} / ${formatNumber(data.capacity.total)}`}
              >
                {percent}%
              </progress>
            </article>
            <MetricCard label={t("resourceAvailable", { unit })} value={formatNumber(data.capacity.available)} />
            <MetricCard label={t("resourceUnavailable", { unit })} value={formatNumber(data.capacity.unavailable)} />
            <MetricCard label={t("runningJobs")} value={data.jobs.running} />
            <MetricCard label={t("queuedJobs")} value={data.jobs.pending} detail={t("pendingResources") + ": " + formatNumber(data.jobs.pendingResources)} />
            <MetricCard label={t("jobsOnHold")} value={data.jobs.held} />
            <MetricCard label={t("activeErrors")} value={data.jobs.activeErrors} />
          </section>

          <section className="operations-grid" aria-label={t("operationsOverview")} aria-busy={overview.refreshing}>
            <section className="surface operations-block operations-block--wide" aria-label={t("queuePressureTitle")}>
              <div className="section-title-row section-title-row--stack">
                <div>
                  <h2>{t("queuePressureTitle")}</h2>
                  {oldestPendingAge && data.jobs.oldestPendingAt && (
                    <p className="muted">{t("oldestQueuedAt")}: {oldestPendingAge} ({formatBudapestDateTime(data.jobs.oldestPendingAt)})</p>
                  )}
                </div>
                <a className="btn btn-secondary" href="/jobs">{t("openMyJobs")}</a>
              </div>
              <dl className="pressure-stats">
                <div className="pressure-stat">
                  <dt>{t("queuedJobs")}</dt>
                  <dd>{formatNumber(data.jobs.pending)}</dd>
                </div>
                <div className="pressure-stat">
                  <dt>{t("pendingResources")}</dt>
                  <dd>{formatNumber(data.jobs.pendingResources)}</dd>
                </div>
                <div className="pressure-stat">
                  <dt>{t("oldestQueuedAt")}</dt>
                  <dd>{data.jobs.oldestPendingAt ? formatBudapestDateTime(data.jobs.oldestPendingAt) : "—"}</dd>
                </div>
              </dl>
              {data.jobs.pending === 0 && <p className="muted">{t("noPendingJobs")}</p>}
            </section>

            <section className="surface operations-block operations-block--wide" aria-label={t("capacityByQueue")}>
              <div>
                <h2>{t("capacityByQueue")}</h2>
              </div>
              {data.queues.length ? (
                <div className="table-wrap">
                  <table className="overview-table">
                    <caption className="sr-only">{t("capacityByQueue")}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{t("queueName")}</th>
                        <th scope="col">{t("queueState")}</th>
                        <th scope="col">{t("allocated")}</th>
                        <th scope="col">{t("available")}</th>
                        <th scope="col">{t("reserved")}</th>
                        <th scope="col">{t("unavailable")}</th>
                        <th scope="col">{t("total")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.queues.map((queue) => {
                        const queuePercent = capacityPercent(queue);
                        return (
                          <tr key={queue.name}>
                            <th scope="row">
                              <span className="queue-capacity__name">{queue.name}</span>
                              <progress
                                className="queue-capacity__progress"
                                max="100"
                                value={queuePercent}
                                aria-label={`${queue.name}: ${formatNumber(queue.allocated)} / ${formatNumber(queue.total)}`}
                              >
                                {queuePercent}%
                              </progress>
                            </th>
                            <td>{queue.state ?? "—"}</td>
                            <td>{formatNumber(queue.allocated)}</td>
                            <td>{formatNumber(queue.available)}</td>
                            <td>{queue.reserved === null ? "—" : formatNumber(queue.reserved)}</td>
                            <td>{formatNumber(queue.unavailable)}</td>
                            <td>{formatNumber(queue.total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">{t("noQueueData")}</p>
              )}
            </section>

            <section className="surface operations-block operations-block--wide" aria-label={t("solverLoad")}>
              <div>
                <h2>{t("solverLoad")}</h2>
              </div>
              <div className="table-wrap">
                <table className="solver-load-table">
                  <caption className="sr-only">{t("solverLoad")}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t("solver")}</th>
                      <th scope="col">{t("runningResources")}</th>
                      <th scope="col">{t("pendingResources")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.solverLoads.map((load) => (
                      <tr key={load.solver}>
                        <th scope="row">{load.solver}</th>
                        <td>{formatNumber(load.runningResources)} <span className="muted">({load.runningJobs} {t(load.runningJobs === 1 ? "job" : "jobsUnit")})</span></td>
                        <td>{formatNumber(load.pendingResources)} <span className="muted">({load.pendingJobs} {t(load.pendingJobs === 1 ? "job" : "jobsUnit")})</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        </>
      )}
    </main>
  );
}
