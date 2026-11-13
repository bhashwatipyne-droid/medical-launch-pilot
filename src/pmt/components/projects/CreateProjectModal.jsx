import { DELIVERABLE_KINDS, STAGES as LAUNCH_STAGES } from "@/lib/launchFlow";
import { makeMatcher } from "@/lib/search";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { PROJECTS } from "@/constants/testIds";
import {
  PROJECT_STATUSES,
} from "@/constants/projectPalette";
import { checkProjectDuplicates, createProject } from "@/services/api";
import { useUser } from "@/context/UserContext";
import { trackEvent } from "../../analytics";
import { AddClientModal } from "@/components/clients/AddClientModal";
import { findSimilarClients, findSimilarProjects } from "@/lib/lookalikes";

import { fmtDue, smallButton, twoCols } from "@/components/projects/createProjectLogic";
import { CreateProjectFooter } from "@/components/projects/create/CreateProjectFooter";
import { CreateLaunchProducts } from "@/components/projects/create/CreateLaunchProducts";
import { CreateLaunchSteps, CreateLaunchTimeline, StepHeading } from "@/components/projects/create/CreateLaunchTimeline";
import { CreateProjectMetaFields } from "@/components/projects/create/CreateProjectMetaFields";
import { CreateProjectNameNotices } from "@/components/projects/create/CreateProjectNameNotices";
import { CreateProjectDescriptionField, CreateProjectNameFields } from "@/components/projects/create/CreateProjectNameFields";
import { autoStagePlan, planRowIssue, planToSchedule, planWindowIssue } from "@/lib/stagePlan";
import { CreateProjectClientPicker } from "@/components/projects/create/CreateProjectClientPicker";
import { CreateProjectHeader } from "@/components/projects/create/CreateProjectHeader";

// New product launch, in two steps (PROTOTYPE).
//  1 Product details: product line, launch name, what it is for, status,
//    product owner, and the deliverables in the launch (the pieces of the
//    product, each with a name and a type).
//  2 Timeline & stages: the launch's start and deadline; the seven stages are
//    scheduled across that window automatically, and any stage's dates can be
//    customized. Each deliverable gets that plan.
//
// Step 1 starts from the client (searchable, by name or initials, with
// "Add as a new client" when it isn't there yet), then checks the name as it
// is typed against existing projects - for this client first, then others -
// so the same project isn't created twice. A similar name must be confirmed
// as a new project, and gets a one-line description that tells the two apart
// wherever the team picks a project.
//
// Editing a launch (`editProject`) is the same modal, filled in: step 1 its
// details (its deliverables are managed on its page), step 2 its timeline
// and stage plan, where any stage's dates can be moved. `onSave(updates)`
// saves it; `onDelete` adds a delete button.
export const CreateProjectModal = ({
  open,
  onClose,
  onCreated,
  clients: clientList,
  projects: allProjects = [],
  onClientsChanged,
  editProject = null,
  onSave,
  onDelete,
}) => {
  const isEdit = !!editProject;
  // The launch being edited is not a duplicate of itself.
  const projects = useMemo(
    () => (editProject ? allProjects.filter((p) => p.id !== editProject.id) : allProjects),
    [allProjects, editProject]
  );
  const { currentUserId } = useUser();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [clientMenuOpen, setClientMenuOpen] = useState(false);
  const [clientIndex, setClientIndex] = useState(0);
  const [addClientName, setAddClientName] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [recentDismissed, setRecentDismissed] = useState(false);
  const [pocId, setPocId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState(PROJECT_STATUSES[0]);
  const [step, setStep] = useState(1);
  const [products, setProducts] = useState([]);
  const [draftProduct, setDraftProduct] = useState(null);
  const [planOverrides, setPlanOverrides] = useState({});
  const [customizing, setCustomizing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // A client added from here, until the page's refreshed list includes it.
  const [addedClient, setAddedClient] = useState(null);

  // Editing: start from the launch as it is.
  useEffect(() => {
    if (!open || !editProject) return;
    const day = (v) => String(v || "").slice(0, 10);
    setName(editProject.name || "");
    setDescription(editProject.description || "");
    setClientId(editProject.client_id || "");
    setPocId(editProject.poc_id || "");
    setStatus(editProject.status || PROJECT_STATUSES[0]);
    setStartDate(day(editProject.start_date));
    setEndDate(day(editProject.end_date));
    setPlanOverrides({ ...(editProject.stage_plan || {}) });
    setConfirmed(true);
    setStep(1);
    setCustomizing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editProject?.id]);

  const clients = useMemo(
    () =>
      addedClient && !clientList.some((c) => c.id === addedClient.id)
        ? [...clientList, addedClient]
        : clientList,
    [clientList, addedClient]
  );

  const clientNames = useMemo(
    () => new Map(clients.map((c) => [c.id, c.name])),
    [clients]
  );
  const clientNameOf = (id) => clientNames.get(id) || "";

  const projectCounts = useMemo(() => {
    const counts = new Map();
    projects.forEach((p) => counts.set(p.client_id, (counts.get(p.client_id) || 0) + 1));
    return counts;
  }, [projects]);

  // Same client + same name made in the last 30 days, asked of the server because
  // it sees every project, not just the ones this page has loaded. It only
  // informs: it never changes whether the project can be created.
  // The answer is kept with the client and name it was asked for, so a result
  // for an earlier spelling is never shown against the current one.
  const [recentCheck, setRecentCheck] = useState({ key: "", list: [] });
  const checkedName = name.trim();
  const checkKey = `${clientId}|${checkedName}`;
  useEffect(() => {
    if (!open || !clientId || checkedName.length < 3) return undefined;
    let stale = false;
    const timer = setTimeout(() => {
      checkProjectDuplicates(currentUserId, clientId, checkedName)
        .then((data) => !stale && setRecentCheck({ key: checkKey, list: data?.duplicates || [] }))
        .catch(() => !stale && setRecentCheck({ key: checkKey, list: [] }));
    }, 400);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [open, clientId, checkedName, checkKey, currentUserId]);

  if (!open) return null;

  const selectedClient = clients.find((client) => client.id === clientId);
  const availablePocs = selectedClient?.contact_persons || [];

  // Client search: most-used clients when empty; otherwise names containing
  // the text, then look-alike names ("ABSL" finds Aditya Birla Sun Life MF).
  const q = clientQuery.trim().toLowerCase();
  const matchClient = makeMatcher(clientQuery);
  const clientOptions = (() => {
    if (!q) {
      return clients
        .filter((c) => c.status !== "Inactive")
        .sort((a, b) => (projectCounts.get(b.id) || 0) - (projectCounts.get(a.id) || 0))
        .slice(0, 6)
        .map((client) => ({ client, why: "" }));
    }
    const direct = clients
      .filter((c) => matchClient(c.name))
      .map((client) => ({ client, why: "" }));
    const fuzzy = findSimilarClients(clientQuery, clients)
      .filter((m) => !direct.some((d) => d.client.id === m.client.id))
      .map((m) => ({ client: m.client, why: m.why }));
    return [...direct, ...fuzzy].slice(0, 7);
  })();
  const exactClient = q && clients.some((c) => (c.name || "").trim().toLowerCase() === q);
  const showAddNewClient = !!q && !exactClient;
  const clientChoiceCount = clientOptions.length + (showAddNewClient ? 1 : 0);
  const activeClientIndex = Math.min(clientIndex, Math.max(0, clientChoiceCount - 1));

  const pickClient = (client) => {
    setClientId(client.id);
    setClientQuery("");
    setClientMenuOpen(false);
    setClientIndex(0);
    setPocId("");
    setConfirmed(false);
    setRecentDismissed(false);
  };

  const clientMeta = (client, why) => {
    if (why) return why;
    const count = projectCounts.get(client.id) || 0;
    return `${count} ${count === 1 ? "launch" : "launches"}${client.status === "Inactive" ? " · Inactive" : ""}`;
  };

  // Name check against existing projects.
  const trimmed = name.trim();
  const matches = findSimilarProjects(name, clientId, projects, clientNameOf);
  const exact = matches.find((m) => m.exact);
  const sameClientMatches = matches.filter((m) => m.same);
  const otherClientMatches = matches.filter((m) => !m.same);
  // Recent same-name projects the name check above has not already listed.
  const listedIds = new Set(matches.map((m) => m.project.id));
  const recentOnly = (recentCheck.key === checkKey ? recentCheck.list : []).filter(
    (d) => !listedIds.has(d.id)
  );
  const nameState = !trimmed
    ? "empty"
    : exact
      ? "exact"
      : matches.length
        ? "similar"
        : trimmed.length >= 3
          ? "clear"
          : "empty";
  const canCreate =
    !!selectedClient &&
    !!trimmed &&
    ((nameState !== "similar" && nameState !== "exact") || confirmed);

  const openProject = (project) => {
    onClose?.();
    navigate(`/projects/${project.id}`);
  };

  const addProduct = () => {
    const d = draftProduct;
    const added = {
      key: `p${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: d.name.trim(),
      type: d.type,
    };
    setProducts((prev) => [...prev, added]);
    setDraftProduct(null);
  };

  const removeProduct = (key) => {
    setProducts((prev) => prev.filter((d) => d.key !== key));
  };

  const reset = () => {
    setName("");
    setDescription("");
    setClientId("");
    setClientQuery("");
    setClientMenuOpen(false);
    setConfirmed(false);
    setRecentDismissed(false);
    setPocId("");
    setStartDate("");
    setEndDate("");
    setStatus(PROJECT_STATUSES[0]);
    setStep(1);
    setProducts([]);
    setDraftProduct(null);
    setPlanOverrides({});
    setCustomizing(false);
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const planIssue = planWindowIssue(startDate, endDate);
  const plan = planIssue ? null : autoStagePlan(startDate, endDate, planOverrides);
  const rowIssue = plan ? planRowIssue(plan, startDate, endDate) : "";
  const canFinish = !!plan && !rowIssue;

  const handleSubmit = async () => {
    if (!canCreate || !canFinish || submitting) return;

    setSubmitting(true);

    try {
      if (isEdit) {
        await onSave?.({
          name: trimmed,
          description: description.trim(),
          client_id: clientId,
          poc_id: pocId || null,
          start_date: startDate,
          end_date: endDate,
          status,
          // The stages whose dates were changed from the auto plan.
          stage_plan: planOverrides,
        });
        toast.success(`${trimmed} saved`);
        reset();
        onClose?.();
        return;
      }
      // Every deliverable goes through all seven stages on the launch's plan.
      const schedule = planToSchedule(plan);
      const cleanedDeliverables = products.map((d) => ({
        name: d.name,
        type: d.type || "",
        stage_schedule: schedule,
        start_dt: plan[0].start,
        end_dt: plan[plan.length - 1].end,
        required_stages: LAUNCH_STAGES,
        approval_types: [],
      }));

      const created = await createProject(currentUserId, {
        name: trimmed,
        description: description.trim(),
        client_id: clientId,
        poc_id: pocId || null,
        start_date: startDate,
        end_date: endDate,
        status,
        // The stages whose dates were changed from the auto plan.
        stage_plan: planOverrides,
        deliverables: cleanedDeliverables,
      });

      trackEvent("project_created", {
        project_id: created.id,
        status: created.status,
      });

      toast.success(`${created.name} created with a ${plan.length}-stage plan`);

      reset();
      onCreated?.(created);
      onClose?.();
    } catch (err) {
      toast.error(
        err?.response?.data?.detail ||
          "Failed to create launch"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // The name field's ring shows the name check: taken, similar, or clear.
  const nameUnderline =
    nameState === "exact"
      ? "shadow-[inset_0_0_0_1px_#ef4444] focus:shadow-[inset_0_0_0_1px_#ef4444,0_0_0_3px_rgb(254,226,226)]"
      : nameState === "similar" || (nameState === "clear" && recentOnly.length > 0)
        ? "shadow-[inset_0_0_0_1px_#f59e0b] focus:shadow-[inset_0_0_0_1px_#f59e0b,0_0_0_3px_rgb(254,243,199)]"
        : nameState === "clear" && selectedClient
          ? "shadow-[inset_0_0_0_1px_#10b981] focus:shadow-[inset_0_0_0_1px_#10b981,0_0_0_3px_rgb(209,250,229)]"
          : "";

  // Step 1 needs a product line, a name (confirmed when it looks like an
  // existing launch), an owner when the line has owners, and a deliverable.
  const needsOwner = availablePocs.length > 0 && !pocId;
  const needsProduct = !isEdit && products.length === 0;
  const canContinue = canCreate && !needsOwner && !needsProduct;
  const step1Label = !selectedClient
    ? "Choose a product line first"
    : !trimmed
      ? "Name the launch first"
      : (nameState === "exact" || nameState === "similar") && !confirmed
          ? nameState === "exact"
            ? "Confirm it’s not a duplicate"
            : "Confirm it’s a new launch"
          : needsOwner
            ? "Choose a product owner"
            : needsProduct
              ? "Add a deliverable"
              : "Continue";
  const step2Label = submitting
    ? isEdit
      ? "Saving..."
      : "Creating..."
    : !plan
      ? "Fix the timeline"
      : rowIssue
        ? "Fix stage dates"
        : isEdit
          ? "Save changes"
          : "Create launch";
  const isStep2 = step === 2;
  const nextOk = isStep2 ? canFinish && !submitting : canContinue;
  const createLabel = isStep2 ? step2Label : step1Label;
  const goNext = () => {
    if (!nextOk) return;
    if (isStep2) handleSubmit();
    else {
      setDraftProduct(null);
      setStep(2);
    }
  };
  const goBack = () => setStep(1);

  const matchRow = (m) => (
    <div
      key={m.project.id}
      className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-3.5 py-2.5"
    >
      <span className="flex min-w-[220px] flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openProject(m.project)}
            className="text-left text-sm font-semibold text-foreground underline-offset-2 hover:text-[#2b2bb5] hover:underline"
          >
            {m.project.name}
          </button>
          <span
            className={`rounded px-1.5 py-px text-[11px] font-medium ${
              m.exact
                ? "bg-red-50 text-red-700"
                : m.same
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {m.exact ? "Already exists" : m.same ? "Same product line" : "Other product line"}
          </span>
        </span>
        <span className="text-xs text-muted-foreground">
          {[clientNameOf(m.project.client_id), m.project.code, m.project.status, fmtDue(m.project.end_date)]
            .filter(Boolean)
            .join(" · ")}
        </span>
        <span className="text-xs text-slate-400">{m.why}</span>
      </span>
      <button type="button" className={smallButton} onClick={() => openProject(m.project)}>
        Open project
      </button>
    </div>
  );


  const ctx = {
    activeClientIndex,
    availablePocs,
    addProduct,
    canCreate,
    customizing,
    draftProduct,
    goBack,
    goNext,
    isEdit,
    onDelete,
    isStep2,
    nextOk,
    plan,
    planIssue,
    planOverrides,
    rowIssue,
    products,
    removeProduct,
    setCustomizing,
    setDraftProduct,
    setPlanOverrides,
    clientChoiceCount,
    clientMenuOpen,
    clientMeta,
    clientOptions,
    clientQuery,
    confirmed,
    createLabel,
    // PROTOTYPE: deliverable kinds, not the work sheet's activity types.
    deliverableTypes: DELIVERABLE_KINDS,
    description,
    endDate,
    exact,
    handleClose,
    matchRow,
    matches,
    name,
    nameState,
    nameUnderline,
    openProject,
    otherClientMatches,
    pickClient,
    pocId,
    projectCounts,
    q,
    recentOnly,
    sameClientMatches,
    selectedClient,
    setAddClientName,
    setClientId,
    setClientIndex,
    setClientMenuOpen,
    setClientQuery,
    recentDismissed,
    setRecentDismissed,
    setConfirmed,
    setDescription,
    setEndDate,
    setName,
    setPocId,
    setStartDate,
    setStatus,
    showAddNewClient,
    startDate,
    status,
    submitting,
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit product launch" : "New product launch"}
        data-testid={PROJECTS.modal}
        onKeyDown={(e) => {
          if (e.key === "Escape" && addClientName === null) handleClose();
        }}
        className="flex max-h-[calc(100dvh-32px)] w-full max-w-[1180px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_6px_25px_rgba(13,28,61,0.15)]"
      >
        <CreateProjectHeader {...ctx} />

        <CreateLaunchSteps step={step} onBack={goBack} />

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pb-5 pt-3 [&>*]:shrink-0">
          {!isStep2 ? (
            <>
              <StepHeading
                title="Product details"
                sub={isEdit ? "Change the basic information for this product launch." : "Add the basic information for this product launch."}
              />
              <div className={twoCols}>
                <CreateProjectClientPicker {...ctx} />
                <CreateProjectNameFields {...ctx} />
              </div>
              <CreateProjectNameNotices {...ctx} />
              <CreateProjectDescriptionField {...ctx} />
              <CreateProjectMetaFields {...ctx} />
              {isEdit ? (
                <p className="m-0 rounded-xl bg-[rgb(249,250,251)] px-4 py-3 text-[13px] text-[rgb(84,100,144)] shadow-[inset_0_0_0_1px_rgb(239,240,242)]">
                  Deliverables are added, edited and deleted on the launch page.
                </p>
              ) : (
                <CreateLaunchProducts {...ctx} />
              )}
            </>
          ) : (
            <CreateLaunchTimeline {...ctx} />
          )}
        </div>

        <CreateProjectFooter {...ctx} />
      </div>

      <AddClientModal
        open={addClientName !== null}
        initialName={addClientName || ""}
        onClose={() => setAddClientName(null)}
        clients={clients}
        projects={projects}
        openLabel="Use this product line"
        onOpenExisting={(client) => pickClient(client)}
        onSaved={(client) => {
          onClientsChanged?.();
          if (client?.id) {
            setAddedClient(client);
            pickClient(client);
          }
        }}
      />
    </div>
  );
};