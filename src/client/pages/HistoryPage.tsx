import { useState } from "react";

import type { HistoryBucket, HistoryPreset } from "../../shared/types/hpc";
import { HistoryBarChart } from "../components/HistoryBarChart";
import { MetricCard } from "../components/MetricCard";
import { useApi } from "../lib/api";
import { formatHistoryBucketLabel } from "../lib/format";
import { useUi } from "../lib/ui";

const PRESETS: HistoryPreset[] = ["24h", "7d", "30d", "1y"];

export function HistoryPage() {
  const [preset, setPreset] = useState<HistoryPreset>("7d");
  const history = useApi<HistoryBucket[]>(`/api/history?preset=${preset}`);
  const { language, t } = useUi();

  if (history.loading && !history.data) {
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

  return (
    <main className="page">
      <section className="page-header">
        <div>
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
                aria-pressed={option === preset}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="metric-grid metric-grid--history">
        <MetricCard label={t("submitted")} value={totals.submitted} detail={t("acrossPreset", { preset })} />
        <MetricCard label={t("started")} value={totals.started} detail={t("jobsEnteringExecution")} />
        <MetricCard label={t("finished")} value={totals.finished} detail={t("completedSuccessfully")} />
        <MetricCard label={t("failed")} value={totals.failed} detail={t("explicitFailuresOnly")} />
      </section>

      <section className="surface" aria-busy={history.loading}>
        <div className="section-title-row">
          <div>
            <h2>{t("finishedVsFailedJobs")}</h2>
          </div>
        </div>
        <HistoryBarChart
          data={history.data}
          ariaLabel={t("barChartLabel", { preset })}
          noDataLabel={t("noHistoryChartData")}
          interactionLabel={t("chartInteractionHint")}
          finishedLabel={t("finished")}
          failedLabel={t("failed")}
          formatTime={(value) => formatHistoryBucketLabel(value, preset, language)}
        />
      </section>
    </main>
  );
}
