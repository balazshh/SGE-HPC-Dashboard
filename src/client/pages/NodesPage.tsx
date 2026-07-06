import type { NodeRecord } from "../../shared/types/hpc";
import { AuthGate } from "../components/AuthGate";
import { MetricCard } from "../components/MetricCard";
import { StatusPill } from "../components/StatusPill";
import { useApi } from "../lib/api";
import { formatBudapestDateTime } from "../lib/format";
import { useUi } from "../lib/ui";

function readNumber(value?: string | null) {
  const number = Number.parseFloat(value ?? "");
  return Number.isFinite(number) ? number : null;
}

function show(value?: string | number | null) {
  return value ?? "—";
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
  const updatedAt = items[0]?.lastSeenAt;
  const okCount = items.filter((node) => node.status === "ok").length;
  const partialCount = items.filter((node) => node.status === "partial").length;
  const missingCount = items.filter((node) => node.status === "missing").length;
  const idleCount = items.filter((node) => node.status === "ok" && readNumber(node.loadRaw) === 0).length;
  const busyCount = items.filter((node) => node.status === "ok" && (readNumber(node.loadRaw) ?? 0) > 0).length;

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">{t("nodes")}</p>
          <h1>{t("liveNodeInventory")}</h1>
          <p className="lede">{t("nodesPageLede")}</p>
        </div>
        {updatedAt ? (
          <div className="page-header__meta">
            <span className="muted">{t("lastUpdated")}</span>
            <strong>{formatBudapestDateTime(updatedAt)}</strong>
          </div>
        ) : null}
      </section>

      <section className="metric-grid" aria-label={t("nodes")}>
        <MetricCard label={t("totalNodes")} value={items.length} detail={t("nodesFromQhost")} />
        <MetricCard label={t("okNodes")} value={okCount} detail={t("completeQhostRows")} />
        <MetricCard label={t("partialNodes")} value={partialCount} detail={t("partialQhostRows")} />
        <MetricCard label={t("missingNodes")} value={missingCount} detail={t("missingQhostRows")} />
        <MetricCard label={t("idleNodes")} value={idleCount} detail={t("idleNodesDetail")} />
        <MetricCard label={t("busyNodes")} value={busyCount} detail={t("busyNodesDetail")} />
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
                  <th>{t("swapTotal")}</th>
                  <th>{t("swapUsed")}</th>
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
                      <td>{show(node.arch)}</td>
                      <td>{show(node.ncpu)}</td>
                      <td>{show(node.nsoc)}</td>
                      <td>{show(node.ncor)}</td>
                      <td>{show(node.nthr)}</td>
                      <td>{show(node.loadRaw)}</td>
                      <td>{show(loadPerCpu)}</td>
                      <td>{show(node.memtotRaw)}</td>
                      <td>{show(node.memuseRaw)}</td>
                      <td>{show(node.swaptoRaw)}</td>
                      <td>{show(node.swapusRaw)}</td>
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
