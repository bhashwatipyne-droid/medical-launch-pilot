// PROTOTYPE: the launch-flow part of a deliverable (one product). The team on
// the current stage fills in what that stage records and submits it for
// review; earlier stages' details stay visible, read-only.
import { useState } from "react";
import { ChevronDown, ChevronRight, Save, Send, Undo2 } from "lucide-react";
import { LaunchFacts } from "@/components/launch/LaunchFacts";
import {
  CEO_GATES,
  FIELD_GROUP_LABEL,
  STAGE_FIELDS,
  STAGE_HEX,
  STAGE_LABEL,
  STAGE_CONTRIBUTORS,
  STAGE_TO_DEPARTMENT,
  STAGES,
  missingFields,
} from "@/lib/launchFlow";

const INPUT =
  "w-full min-w-0 rounded-lg border border-input bg-white px-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-[#2b2bb5] focus:ring-[3px] focus:ring-[#2b2bb5]/20 disabled:bg-slate-50 disabled:text-slate-500";

export function FieldInput({ field, value, onChange, disabled }) {
  const id = `launch-${field.key}`;
  const common = { id, disabled, value: value ?? "", onChange: (e) => onChange(e.target.value) };
  let control;
  if (field.type === "area") {
    control = <textarea {...common} rows={3} placeholder={field.placeholder} className={`${INPUT} resize-y py-2 leading-5`} />;
  } else if (field.type === "select") {
    control = (
      <select {...common} className={`${INPUT} h-9`}>
        <option value="">Choose…</option>
        {field.options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    );
  } else {
    const type = field.type === "date" ? "date" : field.type === "number" || field.type === "money" ? "number" : "text";
    control = <input {...common} type={type} placeholder={field.placeholder} className={`${INPUT} h-9`} />;
  }
  return (
    <label htmlFor={id} className={`flex min-w-0 flex-col gap-1.5 ${field.type === "area" ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-semibold text-[rgb(74,88,120)]">
        {field.label}
        {field.required && <span className="text-[rgb(239,68,68)]"> *</span>}
      </span>
      {control}
    </label>
  );
}

// A stage worked by two teams (Packaging) shows each team's part under its own heading.
export function FieldGroupItem({ field, prev, children }) {
  const starts = field.group && field.group !== prev?.group;
  if (!starts) return children;
  return (
    <>
      <div className="mt-1 border-t border-border pt-3 text-xs font-bold uppercase tracking-[0.06em] text-[rgb(84,100,144)] first:mt-0 first:border-t-0 first:pt-0 sm:col-span-2">
        {FIELD_GROUP_LABEL[field.group] || field.group}
      </div>
      {children}
    </>
  );
}

// `bare`: no top rule or heading spacing (inside the launch page's stage form).
// `onSave`: also offer "Save" to keep a draft without sending it.
export function LaunchDetailsEditor({ deliverable, launch, onChange, onSubmitForReview, onSave, busy, bare = false }) {
  const [openEarlier, setOpenEarlier] = useState(false);
  const stage = deliverable?.current_stage;
  const status = deliverable?.stage_status || "Not Started";
  if (!stage || !STAGES.includes(stage)) return null;

  const flow = deliverable.required_stages?.length ? deliverable.required_stages : STAGES;
  const at = flow.indexOf(stage);
  const done = status === "Completed";
  const inReview = status === "Ready for Review";
  // Details stay editable while the stage waits for approval; only the
  // finished flow is locked. Sending for approval is only offered before that.
  const editable = !done;
  const canSend = !done && !inReview;
  const missing = missingFields(stage, launch);
  const gate = CEO_GATES[stage];
  const next = flow[at + 1];
  const earlier = flow.slice(0, done ? flow.length : at);

  return (
    <section className={bare ? "" : "mt-8 border-t border-border pt-6"} data-testid="launch-details">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-[rgb(84,100,144)]">
            Launch details
          </div>
          <h3 className="mt-1 flex flex-wrap items-center gap-2 text-base font-semibold text-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: STAGE_HEX[stage] }} />
            {done ? "All stages complete" : `Step ${at + 1} of ${flow.length}: ${STAGE_LABEL[stage]}`}
          </h3>
          {!done && (
            <p className="mt-1 text-[13px] text-muted-foreground">
              Owned by {STAGE_TO_DEPARTMENT[stage]}
              {(STAGE_CONTRIBUTORS[stage] || []).length ? `, with ${STAGE_CONTRIBUTORS[stage].join(" and ")}` : ""}.{" "}
              {gate
                ? "After the manager approves, the CEO approves this step."
                : `After approval it moves to ${next ? `${STAGE_TO_DEPARTMENT[next]} (${next})` : "dispatch"}.`}
            </p>
          )}
        </div>
        {gate && !done && (
          <span className="rounded-full bg-[rgb(254,243,199)] px-2.5 py-1 text-[11px] font-semibold text-[rgb(146,64,14)]">
            Step {gate.step} · {gate.title}
          </span>
        )}
      </div>

      {deliverable.last_review_action === "sent_back" && status === "Changes Requested" && deliverable.last_review_note && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-[rgb(255,245,245)] px-3.5 py-2.5 text-[13px] leading-5 text-[rgb(185,28,28)] shadow-[inset_0_0_0_1px_rgb(254,202,202)]">
          <Undo2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <b className="font-semibold">Sent back for rework.</b> {deliverable.last_review_note}
          </span>
        </div>
      )}

      {inReview && (
        <div className="mt-4 rounded-lg bg-[rgb(219,234,254)] px-3.5 py-2.5 text-[13px] text-[rgb(30,64,175)]">
          Submitted for review. It is waiting in Approvals{gate ? " for the manager, then the CEO" : ""}. You can still
          edit the details below; save to update what the approver sees.
        </div>
      )}

      {!done && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(STAGE_FIELDS[stage] || []).map((field, i, all) => (
            <FieldGroupItem key={field.key} field={field} prev={all[i - 1]}>
              <FieldInput
                field={field}
                value={launch[field.key]}
                disabled={!editable || busy}
                onChange={(v) => onChange({ ...launch, [field.key]: v })}
              />
            </FieldGroupItem>
          ))}
        </div>
      )}

      {editable && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          <span className="text-xs text-muted-foreground">
            {!canSend
              ? "Changes save straight to the approval."
              : missing.length
                ? `Add ${missing.map((f) => f.label.toLowerCase()).join(", ")} to send it.`
                : "Ready to send for approval."}
          </span>
          {onSave && (
            <button
              type="button"
              data-testid="launch-save-details"
              disabled={busy}
              onClick={onSave}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 text-sm font-semibold text-[rgb(13,27,62)] shadow-[inset_0_0_0_1px_rgb(229,231,235)] hover:bg-slate-50 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {canSend ? "Save" : "Save changes"}
            </button>
          )}
          {canSend && (
            <button
              type="button"
              data-testid="launch-submit-review"
              disabled={busy || missing.length > 0}
              onClick={onSubmitForReview}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#2b2bb5] px-3.5 text-sm font-semibold text-white hover:bg-[#1a1a8a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Send for approval
            </button>
          )}
        </div>
      )}

      {earlier.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setOpenEarlier((v) => !v)}
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#2b2bb5]"
          >
            {openEarlier ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {openEarlier ? "Hide" : "Show"} what earlier stages recorded ({earlier.length})
          </button>
          {openEarlier && (
            <div className="mt-3 flex flex-col gap-5">
              {earlier.map((s, i) => (
                <LaunchFacts key={s} stage={s} launch={launch} stageOnly title={`${i + 1}. ${STAGE_LABEL[s]}`} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
