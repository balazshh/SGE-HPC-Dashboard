import { useEffect, useRef, useState } from "react";

import type { CanonicalJobState, JobRecord, PaginatedJobs } from "../../shared/types/hpc";
import { StatusPill } from "../components/StatusPill";
import { useApi } from "../lib/api";
import { formatDateTime, formatNumber } from "../lib/format";
import { useUi } from "../lib/ui";

const PAGE_SIZE = 5;
const ALL_STATES = ["all", "queued", "running", "hold", "suspended", "error", "finished", "deleted"] as const;
const PRESETS = ["7d", "30d", "1y"] as const;

export function JobsPage() {
  const [query, setQuery] = useState("");
  const [queue, setQueue] = useState("");
  const [state, setState] = useState<(typeof ALL_STATES)[number]>("all");
  const [preset, setPreset] = useState<(typeof PRESETS)[number]>("30d");
  const [page, setPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);
  const detailsRef = useRef<HTMLElement>(null);
  const { language, statusLabel, t } = useUi();

  useEffect(() => {
    if (selectedJob) detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedJob]);

  const historyPath = `/api/jobs/history?${new URLSearchParams({
    query,
    queue,
    state,
    preset,
    page: String(page),
    pageSize: String(PAGE_SIZE),
  })}`;

  const activeJobs = useApi<JobRecord[]>("/api/jobs/active");
  const history = useApi<PaginatedJobs>(historyPath);

  if (activeJobs.loading || (history.loading && !history.data)) {
    return <main className="page"><section className="surface">{t("loadingJobs")}</section></main>;
  }

  if (activeJobs.error || history.error || !activeJobs.data || !history.data) {
    return <main className="page"><section className="surface">{t("failedJobsPage")}</section></main>;
  }

  const historyData = history.data;
  const normalizedQueue = queue.trim().toLowerCase();
  const visibleActiveJobs = normalizedQueue
    ? activeJobs.data.filter((job) => job.queueName?.toLowerCase().includes(normalizedQueue))
    : activeJobs.data;

  return (
    <main className="page">
      <section className="surface">
        <div className="section-title-row">
          <div>
            <h2>{t("activeJobs")}</h2>
            <p className="muted">{t("activeJobsCount", { count: visibleActiveJobs.length })}</p>
          </div>
        </div>
        {visibleActiveJobs.length ? (
          <div className="table-wrap">
            <table>
              <caption className="sr-only">{t("currentSchedulerView")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("jobId")}</th>
                  <th scope="col">{t("name")}</th>
                  <th scope="col">{t("state")}</th>
                  <th scope="col">{t("submittedAt")}</th>
                  <th scope="col">{t("startedAt")}</th>
                </tr>
              </thead>
              <tbody>
                {visibleActiveJobs.map((job) => (
                  <tr key={job.jobId}>
                    <td><button className="table-link" type="button" onClick={() => setSelectedJob(job)}>{job.jobId}</button></td>
                    <td>{job.name}</td>
                    <td><StatusPill value={job.state} /></td>
                    <td>{formatDateTime(job.submittedAt, language)}</td>
                    <td>{formatDateTime(job.startedAt, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">{normalizedQueue ? t("noJobsMatched") : t("noActiveJobsOnCluster")}</p>
        )}
      </section>

      <section className="surface" aria-busy={history.loading}>
        <div className="section-title-row section-title-row--stack">
          <div>
            <h2>{t("personalJobHistory")}</h2>
          </div>
          <form className="filters" onSubmit={(event) => event.preventDefault()}>
            <label>
              <span>{t("search")}</span>
              <input
                className="form-input"
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder={t("searchPlaceholder")}
              />
            </label>
            <label>
              <span>{t("queueName")}</span>
              <input
                className="form-input"
                type="search"
                value={queue}
                onChange={(event) => {
                  setQueue(event.target.value);
                  setPage(1);
                }}
                placeholder={t("queueName")}
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
                    aria-pressed={option === preset}
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
              <caption className="sr-only">{t("personalJobHistory")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("jobId")}</th>
                  <th scope="col">{t("name")}</th>
                  <th scope="col">{t("state")}</th>
                  <th scope="col">{t("submittedAt")}</th>
                  <th scope="col">{t("startedAt")}</th>
                  <th scope="col">{t("finishedAt")}</th>
                </tr>
              </thead>
              <tbody>
                {historyData.items.map((job) => (
                  <tr key={job.jobId}>
                    <td><button className="table-link" type="button" onClick={() => setSelectedJob(job)}>{job.jobId}</button></td>
                    <td>{job.name}</td>
                    <td><StatusPill value={job.state} /></td>
                    <td>{formatDateTime(job.submittedAt, language)}</td>
                    <td>{formatDateTime(job.startedAt, language)}</td>
                    <td>{formatDateTime(job.finishedAt, language)}</td>
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

      {selectedJob && (
        <section ref={detailsRef} className="surface job-details" role="dialog" aria-modal="true" aria-labelledby="job-details-title">
          <div className="section-title-row">
            <div>
              <h2 id="job-details-title">{t("jobDetails")}</h2>
              <p className="muted">{selectedJob.jobId} · {selectedJob.name}</p>
            </div>
            <button className="btn btn-secondary" type="button" onClick={() => setSelectedJob(null)}>{t("close")}</button>
          </div>
          <dl className="job-details__grid">
            <div><dt>{t("state")}</dt><dd><StatusPill value={selectedJob.state} /></dd></div>
            <div><dt>{t("queueName")}</dt><dd>{selectedJob.queueName ?? t("notAvailable")}</dd></div>
            <div><dt>{t("pendingReason")}</dt><dd>{selectedJob.reason ?? t("notAvailable")}</dd></div>
            <div><dt>{t("nodeList")}</dt><dd>{selectedJob.nodeList ?? t("notAvailable")}</dd></div>
            <div><dt>{t("pendingResources")}</dt><dd>{selectedJob.slots === undefined ? t("notAvailable") : formatNumber(selectedJob.slots, language)}</dd></div>
            <div><dt>{t("submittedAt")}</dt><dd>{formatDateTime(selectedJob.submittedAt, language)}</dd></div>
            <div><dt>{t("startedAt")}</dt><dd>{formatDateTime(selectedJob.startedAt, language)}</dd></div>
            {selectedJob.finishedAt && <div><dt>{t("finishedAt")}</dt><dd>{formatDateTime(selectedJob.finishedAt, language)}</dd></div>}
          </dl>
        </section>
      )}
    </main>
  );
}
