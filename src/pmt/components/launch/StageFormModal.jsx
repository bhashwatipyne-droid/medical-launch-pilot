// PROTOTYPE: the form a team fills in for the launch's current stage - what
// the stage records (links, costs, box content…), a Drive / files link and
// comments for the approver - then saves it or sends it for approval. The
// launch's stage is carried by its lead deliverable (the Main unit), so that
// is the one the form writes to.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, ClipboardList, X } from "lucide-react";
import { LaunchDetailsEditor } from "@/components/launch/LaunchDetailsEditor";
import { updateDeliverable } from "@/services/api";

export function StageFormModal({ open, project, lead, currentUserId, onClose, onSaved }) {
  const [launch, setLaunch] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setLaunch({ ...(lead?.launch || {}) });
  }, [open, lead]);

  if (!open || !lead) return null;
  const stage = lead.current_stage;

  const save = async (send) => {
    setBusy(true);
    try {
      await updateDeliverable(currentUserId, lead.id, send ? { launch, stage_status: "Ready for Review" } : { launch });
      toast.success(send ? `${stage} sent for approval` : `${stage} details saved`);
      onSaved?.();
      if (send) onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || (send ? "Could not send for approval" : "Could not save"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${stage} details`}
        onKeyDown={(e) => {
          if (e.key === "Escape" && !busy) onClose?.();
        }}
        className="flex max-h-[calc(100dvh-32px)] w-full max-w-[880px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_6px_25px_rgba(13,28,61,0.15)]"
      >
        <div className="flex shrink-0 items-center gap-2.5 px-6 py-4 shadow-[inset_0_-1px_0_rgb(234,238,244)]">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgb(240,240,253)] text-[rgb(43,43,181)]">
            <ClipboardList className="h-4 w-4" />
          </span>
          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-[rgb(84,100,144)]">
            <span className="truncate">{project?.name}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
            <span className="shrink-0 font-semibold text-[rgb(13,27,62)]">{stage} details</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-[7px] text-[rgb(84,100,144)] hover:bg-[rgb(249,250,251)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-5">
          <LaunchDetailsEditor
            bare
            deliverable={lead}
            launch={launch}
            onChange={setLaunch}
            onSave={() => save(false)}
            onSubmitForReview={() => save(true)}
            busy={busy}
          />
        </div>
      </div>
    </div>
  );
}
