# Research: HPC-Dashboard UI translation (Hungarian and German)

## Summary

Both sibling repositories use the same client UI, translation catalogue, and localization mechanism. The only material UI difference found in the reviewed files is the product mark in `router.tsx`: `SGE HPC` in `HPC-Dashboard` versus `SLURM HPC` in `SLURM-Dashboard`. Hungarian and German dictionaries already exist, but several entries are literal, inconsistent with HPC usage, or bypass `t()` entirely.

For the target terminology, use **Irányítópult / Dashboard**, **Csomópontok / Knoten**, **Feladatok / Jobs**, and **Előzmények / Verlauf**. Keep scheduler identifiers (`SLURM`, `SGE`, `qhost`, partition names, `CPU`, `GB`, and state codes) intact; localize the explanatory labels around them. Hungarian `irányítópult`, `Bejelentkezés`, and `Kijelentkezés` are supported by Microsoft’s official Hungarian UI; German HPC training material uses `Knoten`, `Auftrag`/`Job`, and `Warteschlange`, while German Microsoft UI uses `Dashboard`, `Übersicht`, `Anmelden`, and `Abmelden`.

This brief covers both sibling repositories; the terminology recommendations are applied to their shared client catalogue.

## Scope and local source review

The actual repository roots are nested below the supplied working directory:

- `/home/hbo1bp/HPC-Dashboard/HPC-Dashboard`
- `/home/hbo1bp/HPC-Dashboard/SLURM-Dashboard`

Reviewed in both repositories: `src/client/app/router.tsx`, `src/client/pages/DashboardPage.tsx`, the page components (`HistoryPage`, `JobsPage`, `NodesPage`, `LoginPage`, `NotFoundPage`), all imported UI components (`AuthGate`, `BoschLogo`, `FreshnessBanner`, `HistoryBarChart`, `LoginIntro`, `MetricCard`, `StatusPill`, `TimeChart`, `UserMenu`), `src/client/lib/*.ts(x)`, and the corresponding entry point. The relevant local evidence is direct source evidence, not an inference.

### Existing English label inventory

The English master catalogue in `src/client/lib/ui.tsx` covers:

- **Navigation/auth:** `Dashboard`, `Nodes`, `My Jobs`, `My History`, `Primary`, `Sign in`, `Sign out`, `Language`, `Dark mode`, `Light mode`, `Skip to main content`, and the Microsoft Entra sign-in action.
- **Dashboard/freshness:** `Loading dashboard…`, `Failed to load dashboard.`, `Last updated`, `Live feed healthy`, `Update delayed`, `Data is stale`, `Collector looks broken`, `Refreshing…`, `Refresh dashboard`, `Retry`, `Snapshot`, `No snapshot yet`, `No collector snapshot is available.`, `The collector is not providing a current snapshot.`, `The last refresh failed.`, and `No scheduler snapshot is available yet.`
- **Capacity/operations:** `Allocated`, `Available`, `Reserved`, `Unavailable`, `Total`, `Requested resources`, `Active errors`, `Queue / partition`, `Queue state`, `Capacity by queue`, `Queue pressure`, `Oldest queued job`, `No queued jobs.`, `Solver load`, and resource-unit labels for scheduler slots and CPUs.
- **Job states/history:** `Running jobs`, `Queued jobs`, `Failed jobs`, `Jobs on hold`, `Active jobs`, `Job ID`, `State`, `Submitted at`, `Started at`, `Finished at`, `Search`, `Date preset`, `No jobs matched the selected filters.`, `Submitted`, `Started`, `Finished`, and `Failed`.
- **Nodes:** `Total nodes`, `OK nodes`, `Partial nodes`, `Missing nodes`, `Idle nodes`, `Busy nodes`, `Current qhost view`, `Hostname`, `Status`, `Arch`, `NCPU`, `NSOC`, `NCOR`, `NTHR`, `Load`, `Load / CPU`, `Mem total`, `Mem used`, and `No node data yet.`
- **Empty/error/navigation fallback:** loading and failed-page messages, `No data`, `Page not found`, and `Back to dashboard` equivalents.

`ui.tsx` also contains chart and lede strings (`HPC utilization`, `Active job count`, historical trend copy, and chart keyboard hints). Several of those keys are not currently rendered by `DashboardPage`, but they remain part of the translation contract.

### Existing mechanism and parity

- `Language` is a closed union: `"en" | "de" | "hu"`.
- `translations` is an in-file typed object. `satisfies Record<Language, Record<TranslationKey, string>>` enforces that all three languages have every English key.
- `UiProvider` stores the selected language in `localStorage` under `language`, writes `document.documentElement.lang`, and exposes `t`, `statusLabel`, and `freshnessLabel` through `useUi()`.
- `UserMenu` is the language selector; it uses the labels `English`, `Deutsch`, and `Magyar`.
- `StatusPill` and `FreshnessBanner` correctly use translation helpers for known values. Unknown backend values fall through unchanged.
- Both repositories have the same mechanism and essentially the same UI source. `AppRouter` routes `/`, `/login`, `/nodes`, `/jobs`, and `/history` identically; only the product name differs (`SGE HPC` versus `SLURM HPC`).
- This is a lightweight home-grown dictionary/context, not an external i18n package, message-format library, or translation-file loader.

### Localization gaps to fix later

| Area | Direct source evidence | Consequence |
|---|---|---|
| Existing HU wording | `ui.tsx` has `Vezérlőpult`, `Munkák`, `Előzmény`, and `Kilépés`. | Understandable, but `Irányítópult`, `Feladatok`, `Előzmények`, and `Kijelentkezés` are more natural for this UI. |
| Existing DE wording | `ui.tsx` has `Logout`, `Fehljobs`, `Queue-Druck`, `Live-Node-Inventar`, `Teilweise Nodes`, `Idle-Nodes`, and `Busy-Nodes`. | Mixed English/German and literal compounds; use consistent German UI terms while retaining `Job`, `Queue`, or `Partition` only where they are established HPC terms. |
| State status gaps | German and Hungarian entries for `healthy`, `degraded`, and `down` are still the English strings; `hold` is also left as `hold`. | Freshness/status labels can remain English even after selecting HU or DE. |
| Raw scheduler data | `DashboardPage.tsx` renders `data.scheduler.toUpperCase()` and `queue.state` directly. | Scheduler names and backend state codes are not localized; that is appropriate for identifiers, but explanatory labels should be localized and unknown values should have a deliberate fallback. |
| Raw API errors | `lib/api.ts` creates English `Request timed out` and `Request failed` strings; `DashboardPage.tsx` appends `overview.error` directly after the localized refresh-error label. | Users can see English or server-provided text in HU/DE. Error codes/details should be separated from localized user copy. |
| Hard-coded accessibility text | `components/BoschLogo.tsx` uses `aria-label="Bosch home"`. | Not visible, but the accessible name is English in HU/DE. |
| Hard-coded time/number output | `lib/format.ts` uses `new Intl.DateTimeFormat("en-GB", ...)` for `formatBudapestDateTime()` and `new Intl.NumberFormat("en-US")` for all numbers. Only history bucket labels use the selected language locale. | Main timestamps and metric numbers remain English/UK/US formatted in HU/DE. This is a functional localization gap, not just terminology. |
| Non-localized duration/presets | `DashboardPage.tsx` emits `d`, `h`, `m`; `HistoryPage.tsx` and `JobsPage.tsx` display `24h`, `7d`, `30d`, and `1y` directly. | Presets are acceptable technical shorthand, but duration units need locale-aware wording if expanded for end users. |
| Technical/raw labels | `qhost`, `solver`, queue names, hostnames, `NCPU`/`NSOC`/`NCOR`/`NTHR`, `CPU`, `GB`, and `—` are passed through or hard-coded. | Preserve identifiers and units; localize the surrounding prose and document the intentional exceptions. |

## Research findings

1. **Claim:** Slurm’s own vocabulary distinguishes jobs, nodes, partitions, and queues; its metrics include running and pending jobs, resource allocation, node state/utilization, partition allocation, and queue length. **Sources:** [SchedMD Metrics Guide](https://slurm.schedmd.com/metrics.html), [SchedMD summary cheat sheet](https://slurm.schedmd.com/pdfs/summary.pdf). **Support:** direct evidence from official Slurm documentation. **Confidence:** high.

2. **Claim:** A Slurm partition is the scheduler-specific term to preserve, while “queue” is a useful cross-scheduler explanation. SchedMD explicitly documents `Partition/queue`, and GWDG describes each partition as having its own job queue. **Sources:** [SchedMD summary cheat sheet](https://slurm.schedmd.com/pdfs/summary.pdf), [GWDG Slurm documentation](https://docs.hpc.gwdg.de/how_to_use/slurm/index.html), [GWDG compute partitions](https://docs.hpc.gwdg.de/how_to_use/compute_partitions/index.html). **Support:** direct evidence, with the recommendation to preserve `Partition` as researcher inference. **Confidence:** high.

3. **Claim:** German HPC usage is mixed but consistent enough to justify `Jobs` for this technical dashboard and `Warteschlange`/`Knoten` for user-facing explanations. The German HPC training page uses `Knoten`, `Rechenknoten`, `Auftrag`, `Job`, `Warteschlange`, `RUNNING`, `PENDING`, and error wording in the same lesson. **Source:** [Biont/EMBL-style German HPC training: Scheduler Fundamentals](https://biont-training.github.io/hpc-intro-de/13-scheduler.html). **Support:** direct evidence; choosing `Jobs` rather than `Aufträge` is researcher inference for a Slurm-facing product. **Confidence:** medium-high.

4. **Claim:** Official Microsoft German UI uses `Dashboard`, `Übersicht`, `Anmelden`, and `Abmelden`; it also describes a dashboard as an overview for checking current data status. **Sources:** [Microsoft Learn: Anmelden und Abmelden beim Power BI-Dienst](https://learn.microsoft.com/de-de/power-bi/explore-reports/end-user-sign-in), [Microsoft Learn: Tipps zum Gestalten von Power BI-Dashboards](https://learn.microsoft.com/de-de/power-bi/create-reports/service-dashboards-design-tips). **Support:** direct evidence. **Confidence:** high.

5. **Claim:** Official Microsoft Hungarian UI uses `irányítópult` for dashboard and `Bejelentkezés`/`Kijelentkezés` for authentication. Microsoft Hungarian technical documentation also uses `csomópont`, `kapacitás`, `feladat`, `Futó`, and `Sikertelen`. **Sources:** [Microsoft Learn HU: Power BI dashboards](https://learn.microsoft.com/hu-hu/power-bi/create-reports/service-dashboards), [Microsoft Learn HU: Power BI sign-in/sign-out](https://learn.microsoft.com/hu-hu/power-bi/explore-reports/end-user-sign-in), [Microsoft Learn HU: AKS architecture](https://learn.microsoft.com/hu-hu/azure/well-architected/service-guides/azure-kubernetes-service), [Microsoft Learn HU: Analyze Documents Job Status](https://learn.microsoft.com/hu-hu/rest/api/language/analyze-documents/analyze-documents-job-status/analyze-documents-job-status?view=rest-language-analyze-documents-2026-05-01). **Support:** direct evidence for those terms; applying them to Slurm UI is researcher inference. **Confidence:** high for the individual terms, medium for the HPC-specific compound phrases.

6. **Claim:** For freshness copy, the natural short forms are status-oriented (“Live-Daten aktuell”, “Aktualisierung verzögert”, “Daten veraltet”; “Az adatok naprakészek”, “A frissítés késik”, “Az adatok elavultak”) rather than literal noun phrases. **Sources:** [Microsoft Fabric German real-time dashboards](https://learn.microsoft.com/de-de/fabric/real-time-intelligence/real-time-dashboards-overview), plus the local `FreshnessBanner.tsx` state model. **Support:** source terminology plus researcher inference; no source dictates the product’s exact phrase. **Confidence:** medium.

## Recommended terminology table

The table is an explicit English → Hungarian → German glossary for the labels in scope. “Basis” cites the evidence source; the exact UI wording is a recommendation, not a claim that the source translated this particular dashboard.

| English label | Hungarian recommendation | German recommendation | Basis |
|---|---|---|---|
| Dashboard | **Irányítópult** | **Dashboard** | S5, S6, S9, S10; direct UI terms + recommendation |
| Overview | **Áttekintés** | **Übersicht** | S6, S10; direct UI terms |
| Nodes | **Csomópontok** | **Knoten** | S3, S4, S7; HPC/technical usage |
| Jobs | **Feladatok** | **Jobs** | S1, S4, S8; HU technical `feladat`, DE HPC keeps `Job` |
| My Jobs | **Feladataim** | **Meine Jobs** | S4, S5, S9; recommendation |
| History | **Előzmények** | **Verlauf** | S5, S9; standard UI wording, recommendation |
| My History | **Saját előzményeim** | **Mein Verlauf** | S5, S9; recommendation |
| Primary navigation | **Fő navigáció** | **Hauptnavigation** | S9 plus local `aria-label`; recommendation |
| Skip to main content | **Ugrás a fő tartalomhoz** | **Zum Hauptinhalt springen** | Local existing strings; accessibility wording is a recommendation |
| Language | **Nyelv** | **Sprache** | Local existing strings; standard UI wording |
| Sign in | **Bejelentkezés** | **Anmelden** | S5, S9; direct official UI terms |
| Sign in with Microsoft Entra ID | **Bejelentkezés Microsoft Entra ID-val** | **Mit Microsoft Entra ID anmelden** | S5, S9; direct/localized action pattern |
| Sign out / Logout | **Kijelentkezés** | **Abmelden** | S5, S9; replace current HU `Kilépés` and DE `Logout` |
| Dark mode | **Sötét mód** | **Dunkelmodus** | Local existing strings; standard UI wording |
| Light mode | **Világos mód** | **Hellmodus** | Local existing strings; standard UI wording |
| Last updated | **Legutóbb frissítve** | **Zuletzt aktualisiert** | S10, S11 plus local freshness model; recommendation |
| Last collector update | **Az adatgyűjtő legutóbbi frissítése** | **Letzte Aktualisierung des Collectors** | S11 plus local `FreshnessBanner`; product-specific recommendation |
| Live feed healthy | **Az élő adatfolyam naprakész** | **Live-Daten aktuell** | S11 plus local freshness model; recommendation |
| Update delayed | **A frissítés késik** | **Aktualisierung verzögert** | S11 plus local freshness model; recommendation |
| Data is stale | **Az adatok elavultak** | **Daten veraltet** | S11 plus local freshness model; recommendation |
| Collector looks broken | **Az adatgyűjtő valószínűleg hibás** | **Collector möglicherweise fehlerhaft** | Local state meaning; no authoritative collector glossary, so medium confidence |
| Refreshing… | **Frissítés folyamatban…** | **Wird aktualisiert…** | S11 plus local `FreshnessBanner`; recommendation |
| Refresh dashboard | **Irányítópult frissítése** | **Dashboard aktualisieren** | S6, S9, S11; action wording |
| Retry | **Újrapróbálás** | **Erneut versuchen** | Local existing strings; standard action wording |
| Snapshot | **Pillanatkép** | **Snapshot** | S5, S6 and local source model; preserve technical DE term |
| No snapshot yet | **Még nincs pillanatkép** | **Noch kein Snapshot** | S5, S9 and local empty-state model; recommendation |
| No data | **Nincs adat** | **Keine Daten** | S5, S9 and local empty states; recommendation |
| No collector snapshot is available | **Nem érhető el adatgyűjtő-pillanatkép** | **Kein Collector-Snapshot verfügbar** | Local source meaning; product-specific recommendation |
| No scheduler snapshot is available yet | **Még nem érhető el scheduler-pillanatkép** | **Noch kein Scheduler-Snapshot verfügbar** | S1, S4 and local source meaning; recommendation |
| Failed to load dashboard | **Nem sikerült betölteni az irányítópultot** | **Dashboard konnte nicht geladen werden** | S6, S9 and local error state; recommendation |
| The last refresh failed | **A legutóbbi frissítés sikertelen** | **Die letzte Aktualisierung ist fehlgeschlagen** | S8, S11 and local error state; recommendation |
| Error | **Hiba** | **Fehler** | S8, S9; direct/common technical terms |
| Capacity | **Kapacitás** | **Kapazität** | S1, S7, S10; direct/common technical terms |
| Allocated | **Lefoglalt** | **Zugewiesen** | S1, S7; HPC resource semantics; recommendation over current HU `Használt` |
| Available | **Elérhető** | **Verfügbar** | S1, S7, S10; standard resource wording |
| Reserved | **Foglalt** | **Reserviert** | S1, S7; standard resource wording |
| Unavailable | **Nem érhető el** | **Nicht verfügbar** | S1, S7, S10; standard status wording |
| Total | **Összesen** | **Gesamt** | S1, S7, S10; standalone metric wording |
| Scheduler slots | **Ütemezői slotok** | **Scheduler-Slots** | S1, S3; preserve scheduler concept, localize HU noun |
| CPUs | **CPU-k** | **CPUs** | S1, S3; technical unit remains recognizable |
| Queue / partition | **Várólista / partíció** | **Warteschlange / Partition** | S1, S2, S3, S4; retain `partíció/Partition` for Slurm |
| Queue state | **Várólista állapota** | **Warteschlangenstatus** | S1, S3, S4; recommendation |
| Capacity by queue | **Kapacitás várólistánként**; for strict Slurm copy: **Kapacitás partíciónként** | **Kapazität je Warteschlange**; for strict Slurm copy: **Kapazität je Partition** | S1, S2, S3, S4; distinction is an intentional product choice |
| Queue pressure | **Várólista terhelése** | **Warteschlangenlast** | S1, S3, S4; avoid literal HU `Sor terhelése`/DE `Queue-Druck` |
| Requested resources | **Kért erőforrások** | **Angeforderte Ressourcen** | S1, S3, S7; direct resource semantics |
| Running resources | **Futó erőforrások**; clearer alternative: **Használt erőforrások** | **Laufende Ressourcen**; clearer alternative: **Genutzte Ressourcen** | S1, S3; recommendation, because resources themselves do not “run” |
| Oldest queued job | **Legrégebben várakozó feladat** | **Ältester wartender Job** | S1, S4; recommendation |
| No queued jobs | **Nincs várakozó feladat** | **Keine Jobs in der Warteschlange** | S1, S4; recommendation |
| Running jobs | **Futó feladatok** | **Laufende Jobs** | S1, S4, S8; direct status semantics |
| Queued jobs | **Várakozó feladatok** | **Jobs in der Warteschlange** | S1, S3, S4; more precise than only `Wartende Jobs` |
| Failed jobs | **Sikertelen feladatok** | **Fehlgeschlagene Jobs** | S1, S4, S8; replace DE `Fehljobs` |
| Jobs on hold | **Visszatartott feladatok** | **Zurückgehaltene Jobs** | S1 (held jobs are pending); recommendation |
| Active errors | **Aktív hibák** | **Aktive Fehler** | S8, S9; standard technical wording |
| Active jobs | **Aktív feladatok** | **Aktive Jobs** | S1, S4, S8; recommendation |
| Job ID | **Feladatazonosító** | **Job-ID** | S1, S4; technical identifier |
| Name | **Név** | **Name** | Local existing strings; standard UI wording |
| State | **Állapot** | **Status** | S1, S4, S8; German UI convention |
| Submitted at | **Beküldve** | **Eingereicht am** | S4, S8; recommendation |
| Started at | **Elindítva** | **Gestartet am** | S4, S8; recommendation |
| Finished at | **Befejezve** | **Beendet am** | S4, S8; recommendation |
| No active jobs right now | **Jelenleg nincs aktív feladat** | **Derzeit keine aktiven Jobs** | S4, S9; recommendation |
| Search | **Keresés** | **Suche** | Local existing strings; standard UI wording |
| Date preset | **Időtartam** | **Zeitraum** | Local existing strings; current DE is good |
| No jobs matched the selected filters | **Nincs a kiválasztott szűrőknek megfelelő feladat** | **Keine Jobs entsprechen den ausgewählten Filtern** | S4, S9; recommendation |
| Total nodes | **Összes csomópont** | **Knoten gesamt** | S1, S4, S7; recommendation |
| OK nodes | **Rendben lévő csomópontok** | **OK-Knoten** | S1, S4; preserve state meaning |
| Partial nodes | **Részleges adatú csomópontok** | **Knoten mit unvollständigen Daten** | Local qhost semantics; avoid literal `Teilweise Nodes` |
| Missing nodes | **Hiányzó csomópontok** | **Fehlende Knoten** | S1, S4, S7; recommendation |
| Idle nodes | **Üresjáratú csomópontok** | **Idle-Knoten** | S1, S4; technical state may remain `Idle` in DE |
| Busy nodes | **Terhelt csomópontok** | **Belegte Knoten** | S1, S4; recommendation |
| Node status | **Csomópont állapota** | **Knotenstatus** | S1, S4, S7; recommendation |
| Current qhost view | **Jelenlegi qhost-nézet** | **Aktuelle qhost-Ansicht** | Local command identifier; recommendation |
| No node data yet | **Még nincs csomópontadat** | **Noch keine Knotendaten** | S7, S9 plus local empty state; recommendation |
| Page not found | **Az oldal nem található** | **Seite nicht gefunden** | Local existing strings; standard error wording |
| Back to dashboard | **Vissza az irányítópultra** | **Zurück zum Dashboard** | S6, S9; recommendation |

## Contradictions and terminology decisions

1. **German `Job` versus `Auftrag`:** the German HPC training source deliberately uses both. `Auftrag` is a valid German translation, but `Job` is the more recognizable choice for a Slurm-facing audience and matches the existing technical UI. Use `Auftrag` only if the organization wants a fully German glossary; do not mix the two within one screen.
2. **Hungarian `Vezérlőpult` versus `Irányítópult`:** `Vezérlőpult` is understandable and present in the repository, but Microsoft’s Hungarian dashboard documentation consistently uses `irányítópult`. Use `Irányítópult` for a monitoring dashboard; reserve `Vezérlőpult` for a control/settings panel if that distinction matters.
3. **Queue versus partition:** Slurm’s precise object is a partition; the queue is the user-facing waiting concept. `Várólista / partíció` and `Warteschlange / Partition` intentionally expose both rather than hiding the scheduler’s actual term.
4. **No primary Hungarian Slurm glossary found:** Hungarian recommendations for `queue`, `pending`, and `hold` are based on official Hungarian Microsoft technical vocabulary plus Hungarian-language HPC/IT usage inferred from the meaning. They should receive a native-speaker review before release.

## Missing evidence

- No organization-specific Bosch/SGE/SLURM language or terminology guide was available in the reviewed source tree, so the table assumes formal, professional `Ön`/`Sie` copy and a technical HPC audience.
- `Collector`/`adatgyűjtő` is product-specific. The Hungarian recommendation is natural but not validated by an official HPC glossary; the German recommendation intentionally keeps `Collector` because operators may recognize the component name.
- No source establishes the exact Hungarian equivalents for Slurm `hold`, `degraded`, or `down`; these need product-owner/native-speaker confirmation and should be tested with real scheduler states.
- Direct `fetch_content` requests could not resolve the source hosts in this runtime. `source_check` was attempted for critical Slurm and Microsoft wording but returned `missing-evidence` despite the search provider returning original-page passages. The brief therefore relies on original-page content returned by `web_search(..., includeContent: true)` and links to the originals; re-run source validation from a networked environment before treating the citations as a release gate.
- Locale-aware date/number behavior is a direct code finding, not a web-research claim: `formatBudapestDateTime()` and `formatNumber()` currently ignore the selected language.

## Sources

### Kept

- **SchedMD, Metrics Guide** — https://slurm.schedmd.com/metrics.html — primary source for Slurm job/node/partition metrics, running/pending states, resource allocation, and queue lengths.
- **SchedMD, Slurm summary cheat sheet** — https://slurm.schedmd.com/pdfs/summary.pdf — primary source explicitly showing `Partition/queue`, node, job, and scheduler vocabulary.
- **GWDG, Slurm documentation** — https://docs.hpc.gwdg.de/how_to_use/slurm/index.html — university HPC operations documentation connecting partitions with job queues and running/queued jobs.
- **GWDG, Compute Partitions** — https://docs.hpc.gwdg.de/how_to_use/compute_partitions/index.html — practical partition/node/resource terminology.
- **Biont/EMBL-style German HPC training, Scheduler Fundamentals** — https://biont-training.github.io/hpc-intro-de/13-scheduler.html — direct German usage of `Knoten`, `Auftrag`, `Job`, `Warteschlange`, `RUNNING`, and `PENDING`.
- **Microsoft Learn HU, Power BI dashboards** — https://learn.microsoft.com/hu-hu/power-bi/create-reports/service-dashboards — official Hungarian `irányítópult` and overview/dashboard context.
- **Microsoft Learn HU, Power BI sign-in/sign-out** — https://learn.microsoft.com/hu-hu/power-bi/explore-reports/end-user-sign-in — official `Bejelentkezés` and `Kijelentkezés` wording.
- **Microsoft Learn HU, AKS architecture** — https://learn.microsoft.com/hu-hu/azure/well-architected/service-guides/azure-kubernetes-service — official Hungarian `csomópont`, `kapacitás`, and workload terminology.
- **Microsoft Learn HU, Analyze Documents Job Status** — https://learn.microsoft.com/hu-hu/rest/api/language/analyze-documents/analyze-documents-job-status/analyze-documents-job-status?view=rest-language-analyze-documents-2026-05-01 — official Hungarian `feladat`, `Futó`, `Sikertelen`, and status vocabulary.
- **Microsoft Learn DE, Power BI sign-in/sign-out** — https://learn.microsoft.com/de-de/power-bi/explore-reports/end-user-sign-in — official `Anmelden`, `Abmelden`, and `Dashboard` wording.
- **Microsoft Learn DE, Dashboard design tips** — https://learn.microsoft.com/de-de/power-bi/create-reports/service-dashboards-design-tips — official `Dashboard`/`Übersicht` and at-a-glance monitoring context.
- **Microsoft Fabric DE, Real-Time Dashboards** — https://learn.microsoft.com/de-de/fabric/real-time-intelligence/real-time-dashboards-overview — official live-data and refresh terminology relevant to freshness copy.

### Rejected or deprioritized

- Generic translation/localization marketing pages and SEO articles surfaced by search — useful for general UX reminders, but not authoritative for Hungarian/German HPC terminology.
- Community glossaries, DeepWiki pages, and unrelated GitHub locale files — not used for decision-critical wording when official Microsoft, SchedMD, GWDG, and HPC training sources were available.
- General Hungarian technology blogs — deprioritized in favor of Microsoft’s official Hungarian technical localization; they may be useful as a native-language review corpus but are not the evidence base for this brief.

## Next steps

1. Adopt the glossary above in both `ui.tsx` files, with one deliberate decision on `Jobs` versus `Aufträge` and on whether the SGE view should say `queue` or `partition`.
2. Route raw API errors, scheduler/queue state labels, logo accessibility text, duration units, and all date/number formatting through the same locale context; preserve technical identifiers as explicit exceptions.
3. Run an in-context HU/DE review at narrow card widths and with real `pending`, `held`, `degraded`, `down`, and no-data responses; native speakers should approve the Hungarian scheduler-state wording before release.

## Result

The recommendations in this brief were applied to the shared German and Hungarian UI catalogue in both repositories.
