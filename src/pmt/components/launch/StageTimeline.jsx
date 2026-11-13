// PROTOTYPE: the launch's seven stages as a Gantt table - one row per stage
// with its dates, length and a bar on a month scale. Used by the new-launch
// modal (plan preview, dates editable) and the launch page (live plan, with a
// today line, deliverable counts, and rows that filter the deliverables below).
import { fmtDayMonth, fmtDuration, fmtSpan, phaseOf, timelineScale, todayIsoLocal } from "@/lib/stagePlan";

const HAIR = "shadow-[inset_0_-1px_0_rgb(243,244,246)]";
const DATE_INPUT =
  "h-[30px] min-w-0 flex-1 rounded-[7px] border-0 bg-white px-1.5 text-xs text-[rgb(13,27,62)] shadow-[inset_0_0_0_1px_rgb(226,232,240)] outline-none focus:shadow-[inset_0_0_0_1px_rgb(43,43,181),0_0_0_3px_rgb(220,220,248)]";

const BAR = {
  past: { background: "rgb(16,185,129)" },
  current: { background: "rgb(43,43,181)" },
  upcoming: { background: "rgb(200,200,245)", boxShadow: "inset 0 0 0 1px rgb(144,144,236)" },
  plan: { background: "rgb(200,200,245)", boxShadow: "inset 0 0 0 1px rgb(144,144,236)" },
};

export function StageTimeline({
  rows,
  from,
  to,
  // "plan": every bar the same (a preview). "live": coloured past/current/upcoming.
  mode = "live",
  phases, // { [stage]: "past" | "current" | "upcoming" }: overrides the dates
  showToday = mode === "live",
  counts, // { [stage]: n } -> adds a Deliverables column
  selected, // stage name highlighted
  onSelect, // (stage) => void -> rows become buttons
  editable = false,
  onEdit, // (stage, "start" | "end", value) => void
  minWidth = 820,
}) {
  if (!rows?.length || !from || !to) return null;
  const today = todayIsoLocal();
  const scale = timelineScale(from, to, { monthLabel: "long" });
  const withCounts = !!counts;
  const cols = editable
    ? "140px 290px 80px minmax(0,1fr)"
    : withCounts
      ? "150px 150px 80px 90px minmax(0,1fr)"
      : "160px 170px 90px minmax(0,1fr)";
  const todayIn = showToday && today >= from && today <= to;
  const todayLeft = scale.pos(today) + 50 / scale.total;

  const grid = (
    <>
      {scale.months.map((m) =>
        m.first && m.left === 0 ? null : (
          <span
            key={m.key}
            className="absolute bottom-0 top-0 border-l border-dashed border-[rgb(227,232,245)]"
            style={{ left: `${m.left}%` }}
          />
        )
      )}
    </>
  );

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth }}>
        <div
          className="grid h-9 items-center bg-[rgb(249,250,251)] text-xs font-medium text-[rgb(84,100,144)] shadow-[inset_0_-1px_0_rgb(234,238,244)]"
          style={{ gridTemplateColumns: cols }}
        >
          <span className="pl-10">Stage</span>
          <span>Timeline</span>
          <span>Duration</span>
          {withCounts && <span>Deliverables</span>}
          <span className="relative self-stretch shadow-[inset_1px_0_0_rgb(234,238,244)]">
            {scale.months.map((m) => (
              <span
                key={m.key}
                className="absolute top-0 whitespace-nowrap pl-2 leading-9"
                style={{ left: `${m.left}%` }}
              >
                {m.label}
              </span>
            ))}
          </span>
        </div>

        {rows.map((r) => {
          const phase = mode === "plan" ? "plan" : phases?.[r.stage] || phaseOf(r, today);
          const on = selected === r.stage;
          const n = counts?.[r.stage] || 0;
          const cells = (
            <>
              <span className="flex items-center gap-2.5 pl-4 font-semibold text-[rgb(13,27,62)]">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.dot }} />
                {r.stage}
              </span>
              <span className="tabular-nums text-[rgb(55,65,95)]">
                {editable ? (
                  <span className="flex items-center gap-1.5 pr-3">
                    <input
                      type="date"
                      aria-label={`${r.stage} start`}
                      value={r.start}
                      onChange={(e) => e.target.value && onEdit?.(r.stage, "start", e.target.value)}
                      className={DATE_INPUT}
                    />
                    <span className="text-[rgb(138,151,181)]">→</span>
                    <input
                      type="date"
                      aria-label={`${r.stage} end`}
                      value={r.end}
                      min={r.start}
                      onChange={(e) => e.target.value && onEdit?.(r.stage, "end", e.target.value)}
                      className={DATE_INPUT}
                    />
                  </span>
                ) : (
                  fmtSpan(r.start, r.end)
                )}
              </span>
              <span
                className={`tabular-nums ${r.end < r.start ? "font-medium text-[rgb(220,38,38)]" : "text-[rgb(55,65,95)]"}`}
              >
                {r.end < r.start ? "Ends before start" : fmtDuration(r.start, r.end)}
              </span>
              {withCounts && (
                <span className={`font-semibold ${n ? "text-[rgb(13,27,62)]" : "text-[rgb(200,205,215)]"}`}>
                  {n || "—"}
                </span>
              )}
              <span className="relative min-h-[44px] self-stretch shadow-[inset_1px_0_0_rgb(234,238,244)]">
                {grid}
                {r.end >= r.start && (
                  <span
                    title={`${r.stage} · ${fmtSpan(r.start, r.end)}`}
                    className="absolute top-[15px] h-3.5 rounded-full"
                    style={{
                      left: `${scale.pos(r.start)}%`,
                      width: `max(6px, ${scale.width(r.start, r.end)}%)`,
                      ...BAR[phase],
                    }}
                  />
                )}
                {todayIn && (
                  <span
                    className="absolute bottom-0 top-0 w-0.5 bg-[rgb(239,68,68)]"
                    style={{ left: `${todayLeft}%` }}
                  />
                )}
              </span>
            </>
          );
          const rowClass = `grid min-h-[44px] w-full items-center text-left text-[13px] ${HAIR}`;
          return onSelect ? (
            <button
              key={r.stage}
              type="button"
              aria-pressed={on}
              onClick={() => onSelect(r.stage)}
              className={`${rowClass} ${on ? "bg-[rgb(240,240,253)]" : "bg-white hover:bg-[rgb(249,250,251)]"}`}
              style={{ gridTemplateColumns: cols }}
            >
              {cells}
            </button>
          ) : (
            <div key={r.stage} className={`${rowClass} bg-white`} style={{ gridTemplateColumns: cols }}>
              {cells}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// The legend under a live timeline.
export function StageTimelineLegend({ children }) {
  const today = todayIsoLocal();
  const items = [
    ["Past", BAR.past],
    ["Current", BAR.current],
    ["Upcoming", BAR.upcoming],
  ];
  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 text-xs text-[rgb(84,100,144)]">
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-0.5 bg-[rgb(239,68,68)]" />
        Today, {fmtDayMonth(today)}
      </span>
      {items.map(([label, style]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full" style={style} />
          {label}
        </span>
      ))}
      <span className="flex-1" />
      {children}
    </div>
  );
}
