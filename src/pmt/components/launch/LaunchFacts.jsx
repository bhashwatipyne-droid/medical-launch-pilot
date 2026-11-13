// PROTOTYPE: what a product has recorded so far in the launch flow, shown to
// whoever approves it. At a CEO gate it shows the facts that gate decides on;
// otherwise the details of the stage under review.
import { AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import {
  CEO_GATES,
  FIELD_BY_KEY,
  GATE_FACTS,
  STAGE_FIELDS,
  formatFieldValue,
} from "@/lib/launchFlow";

const isLink = (v) => /^https?:\/\//.test(String(v || ""));

export function CostCheck({ launch }) {
  const unit = Number(launch?.unit_cost);
  const target = Number(launch?.target_cost);
  if (!unit || !target) return null;
  const within = unit <= target;
  const diff = Math.abs(target - unit).toLocaleString("en-IN");
  return (
    <div
      className={`flex items-start gap-2 rounded-lg px-3.5 py-2.5 text-[13px] leading-5 ${
        within ? "bg-[rgb(209,250,229)] text-[rgb(0,91,75)]" : "bg-[rgb(254,243,199)] text-[rgb(146,64,14)]"
      }`}
    >
      {within ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>
        Unit cost ₹{unit.toLocaleString("en-IN")} against a target of ₹{target.toLocaleString("en-IN")}
        {within ? ` (₹${diff} under target).` : ` (₹${diff} over target).`}
      </span>
    </div>
  );
}

export function LaunchFacts({ stage, launch = {}, title, stageOnly = false }) {
  const gate = stageOnly ? null : CEO_GATES[stage];
  const keys = gate ? GATE_FACTS[stage] : (STAGE_FIELDS[stage] || []).map((f) => f.key);
  if (!keys.length) return null;
  const heading = title || (gate ? "What the CEO is approving" : `${stage} details`);

  return (
    <div className="flex flex-col gap-2.5" data-testid="launch-facts">
      <span className="text-sm font-medium text-foreground">{heading}</span>
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg bg-[rgb(234,238,244)] shadow-[0_0_0_1px_rgb(234,238,244)] sm:grid-cols-2">
        {keys.map((key, i) => {
          const field = FIELD_BY_KEY[key];
          const value = launch[key];
          // Text areas take the full row; so does a lone last cell, so the grid never shows a gap.
          const isArea = (k) => FIELD_BY_KEY[k]?.type === "area";
          let col = 0;
          for (let j = 0; j < i; j += 1) col = isArea(keys[j]) ? 0 : (col + 1) % 2;
          const lastInRun = i === keys.length - 1 || isArea(keys[i + 1]);
          const wide = isArea(key) || (col === 0 && lastInRun);
          return (
            <div key={key} className={`min-w-0 bg-white px-3 py-2.5 ${wide ? "sm:col-span-2" : ""}`}>
              <div className="text-[11px] text-[rgb(84,100,144)]">{field?.label || key}</div>
              {isLink(value) ? (
                <a
                  href={value}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-[13px] font-medium text-[#2b2bb5] hover:underline"
                >
                  <span className="truncate">{String(value).replace(/^https?:\/\//, "")}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ) : (
                <div className="mt-0.5 break-words text-[13px] font-medium leading-5 text-[rgb(13,27,62)]">
                  {formatFieldValue(field, value)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {(stage === "Costing" || gate) && !stageOnly && <CostCheck launch={launch} />}
    </div>
  );
}
