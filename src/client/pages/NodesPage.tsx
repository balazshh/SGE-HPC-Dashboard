import type { NodeRecord } from "../../shared/types/hpc";
import { AuthGate } from "../components/AuthGate";
import { MetricCard } from "../components/MetricCard";
import { StatusPill } from "../components/StatusPill";
import { useApi } from "../lib/api";
import { formatMemoryGigabytes } from "../lib/format";
import { useUi } from "../lib/ui";

function readNumber(value?: string | null) {
  const number = Number.parseFloat(value ?? "");
  return Number.isFinite(number) ? number : null;
}

export function NodesPage() {
  return (
    <AuthGate>
      <NodesPageInner />
    </AuthGate>
  );
}

function NodesPageInner() {
  const nodes = useApi<NodeRecord[]>("/api/nodes");
  const { t } = useUi();

  if (nodes.loading) {
    return <main className="page"><section className="surface">{t("loadingNodes")}</section></main>;
  }

  if (nodes.error || !nodes.data) {
    return <main className="page"><section className="surface">{t("failedNodes")}</section></main>;
  }

  const items = nodes.data;
  const counts = items.reduce((summary, node) => {
    summary[node.status] += 1;
    if (node.status === "ok") {
      const load = readNumber(node.loadRaw) ?? 0;
      if (load === 0) summary.idle += 1;
      else summary.busy += 1;
    }
    return summary;
  }, { ok: 0, partial: 0, missing: 0, idle: 0, busy: 0 });

  return (
    <main className="page">
      <section className="metric-grid" aria-label={t("nodes")}>
        <MetricCard label={t("totalNodes")} value={items.length} detail={t("nodesFromQhost")} />
        <MetricCard label={t("okNodes")} value={counts.ok} detail={t("completeQhostRows")} />
        <MetricCard label={t("partialNodes")} value={counts.partial} detail={t("partialQhostRows")} />
        <MetricCard label={t("missingNodes")} value={counts.missing} detail={t("missingQhostRows")} />
        <MetricCard label={t("idleNodes")} value={counts.idle} detail={t("idleNodesDetail")} />
        <MetricCard label={t("busyNodes")} value={counts.busy} detail={t("busyNodesDetail")} />
      </section>

      <section className="surface">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">{t("nodes")}</p>
            <h2>{t("currentQhostView")}</h2>
          </div>
        </div>
        {items.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("hostname")}</th>
                  <th>{t("nodeStatus")}</th>
                  <th>{t("nodeArch")}</th>
                  <th>{t("ncpu")}</th>
                  <th>{t("nsoc")}</th>
                  <th>{t("ncor")}</th>
                  <th>{t("nthr")}</th>
                  <th>{t("load")}</th>
                  <th>{t("loadPerCpu")}</th>
                  <th>{t("memoryTotal")}</th>
                  <th>{t("memoryUsed")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((node) => {
                  const load = readNumber(node.loadRaw);
                  const loadPerCpu = load !== null && node.ncpu ? (load / node.ncpu).toFixed(2) : null;

                  return (
                    <tr key={node.hostname}>
                      <td>{node.hostname}</td>
                      <td><StatusPill value={node.status} /></td>
                      <td>{node.arch ?? "—"}</td>
                      <td>{node.ncpu ?? "—"}</td>
                      <td>{node.nsoc ?? "—"}</td>
                      <td>{node.ncor ?? "—"}</td>
                      <td>{node.nthr ?? "—"}</td>
                      <td>{node.loadRaw ?? "—"}</td>
                      <td>{loadPerCpu ?? "—"}</td>
                      <td>{formatMemoryGigabytes(node.memtotRaw)}</td>
                      <td>{formatMemoryGigabytes(node.memuseRaw)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">{t("noNodesData")}</p>
        )}
      </section>
    </main>
  );
}
