import { Check, Pencil, RefreshCw, Undo2 } from "lucide-react";
import { PROJECTS } from "@/constants/testIds";
import { fieldBase, fieldLabel } from "@/components/projects/createProjectLogic";
import { fmtDuration, fmtSpan, isRowBad, spanDays, timelineScale } from "@/lib/stagePlan";

// The two steps, above the body.
export function CreateLaunchSteps({ step, onBack, first = "Product details" }) {
  const two = step === 2;
  const circle = "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold";
  return (
    <ol className="m-0 flex list-none items-center justify-center gap-3 px-6 pb-1.5 pt-[18px]">
      <li>
        <button type="button" onClick={onBack} className="flex items-center gap-2.5">
          <span className={`${circle} ${two ? "bg-[rgb(144,144,236)] text-[rgb(26,26,138)]" : "bg-[rgb(26,26,138)] text-white"}`}>
            {two ? <Check className="h-3.5 w-3.5" /> : 1}
          </span>
          <span className={`text-sm ${two ? "font-medium text-[rgb(13,27,62)]" : "font-bold text-[rgb(26,26,138)]"}`}>
            {first}
          </span>
        </button>
      </li>
      <li aria-hidden="true" className="h-0.5 w-[min(140px,14vw)] bg-[rgb(144,144,236)]" />
      <li className="flex items-center gap-2.5">
        <span className={`${circle} ${two ? "bg-[rgb(26,26,138)] text-white" : "bg-[rgb(245,246,248)] text-[rgb(55,65,95)]"}`}>2</span>
        <span className={`text-sm ${two ? "font-bold text-[rgb(26,26,138)]" : "font-medium text-[rgb(55,65,95)]"}`}>
          Timeline &amp; stages
        </span>
      </li>
    </ol>
  );
}

export function StepHeading({ title, sub }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h2 className="m-0 text-[22px] font-bold leading-7 text-[rgb(13,27,62)]">{title}</h2>
      <p className="m-0 text-sm text-[rgb(84,100,144)]">{sub}</p>
    </div>
  );
}

const DATE_SM =
  "h-8 w-[132px] rounded-md border-0 bg-white px-1.5 text-xs text-[rgb(13,27,62)] outline-none focus:shadow-[inset_0_0_0_1px_rgb(43,43,181),0_0_0_3px_rgb(220,220,248)]";

// Step 2: the launch window, and the stage plan worked out from it.
export function CreateLaunchTimeline(ctx) {
  const { customizing, endDate, plan, planIssue, planOverrides, rowIssue, setCustomizing, setEndDate, setPlanOverrides, setStartDate, startDate } =
    ctx;
  const total = plan ? spanDays(startDate, endDate) : 0;
  const setWindow = (setter) => (e) => {
    setter(e.target.value);
    setPlanOverrides({});
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-3.5">
          <StepHeading title="Timeline & stages" sub="Set the launch’s overall timeline. We’ll split it into the seven stage deadlines." />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(170px,100%),1fr))] gap-4">
            <label className={fieldLabel}>
              <span>
                Project start <span className="text-[rgb(239,68,68)]">*</span>
              </span>
              <input
                type="date"
                data-testid={PROJECTS.fieldStart}
                aria-label="Project start"
                value={startDate}
                onChange={setWindow(setStartDate)}
                className={`${fieldBase} font-normal`}
              />
            </label>
            <label className={fieldLabel}>
              <span>
                Project deadline <span className="text-[rgb(239,68,68)]">*</span>
              </span>
              <input
                type="date"
                data-testid={PROJECTS.fieldEnd}
                aria-label="Project deadline"
                value={endDate}
                onChange={setWindow(setEndDate)}
                className={`${fieldBase} font-normal`}
              />
            </label>
          </div>
        </div>
        <div className="flex flex-[1_1_280px] items-start gap-3 rounded-xl bg-[rgb(249,250,251)] px-4 py-3.5 shadow-[inset_0_0_0_1px_rgb(234,238,244)]">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgb(240,240,253)] text-[rgb(43,43,181)]">
            <RefreshCw className="h-4 w-4" />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-bold text-[rgb(13,27,62)]">Auto schedule</span>
            <span className="text-[13px] text-[rgb(84,100,144)]">
              {plan
                ? `Stage deadlines are generated based on the project timeline (${total} days). You can customize any stage dates below.`
                : "Stage deadlines appear once the timeline is valid."}
            </span>
          </span>
        </div>
      </div>

      {!plan ? (
        <div
          role="alert"
          className="rounded-xl bg-[rgb(255,245,245)] px-4 py-3.5 text-sm text-[rgb(13,27,62)] shadow-[inset_0_0_0_1px_rgb(254,226,226)]"
        >
          {planIssue}
        </div>
      ) : (
        <>
          <StagePlanTable
            plan={plan}
            from={startDate}
            to={endDate}
            overrides={planOverrides}
            setOverrides={setPlanOverrides}
            customizing={customizing}
            setCustomizing={setCustomizing}
          />
          {rowIssue && (
            <div role="alert" className="rounded-[10px] bg-[rgb(254,243,199)] px-4 py-3 text-[13px] text-[rgb(13,27,62)]">
              {rowIssue}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// The stage plan as a table with a bar per stage on a month scale: "Customize
// dates" edits any stage, edited stages are marked, "Reset to auto" drops the
// edits. `from`/`to` is the window the stages should sit in.
export function StagePlanTable({ plan, from, to, overrides, setOverrides, customizing, setCustomizing, resetLabel = "Reset to auto", modeLabel = "auto-generated" }) {
  const edits = Object.keys(overrides).length;
  const scale = timelineScale(from, to, { monthLabel: "long" });
  const cols = `130px ${customizing ? "290px" : "190px"} 90px minmax(260px,1fr)`;
  const editStage = (stage, edge, value) => {
    if (!value) return;
    const row = plan.find((r) => r.stage === stage);
    setOverrides((o) => ({ ...o, [stage]: { start: row.start, end: row.end, [edge]: value } }));
  };
  return (
    <div className="overflow-hidden rounded-xl shadow-[inset_0_0_0_1px_rgb(239,240,242)]">
      <div className="flex flex-wrap items-center gap-2.5 bg-[rgb(249,250,251)] px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[rgb(240,240,253)] text-[rgb(43,43,181)]">
          <RefreshCw className="h-3.5 w-3.5" />
        </span>
        <span className="flex-1 text-[15px] font-bold text-[rgb(13,27,62)]">
          Stage plan{" "}
          <span className="font-medium text-[rgb(84,100,144)]">
            {edits ? `(${modeLabel}, ${edits} ${edits === 1 ? "stage" : "stages"} edited)` : `(${modeLabel})`}
          </span>
        </span>
        {edits > 0 && (
          <button
            type="button"
            onClick={() => setOverrides({})}
            className="flex h-[30px] items-center gap-1.5 rounded-[7px] px-2.5 text-[13px] font-semibold text-[rgb(55,65,95)] hover:bg-[rgb(245,246,248)]"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Reset to auto
          </button>
        )}
        <button
          type="button"
          aria-pressed={customizing}
          onClick={() => setCustomizing(!customizing)}
          className={`flex h-[30px] items-center gap-1.5 rounded-[7px] px-2.5 text-[13px] font-semibold text-[rgb(26,26,138)] hover:bg-[rgb(240,240,253)] ${
            customizing ? "bg-[rgb(240,240,253)]" : ""
          }`}
        >
          <Pencil className="h-3.5 w-3.5" />
          {customizing ? "Done editing" : "Customize dates"}
        </button>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[680px]">
          <div
            className="grid h-9 items-center px-4 text-xs font-semibold text-[rgb(84,100,144)] shadow-[inset_0_-1px_0_rgb(234,238,244)]"
            style={{ gridTemplateColumns: cols }}
          >
            <span>Stage</span>
            <span>Timeline</span>
            <span>Duration</span>
            <span className="relative block h-4">
              {scale.months.map((m) => (
                <span key={m.key} className="absolute whitespace-nowrap" style={{ left: `${m.left}%` }}>
                  {m.label}
                </span>
              ))}
            </span>
          </div>
          {plan.map((r) => {
            const edited = !!overrides[r.stage];
            const bad = isRowBad(r, from, to);
            const ring = bad ? "shadow-[inset_0_0_0_1px_rgb(239,68,68)]" : "shadow-[inset_0_0_0_1px_rgb(229,231,235)]";
            const left = Math.min(98, scale.pos(r.start));
            const width = Math.max(1.5, Math.min(100 - left, scale.width(r.start, r.end)));
            return (
              <div
                key={r.stage}
                className="grid min-h-[46px] items-center px-4 py-1 text-[13px] shadow-[inset_0_1px_0_rgb(234,238,244)]"
                style={{ gridTemplateColumns: cols }}
              >
                <span className="flex items-center gap-2 font-bold text-[rgb(13,27,62)]">
                  <span className="h-2 w-2 rounded-full" style={{ background: r.dot }} />
                  {r.stage}
                </span>
                {customizing ? (
                  <span className="flex items-center gap-1.5">
                    <input
                      type="date"
                      aria-label={`${r.stage} start`}
                      value={r.start}
                      onChange={(e) => editStage(r.stage, "start", e.target.value)}
                      className={`${DATE_SM} ${ring}`}
                    />
                    <span aria-hidden="true" className="text-[rgb(138,151,181)]">–</span>
                    <input
                      type="date"
                      aria-label={`${r.stage} end`}
                      value={r.end}
                      onChange={(e) => editStage(r.stage, "end", e.target.value)}
                      className={`${DATE_SM} ${ring}`}
                    />
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 whitespace-nowrap text-[rgb(55,65,95)]">
                    {fmtSpan(r.start, r.end)}
                    {edited && (
                      <span className="h-[18px] rounded-full bg-[rgb(254,243,199)] px-1.5 text-[11px] font-semibold leading-[18px] text-[rgb(13,27,62)]">
                        Edited
                      </span>
                    )}
                  </span>
                )}
                <span className="text-[rgb(55,65,95)]">{r.end < r.start ? "—" : fmtDuration(r.start, r.end)}</span>
                <span className="relative block h-4">
                  <span
                    className="absolute top-px h-3.5 rounded-full"
                    style={{ left: `${left}%`, width: `${width}%`, background: r.dot }}
                  />
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
