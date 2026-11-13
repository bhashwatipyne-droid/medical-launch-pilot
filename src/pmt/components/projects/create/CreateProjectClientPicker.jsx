import { PROJECTS } from "@/constants/testIds";
import { Plus, Search } from "lucide-react";
import { getInitials } from "@/lib/contacts";
import { fieldLabel } from "@/components/projects/createProjectLogic";

export function CreateProjectClientPicker(ctx) {
  const { activeClientIndex, clientChoiceCount, clientMenuOpen, clientMeta, clientOptions, clientQuery, pickClient, q, selectedClient, setAddClientName, setClientId, setClientIndex, setClientMenuOpen, setClientQuery, setPocId, showAddNewClient } = ctx;
  return (
    <>
    {/* Client */}
    <div className={fieldLabel}>
      <span>Product line <span className="text-[rgb(239,68,68)]">*</span></span>
      {selectedClient ? (
        <div className="flex h-10 items-center gap-2 rounded-lg bg-white pl-2 pr-1.5 shadow-[inset_0_0_0_1px_rgb(229,231,235)]">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#f0f0fd] text-[10px] font-semibold text-[#1a1a8a]">
            {getInitials(selectedClient.name)}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-normal text-[rgb(13,27,62)]">{selectedClient.name}</span>
          <button
            type="button"
            data-testid={PROJECTS.fieldClient}
            className="h-7 rounded-md px-2 text-xs font-semibold text-[rgb(43,43,181)] hover:bg-[rgb(240,240,253)]"
            onClick={() => {
              setClientId("");
              setClientMenuOpen(true);
              setPocId("");
            }}
          >
            Change
          </button>
        </div>
      ) : (
        <div className="relative">
          {clientMenuOpen && (
            <div className="fixed inset-0 z-[1]" onMouseDown={() => setClientMenuOpen(false)} />
          )}
          <label className="relative z-[2] flex h-10 items-center gap-2 rounded-lg bg-white px-3 font-normal text-[rgb(138,151,181)] shadow-[inset_0_0_0_1px_rgb(229,231,235)] focus-within:shadow-[inset_0_0_0_1px_rgb(43,43,181),0_0_0_3px_rgb(220,220,248)]">
            <Search className="h-3.5 w-3.5" />
            <input
              role="combobox"
              aria-expanded={clientMenuOpen}
              aria-label="Search product line"
              data-testid={PROJECTS.fieldClient}
              value={clientQuery}
              onChange={(e) => {
                setClientQuery(e.target.value);
                setClientMenuOpen(true);
                setClientIndex(0);
              }}
              onFocus={() => setClientMenuOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setClientMenuOpen(true);
                  setClientIndex(Math.min(activeClientIndex + 1, clientChoiceCount - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setClientIndex(Math.max(activeClientIndex - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (activeClientIndex < clientOptions.length) {
                    pickClient(clientOptions[activeClientIndex].client);
                  } else if (showAddNewClient) {
                    setAddClientName(clientQuery.trim());
                    setClientMenuOpen(false);
                  }
                } else if (e.key === "Escape" && clientMenuOpen) {
                  e.stopPropagation();
                  setClientMenuOpen(false);
                }
              }}
              placeholder="Select product line"
              className="min-w-0 flex-1 border-none bg-transparent text-sm text-foreground outline-none"
            />
          </label>
          {clientMenuOpen && (
            <div
              role="listbox"
              className="absolute left-0 right-0 top-[calc(100%+6px)] z-[3] flex max-h-80 flex-col gap-px overflow-auto rounded-xl border border-border bg-white p-1.5 shadow-lg"
            >
              <span className="px-2 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {q ? "Matching product lines" : "Product lines"}
              </span>
              {clientOptions.map(({ client, why }, i) => (
                <button
                  key={client.id}
                  type="button"
                  role="option"
                  aria-selected={i === activeClientIndex}
                  onClick={() => pickClient(client)}
                  className={`flex min-h-10 items-center gap-2.5 rounded-md px-2 py-1 text-left hover:bg-[#f0f0fd] ${
                    i === activeClientIndex ? "bg-[#f0f0fd]" : ""
                  }`}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#f0f0fd] text-[10px] font-semibold text-[#1a1a8a]">
                    {getInitials(client.name)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{client.name}</span>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {clientMeta(client, why)}
                  </span>
                </button>
              ))}
              {clientOptions.length === 0 && (
                <span className="px-2 py-2.5 text-[13px] text-muted-foreground">
                  No product line matches. Check the spelling or add it below.
                </span>
              )}
              {showAddNewClient && (
                <button
                  type="button"
                  onClick={() => {
                    setAddClientName(clientQuery.trim());
                    setClientMenuOpen(false);
                  }}
                  className={`mt-1 flex min-h-10 items-center gap-2.5 rounded-md border-t border-border px-2 py-1 text-left text-[13px] font-semibold text-[#2b2bb5] hover:bg-[#f0f0fd] ${
                    activeClientIndex === clientOptions.length ? "bg-[#f0f0fd]" : ""
                  }`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add “{clientQuery.trim()}” as a new product line
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}
