import { ChevronDown, Layers, Plus, Trash2 } from "lucide-react";
import { PROJECTS } from "@/constants/testIds";
import { fieldBase } from "@/components/projects/createProjectLogic";

export const PILL =
  "flex h-10 items-center gap-2 rounded-full border-0 bg-white px-3.5 text-sm text-[rgb(13,27,62)] shadow-[inset_0_0_0_1px_rgb(229,231,235)] outline-none focus:shadow-[inset_0_0_0_1px_rgb(43,43,181),0_0_0_3px_rgb(220,220,248)]";
const BTN = "h-9 rounded-lg px-3.5 text-sm font-semibold";

// The type of a deliverable, as a pill select. The browser's own arrow sat hard
// against the right edge, so it is replaced with one drawn inside the pill.
export function KindSelect({ value, onChange, kinds }) {
  return (
    <span className="relative inline-flex min-w-[180px]">
      <select
        aria-label="Deliverable type"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${PILL} w-full cursor-pointer appearance-none pr-10`}
      >
        {kinds.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(84,100,144)]"
      />
    </span>
  );
}

// "Deliverables in this launch": the list, and the inline form that adds one
// (name and type). Stage dates come from the launch
// plan in step 2.
export function CreateLaunchProducts(ctx) {
  const { addProduct, deliverableTypes, draftProduct, products, removeProduct, setDraftProduct } = ctx;
  const draftOk = !!draftProduct?.name.trim();
  const setDraft = (patch) => setDraftProduct((d) => ({ ...d, ...patch }));
  const startAdding = () =>
    setDraftProduct({ name: "", type: deliverableTypes[0] || "" });

  return (
    <div className="rounded-xl shadow-[inset_0_0_0_1px_rgb(239,240,242)]">
      <div className="flex items-start gap-3 rounded-t-xl bg-[rgb(249,250,251)] px-4 py-3.5 shadow-[inset_0_0_0_1px_rgb(239,240,242)]">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgb(240,240,253)] text-[rgb(43,43,181)]">
          <Layers className="h-4 w-4" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-bold text-[rgb(13,27,62)]">Deliverables in this launch</span>
          <span className="text-[13px] text-[rgb(84,100,144)]">
            Add each piece of the product to track through the production stages: the main unit, variants, accessories, parts.
          </span>
        </span>
        <span className="whitespace-nowrap text-[13px] text-[rgb(84,100,144)]">
          {products.length} {products.length === 1 ? "deliverable" : "deliverables"}
        </span>
      </div>

      {products.map((d, i) => (
        <div
          key={d.key}
          data-testid={`${PROJECTS.deliverableRowPrefix}-${i}`}
          className="flex min-h-12 items-center gap-3 px-4 py-1.5 text-sm shadow-[inset_0_1px_0_rgb(234,238,244)]"
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-semibold text-[rgb(13,27,62)]">{d.name}</span>
            <span className="text-xs text-[rgb(84,100,144)]">
              {d.type || "No type"}
            </span>
          </span>
          <button
            type="button"
            aria-label={`Remove ${d.name}`}
            data-testid={`${PROJECTS.deliverableRemovePrefix}-${i}`}
            onClick={() => removeProduct(d.key)}
            className="flex h-8 w-8 items-center justify-center rounded-[7px] text-[rgb(84,100,144)] hover:bg-[rgb(245,246,248)]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {draftProduct ? (
        <div className="flex flex-col gap-3 p-4 shadow-[inset_0_1px_0_rgb(234,238,244)]">
          <span className="text-[11px] font-bold uppercase leading-[14px] tracking-[0.05em] text-[rgb(84,100,144)]">
            Add deliverable
          </span>
          <input
            aria-label="Deliverable name"
            autoFocus
            value={draftProduct.name}
            onChange={(e) => setDraft({ name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (draftOk) addProduct();
              }
            }}
            placeholder="Deliverable name, e.g. PX-200 main unit, silicone finger cover"
            className={fieldBase}
          />
          <div className="flex flex-wrap items-start gap-3">
            <KindSelect value={draftProduct.type} onChange={(type) => setDraft({ type })} kinds={deliverableTypes} />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDraftProduct(null)}
              className={`${BTN} bg-white text-[rgb(13,27,62)] shadow-[inset_0_0_0_1px_rgb(229,231,235)] hover:bg-[rgb(249,250,251)]`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => draftOk && addProduct()}
              disabled={!draftOk}
              className={`${BTN} ${draftOk ? "bg-[rgb(43,43,181)] text-white hover:bg-[rgb(61,61,204)]" : "cursor-not-allowed bg-[rgb(239,240,242)] text-[rgb(84,100,144)]"}`}
            >
              Add to launch
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-center px-4 py-3.5 shadow-[inset_0_1px_0_rgb(234,238,244)]">
          <button
            type="button"
            data-testid={PROJECTS.addDeliverableBtn}
            onClick={startAdding}
            className="flex h-9 items-center gap-2 rounded-lg bg-[rgb(240,240,253)] px-3.5 text-sm font-semibold text-[rgb(26,26,138)] shadow-[inset_0_0_0_1px_rgb(144,144,236)] hover:bg-[rgb(220,220,248)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add deliverable
          </button>
        </div>
      )}
    </div>
  );
}
