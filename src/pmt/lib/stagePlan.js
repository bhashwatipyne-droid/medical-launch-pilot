// PROTOTYPE: the launch stage plan and the timeline (Gantt) maths shared by the
// new-launch modal, the launch page and Home.
//
// A launch has an overall start and deadline. The seven stages split that
// window by a fixed weight (how long each stage usually takes), so a plan is
// always available. Any stage can be given its own dates (an "override").
// Products keep their own per-stage windows in deliverable.stage_schedule; a
// launch's plan on screen is read from those when it has products.
import { STAGES, STAGE_HEX } from "@/lib/launchFlow";

// Relative length of each stage, in the order of STAGES.
export const STAGE_WEIGHT = {
  Sample: 15,
  Sourcing: 15,
  Costing: 10,
  BOM: 15,
  Packaging: 21,
  Purchase: 15,
  Production: 10,
};

// The shortest launch window the auto plan splits (one day per stage).
export const MIN_PLAN_DAYS = 7;

const MS_DAY = 864e5;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Dates are "YYYY-MM-DD" calendar days, read in local time so no timezone can
// shift them.
export const toDate = (iso) => {
  const [y, m, d] = String(iso || "").slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const toIso = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const addDaysIso = (iso, n) => {
  const d = toDate(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
};
// Days from a to b, both included ("01 Oct" to "01 Oct" is 1 day).
export const spanDays = (a, b) => Math.round((toDate(b) - toDate(a)) / MS_DAY) + 1;
export const todayIsoLocal = () => toIso(new Date());
const isIso = (v) => /^\d{4}-\d{2}-\d{2}/.test(String(v || ""));

// "02 Oct" / "02 Oct 2026"
export const fmtDayMonth = (iso, withYear = false) => {
  if (!isIso(iso)) return "";
  const d = toDate(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ""}`;
};
export const fmtSpan = (start, end) => `${fmtDayMonth(start)} – ${fmtDayMonth(end)}`;
export const fmtDuration = (start, end) => {
  const n = Math.max(0, spanDays(start, end));
  return `${n} ${n === 1 ? "day" : "days"}`;
};

// The auto plan: [{ stage, start, end, dot }], or null when the window is
// missing or too short. `overrides` is { [stage]: { start, end } }.
export const autoStagePlan = (start, end, overrides = {}) => {
  if (!isIso(start) || !isIso(end)) return null;
  const total = spanDays(start, end);
  if (!(total >= MIN_PLAN_DAYS)) return null;
  const weightSum = STAGES.reduce((sum, s) => sum + STAGE_WEIGHT[s], 0);
  let acc = 0;
  let cursor = 0;
  return STAGES.map((stage, i) => {
    acc += STAGE_WEIGHT[stage];
    const endDay =
      i === STAGES.length - 1 ? total : Math.max(cursor + 1, Math.round((acc / weightSum) * total));
    const own = overrides?.[stage];
    const row = {
      stage,
      dot: STAGE_HEX[stage],
      start: own?.start || addDaysIso(start, cursor),
      end: own?.end || addDaysIso(start, endDay - 1),
    };
    cursor = endDay;
    return row;
  });
};

export const planHasBadDates = (plan) => !!plan && plan.some((r) => r.end < r.start);

// Why no plan can be made for this window, or "" when one can.
export const planWindowIssue = (start, end) => {
  if (!isIso(start) || !isIso(end)) return "Choose both a project start and a deadline.";
  if (end < start) return "The deadline is before the project start.";
  const total = spanDays(start, end);
  if (total < MIN_PLAN_DAYS)
    return `The timeline is ${total} ${total === 1 ? "day" : "days"}. Give it at least ${MIN_PLAN_DAYS} days so each stage gets one.`;
  return "";
};

// The first stage that ends before it starts or runs outside the launch
// window, as a sentence, or "".
export const planRowIssue = (plan, start, end) => {
  const bad = (plan || []).find((r) => r.end < r.start || r.start < start || r.end > end);
  return bad
    ? `${bad.stage} runs outside the project window or ends before it starts. Adjust its dates or the project timeline.`
    : "";
};
export const isRowBad = (r, start, end) => r.end < r.start || r.start < start || r.end > end;

// A plan as a deliverable stage_schedule ({ Stage: { start_dt, end_dt } }).
export const planToSchedule = (plan) =>
  Object.fromEntries((plan || []).map((r) => [r.stage, { start_dt: r.start, end_dt: r.end }]));

// A launch's plan as shown on its page and on Home: each stage spans the
// earliest start to the latest end its products are scheduled for. Stages no
// product has dates for come from the saved launch plan, then from the auto
// plan of the launch's own start and end dates.
export const projectStagePlan = (project) => {
  const products = project?.deliverables || [];
  const fallback =
    autoStagePlan(
      String(project?.start_date || "").slice(0, 10),
      String(project?.end_date || "").slice(0, 10),
      project?.stage_plan || {}
    ) || [];
  const fromFallback = Object.fromEntries(fallback.map((r) => [r.stage, r]));
  const rows = STAGES.map((stage) => {
    let start = "";
    let end = "";
    products.forEach((d) => {
      const w = d.stage_schedule?.[stage];
      const s = String(w?.start_dt || "").slice(0, 10);
      const e = String(w?.end_dt || "").slice(0, 10);
      if (isIso(s) && (!start || s < start)) start = s;
      if (isIso(e) && (!end || e > end)) end = e;
    });
    if (!start || !end) {
      const f = fromFallback[stage];
      if (!f) return null;
      start = start || f.start;
      end = end || f.end;
    }
    if (end < start) end = start;
    return { stage, dot: STAGE_HEX[stage], start, end };
  });
  return rows.every(Boolean) ? rows : rows.filter(Boolean);
};

// The horizontal scale of a timeline from `from` to `to` (both days included):
// `pos(iso)` is a 0-100 offset of the start of that day, `width(a, b)` the
// width of a span, `months` the month ticks.
export const timelineScale = (from, to, { monthLabel = "short" } = {}) => {
  const total = Math.max(1, spanDays(from, to));
  const clamp = (x) => Math.max(0, Math.min(100, x));
  const pos = (iso) => clamp(((spanDays(from, iso) - 1) / total) * 100);
  const width = (a, b) => clamp((spanDays(a, b) / total) * 100);
  const months = [];
  const first = toDate(from);
  const last = toDate(to);
  let c = new Date(first.getFullYear(), first.getMonth(), 1);
  const thisMonth = todayIsoLocal().slice(0, 7);
  while (c <= last) {
    const iso = toIso(c);
    const left = iso < from ? 0 : pos(iso);
    months.push({
      key: iso.slice(0, 7),
      label: monthLabel === "long" ? `${MONTHS[c.getMonth()]} ${c.getFullYear()}` : MONTHS[c.getMonth()],
      left,
      first: months.length === 0,
      current: iso.slice(0, 7) === thisMonth,
    });
    c = new Date(c.getFullYear(), c.getMonth() + 1, 1);
  }
  // A partial first month too narrow for its label hands it to the next tick.
  if (months.length > 1 && months[1].left < 8) months[0].label = "";
  return { pos, width, months, total };
};

// Past / current / upcoming, against today.
export const phaseOf = (row, today = todayIsoLocal()) =>
  row.end < today ? "past" : row.start <= today ? "current" : "upcoming";

// ---- The launch as one product moving through the stages ----------------
// A launch is one product: it, not each of its deliverables, moves through
// the seven stages on one timeline. Its deliverables (main unit, parts,
// accessories, consumables) are the items listed under it.

const day10 = (v) => String(v || "").slice(0, 10);
const LEGACY_DONE = ["Completed", "Closed"];
const itemStage = (d) => (STAGES.includes(d.current_stage) ? d.current_stage : STAGES[0]);

// The launch's stage plan: its start and end split across the stages (with
// any stage dates set on the launch). A launch without dates falls back to
// how its deliverables were scheduled.
export const launchStagePlan = (project) =>
  autoStagePlan(day10(project?.start_date), day10(project?.end_date), project?.stage_plan || {}) ||
  projectStagePlan(project);

// Where the launch is: the stage its Main unit is at (or, without one, its
// least advanced deliverable), the status there, and whether it is done.
// { stage, index, status, done, total }
export const launchStageOf = (project) => {
  const items = project?.deliverables || [];
  const total = STAGES.length;
  if (project?.status === "Completed") return { stage: STAGES[total - 1], index: total - 1, status: "Completed", done: true, total };
  const main = items.find((d) => d.type === "Main unit");
  const lead =
    main || [...items].sort((a, b) => STAGES.indexOf(itemStage(a)) - STAGES.indexOf(itemStage(b)))[0];
  if (!lead) return { stage: STAGES[0], index: 0, status: "Not Started", done: false, total };
  const stage = itemStage(lead);
  const index = STAGES.indexOf(stage);
  const status = LEGACY_DONE.includes(lead.stage_status) ? "Completed" : lead.stage_status || "Not Started";
  return { stage, index, status, done: index === total - 1 && status === "Completed", total, lead };
};

// Done / current / upcoming for each stage of the launch, from where it is.
export const launchPhaseOf = (where, stage) => {
  const i = STAGES.indexOf(stage);
  if (where.done || i < where.index) return "past";
  return i === where.index ? "current" : "upcoming";
};

// Share of the launch done: finished stages out of seven.
export const launchPct = (where) =>
  where.done ? 100 : Math.round(((where.index + (where.status === "Completed" ? 1 : 0)) / where.total) * 100);

// ---- Daily / weekly timeline windows -------------------------------------
// The window a timeline shows around an anchor date, its column ticks, and how
// far the arrows move it.
//   daily:  two weeks from the Monday of the anchor's week, a column a day
//   weekly: twelve weeks, from three weeks before the anchor's week
const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const TIMELINE_SCALES = [
  ["daily", "Daily"],
  ["weekly", "Weekly"],
];
const mondayOf = (iso) => {
  const d = toDate(iso);
  return addDaysIso(iso, -((d.getDay() + 6) % 7));
};

export const timelineWindow = (scaleIn, anchor, today = todayIsoLocal()) => {
  // Anything but "daily" (e.g. a remembered "monthly") is weekly.
  const scale = scaleIn === "daily" ? "daily" : "weekly";
  let from;
  let to;
  const ticks = [];
  if (scale === "daily") {
    from = mondayOf(anchor);
    to = addDaysIso(from, 13);
    for (let i = 0; i < 14; i += 1) {
      const iso = addDaysIso(from, i);
      const d = toDate(iso);
      ticks.push({ key: iso, iso, label: `${WEEKDAY[d.getDay()]} ${d.getDate()}`, current: iso === today, shade: d.getDay() === 0 || d.getDay() === 6 });
    }
  } else {
    from = addDaysIso(mondayOf(anchor), -21);
    to = addDaysIso(from, 12 * 7 - 1);
    const thisWeek = mondayOf(today);
    for (let i = 0; i < 12; i += 1) {
      const iso = addDaysIso(from, i * 7);
      ticks.push({ key: iso, iso, label: fmtDayMonth(iso), current: iso === thisWeek });
    }
  }
  const total = spanDays(from, to);
  const pos = (iso) => Math.max(0, Math.min(100, ((spanDays(from, iso) - 1) / total) * 100));
  const f = toDate(from);
  const t = toDate(to);
  const sameYear = f.getFullYear() === t.getFullYear();
  const label =
    scale === "daily"
      ? `${WEEKDAY[f.getDay()]} ${f.getDate()}${f.getMonth() === t.getMonth() ? "" : ` ${MONTH[f.getMonth()]}`} – ${WEEKDAY[t.getDay()]} ${t.getDate()} ${MONTH[t.getMonth()]}${sameYear ? "" : ` ${t.getFullYear()}`}`
      : `${fmtDayMonth(from)}${sameYear ? "" : ` ${f.getFullYear()}`} – ${fmtDayMonth(to, true)}`;
  return {
    scale,
    from,
    to,
    total,
    label,
    ticks: ticks.map((tk) => ({ ...tk, left: pos(tk.iso), width: 100 / ticks.length })),
    pos,
    // The anchor one step back (-1) or forward (+1).
    step: (dir) => addDaysIso(anchor, (scale === "daily" ? 7 : 28) * dir),
  };
};
