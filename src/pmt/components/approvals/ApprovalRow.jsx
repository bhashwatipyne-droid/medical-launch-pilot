import { APPROVALS } from "@/constants/testIds";
import { dueChip } from "./approvalsView";
import { memo } from "react";

export const ApprovalRow = memo(function ApprovalRow({
  item,
  isSelected,
  checked,
  canAct,
  draggable,
  onOpen,
  onToggle,
  onDragStart,
  onDragEnd,
}) {
  // PROTOTYPE: a rejected stage shows as sent back, with the reason.
  const sentBack = item.approval_type === "SENT_BACK";
  const chip = sentBack
    ? { cls: "bg-[rgb(255,245,245)] text-[rgb(185,28,28)]", label: `Sent back${item.sent_back_by_role ? ` by ${item.sent_back_by_role}` : ""}` }
    : dueChip(item.due_date);

  return (
    <div
      data-testid={`${APPROVALS.listRowPrefix}-${item.id}`}
      draggable={draggable}
      onDragStart={() => onDragStart(item)}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(item.id)}
      className={[
        "flex w-full cursor-pointer items-start gap-2.5 border-b border-slate-100 px-4 py-3 text-left transition-colors",
        isSelected ? "bg-[#f0f0fd]" : "hover:bg-slate-50",
      ].join(" ")}
    >
      {canAct && (
        <input
          type="checkbox"
          data-testid={`${APPROVALS.checkboxPrefix}-${item.id}`}
          checked={checked}
          onChange={() => onToggle(item.id)}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-[#2b2bb5] accent-[#2b2bb5]"
          aria-label={`Select ${item.deliverable_name}`}
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="flex-1" />
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${chip.cls}`}>
            {chip.label}
          </span>
        </div>
        <div className="mt-1 truncate text-sm font-semibold leading-5 text-slate-900">
          {item.deliverable_name}
        </div>
        <div className="mt-0.5 truncate text-xs text-slate-500">
          {item.project_name} · {item.client_name || "—"}
        </div>
        {sentBack && item.sent_back_note && (
          <div className="mt-1 line-clamp-2 text-xs leading-4 text-[rgb(185,28,28)]">“{item.sent_back_note}”</div>
        )}
      </div>
    </div>
  );
});
