import { ArrowRight, Box, Calendar, Check, Clock, Hourglass, Layers, Send, Undo2 } from "lucide-react";
import { CEO_GATES, STAGES, STAGE_HEX, STAGE_LABEL, STAGE_TO_DEPARTMENT } from "@/lib/launchFlow";
import { Badge } from "@/components/projects/detail/parts";
import { DELIVERABLE_STATUS, HAIRLINE, fmtMin } from "@/components/projects/detail/projectDetailView";
import { StageTimeline, StageTimelineLegend } from "@/components/launch/StageTimeline";
import { fmtSpan, launchPhaseOf } from "@/lib/stagePlan";

const PAST = "rgb(16,185,129)";
const TODO = "rgb(226,232,240)";

// The launch's progress: where the product is in the seven stages, as a
// track, with how many deliverables it lists (and the time logged on it,
// when there is a Work sheet to log it).
// Where the current stage's approval is, and what can be done about it:
// fill in the stage and send it for approval, wait for it, or rework a stage
// that was sent back. Approvers get a way to Approvals instead.
function ApprovalBar({ where, canSubmit, canReview, onOpenForm, onReview }) {
  if (where.done || !where.lead) return null;
  const lead = where.lead;
  const stage = where.stage;
  const gate = CEO_GATES[stage];
  const inReview = where.status === "Ready for Review";
  const sentBack = where.status === "Changes Requested" && lead.last_review_action === "sent_back";
  const BTN =
    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold transition-colors";
  return (
    <div
      data-testid="launch-approval-bar"
      className="flex w-full flex-wrap items-center gap-3 border-t border-[rgb(234,238,244)] pt-4"
    >
      {inReview ? (
        <>
          <span className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-[rgb(30,64,175)]">
            <Hourglass className="h-4 w-4 shrink-0" />
            {stage} is waiting for approval{gate ? ": the manager, then the CEO" : " from the manager"}.
          </span>
          {canReview && (
            <button type="button" onClick={onReview} className={`${BTN} bg-[rgb(43,43,181)] text-white hover:bg-[rgb(61,61,204)]`}>
              Review in Approvals
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {canSubmit && (
            <button type="button" onClick={onOpenForm} className={`${BTN} bg-white text-[rgb(13,27,62)] shadow-[inset_0_0_0_1px_rgb(229,231,235)] hover:bg-[rgb(249,250,251)]`}>
              View {stage} details
            </button>
          )}
        </>
      ) : (
        <>
          {sentBack ? (
            <span className="flex min-w-0 flex-1 items-start gap-2 rounded-lg bg-[rgb(255,245,245)] px-3 py-2 text-[13px] leading-5 text-[rgb(185,28,28)] shadow-[inset_0_0_0_1px_rgb(254,202,202)]">
              <Undo2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <b className="font-semibold">{stage} was sent back.</b> {lead.last_review_note}
              </span>
            </span>
          ) : (
            <span className="min-w-0 flex-1 text-[13px] text-[rgb(84,100,144)]">
              {STAGE_TO_DEPARTMENT[stage]} fills in {stage}: {STAGE_LABEL[stage].charAt(0).toLowerCase() + STAGE_LABEL[stage].slice(1)}. Then it goes for approval.
            </span>
          )}
          {canSubmit && (
            <button
              type="button"
              data-testid="launch-send-for-approval"
              onClick={onOpenForm}
              className={`${BTN} bg-[rgb(43,43,181)] text-white hover:bg-[rgb(61,61,204)]`}
            >
              <Send className="h-4 w-4" />
              {sentBack ? `Rework & resubmit ${stage}` : `Send ${stage} for approval`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function ProjectStats({ where, pct, total, loggedMinutes, canSubmit, canReview, onOpenForm, onReview }) {
  const status = DELIVERABLE_STATUS[where.status] || DELIVERABLE_STATUS["Not Started"];
  return (
    <div
      data-testid="project-detail-stats"
      className={`flex flex-wrap items-center gap-x-8 gap-y-5 rounded-xl bg-white px-5 py-4 ${HAIRLINE}`}
    >
      <div className="flex min-w-0 flex-[3_1_420px] flex-col gap-3">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <span className="flex flex-col gap-0.5">
            <span className="text-[32px] font-bold leading-10 text-[rgb(13,27,62)]">{pct}%</span>
            <span className="text-[13px] text-[rgb(55,65,95)]">Launch progress</span>
          </span>
          <span className="flex flex-wrap items-center gap-2 pb-px text-[13px] text-[rgb(84,100,144)]">
            {where.done ? (
              `All ${where.total} stages done`
            ) : (
              <>
                Step {where.index + 1} of {where.total} · <span className="font-semibold text-[rgb(13,27,62)]">{where.stage}</span>
                <Badge color={status.badge}>{status.label}</Badge>
              </>
            )}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1" aria-label={`Stage ${where.index + 1} of ${where.total}`}>
          {STAGES.map((stage) => {
            const phase = launchPhaseOf(where, stage);
            return (
              <span key={stage} className="flex min-w-0 flex-col gap-1" title={STAGE_LABEL[stage]}>
                <span
                  className="h-2 rounded-full"
                  style={{ background: phase === "past" ? PAST : phase === "current" ? STAGE_HEX[stage] : TODO }}
                />
                <span
                  className={`truncate text-[11px] ${phase === "current" ? "font-semibold text-[rgb(13,27,62)]" : "text-[rgb(84,100,144)]"}`}
                >
                  {stage}
                </span>
              </span>
            );
          })}
        </div>
      </div>
      {[
        { Icon: Box, value: total, label: total === 1 ? "Deliverable" : "Deliverables", divider: true },
        // Time logged comes from the Work sheet; null when there is none.
        loggedMinutes != null && { Icon: Clock, value: fmtMin(loggedMinutes), label: "Time logged" },
      ].filter(Boolean).map(({ Icon, value, label, divider }) => (
        <div
          key={label}
          className={`flex flex-[1_1_150px] items-center gap-3 ${divider ? "md:pl-6 md:shadow-[inset_1px_0_0_rgb(234,238,244)]" : ""}`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgb(249,250,251)] text-[rgb(55,65,95)]">
            <Icon className="h-4 w-4" />
          </span>
          <span className="flex flex-col">
            <span className="text-lg font-semibold leading-6 text-[rgb(13,27,62)]">{value}</span>
            <span className="text-xs text-[rgb(84,100,144)]">{label}</span>
          </span>
        </div>
      ))}
      <ApprovalBar where={where} canSubmit={canSubmit} canReview={canReview} onOpenForm={onOpenForm} onReview={onReview} />
    </div>
  );
}

const VIEWS = [
  ["stages", "Stages", Layers],
  ["timeline", "Timeline", Calendar],
];

// "Production stages": the launch's seven stages, as a row of steps (done,
// current, upcoming, with each stage's dates) or as a Gantt.
export function ProductionStages({ plan, where, setView, view }) {
  const isTimeline = view === "timeline";
  const byStage = Object.fromEntries(plan.map((r) => [r.stage, r]));
  const phases = Object.fromEntries(STAGES.map((s) => [s, launchPhaseOf(where, s)]));
  const from = plan.length ? plan.map((r) => r.start).sort()[0] : "";
  const to = plan.length ? plan.map((r) => r.end).sort().pop() : "";

  return (
    <section className="flex flex-col gap-3" aria-label="Production stages">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="m-0 min-w-[160px] flex-1 text-lg font-semibold leading-6 text-[rgb(13,27,62)]">Production stages</h2>
        <div role="radiogroup" aria-label="Stage view" className="flex gap-2">
          {VIEWS.map(([key, label, Icon]) => {
            const on = view === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setView(key)}
                className={`flex h-8 items-center gap-1.5 rounded-[7px] px-3 text-xs font-semibold ${
                  on
                    ? "bg-[rgb(240,240,253)] text-[rgb(26,26,138)] shadow-[inset_0_0_0_2px_rgb(43,43,181)]"
                    : "bg-white text-[rgb(55,65,95)] shadow-[inset_0_0_0_1px_rgb(234,238,244)] hover:bg-[rgb(249,250,251)]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {!isTimeline ? (
        <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2 p-0" data-testid="project-stage-steps">
          {STAGES.map((stage, i) => {
            const phase = phases[stage];
            const r = byStage[stage];
            return (
              <li
                key={stage}
                title={STAGE_LABEL[stage]}
                className={`flex min-w-0 flex-col gap-1.5 rounded-[10px] px-3 py-2.5 ${
                  phase === "current"
                    ? "bg-[rgb(240,240,253)] shadow-[inset_0_0_0_2px_rgb(43,43,181)]"
                    : "bg-white shadow-[inset_0_0_0_1px_rgb(234,238,244)]"
                }`}
              >
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[rgb(84,100,144)]">
                  <span
                    className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={
                      phase === "past"
                        ? { background: PAST, color: "#fff" }
                        : phase === "current"
                          ? { background: STAGE_HEX[stage], color: "#fff" }
                          : { background: "rgb(245,246,248)", color: "rgb(84,100,144)" }
                    }
                  >
                    {phase === "past" ? <Check className="h-2.5 w-2.5" /> : i + 1}
                  </span>
                  {phase === "past" ? "Done" : phase === "current" ? "Current" : "Upcoming"}
                </span>
                <span className="truncate text-[13px] font-semibold text-[rgb(13,27,62)]">{stage}</span>
                <span className="text-xs tabular-nums text-[rgb(84,100,144)]">{r ? fmtSpan(r.start, r.end) : "No dates"}</span>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className={`overflow-hidden rounded-xl bg-white ${HAIRLINE}`} data-testid="project-stage-timeline">
          {plan.length ? (
            <>
              <StageTimeline rows={plan} from={from} to={to} phases={phases} />
              <StageTimelineLegend />
            </>
          ) : (
            <div className="px-4 py-10 text-center text-[13px] text-[rgb(84,100,144)]">
              Set the launch&apos;s start and end dates to see its timeline.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
