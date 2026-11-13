import { makeMatcher } from "@/lib/search";
import { useEffect, useMemo, useState } from "react";
import { useSessionState } from "@/hooks/useSessionState";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useUser } from "@/context/UserContext";
import { consumePrefetch } from "@/services/prefetch";
import { useAccess } from "@/hooks/useAccess";
import {
  getProject,
  getProjectWorkLog,
  getOptions,
  updateProject,
  deleteProject,
  getClients,
  getWorksheetLookups,
  updateDeliverable,
  deleteDeliverable,
} from "@/services/api";
import { findLookalikes } from "@/lib/lookalikes";
import { APP_ACTIONS, QUICK_LOG_ENABLED, requestAppAction } from "@/lib/appActions";
import { DeliverableModal } from "@/components/projects/DeliverableModal";
import { StageFormModal } from "@/components/launch/StageFormModal";
import { ImportDeliverablesModal } from "@/components/projects/ImportDeliverablesModal";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import ShareProjectModal from "@/components/projects/ShareProjectModal";
import ConfirmDeleteModal from "@/components/ui/ConfirmDeleteModal";
import { QuickLogTrigger } from "@/components/work-sheet/QuickLogTrigger";
import { trackEvent } from "../analytics";
import { ProjectDetailSkeleton } from "@/components/skeletons/Skeletons";
import { ProjectHeader } from "@/components/projects/detail/ProjectHeader";
import { ProductionStages, ProjectStats } from "@/components/projects/detail/ProjectStats";
import { autoStagePlan, launchPct, launchStageOf, launchStagePlan, planToSchedule } from "@/lib/stagePlan";
import { ProjectTabsPanel } from "@/components/projects/detail/ProjectTabsPanel";
import { BRAND_500, PROJECT_STATUS_DOT } from "@/components/projects/detail/projectDetailView";
import { downloadCsv, slugify, todayStamp } from "@/lib/exportCsv";

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const {
    currentUser,
    currentUserId,
    users,
    loading: userLoading,
  } = useUser();

  const access = useAccess();
  // Everyone can open a project; only admins can change it.
  const canManage = access.canManageProjects;
  const canLogWork = access.canLogWork;

  const [project, setProject] = useState(null);
  const [workItems, setWorkItems] = useState([]);
  const [workLogTotal, setWorkLogTotal] = useState(0);
  const [loggedMinutes, setLoggedMinutes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useSessionState(`project-${projectId}-tab`, "deliverables");
  const [query, setQuery] = useSessionState(`project-${projectId}-query`, "");
  const [closedGroups, setClosedGroups] = useSessionState(`project-${projectId}-closed`, {});
  const [stageView, setStageView] = useSessionState(`project-${projectId}-stage-view`, "stages");
  const [delivModal, setDelivModal] = useState({
    open: false,
    mode: "add",
    initial: null,
  });
  const [importOpen, setImportOpen] = useState(false);
  // PROTOTYPE: the current stage's form (fill in, save, send for approval).
  const [stageFormOpen, setStageFormOpen] = useState(false);
  const [deliverableTypes, setDeliverableTypes] = useState([]);
  const [clients, setClients] = useState([]);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  // Other projects with names easy to confuse with this one, warned about
  // under the title so the team checks the project code when logging.
  const [lookalikes, setLookalikes] = useState([]);

  const fetchAll = async () => {
    setLoading(true);

    try {
      // One slim work-log query (the server merges the project_id and
      // deliverable_id matches itself) instead of two full /work-items
      // downloads. Clients are only needed by the edit-project modal, so they
      // load on demand (see the effect below), not on every page open.
      // Usually already on its way from boot (services/prefetch).
      const [p, workLog, options] = await Promise.all([
        consumePrefetch(`project:${projectId}`, () => getProject(currentUserId, projectId)),
        consumePrefetch(`project-worklog:${projectId}`, () =>
          getProjectWorkLog(currentUserId, projectId)
        ),
        consumePrefetch("project-options", () => getOptions()),
      ]);

      const items = workLog.items || [];
      setProject(p);
      setWorkItems(items);
      setWorkLogTotal(workLog.total ?? items.length);
      setLoggedMinutes(
        workLog.total_minutes ??
          items.reduce((sum, w) => sum + (Number(w.time_taken_minutes) || 0), 0)
      );
      setDeliverableTypes(options.deliverable_types || []);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  // The Work Sheet's slim lookup (names, clients, codes) is enough to find
  // look-alike project names; a failure just means no warning is shown.
  useEffect(() => {
    if (!project?.id) return undefined;
    let cancelled = false;
    getWorksheetLookups()
      .then((data) => {
        if (cancelled) return;
        const names = new Map((data?.clients || []).map((c) => [c.id, c.name]));
        setLookalikes(
          findLookalikes(project, data?.projects || [], (id) => names.get(id) || "")
        );
      })
      .catch(() => !cancelled && setLookalikes([]));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, project?.name, project?.client_id]);

  useEffect(() => {
    if (!editProjectOpen || clients.length) return;
    getClients()
      .then((data) => setClients(data || []))
      .catch(() => toast.error("Could not load clients"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editProjectOpen]);

  // Lightweight refresh for edits that only change the project or its
  // deliverables. No loading flag: the page stays put instead of flashing a
  // skeleton.
  const refreshProject = async () => {
    try {
      setProject(await getProject(currentUserId, projectId));
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to refresh project");
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchAll();

      trackEvent("project_detail_opened", {
        project_id: projectId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, currentUserId]);

  const handleStatusChange = async (status) => {
    if (status === project.status) return;
    try {
      const updated = await updateProject(currentUserId, projectId, { status });

      trackEvent("project_status_changed", {
        project_id: projectId,
        to_status: status,
      });

      setProject((p) => ({ ...p, ...updated }));
      toast.success(`Project marked ${status.toLowerCase()}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Update failed");
    }
  };

  const setDeliverableName = (id, name) =>
    setProject((p) => ({
      ...p,
      deliverables: (p.deliverables || []).map((x) =>
        x.id === id ? { ...x, name } : x
      ),
    }));

  const handleRename = async (deliverable, name) => {
    const previous = deliverable.name;
    setDeliverableName(deliverable.id, name);
    try {
      await updateDeliverable(currentUserId, deliverable.id, { name });
      toast.success("Deliverable renamed");
    } catch (err) {
      setDeliverableName(deliverable.id, previous);
      toast.error(err?.response?.data?.detail || "Could not rename deliverable");
    }
  };

  // PROTOTYPE: saving the launch also moves its deliverables onto its (new)
  // stage plan, so approvals and deadlines follow the launch's dates.
  const handleProjectEditSave = async (updates) => {
    await updateProject(currentUserId, projectId, updates);
    const plan = autoStagePlan(updates.start_date, updates.end_date, updates.stage_plan || {});
    if (plan) {
      const stage_schedule = planToSchedule(plan);
      await Promise.all(
        (project?.deliverables || []).map((d) =>
          updateDeliverable(currentUserId, d.id, {
            stage_schedule,
            start_dt: plan[0].start,
            end_dt: plan[plan.length - 1].end,
          })
        )
      );
    }
    await refreshProject();
  };

  // A deliverable picked for deletion from its row's dustbin.
  const [deliverableToDelete, setDeliverableToDelete] = useState(null);
  const [deletingDeliverable, setDeletingDeliverable] = useState(false);
  const handleDeliverableDelete = async () => {
    const d = deliverableToDelete;
    if (!d) return;
    setDeletingDeliverable(true);
    try {
      await deleteDeliverable(currentUserId, d.id);
      toast.success(`${d.name} deleted`);
      setDeliverableToDelete(null);
      await refreshProject();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not delete deliverable");
    } finally {
      setDeletingDeliverable(false);
    }
  };

  const handleProjectDelete = async () => {
    setDeletingProject(true);

    try {
      await deleteProject(currentUserId, projectId);

      toast.success("Launch deleted");
      navigate("/projects");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not delete project");
    } finally {
      setDeletingProject(false);
    }
  };

  // The quick logger lives on the work sheet; open it there.
  const openQuickLog = () => {
    requestAppAction(APP_ACTIONS.QUICK_LOG);
    navigate("/");
  };

  const deliverables = useMemo(() => project?.deliverables || [], [project]);
  const userName = useMemo(
    () => Object.fromEntries((users || []).map((u) => [u.id, u.name])),
    [users]
  );

  const q = query.trim();

  // The launch's deliverables are a plain list (the launch, not each item,
  // moves through the stages), filtered by the search.
  const listed = useMemo(() => {
    const match = makeMatcher(q);
    return deliverables.filter((d) => match(d.name, d.type));
  }, [deliverables, q]);

  const workGroups = useMemo(() => {
    const match = makeMatcher(q);
    const filtered = workItems.filter((w) =>
      match(w.deliverable_name, userName[w.creator_id], w.stage)
    );
    const byDate = new Map();
    filtered.forEach((w) => {
      const key = w.work_date || "";
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key).push(w);
    });
    return [...byDate.entries()].map(([date, rows]) => ({
      date,
      rows,
      minutes: rows.reduce((sum, w) => sum + (Number(w.time_taken_minutes) || 0), 0),
    }));
  }, [workItems, q, userName]);

  const people = useMemo(() => {
    const totals = new Map();
    workItems.forEach((w) => {
      const name = userName[w.creator_id] || "Unknown";
      totals.set(name, (totals.get(name) || 0) + (Number(w.time_taken_minutes) || 0));
    });
    const sum = [...totals.values()].reduce((a, b) => a + b, 0) || 1;
    return [...totals.entries()]
      .map(([name, minutes]) => ({ name, minutes, pct: Math.round((minutes / sum) * 100) }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [workItems, userName]);

  const stagePlan = useMemo(() => (project ? launchStagePlan(project) : []), [project]);
  const where = useMemo(() => launchStageOf(project), [project]);

  if (userLoading || !currentUser) return null;

  if (loading || !project) {
    return <ProjectDetailSkeleton />;
  }

  const total = deliverables.length;
  const pct = launchPct(where);

  const toggleGroup = (key) =>
    setClosedGroups((c) => ({ ...c, [key]: !c[key] }));

  // Export the deliverables currently listed (search applied) as a CSV, in
  // the same order and wording as the table.
  const handleExportDeliverables = () => {
    if (listed.length === 0) {
      toast.info("No deliverables to export");
      return;
    }
    const header = ["Deliverable", "Type"];
    const rows = listed.map((d) => [d.name || "", d.type || ""]);
    const slug = slugify(project.name) || "project";
    downloadCsv(`${slug}-deliverables-${todayStamp()}.csv`, header, rows);
    trackEvent("project_deliverables_exported", {
      project_id: projectId,
      count: rows.length,
    });
    toast.success(
      `Exported ${rows.length} deliverable${rows.length === 1 ? "" : "s"}`
    );
  };

  const statusDot = PROJECT_STATUS_DOT[project.status] || BRAND_500;
  // The work log comes from the Work sheet; without it, only deliverables.
  const showWorkLog = access.canViewWorksheet;
  const isDeliv = !showWorkLog || tab === "deliverables";

  return (
    <div
      data-testid="project-detail-page"
      className="flex-1 overflow-auto bg-white font-['Inter',sans-serif] text-[rgb(13,27,62)] antialiased"
    >
      <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-4 pb-16 pt-3 md:gap-5 md:px-6 md:pt-4">
        <ProjectHeader canManage={canManage} currentUser={currentUser} onInvoiceSaved={(_, invoiceNumber) => setProject((p) => (p ? { ...p, invoice_number: invoiceNumber } : p))} handleStatusChange={handleStatusChange} lookalikes={lookalikes} navigate={navigate} project={project} setDeleteProjectOpen={setDeleteProjectOpen} setEditProjectOpen={setEditProjectOpen} setShareOpen={setShareOpen} statusDot={statusDot} />

        <ProjectStats
          where={where}
          pct={pct}
          total={total}
          loggedMinutes={showWorkLog ? loggedMinutes : null}
          canSubmit={access.canLogWork}
          canReview={access.canActOnApprovals}
          onOpenForm={() => setStageFormOpen(true)}
          onReview={() => navigate("/approvals")}
        />

        <ProductionStages plan={stagePlan} where={where} setView={setStageView} view={stageView} />

        <ProjectTabsPanel onDeleteDeliverable={canManage ? setDeliverableToDelete : undefined} showWorkLog={showWorkLog} canLogWork={QUICK_LOG_ENABLED && canLogWork} canManage={canManage} closedGroups={closedGroups} listed={listed} handleExportDeliverables={handleExportDeliverables} handleRename={handleRename} isDeliv={isDeliv} loggedMinutes={loggedMinutes} openQuickLog={openQuickLog} people={people} q={q} query={query} setDelivModal={setDelivModal} setImportOpen={setImportOpen} setQuery={setQuery} setTab={setTab} statsH={0} toggleGroup={toggleGroup} tab={tab} total={total} userName={userName} workGroups={workGroups} workItems={workItems} workLogTotal={workLogTotal} />
      </div>

      {QUICK_LOG_ENABLED && canLogWork && <QuickLogTrigger onOpen={openQuickLog} />}

      <StageFormModal
        open={stageFormOpen}
        project={project}
        lead={where.lead}
        currentUserId={currentUserId}
        onClose={() => setStageFormOpen(false)}
        onSaved={refreshProject}
      />

      <DeliverableModal
        open={delivModal.open}
        mode={delivModal.mode}
        project={project}
        projectId={projectId}
        initial={delivModal.initial}
        currentUserId={currentUserId}
        onClose={() => setDelivModal((m) => ({ ...m, open: false }))}
        onSaved={refreshProject}
      />

      <ImportDeliverablesModal
        open={importOpen}
        projectId={projectId}
        deliverableTypes={deliverableTypes}
        onClose={() => setImportOpen(false)}
        onImported={refreshProject}
      />

      <ShareProjectModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        project={project}
        userId={currentUserId}
      />

      {/* Editing a launch is the new-launch modal, filled in. */}
      <CreateProjectModal
        open={editProjectOpen}
        onClose={() => setEditProjectOpen(false)}
        clients={clients}
        editProject={project}
        onSave={handleProjectEditSave}
        onDelete={
          canManage
            ? () => {
                setEditProjectOpen(false);
                setDeleteProjectOpen(true);
              }
            : undefined
        }
      />

      <ConfirmDeleteModal
        open={!!deliverableToDelete}
        onClose={() => {
          if (!deletingDeliverable) setDeliverableToDelete(null);
        }}
        onConfirm={handleDeliverableDelete}
        title="Delete this deliverable?"
        description={`"${deliverableToDelete?.name || ""}" will be removed from ${project.name}.`}
        warning="This can’t be undone."
        confirmLabel="Delete deliverable"
        loading={deletingDeliverable}
      />

      <ConfirmDeleteModal
        open={deleteProjectOpen}
        onClose={() => {
          if (!deletingProject) {
            setDeleteProjectOpen(false);
          }
        }}
        onConfirm={handleProjectDelete}
        title="Delete this launch?"
        description={`"${project.name}" will be permanently deleted.`}
        warning="Its deliverables will be deleted with it."
        confirmLabel="Delete launch"
        loading={deletingProject}
      />
    </div>
  );
}
