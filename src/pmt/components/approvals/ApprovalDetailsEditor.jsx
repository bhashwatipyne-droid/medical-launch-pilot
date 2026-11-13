// Lets an approver fix the details of the stage under review (a wrong link, a
// typo in the brief) without sending it back. Saved changes are written to the
// approval log and the stage's team is not asked to resubmit.
import { useEffect, useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { FieldGroupItem, FieldInput } from "@/components/launch/LaunchDetailsEditor";
import { LaunchFacts } from "@/components/launch/LaunchFacts";
import { STAGE_FIELDS } from "@/lib/launchFlow";
import { updateDeliverable } from "@/services/api";
import { fmtDayMonth } from "@/lib/stagePlan";

export function ApprovalDetailsEditor({ item, canEdit, currentUserId, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);

  // A different approval, or fresh data from the server, starts a new draft.
  useEffect(() => {
    setEditing(false);
  }, [item.id]);

  const fields = STAGE_FIELDS[item.current_stage] || [];
  const edit = item.last_edit;

  const save = async () => {
    setBusy(true);
    try {
      await updateDeliverable(currentUserId, item.deliverable_id, { launch: { ...(item.launch || {}), ...draft } });
      toast.success(`${item.current_stage} details updated`);
      setEditing(false);
      await onSaved?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not save the changes");
    } finally {
      setBusy(false);
    }
  };

  if (!editing) {
    return (
      <LaunchFacts
        stage={item.current_stage}
        launch={item.launch || {}}
        action={
          canEdit && fields.length > 0 ? (
            <button
              type="button"
              data-testid="approval-edit-details"
              onClick={() => {
                setDraft({ ...(item.launch || {}) });
                setEditing(true);
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-semibold text-[rgb(13,27,62)] shadow-[inset_0_0_0_1px_rgb(229,231,235)] hover:bg-slate-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit details
            </button>
          ) : null
        }
        note={
          edit ? (
            <p className="m-0 text-xs text-[rgb(84,100,144)]" data-testid="approval-last-edit">
              Edited by {edit.by} · {fmtDayMonth(String(edit.at).slice(0, 10))}. {edit.what}
            </p>
          ) : null
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid="approval-details-form">
      <span className="text-sm font-medium text-foreground">{item.current_stage} details</span>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((field, i, all) => (
          <FieldGroupItem key={field.key} field={field} prev={all[i - 1]}>
            <FieldInput field={field} value={draft[field.key]} disabled={busy} onChange={(v) => setDraft((d) => ({ ...d, [field.key]: v }))} />
          </FieldGroupItem>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => setEditing(false)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 text-sm font-semibold text-[rgb(13,27,62)] shadow-[inset_0_0_0_1px_rgb(229,231,235)] hover:bg-slate-50 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="button"
          data-testid="approval-save-details"
          disabled={busy}
          onClick={save}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#2b2bb5] px-3.5 text-sm font-semibold text-white hover:bg-[#1a1a8a] disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          Save changes
        </button>
      </div>
    </div>
  );
}
