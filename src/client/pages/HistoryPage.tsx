import { useState } from "react";

import type { HistoryBucket, HistoryPreset } from "../../shared/types/hpc";
import { MetricCard } from "../components/MetricCard";
import { useApi } from "../lib/api";
import { formatHistoryBucketLabel } from "../lib/format";
import { useUi } from "../lib/ui";

const PRESETS: HistoryPreset[] = ["24h", "7d", "30d", "1y"];

export function HistoryPage() {
  const [preset, setPreset] = useState<HistoryPreset>("7d");
  const history = useApi<HistoryBucket[]>(`/api/history?preset=${preset}`);
  const { language, t } = useUi();

  if (history.loading) {
    return <main className="page"><section className="surface">{t("loadingHistory")}</section></main>;
  }

  if (history.error || !history.data) {
    return <main className="page"><section className="surface">{t("failedHistory")}</section></main>;
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
          <p className="eyebrow">{t("myHistory")}</p>
          <h1>{t("personalHistoricalTrends")}</h1>
          <p className="lede">{t("historyPageLede")}</p>
        </div>
        <div className="preset-group" role="group" aria-label={t("range")}>
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
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard label={t("submitted")} value={totals.submitted} detail={t("acrossPreset", { preset })} />
        <MetricCard label={t("started")} value={totals.started} detail={t("jobsEnteringExecution")} />
        <MetricCard label={t("finished")} value={totals.finished} detail={t("completedSuccessfully")} />
        <MetricCard label={t("failed")} value={totals.failed} detail={t("explicitFailuresOnly")} />
      </section>

      <section className="surface">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">{t("trendChart")}</p>
            <h2>{t("finishedVsFailedJobs")}</h2>
          </div>
          <span className="muted">{t("preset")}: {preset}</span>
        </div>
        <div className="history-chart" role="img" aria-label={t("barChartLabel", { preset })}>
          {history.data.map((bucket) => (
            <div key={bucket.bucketStart} className="history-chart__bucket">
              <div className="history-chart__bars">
                <span
                  className="history-chart__bar history-chart__bar--finished"
                  style={{ height: `${(bucket.finishedCount / maxHeight) * 160}px` }}
                  title={`${t("finished")}: ${bucket.finishedCount}`}
                />
                <span
                  className="history-chart__bar history-chart__bar--failed"
                  style={{ height: `${(bucket.failedCount / maxHeight) * 160}px` }}
                  title={`${t("failed")}: ${bucket.failedCount}`}
                />
              </div>
              <span className="history-chart__label">{formatHistoryBucketLabel(bucket.bucketStart, preset, language)}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
