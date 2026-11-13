import { Clock, Download, Plus, Search, Trash2, Upload } from "lucide-react";
import { Avatar, Badge, CountPill, DeliverableNameInput, Dot, GroupHeader } from "@/components/projects/detail/parts";
import { DELIV_GRID, HAIRLINE, HEAD_ROW, LOG_GRID, NEUTRAL_400, STAGE_DOT, WORK_STATUS_BADGE, fmtDay, fmtMin } from "@/components/projects/detail/projectDetailView";

export function ProjectTabsPanel({ onDeleteDeliverable, showWorkLog = true, canLogWork, canManage, closedGroups, listed, handleExportDeliverables, handleRename, isDeliv, loggedMinutes, openQuickLog, people, q, query, setDelivModal, setImportOpen, setQuery, setTab, statsH, tab, toggleGroup, total, userName, workGroups, workItems, workLogTotal }) {
  return (
    <>
    {/* Tabs panel */}
    <div className={`flex flex-col overflow-clip rounded-xl bg-white ${HAIRLINE}`}>
      {/* Tabs + toolbar stay pinned under the stats block on desktop. */}
      <div
        className="z-10 bg-white md:sticky md:top-[var(--stats-h,0px)]"
        style={{ "--stats-h": `${statsH}px` }}
      >
      <div
        role="tablist"
        aria-label="Project sections"
        className="flex items-center gap-1 px-4 shadow-[inset_0_-1px_0_rgb(234,238,244)]"
      >
        {[
          ["deliverables", "Deliverables", total],
          showWorkLog && ["log", "Work log", workLogTotal],
        ].filter(Boolean).map(([key, label, count]) => {
          const active = isDeliv ? key === "deliverables" : tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setTab(key);
                setQuery("");
              }}
              className={`flex h-11 items-center gap-2 px-2.5 text-sm font-semibold ${
                active
                  ? "text-[rgb(13,27,62)] shadow-[inset_0_-2px_0_rgb(43,43,181)]"
                  : "text-[rgb(84,100,144)]"
              }`}
            >
              {label}
              <CountPill className="px-[7px] py-px">{count}</CountPill>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <label className="flex h-8 min-w-[200px] flex-[0_1_300px] items-center gap-2 rounded-[7px] bg-white px-2.5 text-[rgb(84,100,144)] shadow-[inset_0_0_0_1px_rgb(239,240,242)]">
          <Search className="h-3.5 w-3.5" />
          <input
            aria-label={isDeliv ? "Search deliverables" : "Search work log"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isDeliv ? "Search deliverables" : "Search work log"}
            className="min-w-0 flex-1 border-none bg-transparent text-[13px] text-[rgb(13,27,62)] outline-none placeholder:text-[rgb(84,100,144)]"
          />
        </label>

        <span className="flex-1" />

        {isDeliv && (
          <button
            type="button"
            data-testid="project-detail-export-deliverables-btn"
            onClick={handleExportDeliverables}
            disabled={listed.length === 0}
            className="inline-flex h-8 items-center gap-1.5 rounded-[7px] bg-[rgb(245,246,248)] px-3.5 text-xs font-semibold leading-4 text-[rgb(74,88,120)] shadow-[inset_0_0_0_1px_rgb(239,240,242)] transition-colors hover:bg-[rgb(243,244,246)] focus:outline-none focus-visible:shadow-[inset_0_0_0_1px_rgb(239,240,242),0_0_0_3px_rgb(220,220,248)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        )}

        {isDeliv && canManage && (
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="project-detail-import-deliverables-btn"
              onClick={() => setImportOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-[7px] bg-[rgb(245,246,248)] px-3.5 text-xs font-semibold leading-4 text-[rgb(74,88,120)] shadow-[inset_0_0_0_1px_rgb(239,240,242)] transition-colors hover:bg-[rgb(243,244,246)] focus:outline-none focus-visible:shadow-[inset_0_0_0_1px_rgb(239,240,242),0_0_0_3px_rgb(220,220,248)]"
            >
              <Upload className="h-3.5 w-3.5" />
              Import
            </button>
            <button
              type="button"
              data-testid="project-detail-add-deliverable-btn"
              onClick={() => setDelivModal({ open: true, mode: "add", initial: null })}
              className="inline-flex h-8 items-center gap-1.5 rounded-[7px] bg-[rgb(43,43,181)] px-3.5 text-xs font-semibold leading-4 text-white transition-colors hover:bg-[rgb(61,61,204)] focus:outline-none focus-visible:shadow-[0_0_0_3px_rgb(220,220,248)]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add deliverable
            </button>
          </div>
        )}

        {!isDeliv && canLogWork && (
          <button
            type="button"
            onClick={openQuickLog}
            className="inline-flex h-8 items-center gap-1.5 rounded-[7px] bg-[rgb(43,43,181)] px-3.5 text-xs font-semibold leading-4 text-white transition-colors hover:bg-[rgb(61,61,204)] focus:outline-none focus-visible:shadow-[0_0_0_3px_rgb(220,220,248)]"
          >
            <Clock className="h-3.5 w-3.5" />
            Log time
          </button>
        )}
      </div>
      </div>

      {isDeliv ? (
        <div className="overflow-x-auto">
          <div className="md:min-w-[760px]">
            <div className={`${DELIV_GRID} ${HEAD_ROW} max-md:hidden`}>
              <span>Deliverable</span>
              <span>Type</span>
            </div>

            {listed.map((d) => {
              const open = () => setDelivModal({ open: true, mode: "edit", initial: d });
              return (
                <div
                  key={d.id}
                  data-testid={`project-detail-deliverable-${d.id}`}
                  role={canManage ? "button" : undefined}
                  tabIndex={canManage ? 0 : undefined}
                  title={canManage ? "Edit deliverable" : undefined}
                  onClick={canManage ? open : undefined}
                  onKeyDown={canManage ? (e) => e.key === "Enter" && open() : undefined}
                  className={`${DELIV_GRID} min-h-[52px] items-center px-4 text-sm shadow-[inset_0_-1px_0_rgb(243,244,246)] hover:bg-[rgb(249,250,251)] max-md:py-2 ${
                    canManage ? "cursor-pointer focus:bg-[rgb(249,250,251)] focus:outline-none" : ""
                  }`}
                >
                  <span className="flex min-w-0 flex-col gap-0.5 py-1.5 max-md:order-1">
                    {canManage ? (
                      <DeliverableNameInput name={d.name} onSave={(name) => handleRename(d, name)} />
                    ) : (
                      <span className="truncate text-sm font-medium leading-[26px] text-[rgb(13,27,62)]" title={d.name}>
                        {d.name}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center justify-between gap-2 text-[13px] text-[rgb(55,65,95)] max-md:order-3">
                    {d.type || "—"}
                    {onDeleteDeliverable && (
                      <button
                        type="button"
                        aria-label={`Delete ${d.name}`}
                        title="Delete deliverable"
                        data-testid={`project-detail-delete-deliverable-${d.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDeliverable(d);
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] text-[rgb(138,151,181)] hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </span>
                </div>
              );
            })}

            {listed.length === 0 && (
              <div className="px-4 py-10 text-center text-[13px] text-[rgb(84,100,144)]">
                {total === 0 && !q ? "No deliverables yet." : "No deliverables match this search."}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-start">
          <div className="min-w-0 flex-[1_1_620px] overflow-x-auto">
            <div className="min-w-[720px]">
              <div className={`${LOG_GRID} ${HEAD_ROW}`}>
                <span>Member</span>
                <span>Deliverable</span>
                <span>Stage</span>
                <span className="text-right">Time</span>
                <span>Status</span>
              </div>

              {workGroups.map((g) => {
                const key = `w:${g.date}`;
                const open = !closedGroups[key];
                return (
                  <div key={g.date}>
                    <GroupHeader
                      open={open}
                      onToggle={() => toggleGroup(key)}
                      name={fmtDay(g.date)}
                      meta={`${g.rows.length} ${g.rows.length > 1 ? "entries" : "entry"} · ${fmtMin(g.minutes)}`}
                    />
                    {open &&
                      g.rows.map((w) => {
                        const by = userName[w.creator_id] || "—";
                        return (
                          <div
                            key={w.id}
                            className={`${LOG_GRID} min-h-12 items-center pl-[34px] pr-4 text-sm shadow-[inset_0_-1px_0_rgb(243,244,246)] hover:bg-[rgb(249,250,251)]`}
                          >
                            <span className="flex min-w-0 items-center gap-2 text-[13px] text-[rgb(74,88,120)]">
                              <Avatar name={by} />
                              <span className="truncate" title={by}>
                                {by}
                              </span>
                            </span>
                            <span
                              className="truncate text-[rgb(13,27,62)]"
                              title={w.deliverable_name || ""}
                            >
                              {w.deliverable_name || "—"}
                            </span>
                            <span className="flex items-center gap-1.5 text-[13px] text-[rgb(74,88,120)]">
                              <Dot color={STAGE_DOT[w.stage] || NEUTRAL_400} size={6} />
                              {w.stage || "—"}
                            </span>
                            <span className="text-right text-[13px] tabular-nums text-[rgb(74,88,120)]">
                              {fmtMin(w.time_taken_minutes)}
                            </span>
                            <span>
                              <Badge color={WORK_STATUS_BADGE[w.status] || "Neutral"}>
                                {w.status || "Not Started"}
                              </Badge>
                            </span>
                          </div>
                        );
                      })}
                  </div>
                );
              })}

              {workGroups.length === 0 && (
                <div className="px-4 py-10 text-center text-[13px] text-[rgb(84,100,144)]">
                  {workItems.length === 0
                    ? "No work logged yet for this project."
                    : "No entries match this search."}
                </div>
              )}

              {workLogTotal > workItems.length && (
                <div className="px-4 py-3 text-xs text-[rgb(84,100,144)]">
                  Showing the latest {workItems.length} of {workLogTotal} entries.
                </div>
              )}
            </div>
          </div>

          <div className="flex min-w-[240px] flex-[0_1_280px] flex-col gap-3 p-4 shadow-[inset_1px_0_0_rgb(234,238,244)]">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[13px] font-semibold text-[rgb(13,27,62)]">
                Time by member
              </span>
              <span className="text-xs text-[rgb(84,100,144)]">
                {fmtMin(loggedMinutes)} total
              </span>
            </div>
            {people.map((m) => (
              <div key={m.name} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-[13px]">
                  <Avatar name={m.name} size={22} />
                  <span className="min-w-0 flex-1 truncate text-[rgb(74,88,120)]">
                    {m.name}
                  </span>
                  <span className="font-medium tabular-nums text-[rgb(13,27,62)]">
                    {fmtMin(m.minutes)}
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-[rgb(245,246,248)]">
                  <div
                    className="h-full rounded-full bg-[rgb(61,61,204)]"
                    style={{ width: `${m.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
