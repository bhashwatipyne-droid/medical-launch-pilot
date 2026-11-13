import { APPROVALS } from "@/constants/testIds";
import { COLUMNS, QUEUE_MOVES_ENABLED, deadlineText, dueChip, isSentBack } from "@/components/approvals/approvalsView";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { LaunchFacts } from "@/components/launch/LaunchFacts";
import { CEO_GATES, STAGES, STAGE_LABEL, STAGE_TO_DEPARTMENT } from "@/lib/launchFlow";
import { fmtDayMonth } from "@/lib/stagePlan";

// PROTOTYPE: rejecting a stage. The dropdown is where the launch goes back
// to: this stage (the same team reworks it) or an earlier one (those stages
// are redone). At a CEO gate it starts on the stage the client's rule names
// (step 4 -> Sample, step 8 -> Packaging).
// `approve` is the Approve button: it shares the row, and the hint gets a line
// of its own under the whole row, so the row never wraps differently per stage.
function SendBackControl({ item, disabled, onSendBack, approve }) {
  const flow = item.required_stages?.length ? item.required_stages : STAGES;
  const stages = flow.slice(0, Math.max(1, flow.indexOf(item.current_stage) + 1));
  const gate = CEO_GATES[item.current_stage];
  const fallback = gate?.returnTo || item.current_stage;
  const [to, setTo] = useState(fallback);
  useEffect(() => setTo(fallback), [item.id, fallback]);
  const team = STAGE_TO_DEPARTMENT[to];
  const hint =
    to === item.current_stage
      ? `The ${team} team reworks ${to} and sends it for approval again.`
      : `The launch goes back to ${to} (${team}); ${to} and every stage after it up to ${item.current_stage} are done again.`;
  return (
    <div className="mt-4 flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {approve}
        <button
          type="button"
          data-testid={`approval-send-back-${item.id}`}
          onClick={() => onSendBack(item, to)}
          disabled={disabled}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 text-sm font-semibold text-[rgb(185,28,28)] shadow-[inset_0_0_0_1px_rgb(252,165,165)] hover:bg-[rgb(255,245,245)] disabled:opacity-50"
        >
          <Undo2 className="h-4 w-4" />
          Send back
        </button>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          to stage
          <select
            aria-label="Send back to stage"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            disabled={disabled}
            className="h-9 max-w-[280px] rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none focus:border-[#2b2bb5] focus:ring-[3px] focus:ring-[#2b2bb5]/20"
          >
            {stages.map((s, i) => (
              <option key={s} value={s}>
                {i + 1}. {s}
                {s === item.current_stage ? " (this stage)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      <span className="text-xs leading-4 text-slate-500">
        {hint}
        {gate && to === gate.returnTo && to !== item.current_stage ? " This is the default for this CEO gate." : ""}
      </span>
    </div>
  );
}

// PROTOTYPE: a stage that was rejected: who sent it back, why, and that it
// now waits on the team to rework it and send it for approval again.
function SentBackNotice({ item }) {
  const team = STAGE_TO_DEPARTMENT[item.current_stage];
  return (
    <div className="mt-6 flex flex-col gap-3" data-testid="approval-sent-back">
      <div className="rounded-xl bg-[rgb(255,245,245)] px-4 py-3.5 shadow-[inset_0_0_0_1px_rgb(254,202,202)]">
        <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[rgb(185,28,28)]">
          <Undo2 className="h-4 w-4" />
          Sent back by {item.sent_back_by_name}
          {item.sent_back_by_role ? ` (${item.sent_back_by_role})` : ""}
          {item.sent_back_at && <span className="font-normal text-[rgb(220,38,38)]">· {fmtDayMonth(String(item.sent_back_at).slice(0, 10))}</span>}
        </div>
        <p className="m-0 mt-1.5 text-sm leading-5 text-[rgb(13,27,62)]">{item.sent_back_note || "No reason given."}</p>
        <p className="m-0 mt-2 text-xs text-[rgb(84,100,144)]">
          {item.sent_back_from && item.sent_back_from !== item.current_stage
            ? `Moved back from ${item.sent_back_from} to ${item.current_stage}.`
            : `Back to ${item.current_stage} for rework.`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/50 px-3.5 py-2.5 text-xs leading-5 text-muted-foreground">
        <span className="flex-1">
          Waiting for {team ? `the ${team} team` : "the team"} to rework {item.current_stage} and send it for approval again from the launch page.
        </span>
        {item.project_id && (
          <Link
            to={`/projects/${item.project_id}`}
            className="inline-flex items-center gap-1 font-semibold text-[#2b2bb5] hover:underline"
          >
            Open launch
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

export function ApprovalsDetail(ctx) {
  const { aSel, canAct: canActOnQueue, decide, detailOpen, handleMove, loading, movingId, notes, sendBack, setDetailOpen, setNotes } = ctx;
  const sentBack = isSentBack(aSel);
  const canAct = canActOnQueue && !sentBack;
  return (
    <>
    {/* DETAIL */}
    <div className={`flex-1 overflow-y-auto ${detailOpen ? "" : "max-md:hidden"}`}>
      {aSel ? (
        <div className="max-w-[720px] px-4 pb-10 pt-4 md:px-7 md:pt-6">
          <button
            type="button"
            onClick={() => setDetailOpen(false)}
            className="mb-3 inline-flex h-10 items-center gap-1 rounded-lg pr-3 text-sm font-medium text-[#2b2bb5] active:bg-[#f0f0fd] md:hidden"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to list
          </button>

          <div className="flex flex-wrap items-start gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-2 md:min-w-[240px]">
              <div className="flex flex-wrap items-center gap-2">
                {sentBack ? (
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[rgb(255,245,245)] px-2 py-1 text-[11px] font-semibold text-[rgb(185,28,28)]">
                    <Undo2 className="h-3 w-3" />
                    Sent back for rework
                  </span>
                ) : (() => {
                  const chip = dueChip(aSel.due_date);
                  return (
                    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-medium ${chip.cls}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${chip.dot}`} />
                      {chip.label}
                    </span>
                  );
                })()}
                {aSel.gate && (
                  <span className="inline-flex items-center whitespace-nowrap rounded-full bg-[rgb(254,243,199)] px-2 py-1 text-[11px] font-semibold text-[rgb(146,64,14)]">
                    Step {aSel.gate.step} · {aSel.gate.title}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                {aSel.deliverable_name}
              </h2>
            </div>

            {canAct && QUEUE_MOVES_ENABLED && (
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <span className="text-xs text-slate-500">Move to</span>
              {COLUMNS.filter((c) => c.key !== aSel.approval_type && !c.readOnly).map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => handleMove(aSel, c.key)}
                  disabled={movingId === aSel.id}
                  className="h-7 rounded-lg bg-white px-2.5 text-xs text-slate-700 shadow-[inset_0_0_0_1px_rgba(226,232,240,1)] hover:bg-slate-50 disabled:opacity-50"
                >
                  {c.label}
                </button>
              ))}
            </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-[92px_1fr] gap-y-2.5 md:grid-cols-[130px_1fr] text-sm">
            <span className="text-slate-500">Project</span>
            <span className="text-foreground">{aSel.project_name}</span>
            <span className="text-slate-500">Client</span>
            <span className="text-foreground">{aSel.client_name || "—"}</span>
            <span className="text-slate-500">Deadline</span>
            <span className="text-foreground">{deadlineText(aSel.due_date)}</span>
            <span className="text-slate-500">Workflow</span>
            <span className="flex flex-wrap items-center gap-1.5">
              {(aSel.required_stages || [aSel.current_stage]).map((stage, i, arr) => (
                <span key={stage} className="flex items-center gap-1.5">
                  <span
                    className={[
                      "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium",
                      stage === aSel.current_stage
                        ? "bg-[#2b2bb5] text-white"
                        : arr.indexOf(aSel.current_stage) > i
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500",
                    ].join(" ")}
                  >
                    {stage}
                  </span>
                  {i < arr.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
                </span>
              ))}
            </span>
          </div>

          <div className="mt-6">
            <LaunchFacts stage={aSel.current_stage} launch={aSel.launch || {}} />
          </div>

          {aSel.comments && (
            <div className="mt-5 rounded-lg border border-border bg-muted/50 px-3.5 py-2.5 text-xs leading-5 text-muted-foreground">
              {aSel.comments}
            </div>
          )}

          {sentBack ? (
            <SentBackNotice item={aSel} />
          ) : canAct ? (
          <>
          <label className="mt-5 flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Review note</span>
            <textarea
              data-testid={`${APPROVALS.notePrefix}-${aSel.id}`}
              placeholder="Optional when approving. Required when sending back."
              value={notes[aSel.id] || ""}
              onChange={(e) =>
                setNotes((prev) => ({ ...prev, [aSel.id]: e.target.value }))
              }
              rows={3}
              className="resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm leading-5 outline-none focus:border-[#2b2bb5] focus:ring-[3px] focus:ring-[#2b2bb5]/20"
            />
          </label>

          <SendBackControl
            item={aSel}
            disabled={movingId === aSel.id}
            onSendBack={sendBack}
            approve={
            <button
              type="button"
              data-testid={`${APPROVALS.approvePrefix}-${aSel.id}`}
              onClick={() => decide(aSel)}
              disabled={movingId === aSel.id}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#2b2bb5] px-3.5 text-sm font-semibold text-white hover:bg-[#1a1a8a] disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Approve
            </button>
            }
          />
          </>
          ) : (
            <div
              data-testid="approvals-read-only-note"
              className="mt-5 rounded-lg border border-border bg-muted/50 px-3.5 py-2.5 text-xs leading-5 text-muted-foreground"
            >
              You can follow this approval here. Only managers can approve it
              or move it to another queue.
            </div>
          )}
        </div>
      ) : (
        !loading && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select an approval to review it
          </div>
        )
      )}
    </div>
    </>
  );
}
