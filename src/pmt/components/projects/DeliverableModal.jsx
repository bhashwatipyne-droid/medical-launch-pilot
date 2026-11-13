// PROTOTYPE: add or edit a deliverable of a launch, styled like the
// new-launch modal. A deliverable is an item listed under the launch (the
// main unit, a part, an accessory): a name and a type.
// It has no timeline of its own - the launch moves through the stages - so
// a new one simply takes the launch's stage dates. Stage details and
// approvals belong to the launch (its page's stage form), not to an item.
import { DELIVERABLE_KINDS, STAGES as LAUNCH_STAGES } from "@/lib/launchFlow";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Layers, Trash2, X } from "lucide-react";
import ConfirmDeleteModal from "@/components/ui/ConfirmDeleteModal";
import { fieldBase, fieldLabel } from "@/components/projects/createProjectLogic";
import { KindSelect } from "@/components/projects/create/CreateLaunchProducts";
import { StepHeading } from "@/components/projects/create/CreateLaunchTimeline";
import { launchStagePlan, planToSchedule } from "@/lib/stagePlan";

import { createDeliverable, updateDeliverable, deleteDeliverable } from "@/services/api";
import { trackEvent } from "../../analytics";

const SECONDARY =
  "flex h-10 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-semibold text-[rgb(13,27,62)] shadow-[inset_0_0_0_1px_rgb(229,231,235)] hover:bg-[rgb(249,250,251)] disabled:opacity-60";

export const DeliverableModal = ({ open, mode, project, projectId, initial, currentUserId, onClose, onSaved }) => {
  const plan = useMemo(() => (project ? launchStagePlan(project) : []), [project]);
  const isEdit = mode === "edit";

  const [name, setName] = useState("");
  const [type, setType] = useState(DELIVERABLE_KINDS[0]);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isEdit && initial) {
      setName(initial.name || "");
      setType(initial.type || DELIVERABLE_KINDS[0]);
    } else {
      setName("");
      setType(DELIVERABLE_KINDS[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, initial]);

  if (!open) return null;

  const kinds = DELIVERABLE_KINDS.includes(type) || !type ? DELIVERABLE_KINDS : [type, ...DELIVERABLE_KINDS];

  const missing = !name.trim() ? "Name the deliverable" : "";
  const nextOk = !missing && !saving;
  const nextLabel = saving ? (isEdit ? "Saving..." : "Adding...") : missing || (isEdit ? "Save changes" : "Add deliverable");

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // A new item takes the launch's stage dates (the work sheet and
      // approvals still read them); an edit leaves its dates alone.
      const payload = {
        name: name.trim(),
        type: type || "",
        ...(isEdit
          ? {}
          : {
              stage_schedule: planToSchedule(plan),
              ...(plan.length ? { start_dt: plan[0].start, end_dt: plan[plan.length - 1].end } : {}),
              required_stages: LAUNCH_STAGES,
              approval_types: [],
            }),
      };
      const saved = isEdit
        ? await updateDeliverable(currentUserId, initial.id, payload)
        : await createDeliverable(currentUserId, { project_id: projectId, ...payload });
      toast.success(isEdit ? "Deliverable updated" : `${payload.name} added to ${project?.name || "the launch"}`);
      trackEvent(isEdit ? "project_deliverable_edited" : "project_deliverable_created", {
        project_id: projectId,
        deliverable_id: saved.id,
        stage: saved.current_stage,
      });
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || `Failed to ${isEdit ? "update" : "add"} deliverable`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initial?.id) return;
    setDeleting(true);
    try {
      await deleteDeliverable(currentUserId, initial.id);
      trackEvent("project_deliverable_deleted", { project_id: projectId, deliverable_id: initial.id });
      toast.success("Deliverable deleted");
      onSaved?.({ deleted: true, id: initial.id });
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not delete deliverable");
    } finally {
      setDeleting(false);
    }
  };

  const goNext = () => {
    if (nextOk) handleSubmit();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit deliverable" : "Add deliverable"}
        onKeyDown={(e) => {
          if (e.key === "Escape" && !deleteOpen && !saving) onClose?.();
        }}
        className="flex max-h-[calc(100dvh-32px)] w-full max-w-[820px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_6px_25px_rgba(13,28,61,0.15)]"
      >
        <div className="flex shrink-0 items-center gap-2.5 px-6 py-4 shadow-[inset_0_-1px_0_rgb(234,238,244)]">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgb(240,240,253)] text-[rgb(43,43,181)]">
            <Layers className="h-4 w-4" />
          </span>
          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-[rgb(84,100,144)]">
            <span className="truncate">{project?.name || "Launch"}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
            <span className="shrink-0 font-semibold text-[rgb(13,27,62)]">{isEdit ? "Edit deliverable" : "New deliverable"}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-[7px] text-[rgb(84,100,144)] hover:bg-[rgb(249,250,251)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pb-5 pt-3 [&>*]:shrink-0">
          <StepHeading
            title="Deliverable details"
            sub={`An item listed under ${project?.name || "this launch"}: the main unit, a variant, an accessory, a part or a consumable.`}
          />
          <label className={fieldLabel}>
            <span>
              Deliverable name <span className="text-[rgb(239,68,68)]">*</span>
            </span>
            <input
              aria-label="Deliverable name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  goNext();
                }
              }}
              placeholder="e.g. PX-200 main unit, silicone finger cover"
              className={`${fieldBase} font-normal`}
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-[rgb(13,27,62)]">Type</span>
            <div className="flex flex-wrap items-start gap-3">
              <KindSelect value={type} onChange={setType} kinds={kinds} />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2.5 px-6 py-3.5 shadow-[inset_0_1px_0_rgb(234,238,244)]">
          {isEdit && (
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              disabled={saving || deleting}
              aria-label="Delete deliverable"
              title="Delete deliverable"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-[rgb(84,100,144)] shadow-[inset_0_0_0_1px_rgb(229,231,235)] hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <span className="flex-1" />
          <button type="button" onClick={onClose} disabled={saving} className={SECONDARY}>
            Cancel
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-disabled={!nextOk}
            disabled={saving}
            className={`flex h-10 items-center gap-2 rounded-lg px-[18px] text-sm font-semibold transition-colors ${
              nextOk ? "bg-[rgb(43,43,181)] text-white hover:bg-[rgb(61,61,204)]" : "cursor-not-allowed bg-[rgb(239,240,242)] text-[rgb(84,100,144)]"
            }`}
          >
            {nextLabel}
          </button>
        </div>
      </div>

      <ConfirmDeleteModal
        open={deleteOpen}
        onClose={() => {
          if (!deleting) setDeleteOpen(false);
        }}
        onConfirm={handleDelete}
        title="Delete this deliverable?"
        description={`"${name || initial?.name || "This deliverable"}" will be permanently deleted.`}
        warning="Any work logged on this deliverable will be kept."
        confirmLabel="Delete deliverable"
        loading={deleting}
      />
    </div>
  );
};
