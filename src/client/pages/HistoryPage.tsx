import { useState } from "react";

import type { HistoryBucket, HistoryPreset } from "../../shared/types/hpc";
import { AuthGate } from "../components/AuthGate";
import { MetricCard } from "../components/MetricCard";
import { useApi } from "../lib/api";

const PRESETS: HistoryPreset[] = ["24h", "7d", "30d", "1y"];

export function HistoryPage() {
  return (
    <AuthGate>
      <HistoryPageInner />
    </AuthGate>
  );
}

function HistoryPageInner() {
  const [preset, setPreset] = useState<HistoryPreset>("7d");
  const history = useApi<HistoryBucket[]>(`/api/history?preset=${preset}`);

  if (history.loading) {
    return <main className="page"><section className="surface">Loading history…</section></main>;
  }

  if (history.error || !history.data) {
    return <main className="page"><section className="surface">Failed to load history.</section></main>;
  }

  const totals = history.data.reduce(
    (accumulator, bucket) => ({
      submitted: accumulator.submitted + bucket.submittedCount,
      started: accumulator.started + bucket.startedCount,
      finished: accumulator.finished + bucket.finishedCount,
      failed: accumulator.failed + bucket.failedCount,
    }),
    { submitted: 0, started: 0, finished: 0, failed: 0 },
  );

  const maxHeight = Math.max(1, ...history.data.map((bucket) => Math.max(bucket.finishedCount, bucket.failedCount)));

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">My History</p>
          <h1>Personal historical trends</h1>
          <p className="lede">Short ranges use hourly rollups. Longer ranges switch to daily rollups to keep the page readable.</p>
        </div>
        <fieldset className="preset-group">
          <legend>Range</legend>
          <div>
            {PRESETS.map((option) => (
              <button
                key={option}
                type="button"
                className={option === preset ? "btn btn-primary" : "btn btn-secondary"}
                onClick={() => setPreset(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="metric-grid">
        <MetricCard label="Submitted" value={totals.submitted} detail={`Across ${preset}`} />
        <MetricCard label="Started" value={totals.started} detail="Jobs entering execution" />
        <MetricCard label="Finished" value={totals.finished} detail="Completed successfully" />
        <MetricCard label="Failed" value={totals.failed} detail="Explicit failures only" />
      </section>

      <section className="surface">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Trend chart</p>
            <h2>Finished vs failed jobs</h2>
          </div>
          <span className="muted">Preset: {preset}</span>
        </div>
        <div className="history-chart" role="img" aria-label={`Bar chart of finished and failed jobs for ${preset}`}>
          {history.data.map((bucket) => (
            <div key={bucket.label} className="history-chart__bucket">
              <div className="history-chart__bars">
                <span
                  className="history-chart__bar history-chart__bar--finished"
                  style={{ height: `${(bucket.finishedCount / maxHeight) * 160}px` }}
                  title={`Finished: ${bucket.finishedCount}`}
                />
                <span
                  className="history-chart__bar history-chart__bar--failed"
                  style={{ height: `${(bucket.failedCount / maxHeight) * 160}px` }}
                  title={`Failed: ${bucket.failedCount}`}
                />
              </div>
              <span className="history-chart__label">{bucket.label}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
