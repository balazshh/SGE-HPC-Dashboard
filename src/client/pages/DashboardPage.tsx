import type { ClusterHistoryPoint, ClusterSummary, JobRecord } from "../../shared/types/hpc";
import { FreshnessBanner } from "../components/FreshnessBanner";
import { MetricCard } from "../components/MetricCard";
import { StatusPill } from "../components/StatusPill";
import { TimeChart } from "../components/TimeChart";
import { useApi } from "../lib/api";
import { formatBudapestDateTime, formatHistoryBucketLabel, formatNumber } from "../lib/format";
import { useUi } from "../lib/ui";

export function DashboardPage() {
  const summary = useApi<ClusterSummary>("/api/dashboard/summary");
  const clusterHistory = useApi<ClusterHistoryPoint[]>("/api/dashboard/history");
  const myJobs = useApi<JobRecord[]>("/api/jobs/active");
  const { language, t } = useUi();

  if (summary.loading || clusterHistory.loading || myJobs.loading) {
    return <main className="page"><section className="surface">{t("loadingDashboard")}</section></main>;
  }

  if (summary.error || clusterHistory.error || myJobs.error || !summary.data || !clusterHistory.data || !myJobs.data) {
    return <main className="page"><section className="surface">{t("failedDashboard")}</section></main>;
  }

  const utilizationPercent = summary.data.totalSlots > 0
    ? Math.round((summary.data.usedSlots / summary.data.totalSlots) * 100)
    : 0;
  const formatTime = (value: string) => formatHistoryBucketLabel(value, "24h", language);
  const chartEnd = Date.now();
  const chartStart = chartEnd - 24 * 60 * 60 * 1000;

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

      <section className="dashboard-chart-grid" aria-label={t("clusterActivity")}>
        <TimeChart
          title={t("hpcUtilizationOverTime")}
          rangeLabel={t("last24Hours")}
          ariaLabel={t("utilizationTimeChartLabel")}
          noDataLabel={t("noClusterHistory")}
          latestLabel={t("latestValue")}
          points={clusterHistory.data.map((point) => ({ recordedAt: point.recordedAt, value: point.utilizationPercent }))}
          tone="blue"
          domainStart={chartStart}
          domainEnd={chartEnd}
          maxValue={100}
          formatValue={(value) => `${value}%`}
          formatTime={formatTime}
        />
        <TimeChart
          title={t("jobCountOverTime")}
          rangeLabel={t("last24Hours")}
          ariaLabel={t("jobCountTimeChartLabel")}
          noDataLabel={t("noClusterHistory")}
          latestLabel={t("latestValue")}
          points={clusterHistory.data.map((point) => ({ recordedAt: point.recordedAt, value: point.jobCount }))}
          tone="purple"
          domainStart={chartStart}
          domainEnd={chartEnd}
          formatValue={formatNumber}
          formatTime={formatTime}
        />
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
