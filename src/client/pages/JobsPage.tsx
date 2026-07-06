import { useMemo, useState } from "react";

import type { CanonicalJobState, JobRecord, PaginatedJobs } from "../../shared/types/hpc";
import { AuthGate } from "../components/AuthGate";
import { StatusPill } from "../components/StatusPill";
import { useApi } from "../lib/api";
import { formatBudapestDateTime } from "../lib/format";

const PAGE_SIZE = 5;
const ALL_STATES = ["all", "queued", "running", "hold", "suspended", "error", "finished", "deleted"] as const;
const PRESETS = ["7d", "30d", "1y"] as const;

export function JobsPage() {
  return (
    <AuthGate>
      <JobsPageInner />
    </AuthGate>
  );
}

function JobsPageInner() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<(typeof ALL_STATES)[number]>("all");
  const [preset, setPreset] = useState<(typeof PRESETS)[number]>("30d");
  const [page, setPage] = useState(1);

  const historyPath = useMemo(() => {
    const params = new URLSearchParams({
      state,
      preset,
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });

    if (query) params.set("query", query);

    return `/api/jobs/history?${params.toString()}`;
  }, [page, preset, query, state]);

  const activeJobs = useApi<JobRecord[]>("/api/jobs/active");
  const history = useApi<PaginatedJobs>(historyPath);

  if (activeJobs.loading || history.loading) {
    return <main className="page"><section className="surface">Loading jobs…</section></main>;
  }

  if (activeJobs.error || history.error || !activeJobs.data || !history.data) {
    return <main className="page"><section className="surface">Failed to load jobs.</section></main>;
  }

  const historyData = history.data;

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">My Jobs</p>
          <h1>Active jobs and personal history</h1>
          <p className="lede">Keep live jobs and 1-year finished-job history separate. Filters stay intentionally small: search, state, preset, pagination.</p>
        </div>
      </section>

      <section className="surface">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Active jobs</p>
            <h2>Current scheduler view</h2>
          </div>
          <span className="muted">{activeJobs.data.length} active jobs</span>
        </div>
        {activeJobs.data.length ? (
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
                {activeJobs.data.map((job) => (
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
          <p className="muted">No active jobs on the cluster.</p>
        )}
      </section>

      <section className="surface">
        <div className="section-title-row section-title-row--stack">
          <div>
            <p className="eyebrow">Past jobs</p>
            <h2>1-year personal job history</h2>
          </div>
          <form className="filters" onSubmit={(event) => event.preventDefault()}>
            <label>
              <span>Search</span>
              <input
                className="form-input"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Job ID or name"
              />
            </label>
            <label>
              <span>State</span>
              <select
                className="form-input"
                value={state}
                onChange={(event) => {
                  setState(event.target.value as CanonicalJobState | "all");
                  setPage(1);
                }}
              >
                {ALL_STATES.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <fieldset className="preset-group">
              <legend>Date preset</legend>
              <div>
                {PRESETS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={option === preset ? "btn btn-primary" : "btn btn-secondary"}
                    onClick={() => {
                      setPreset(option);
                      setPage(1);
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>
          </form>
        </div>

        {historyData.items.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Name</th>
                  <th>State</th>
                  <th>Submitted at</th>
                  <th>Started at</th>
                  <th>Finished at</th>
                </tr>
              </thead>
              <tbody>
                {historyData.items.map((job) => (
                  <tr key={job.jobId}>
                    <td>{job.jobId}</td>
                    <td>{job.name}</td>
                    <td><StatusPill value={job.state} /></td>
                    <td>{formatBudapestDateTime(job.submittedAt)}</td>
                    <td>{formatBudapestDateTime(job.startedAt)}</td>
                    <td>{formatBudapestDateTime(job.finishedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No jobs matched the selected filters.</p>
        )}

        <div className="pagination-row">
          <span className="muted">Showing {historyData.items.length} of {historyData.total} jobs</span>
          <div className="pagination-controls">
            <button className="btn btn-secondary" disabled={historyData.page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
            <span>Page {historyData.page} / {historyData.totalPages}</span>
            <button className="btn btn-secondary" disabled={historyData.page === historyData.totalPages} onClick={() => setPage((value) => Math.min(historyData.totalPages, value + 1))}>Next</button>
          </div>
        </div>
      </section>
    </main>
  );
}
