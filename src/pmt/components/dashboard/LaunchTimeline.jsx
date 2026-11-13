// PROTOTYPE (medical launch flow): Home's "At a glance" production timeline.
// One bar per launch, split into its seven stages and coloured by where the
// launch is (stages done, its current stage, upcoming; grey while on hold). Click a
// launch to open it. Daily or weekly, like Planning's day / week switch: a
// window of days or weeks around a date, moved with the
// arrows or the date picker.
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSessionState } from "@/hooks/useSessionState";
import { PROJECT_STATUS_DOT } from "@/components/projects/detail/projectDetailView";
import { TIMELINE_SCALES, fmtSpan, launchPhaseOf, launchStageOf, launchStagePlan, spanDays, timelineWindow, todayIsoLocal } from "@/lib/stagePlan";
import { C, CARD, EYEBROW } from "./dashboardTheme";

const SEG = {
  past: C.success500,
  current: C.brand500,
  upcoming: "rgb(200,200,245)",
  hold: "rgb(209,213,219)",
};
const STATUS_SHORT = { "Approval Pending": "Approval" };
const GRID = "grid grid-cols-[minmax(140px,190px)_96px_minmax(0,1fr)] gap-x-3";
const HIDDEN_STATUSES = ["Scrapped"];

// Launches with a plan, oldest start first.
export const launchTimelineRows = (projects = []) =>
  projects
    .filter((p) => !p.hidden && !HIDDEN_STATUSES.includes(p.status))
    .map((p) => ({ project: p, plan: launchStagePlan(p), where: launchStageOf(p) }))
    .filter((r) => r.plan.length)
    .map((r) => ({
      ...r,
      start: r.plan.map((s) => s.start).sort()[0],
      end: r.plan.map((s) => s.end).sort().pop(),
    }))
    .sort((a, b) => a.start.localeCompare(b.start));

// Light segments (upcoming, on hold) take dark text; the rest white.
const ON_LIGHT = new Set([SEG.upcoming, SEG.hold]);

// Day / week / month switch, the window's dates with arrows, and a date to
// jump to - laid out like Planning's "Today / This week" bar.
function ScaleBar({ scale, setScale, win, anchor, setAnchor, today }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div role="radiogroup" aria-label="Timeline scale" className="flex rounded-[10px] bg-[rgb(245,246,248)] p-1">
        {TIMELINE_SCALES.map(([key, label]) => {
          const on = scale === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setScale(key)}
              className={`h-8 rounded-[8px] px-3.5 text-[13px] font-semibold ${
                on ? "bg-white text-[rgb(13,27,62)] shadow-[0_1px_2px_rgba(13,28,61,0.12)]" : "text-[rgb(55,65,95)] hover:text-[rgb(13,27,62)]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Earlier"
          onClick={() => setAnchor(win.step(-1))}
          className="flex h-8 w-8 items-center justify-center rounded-[7px] text-[rgb(55,65,95)] hover:bg-[rgb(245,246,248)]"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[150px] text-center text-[15px] font-semibold text-[rgb(13,27,62)]" data-testid="timeline-range">
          {win.label}
        </span>
        <button
          type="button"
          aria-label="Later"
          onClick={() => setAnchor(win.step(1))}
          className="flex h-8 w-8 items-center justify-center rounded-[7px] text-[rgb(55,65,95)] hover:bg-[rgb(245,246,248)]"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <input
        type="date"
        aria-label="Go to date"
        value={anchor}
        onChange={(e) => e.target.value && setAnchor(e.target.value)}
        className="h-9 rounded-lg border-0 bg-white px-3 text-sm text-[rgb(13,27,62)] shadow-[inset_0_0_0_1px_rgb(229,231,235)] outline-none focus:shadow-[inset_0_0_0_1px_rgb(43,43,181),0_0_0_3px_rgb(220,220,248)]"
      />
      {anchor !== today && (
        <button
          type="button"
          onClick={() => setAnchor(today)}
          className="h-8 rounded-[7px] px-2.5 text-[13px] font-semibold text-[rgb(43,43,181)] hover:bg-[rgb(240,240,253)]"
        >
          Today
        </button>
      )}
    </div>
  );
}

// `onlyIds` (a Set of project ids): the launches behind the selected "Where
// are we?" card stay in full colour, the rest fade.
export function LaunchTimeline({ projects, loading, onOpen, onlyIds }) {
  const today = todayIsoLocal();
  const [scale, setScale] = useSessionState("dashboard-timeline-scale", "weekly");
  const [anchor, setAnchor] = useState(today);
  const win = timelineWindow(scale, anchor, today);
  const { from, to } = win;
  // Only launches running somewhere in the window.
  const rows = launchTimelineRows(projects).filter((r) => r.end >= from && r.start <= to);
  const todayIn = today >= from && today <= to;
  const todayLeft = win.pos(today) + 50 / win.total;
  // A stage, cut to the window: left and width in %, or null when outside it.
  const place = (s) => {
    const a = s.start < from ? from : s.start;
    const b = s.end > to ? to : s.end;
    if (b < a) return null;
    return { left: win.pos(a), width: (spanDays(a, b) / win.total) * 100 };
  };

  return (
    <section aria-label="Production timeline" className={`${CARD} flex flex-col gap-4 p-5`} data-testid="launch-timeline">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-[200px] flex-1 flex-col gap-0.5">
          <span className={EYEBROW}>At a glance · production timeline</span>
          <span className="text-[13px] text-[rgb(84,100,144)]">
            One bar per launch, split into its seven stages · select a launch to open it
          </span>
        </div>
        <span className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[12px] text-[rgb(74,88,120)]">
          {[
            ["Stage done", SEG.past],
            ["Current stage", SEG.current],
            ["Upcoming", SEG.upcoming],
            ["On hold", SEG.hold],
          ].map(([name, color]) => (
            <span key={name} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
              {name}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-0.5 bg-[rgb(239,68,68)]" />
            Today
          </span>
        </span>
      </div>

      <ScaleBar scale={win.scale} setScale={setScale} win={win} anchor={anchor} setAnchor={setAnchor} today={today} />

      {loading && !rows.length ? (
        <div className="px-4 py-8 text-center text-[13px] text-[rgb(84,100,144)]">Loading launches…</div>
      ) : !rows.length ? (
        <div className="px-4 py-8 text-center text-[13px] text-[rgb(84,100,144)]">
          No launches running in {win.label}.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex min-w-[640px] flex-col">
            <div className={`${GRID} h-8 items-center text-[12px] font-medium text-[rgb(84,100,144)] shadow-[inset_0_-1px_0_rgb(234,238,244)]`}>
              <span>Launch</span>
              <span>Status</span>
              <span className="relative self-stretch">
                {win.ticks.map((t) => (
                  <span
                    key={t.key}
                    className="absolute top-0 overflow-hidden whitespace-nowrap pl-1.5 leading-8"
                    style={{
                      left: `${t.left}%`,
                      maxWidth: `${t.width}%`,
                      color: t.current ? C.brand500 : undefined,
                      fontWeight: t.current ? 700 : 500,
                    }}
                  >
                    {t.label}
                  </span>
                ))}
              </span>
            </div>
            {rows.map(({ project: p, plan, where, start, end }) => {
              const faded = !!onlyIds && !onlyIds.has(p.id);
              const hold = p.status === "On Hold";
              const done = p.status === "Completed";
              const n = p.deliverables_count ?? p.deliverables?.length ?? 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onOpen(p.id)}
                  title={`${p.name} · ${fmtSpan(start, end)}, ${end.slice(0, 4)}`}
                  className={`${GRID} min-h-[52px] w-full items-center bg-transparent p-0 text-left shadow-[inset_0_-1px_0_rgb(243,244,246)] transition-opacity duration-150 hover:bg-[rgb(249,250,251)] ${
                    faded ? "opacity-30 hover:opacity-70" : ""
                  }`}
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[13px] font-semibold text-[rgb(13,27,62)]">{p.name}</span>
                    <span className="truncate text-[12px] text-[rgb(84,100,144)]">
                      {p.client_name || "—"} · {n} {n === 1 ? "deliverable" : "deliverables"}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 whitespace-nowrap text-[12px] text-[rgb(55,65,95)]">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: hold ? C.error500 : PROJECT_STATUS_DOT[p.status] || C.brand500 }}
                    />
                    {STATUS_SHORT[p.status] || p.status}
                  </span>
                  <span className="relative min-h-[52px] self-stretch">
                    {win.ticks.map((t, i) => (
                      <span
                        key={t.key}
                        className={`absolute bottom-0 top-0 ${i ? "border-l border-dashed border-[rgb(227,232,245)]" : ""} ${t.shade ? "bg-[rgb(249,250,251)]" : ""}`}
                        style={{ left: `${t.left}%`, width: t.shade ? `${t.width}%` : undefined }}
                      />
                    ))}
                    {plan.map((s) => {
                      const at = place(s);
                      if (!at) return null;
                      const phase = launchPhaseOf(where, s.stage);
                      const bg = hold ? SEG.hold : done ? SEG.past : SEG[phase];
                      const state = hold ? "on hold" : done || phase === "past" ? "done" : phase;
                      return (
                        <span
                          key={s.stage}
                          title={`${s.stage} · ${fmtSpan(s.start, s.end)} · ${state}`}
                          className="absolute top-[16px] flex h-5 items-center overflow-hidden rounded px-1.5 text-[11px] font-semibold"
                          style={{
                            left: `${at.left}%`,
                            width: `calc(${at.width}% - 2px)`,
                            minWidth: 3,
                            background: bg,
                            color: ON_LIGHT.has(bg) ? "rgb(55,65,95)" : "#fff",
                          }}
                        >
                          {at.width > 7 && <span className="truncate">{s.stage}</span>}
                        </span>
                      );
                    })}
                    {todayIn && (
                      <span className="absolute bottom-0 top-0 w-0.5 bg-[rgb(239,68,68)]" style={{ left: `${todayLeft}%` }} />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
