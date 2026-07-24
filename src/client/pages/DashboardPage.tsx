import type { ClusterSummary, JobRecord } from "../../shared/types/hpc";
import { FreshnessBanner } from "../components/FreshnessBanner";
import { MetricCard } from "../components/MetricCard";
import { StatusPill } from "../components/StatusPill";
import { formatBudapestDateTime } from "../lib/format";
import { useApi } from "../lib/api";
import { useUi } from "../lib/ui";

export function DashboardPage() {
  const summary = useApi<ClusterSummary>("/api/dashboard/summary");
  const myJobs = useApi<JobRecord[]>("/api/jobs/active");
  const { t } = useUi();

  if (summary.loading || myJobs.loading) {
    return <main className="page"><section className="surface">{t("loadingDashboard")}</section></main>;
  }

  if (summary.error || myJobs.error || !summary.data || !myJobs.data) {
    return <main className="page"><section className="surface">{t("failedDashboard")}</section></main>;
  }

  const utilizationPercent = summary.data.totalSlots > 0
    ? Math.round((summary.data.usedSlots / summary.data.totalSlots) * 100)
    : 0;
  const utilizationBarPercent = Math.max(0, Math.min(utilizationPercent, 100));

  return (
    <main className="page">
      <FreshnessBanner updatedAt={summary.data.updatedAt} />

      <section className="metric-grid" aria-label={t("dashboard")}>
        <MetricCard label={t("clusterUtilization")} value={`${utilizationPercent}%`} detail={t("usedOfTotalSlots", { used: summary.data.usedSlots, total: summary.data.totalSlots })} />
        <MetricCard label={t("runningJobs")} value={summary.data.runningJobs} detail={t("liveSchedulerCount")} />
        <MetricCard label={t("queuedJobs")} value={summary.data.queuedJobs} detail={t("waitingInSchedulerQueue")} />
        <MetricCard label={t("failedJobs")} value={summary.data.failedJobs} detail={t("schedulerErrorInterpretation")} />
        <MetricCard label={t("jobsOnHold")} value={summary.data.holdJobs} detail={t("holdStatesOnly")} />
        <MetricCard label={t("myActiveJobs")} value={summary.data.myActiveJobsCount} detail={t("previewFromCurrentJobs")} />
      </section>

      <section className="two-column">
        <article className="surface">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">{t("health")}</p>
              <h2>{t("clusterHealthSummary")}</h2>
            </div>
            <StatusPill value={summary.data.healthStatus} />
          </div>
          <dl className="detail-list">
            <div>
              <dt>{t("offlineNodes")}</dt>
              <dd>{summary.data.offlineNodeCount}</dd>
            </div>
            <div>
              <dt>{t("freeSlots")}</dt>
              <dd>{summary.data.freeSlots}</dd>
            </div>
            <div>
              <dt>{t("healthRule")}</dt>
              <dd>{t("healthRuleText")}</dd>
            </div>
          </dl>
        </article>

        <article className="surface">
          <p className="eyebrow">{t("capacity")}</p>
          <h2>{t("clusterUtilization")}</h2>
          <progress
            className="progress"
            max={100}
            value={utilizationBarPercent}
            aria-label={t("clusterUtilization")}
          >
            {utilizationPercent}%
          </progress>
          <p className="muted">{t("utilizationInUse", { percent: utilizationPercent })}</p>
        </article>
      </section>

      <section className="surface">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">{t("myJobs")}</p>
            <h2>{t("activeJobsPreview")}</h2>
          </div>
          <a className="btn btn-secondary" href="/jobs">{t("openMyJobs")}</a>
        </div>
        {myJobs.data.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("jobId")}</th>
                  <th>{t("name")}</th>
                  <th>{t("state")}</th>
                  <th>{t("submittedAt")}</th>
                  <th>{t("startedAt")}</th>
                </tr>
              </thead>
              <tbody>
                {myJobs.data.slice(0, 5).map((job) => (
                  <tr key={job.jobId}>
                    <td>{job.jobId}</td>
                    <td>{job.name}</td>
                    <td><StatusPill value={job.state} /></td>
                    <td>{formatBudapestDateTime(job.submittedAt)}</td>
                    <td>{formatBudapestDateTime(job.startedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">{t("noActiveJobsRightNow")}</p>
        )}
      </section>
    </main>
  );
}
