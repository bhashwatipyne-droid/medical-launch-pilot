import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import { useSessionState } from "@/hooks/useSessionState";
import { LaunchTimeline } from "./LaunchTimeline";
import { Badge, Block, Dot, Empty, Pill, SectionHead, StatTile } from "./dashboardParts";
import { C, CARD, HEAD_ROW, NEXT_BADGE, ROW_DIVIDER, STAGE_DOT } from "./dashboardTheme";

const DELIV_GRID = "grid grid-cols-[minmax(280px,2.2fr)_minmax(150px,1fr)_96px_72px_64px] gap-x-4";
const STATUS_BADGE = { "Ready for Review": "Info", "Changes Requested": "Warning", "In Progress": "Neutral", "Not Started": "Neutral", Blocked: "Error" };
import { addDays, fmtDay, fmtWeekday, pc } from "@/lib/homeDashboard";

export function OverviewTab(ctx) {
  const { goProject, h, kpis, launches, launchesLoading, nextDue, projects, today, userName } = ctx;
  // The selected "Where are we?" card: its deliverables are listed under the
  // timeline, and the timeline fades every launch not behind it. Clicking the
  // card again clears it. Kept for the tab session.
  const [sel, setSel] = useSessionState("dashboard-kpi", "Products in progress");
  // The table body can be collapsed with the header button; the header stays.
  const [open, setOpen] = useSessionState("dashboard-kpi-open", true);
  const picked = kpis.find((k) => k.label === sel);
  const pickedLaunches = picked ? new Set(picked.rows.map((r) => r.project_id)) : null;
  const pickedRows = picked
    ? [...picked.rows].sort((a, b) => String(a.due || "9999").localeCompare(String(b.due || "9999")))
    : [];
  return (
    <>
    <>
      <Block title="Where are we?">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
          {kpis.map((k) => (
            <button
              key={k.label}
              type="button"
              onClick={() => {
                if (sel === k.label) setSel("");
                else {
                  setSel(k.label);
                  setOpen(true);
                }
              }}
              aria-pressed={sel === k.label}
              className={`${CARD} flex min-w-0 flex-col gap-2 p-4 text-left transition-shadow duration-100 hover:shadow-[inset_0_0_0_1px_rgb(144,144,236)] ${sel === k.label ? "shadow-[inset_0_0_0_2px_rgb(79,70,229)]" : ""}`}
            >
              <span className="flex items-center gap-2 text-[13px] font-medium text-[rgb(74,88,120)]">
                <Dot color={k.dot} />
                {k.label}
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-[32px] font-bold leading-10 text-[rgb(13,27,62)]">{k.value}</span>
                <span className="text-[14px] text-[rgb(138,151,181)]">/ {k.den}</span>
              </span>
              <span className="h-1 overflow-hidden rounded-full bg-[rgb(245,246,248)]">
                <span className="block h-full rounded-full" style={{ width: `${pc(k.value, k.den)}%`, background: k.dot }} />
              </span>
              <span className="text-[12px] leading-4 text-[rgb(84,100,144)]">
                {pc(k.value, k.den)}% of {k.denLabel} · {h.projectsOf(k.rows)} launches
              </span>
              {k.note && <span className="text-[12px] leading-4 text-[rgb(138,151,181)]">{k.note}</span>}
              {k.extra && (
                <Pill bg={k.extra.good ? C.success100 : C.error50} fg={k.extra.good ? C.successText : C.error500}>
                  {k.extra.text}
                </Pill>
              )}
            </button>
          ))}
        </div>
      </Block>

      {/* "At a glance": the per-launch production timeline. */}
      <LaunchTimeline
        projects={launches}
        loading={launchesLoading}
        onOpen={goProject}
        onlyIds={pickedLaunches}
      />

      <div className="flex flex-col">
        {picked && (
          <section className={`${CARD} flex flex-col`} data-testid="kpi-deliverables">
            <SectionHead title={`${picked.label} · deliverables`} sub={`${pickedRows.length} deliverable${pickedRows.length === 1 ? "" : "s"} in ${h.projectsOf(picked.rows)} launch${h.projectsOf(picked.rows) === 1 ? "" : "es"}. Click one to open its launch.`}>
              <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                data-testid="kpi-deliverables-toggle"
                className="flex h-7 items-center gap-1 rounded-[7px] px-2 text-[13px] font-medium text-[rgb(84,100,144)] hover:bg-[rgb(249,250,251)] hover:text-[rgb(13,27,62)]"
              >
                {open ? "Collapse" : "Expand"}
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </SectionHead>
            {!open ? null : pickedRows.length === 0 ? (
              <Empty>No deliverables here for this view.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className={`${DELIV_GRID} ${HEAD_ROW}`}>
                    <span>Deliverable / launch</span><span>Status</span><span>Due</span><span>Late by</span><span />
                  </div>
                  {pickedRows.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => goProject(r.project_id)}
                      className={`${DELIV_GRID} min-h-[60px] w-full items-center bg-white px-4 py-2.5 text-left ${ROW_DIVIDER} hover:bg-[rgb(249,250,251)]`}
                    >
                      <span className="flex min-w-0 flex-col gap-[3px]">
                        <span className="truncate text-[14px] font-medium text-[rgb(13,27,62)]" title={r.name}>{r.name}</span>
                        <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-[rgb(84,100,144)]">
                          <Dot color={STAGE_DOT[r.stage]} size={6} />
                          <span className="truncate" title={projects[r.project_id]?.name}>
                            {r.stage} · {projects[r.project_id]?.name || "—"}
                          </span>
                        </span>
                      </span>
                      <span><Badge color={STATUS_BADGE[r.stage_status] || "Neutral"}>{r.stage_status}</Badge></span>
                      <span className="text-[13px] font-medium text-[rgb(13,27,62)]">{r.due ? fmtDay(r.due) : "—"}</span>
                      <span className={`text-[13px] ${r.days_late > 0 ? "font-medium text-[rgb(220,38,38)]" : "text-[rgb(84,100,144)]"}`}>{r.days_late > 0 ? `${r.days_late}d` : "—"}</span>
                      <span className="flex items-center justify-end gap-0.5 text-[13px] font-semibold text-[rgb(43,43,181)]">
                        Open
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {/* PROTOTYPE: no "What needs attention now?" block. */}
      <div className="flex flex-col gap-4">
        <Block title="What is coming next?">
          <section className={`${CARD} flex min-w-0 flex-col`}>
            <SectionHead
              title="Next 7 days"
              sub={`Work due ${fmtDay(today)} – ${fmtDay(addDays(today, 7))}. Click an item to open its launch.`}
            />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-2 px-4 pb-3">
              <StatTile label="Due" value={nextDue} />
              <StatTile label="At risk" value={`${h.nextCount("At risk")} / ${nextDue}`} sub={`${pc(h.nextCount("At risk"), nextDue)}% of due`} color={C.warningText} />
              <StatTile label="In review" value={`${h.nextCount("In review")} / ${nextDue}`} sub={`${pc(h.nextCount("In review"), nextDue)}% of due`} color={C.infoText} />
              <StatTile label="Already delayed" value={`${h.nextCount("Delayed")} / ${nextDue}`} sub={`${pc(h.nextCount("Delayed"), nextDue)}% of due`} color={C.error500} />
            </div>
            {nextDue > 0 && (
              <div className="mx-4 mb-3 rounded-lg bg-[rgb(209,250,229)] px-3 py-2 text-[12px] leading-4 text-[rgb(0,91,75)]">
                {nextDue - h.nextCount("Delayed")} items should close or move forward if current blockers are resolved.
              </div>
            )}
            {h.next.slice(0, 7).map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => goProject(n.project_id)}
                className="flex items-center gap-3 bg-white px-4 py-2.5 text-left shadow-[inset_0_1px_0_rgb(243,244,246)] hover:bg-[rgb(249,250,251)]"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className="truncate text-[14px] font-medium text-[rgb(13,27,62)]">{n.name}</span>
                  <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-[rgb(84,100,144)]">
                    <Dot color={STAGE_DOT[n.stage]} size={6} />
                    <span className="truncate" title={projects[n.project_id]?.name}>
                      {projects[n.project_id]?.name} · {n.stage} · {n.owner_id ? userName[n.owner_id] || "Unknown" : "Unassigned"}
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[12px] font-medium text-[rgb(74,88,120)]">{fmtWeekday(n.final_due)}</span>
                  <Badge color={NEXT_BADGE[n.next_status]}>{n.next_status}</Badge>
                </span>
              </button>
            ))}
            {nextDue === 0 && <Empty>Nothing due in the next 7 days for this view.</Empty>}
          </section>
        </Block>
      </div>
    </>
    </>
  );
}
