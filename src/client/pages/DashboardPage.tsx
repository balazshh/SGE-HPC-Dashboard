import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { AuthGate } from "../components/AuthGate";
import { FreshnessBanner } from "../components/FreshnessBanner";
import { MetricCard } from "../components/MetricCard";
import { StatusPill } from "../components/StatusPill";
import { formatBudapestDateTime } from "../lib/format";
import { useTRPC } from "../lib/trpc";

export function DashboardPage() {
  return (
    <AuthGate>
      <DashboardPageInner />
    </AuthGate>
  );
}

function DashboardPageInner() {
  const trpc = useTRPC();
  const summary = useQuery(trpc.dashboard.getSummary.queryOptions());
  const myJobs = useQuery(trpc.dashboard.getMyActiveJobsPreview.queryOptions());

  if (!summary.data || !myJobs.data) {
    return <main className="page"><section className="surface">Loading dashboard…</section></main>;
  }

  const utilizationPercent = summary.data.totalSlots > 0
    ? Math.round((summary.data.usedSlots / summary.data.totalSlots) * 100)
    : 0;

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Cluster status at a glance</h1>
          <p className="lede">Live status comes from qstat. Timestamps are stored in UTC and shown here in Europe/Budapest.</p>
        </div>
        <div className="page-header__meta">
          <span className="muted">Last updated</span>
          <strong>{formatBudapestDateTime(summary.data.updatedAt)}</strong>
        </div>
      </section>

      <FreshnessBanner updatedAt={summary.data.updatedAt} />

      <section className="metric-grid" aria-label="Cluster summary">
        <MetricCard label="Cluster utilization" value={`${utilizationPercent}%`} detail={`${summary.data.usedSlots} used / ${summary.data.totalSlots} total slots`} />
        <MetricCard label="Running jobs" value={summary.data.runningJobs} detail="Live scheduler count" />
        <MetricCard label="Queued jobs" value={summary.data.queuedJobs} detail="Waiting in scheduler queue" />
        <MetricCard label="Failed jobs" value={summary.data.failedJobs} detail="Explicit scheduler error/failure interpretation" />
        <MetricCard label="Jobs on hold" value={summary.data.holdJobs} detail="Hold states only" />
        <MetricCard label="My active jobs" value={summary.data.myActiveJobsCount} detail="Preview from current jobs" />
      </section>

      <section className="two-column">
        <article className="surface">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Health</p>
              <h2>Cluster health summary</h2>
            </div>
            <StatusPill value={summary.data.healthStatus} />
          </div>
          <dl className="detail-list">
            <div>
              <dt>Offline nodes</dt>
              <dd>{summary.data.offlineNodeCount}</dd>
            </div>
            <div>
              <dt>Free slots</dt>
              <dd>{summary.data.freeSlots}</dd>
            </div>
            <div>
              <dt>Health rule</dt>
              <dd>Healthy: scheduler reachable. Degraded: some nodes offline. Down: scheduler query failed.</dd>
            </div>
          </dl>
        </article>

        <article className="surface">
          <p className="eyebrow">Capacity</p>
          <h2>Cluster utilization</h2>
          <div className="progress" aria-hidden="true">
            <span style={{ width: `${utilizationPercent}%` }} />
          </div>
          <p className="muted">{utilizationPercent}% of cluster slots are currently in use.</p>
        </article>
      </section>

      <section className="surface">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">My jobs</p>
            <h2>Active jobs preview</h2>
          </div>
          <Link className="btn btn-secondary" to="/jobs">Open My Jobs</Link>
        </div>
        {myJobs.data.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Name</th>
                  <th>State</th>
                  <th>Submitted at</th>
                  <th>Started at</th>
                </tr>
              </thead>
              <tbody>
                {myJobs.data.map((job) => (
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
          <p className="muted">You have no active jobs right now.</p>
        )}
      </section>
    </main>
  );
}
