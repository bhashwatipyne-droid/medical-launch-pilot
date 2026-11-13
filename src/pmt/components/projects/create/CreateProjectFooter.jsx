import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { PROJECTS } from "@/constants/testIds";

const SECONDARY =
  "flex h-10 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-semibold text-[rgb(13,27,62)] shadow-[inset_0_0_0_1px_rgb(229,231,235)] hover:bg-[rgb(249,250,251)]";

export function CreateProjectFooter(ctx) {
  const { createLabel, goBack, goNext, handleClose, isStep2, nextOk, onDelete, submitting } = ctx;
  return (
    <div className="flex shrink-0 items-center gap-2.5 px-6 py-3.5 shadow-[inset_0_1px_0_rgb(234,238,244)]">
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={submitting}
          aria-label="Delete launch"
          title="Delete launch"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-[rgb(84,100,144)] shadow-[inset_0_0_0_1px_rgb(229,231,235)] hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      {isStep2 && (
        <button type="button" onClick={goBack} disabled={submitting} className={`${SECONDARY} pl-2.5`}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      )}
      <span className="flex-1" />
      <button type="button" data-testid={PROJECTS.modalCancel} onClick={handleClose} className={SECONDARY}>
        Cancel
      </button>
      <button
        type="button"
        data-testid={PROJECTS.modalSubmit}
        onClick={goNext}
        aria-disabled={!nextOk}
        disabled={submitting}
        className={`flex h-10 items-center gap-2 rounded-lg px-[18px] text-sm font-semibold transition-colors ${
          nextOk ? "bg-[rgb(43,43,181)] text-white hover:bg-[rgb(61,61,204)]" : "cursor-not-allowed bg-[rgb(239,240,242)] text-[rgb(84,100,144)]"
        }`}
      >
        {createLabel}
        {!isStep2 && nextOk && <ArrowRight className="h-4 w-4" />}
      </button>
    </div>
  );
}
