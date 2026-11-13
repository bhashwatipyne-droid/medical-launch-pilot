import { format, parseISO } from "date-fns";

// New-launch modal fields (Mint: 40px, 8px radius, neutral-250 ring).
export const fieldBase =
  "h-10 w-full min-w-0 rounded-lg border-0 bg-white px-3 text-sm text-[rgb(13,27,62)] shadow-[inset_0_0_0_1px_rgb(229,231,235)] outline-none placeholder:text-[rgb(138,151,181)] focus:shadow-[inset_0_0_0_1px_rgb(43,43,181),0_0_0_3px_rgb(220,220,248)] disabled:bg-[rgb(249,250,251)] disabled:text-[rgb(138,151,181)]";
export const fieldLabel = "flex min-w-0 flex-col gap-1.5 text-[13px] font-semibold text-[rgb(13,27,62)]";
export const twoCols = "grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-4";

export const smallButton =
  "inline-flex h-7 items-center whitespace-nowrap rounded-md border border-border bg-white px-2.5 text-xs font-semibold text-foreground hover:bg-slate-50";

export const fmtDue = (date) => {
  if (!date) return "no end date";
  try {
    return `due ${format(parseISO(date), "dd MMM yyyy")}`;
  } catch {
    return `due ${date}`;
  }
};
