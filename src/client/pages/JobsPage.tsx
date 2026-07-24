import { useState } from "react";

import type { CanonicalJobState, JobRecord, PaginatedJobs } from "../../shared/types/hpc";
import { StatusPill } from "../components/StatusPill";
import { useApi } from "../lib/api";
import { formatBudapestDateTime } from "../lib/format";
import { useUi } from "../lib/ui";

const PAGE_SIZE = 5;
const ALL_STATES = ["all", "queued", "running", "hold", "suspended", "error", "finished", "deleted"] as const;
const PRESETS = ["7d", "30d", "1y"] as const;

export function JobsPage() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<(typeof ALL_STATES)[number]>("all");
  const [preset, setPreset] = useState<(typeof PRESETS)[number]>("30d");
  const [page, setPage] = useState(1);
  const { statusLabel, t } = useUi();

  const historyPath = `/api/jobs/history?${new URLSearchParams({
    query,
    state,
    preset,
    page: String(page),
    pageSize: String(PAGE_SIZE),
  })}`;

  const activeJobs = useApi<JobRecord[]>("/api/jobs/active");
  const history = useApi<PaginatedJobs>(historyPath);

  if (activeJobs.loading || history.loading) {
    return <main className="page"><section className="surface">{t("loadingJobs")}</section></main>;
  }

  if (activeJobs.error || history.error || !activeJobs.data || !history.data) {
    return <main className="page"><section className="surface">{t("failedJobsPage")}</section></main>;
  }

  const historyData = history.data;

  return (
    <main className="page">
      <section className="surface">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">{t("activeJobs")}</p>
            <h2>{t("currentSchedulerView")}</h2>
          </div>
          <span className="muted">{t("activeJobsCount", { count: activeJobs.data.length })}</span>
        </div>
        {activeJobs.data.length ? (
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
          <p className="muted">{t("noActiveJobsOnCluster")}</p>
        )}
      </section>

      <section className="surface">
        <div className="section-title-row section-title-row--stack">
          <div>
            <p className="eyebrow">{t("pastJobs")}</p>
            <h2>{t("personalJobHistory")}</h2>
          </div>
          <form className="filters" onSubmit={(event) => event.preventDefault()}>
            <label>
              <span>{t("search")}</span>
              <input
                className="form-input"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder={t("searchPlaceholder")}
              />
            </label>
            <label>
              <span>{t("state")}</span>
              <select
                className="form-input"
                value={state}
                onChange={(event) => {
                  setState(event.target.value as CanonicalJobState | "all");
                  setPage(1);
                }}
              >
                {ALL_STATES.map((option) => (
                  <option key={option} value={option}>{statusLabel(option)}</option>
                ))}
              </select>
            </label>
            <fieldset className="preset-group">
              <legend>{t("datePreset")}</legend>
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
                  <th>{t("jobId")}</th>
                  <th>{t("name")}</th>
                  <th>{t("state")}</th>
                  <th>{t("submittedAt")}</th>
                  <th>{t("startedAt")}</th>
                  <th>{t("finishedAt")}</th>
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
          <p className="muted">{t("noJobsMatched")}</p>
        )}

        <div className="pagination-row">
          <span className="muted">{t("showingJobs", { shown: historyData.items.length, total: historyData.total })}</span>
          <div className="pagination-controls">
            <button className="btn btn-secondary" disabled={historyData.page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>{t("previous")}</button>
            <span>{t("page")} {historyData.page} / {historyData.totalPages}</span>
            <button className="btn btn-secondary" disabled={historyData.page === historyData.totalPages} onClick={() => setPage((value) => Math.min(historyData.totalPages, value + 1))}>{t("next")}</button>
          </div>
        </div>
      </section>
    </main>
  );
}
