import { ShieldCheck, Undo2, UserCheck, Users } from "lucide-react";
import { IS_PROTOTYPE } from "@/demo/demoMode";
import { differenceInCalendarDays, format, formatDistanceToNowStrict, parseISO } from "date-fns";

// Columns and small formatting helpers for the Approvals page.

const ALL_COLUMNS = [
  {
    key: "MANAGER",
    label: "Manager",
    icon: Users,
    description: "Internal manager sign-off",
  },
  {
    key: "LEADERSHIP",
    // PROTOTYPE: the client's leadership approval is the CEO.
    label: "CEO",
    icon: ShieldCheck,
    description: "CEO approval gates",
  },
  {
    key: "CLIENT_SPOC",
    label: "Client SPOC",
    icon: UserCheck,
    description: "Client sign-off",
  },
  {
    key: "COMPLIANCE",
    label: "Compliance",
    icon: ShieldCheck,
    description: "Compliance review",
  },
  {
    // PROTOTYPE: stages a manager or the CEO rejected, waiting for the team
    // to rework and resubmit. Nothing to approve here; read only.
    key: "SENT_BACK",
    label: "Sent back",
    icon: Undo2,
    description: "Rejected, waiting for rework",
    readOnly: true,
  },
];

// PROTOTYPE: a launch is approved by the stage's manager and, at the gates,
// the CEO - no client or compliance sign-off - so those queues are hidden.
const PROTOTYPE_HIDDEN = ["CLIENT_SPOC", "COMPLIANCE"];
export const COLUMNS = IS_PROTOTYPE ? ALL_COLUMNS.filter((c) => !PROTOTYPE_HIDDEN.includes(c.key)) : ALL_COLUMNS;

// PROTOTYPE: items are not moved between queues by hand - each stage goes to
// its manager, then the CEO at the gates - so "Move to" and drag are off.
export const QUEUE_MOVES_ENABLED = !IS_PROTOTYPE;

export const SENT_BACK = "SENT_BACK";
export const isSentBack = (item) => item?.approval_type === SENT_BACK;

export const initialBoard = () =>
  Object.fromEntries(COLUMNS.map((column) => [column.key, []]));

export const ageLabel = (isoDate) => {
  if (!isoDate) return "—";
  try {
    return `${formatDistanceToNowStrict(parseISO(isoDate))} ago`;
  } catch {
    return "—";
  }
};

// Due-date chip: replaces the plain "Pending" label with how close the
// current stage's deadline is. Falls back to "Pending" when there is none.
export const dueChip = (isoDate) => {
  const fallback = {
    label: "Pending",
    cls: "bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  };
  if (!isoDate) return fallback;
  try {
    const due = parseISO(String(isoDate).slice(0, 10));
    const days = differenceInCalendarDays(due, new Date());
    if (Number.isNaN(days)) return fallback;
    if (days < 0) {
      return { label: `Overdue · ${Math.abs(days)}d`, cls: "bg-red-50 text-red-700", dot: "bg-red-500" };
    }
    if (days === 0) return { label: "Due today", cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500" };
    if (days === 1) return { label: "Due tomorrow", cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500" };
    return { label: `Due ${format(due, "EEE d MMM")}`, cls: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
  } catch {
    return fallback;
  }
};

export const deadlineText = (isoDate) => {
  if (!isoDate) return "—";
  try {
    const due = parseISO(String(isoDate).slice(0, 10));
    const days = differenceInCalendarDays(due, new Date());
    const text = format(due, "EEE, d MMM");
    if (days === 0) return `Today · ${text}`;
    if (days === 1) return `Tomorrow · ${text}`;
    return text;
  } catch {
    return "—";
  }
};

export const isEditableTarget = (el) => {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
};

// Shortcuts need Ctrl (Windows/Linux) or Cmd (Mac) held down. Plain letters
// used to trigger them, and people typing or just resting on the keyboard
// approved or sent back items by accident.
export const IS_MAC =
  typeof navigator !== "undefined" &&
  /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent || "");
export const MOD_LABEL = IS_MAC ? "⌘" : "Ctrl";

export const KBD_CLASS =
  "inline-flex h-[18px] items-center rounded px-[5px] text-[10px] font-semibold text-slate-700 shadow-[inset_0_0_0_1px_rgba(234,238,244,1)]";

// One row of the queue list. Memoised so ticking a checkbox (or moving the
// highlight) re-renders only the rows whose own state changed, not all of the
// hundreds in the queue - that was most of the input lag on bulk selection.
