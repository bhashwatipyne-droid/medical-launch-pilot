import { PROJECT_STATUSES } from "@/constants/projectPalette";
import { fieldBase, fieldLabel, twoCols } from "@/components/projects/createProjectLogic";

// Status and product owner, side by side. The owner is required whenever the
// product line has owners to pick from.
export function CreateProjectMetaFields(ctx) {
  const { availablePocs, pocId, selectedClient, setPocId, setStatus, status } = ctx;
  return (
    <div className={twoCols}>
      <label className={fieldLabel}>
        <span>Status</span>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${fieldBase} px-2.5 font-normal`}>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className={fieldLabel}>
        <span>
          Product owner {availablePocs.length > 0 && <span className="text-[rgb(239,68,68)]">*</span>}
        </span>
        <select
          aria-label="Product owner"
          value={pocId}
          onChange={(e) => setPocId(e.target.value)}
          disabled={!selectedClient}
          className={`${fieldBase} px-2.5 font-normal`}
        >
          <option value="">
            {!selectedClient ? "Choose a product line first" : availablePocs.length ? "Select owner" : "No owners yet"}
          </option>
          {availablePocs.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
