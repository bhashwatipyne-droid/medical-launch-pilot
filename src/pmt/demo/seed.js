// Made-up sample workspace for the public demo. Every name, client and number
// below is invented. Dates are worked out from today, so the demo always looks
// current: some work is late, some is due this week, some is waiting for review.

import { DEPARTMENT_TO_STAGE, STAGES, STAGE_TO_DEPARTMENT, isGateStage } from "@/lib/launchFlow";

const pad = (n) => String(n).padStart(2, "0");
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const dayOffset = (n) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return isoOf(d);
};

export const todayIso = () => dayOffset(0);

const stamp = (offset, hour = 10, minute = 0) =>
  `${dayOffset(offset)}T${pad(hour)}:${pad(minute)}:00+00:00`;

const weekdayOf = (iso) => new Date(`${iso}T12:00:00`).getDay();
const isWorkingDay = (iso) => {
  const w = weekdayOf(iso);
  return w !== 0 && w !== 6;
};

// Small deterministic random generator: the demo looks the same every visit.
const makeRandom = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ---------------------------------------------------------------- people
// PROTOTYPE (medical launch flow): the same internal ids as the original demo,
// so every cross-reference keeps working, with the client's teams.
const USERS = [
  ["u-admin", "Meera Iyer", "demo.admin", "admin", "Administration"],
  ["u-mgr-content", "Kabir Shah", "kabir.shah", "manager", "Product"],
  ["u-c1", "Ishaan Verma", "ishaan.verma", "member", "Product"],
  ["u-c2", "Tara Menon", "tara.menon", "member", "Product"],
  ["u-mgr-proc", "Neha Kulkarni", "neha.kulkarni", "manager", "Procurement"],
  ["u-c3", "Rohan Bose", "rohan.bose", "member", "Procurement"],
  ["u-mgr-anim", "Dev Malhotra", "dev.malhotra", "manager", "R&D"],
  ["u-a1", "Arjun Nair", "arjun.nair", "member", "R&D"],
  ["u-d3", "Sana Qureshi", "sana.qureshi", "member", "R&D"],
  ["u-mgr-design", "Naina Rao", "naina.rao", "manager", "Graphics"],
  ["u-d1", "Anika Sen", "anika.sen", "member", "Graphics"],
  ["u-d2", "Vikram Joshi", "vikram.joshi", "member", "Graphics"],
  ["u-mgr-purchase", "Sandeep Rao", "sandeep.rao", "manager", "Purchase"],
  ["u-a2", "Leela Pillai", "leela.pillai", "member", "Purchase"],
  ["u-mgr-prod", "Imran Qureshi", "imran.qureshi", "manager", "Production"],
  ["u-f1", "Farhan Ali", "farhan.ali", "member", "Production"],
  ["u-f2", "Priya Nair", "priya.nair", "member", "Production"],
  ["u-hr", "Pooja Desai", "pooja.desai", "hr", "Administration"],
].map(([id, name, username, role, department]) => ({
  id,
  name,
  username,
  role,
  email: `${username}@demo.pmt.example`,
  department,
  active: true,
  removed: false,
}));

// "View as": Admin = the CEO, Manager = Product's manager, Team member = a Graphics designer.
export const DEMO_LOGIN = {
  admin: "u-admin",
  manager: "u-mgr-content",
  member: "u-d1",
};

const managerOfDepartment = (dept) =>
  USERS.find((u) => u.role === "manager" && u.department === dept)?.id || "u-admin";
const membersOfDepartment = (dept) =>
  USERS.filter((u) => u.role === "member" && u.department === dept).map((u) => u.id);

// Keyed by launch stage: the manager who approves it and the people who work it.
const MANAGER_OF = Object.fromEntries(STAGES.map((s) => [s, managerOfDepartment(STAGE_TO_DEPARTMENT[s])]));
const MEMBERS_OF = Object.fromEntries(STAGES.map((s) => [s, membersOfDepartment(STAGE_TO_DEPARTMENT[s])]));
export const DEMO_MEMBERS_OF = MEMBERS_OF;

// ---------------------------------------------------------------- clients
// The PMT "client" of a launch is the product division it belongs to.
const person = (id, name, designation) => ({
  id,
  name,
  email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@demo.pmt.example`,
  phone: "+91 98000 12345",
  designation,
});

const CLIENTS = [
  {
    id: "c-diag",
    name: "Diagnostics",
    contact_persons: [person("cp-1", "Rahul Khanna", "Head of Diagnostics"), person("cp-2", "Sneha Kulkarni", "Product Owner")],
  },
  {
    id: "c-resp",
    name: "Respiratory Care",
    contact_persons: [person("cp-3", "Dr. Farah Ansari", "Head of Respiratory Care")],
  },
  {
    id: "c-monitor",
    name: "Patient Monitoring",
    contact_persons: [person("cp-4", "Vivek Rao", "Head of Patient Monitoring")],
  },
  {
    id: "c-mobility",
    name: "Mobility & Rehab",
    contact_persons: [person("cp-6", "Manish Jain", "Head of Mobility & Rehab")],
  },
].map((c) => ({
  ...c,
  contact_person: c.contact_persons[0].name,
  status: "Active",
}));

// ---------------------------------------------------------------- projects
// One project = one product launch; its deliverables are the products in it.
// d(name, type, idx, status, [startOffset, endOffset], extra)
// idx is the CURRENT stage (0 = Sample ... 6 = Production); the window is that
// stage's deadline in days from today, earlier stages are laid out backwards.
// extra: { launch, approvedByManager, sentBack: { by, note } }
const ALL_STAGES = STAGES;
const DURS = [7, 9, 5, 6, 9, 4, 10]; // Packaging = old box content + box design
const d = (name, type, idx, status, win, extra = {}) => ({
  name, type, stages: ALL_STAGES, idx, status, win, durs: DURS, ...extra,
});

const LINK = (path) => `https://drive.example.com/${path}`;

const PROJECTS = [
  {
    code: "PRJ-3101", name: "PX-200 Pulse Oximeter Launch", client: "c-diag", poc: "cp-1", status: "Active",
    description: "Fingertip pulse oximeter for pharmacies and home care", start: -40, end: 75,
    items: [
      d("PX-200 Fingertip Oximeter", "Main unit", 2, "Ready for Review", [-5, 1], {
        approvedByManager: true,
        launch: {
          brief: "Fingertip pulse oximeter, SpO₂ 70–100% (±2%), OLED display, auto power-off. Target ISO 80601-2-61.",
          sample_status: "Sample ready", spec_link: LINK("px200-spec-v3"),
          materials: "Medical-grade ABS housing, SpO₂ sensor module, 2×AAA holder, silicone finger pad",
          vendors: "OptiSense Modules, PolyMould Pune", materials_in_by: "2026-11-04",
          material_verified: "Verified", final_sample: "PX200-S3", unit_cost: 412, target_cost: 450,
        },
      }),
      d("PX-200 Paediatric Variant", "Variant", 1, "In Progress", [-3, 4], {
        launch: {
          brief: "Smaller finger clip and paediatric alarm limits on the PX-200 platform.",
          sample_status: "Sample ready", spec_link: LINK("px200p-spec-v1"),
          materials: "Paediatric silicone pad, smaller clip spring", vendors: "PolyMould Pune",
        },
      }),
    ],
  },
  {
    code: "PRJ-3102", name: "BP-3 Arm BP Monitor Launch", client: "c-monitor", poc: "cp-4", status: "Approval Pending",
    description: "Upper-arm BP monitor with irregular heartbeat detection", start: -70, end: 30,
    items: [
      d("BP-3 Arm Monitor", "Main unit", 4, "Ready for Review", [-4, 1], {
        approvedByManager: true,
        launch: {
          brief: "Upper-arm BP monitor, 2×120 memory, irregular heartbeat detection, WHO indicator.",
          sample_status: "Sample ready", spec_link: LINK("bp3-spec-v5"),
          materials: "Pressure sensor, micro pump, cuff, LCD", vendors: "CuffTech, Sensoria", materials_in_by: "2026-10-02",
          material_verified: "Verified", final_sample: "BP3-S4", unit_cost: 690, target_cost: 720,
          bom_link: LINK("bp3-bom-v1.xlsx"), bom_version: "v1.0", bom_items: 64,
          box_content: "Front: product image, 3 key features, clinically validated mark. Back: how to measure, warnings, CDSCO and CE marks, Hindi usage line.",
          approval_form: LINK("bp3-approval-form"), launch_projection: 6000,
          box_design_link: LINK("bp3-box-v2"), artwork_version: "v2",
        },
      }),
      d("BP-3 Large Cuff Accessory", "Accessory", 4, "Changes Requested", [-6, -1], {
        sentBack: { note: "Front panel needs the certification marks and the Hindi usage line before approval." },
        launch: {
          brief: "Large cuff (32–42 cm) sold separately for the BP-3.",
          sample_status: "Sample ready", spec_link: LINK("bp3-cuff-spec"),
          materials: "Nylon cuff, bladder, connector", vendors: "CuffTech", materials_in_by: "2026-10-06",
          material_verified: "Verified", final_sample: "BP3-LC-S2", unit_cost: 185, target_cost: 200,
          bom_link: LINK("bp3-cuff-bom.xlsx"), bom_version: "v1.0", bom_items: 9,
          box_content: "Cuff size range, compatible models, fitting instructions.",
          approval_form: LINK("bp3-cuff-approval-form"), launch_projection: 1500,
          box_design_link: LINK("bp3-cuff-box-v1"), artwork_version: "v1",
        },
      }),
    ],
  },
  {
    code: "PRJ-3103", name: "NB-7 Compact Nebulizer Launch", client: "c-resp", poc: "cp-3", status: "Active",
    description: "Quiet compressor nebulizer for home use, adult and paediatric masks", start: -55, end: 45,
    items: [
      d("NB-7 Nebulizer Kit", "Main unit", 3, "Ready for Review", [-4, 2], {
        launch: {
          brief: "Compressor nebulizer, 0.3 mL/min, under 55 dB, adult and paediatric masks.",
          sample_status: "Sample ready", spec_link: LINK("nb7-spec-v4"),
          materials: "Compressor unit, medication cup, tubing, PVC masks", vendors: "AirFlow Components, MedTube India", materials_in_by: "2026-10-24",
          material_verified: "Verified", final_sample: "NB7-S2", unit_cost: 1180, target_cost: 1250,
          bom_link: LINK("nb7-bom-v1.xlsx"), bom_version: "v1.1", bom_items: 52,
        },
      }),
      d("NB-7 Spare Mask Set", "Accessory", 4, "In Progress", [-2, 4], {
        launch: {
          brief: "Replacement adult and paediatric masks with tubing.",
          sample_status: "Sample ready", spec_link: LINK("nb7-masks-spec"),
          materials: "PVC masks, tubing", vendors: "MedTube India", materials_in_by: "2026-10-20",
          material_verified: "Verified", final_sample: "NB7-M-S1", unit_cost: 140, target_cost: 150,
          bom_link: LINK("nb7-masks-bom.xlsx"), bom_version: "v1.0", bom_items: 6,
          box_content: "Contents list, compatible models, cleaning instructions.",
        },
      }),
    ],
  },
  {
    code: "PRJ-3104", name: "IT-45 IR Thermometer Launch", client: "c-diag", poc: "cp-2", status: "Active",
    description: "Non-contact forehead thermometer, retail and clinical versions", start: -20, end: 90,
    items: [
      d("IT-45 Forehead Thermometer", "Main unit", 1, "In Progress", [-4, 3], {
        launch: {
          brief: "Non-contact IR thermometer, 1 s reading, 32-reading memory, fever alarm.",
          sample_status: "Sample ready", spec_link: LINK("it45-spec-v2"),
          materials: "IR thermopile sensor, LCD module, ABS shell, coin cell holder", vendors: "ThermoSense Components",
        },
      }),
      d("IT-45 Pro (Clinical)", "Variant", 0, "In Progress", [-3, 5], {
        launch: { brief: "Clinical version with object mode and 99-reading memory.", sample_status: "In making" },
      }),
    ],
  },
  {
    code: "PRJ-3105", name: "OC-5L Oxygen Concentrator Launch", client: "c-resp", poc: "cp-3", status: "Active",
    description: "5 L/min oxygen concentrator for home care", start: -95, end: 12,
    items: [
      d("OC-5L Concentrator", "Main unit", 6, "In Progress", [-6, 5], {
        launch: {
          brief: "5 L/min oxygen concentrator, 93% ±3% purity, low-purity alarm.",
          sample_status: "Sample ready", spec_link: LINK("oc5-spec-v6"),
          materials: "Zeolite sieve beds, compressor, flow valve", vendors: "ZeoMed, AirFlow Components", materials_in_by: "2026-09-02",
          material_verified: "Verified", final_sample: "OC5-S5", unit_cost: 14800, target_cost: 15000,
          bom_link: LINK("oc5-bom-v3.xlsx"), bom_version: "v3.1", bom_items: 112,
          box_content: "Carton with accessories list, warnings, oxygen safety labels.",
          approval_form: LINK("oc5-approval-form"), launch_projection: 1200,
          box_design_link: LINK("oc5-box-v2"), artwork_version: "v2",
          po_number: "PO-2026-0457", order_qty: 800, suppliers: "Kovai Enclosures, ZeoMed",
          factory_line: "Line 2, Unit B",
        },
      }),
      d("OC-5L Battery Pack", "Accessory", 5, "Ready for Review", [-3, 1], {
        launch: {
          brief: "Swappable battery pack, 2 hours at 2 L/min.",
          sample_status: "Sample ready", spec_link: LINK("oc5-battery-spec"),
          materials: "Li-ion cells, BMS board, housing", vendors: "PowerCell", materials_in_by: "2026-09-20",
          material_verified: "Verified", final_sample: "OC5-B-S2", unit_cost: 3900, target_cost: 4200,
          bom_link: LINK("oc5-battery-bom.xlsx"), bom_version: "v1.2", bom_items: 31,
          box_content: "Battery specs, charging instructions, transport warnings.",
          approval_form: LINK("oc5-battery-approval-form"), launch_projection: 600,
          box_design_link: LINK("oc5-battery-box-v1"), artwork_version: "v1",
          po_number: "PO-2026-0471", order_qty: 400, suppliers: "PowerCell",
        },
      }),
    ],
  },
  {
    code: "PRJ-3106", name: "GM-11 Glucometer Kit Launch", client: "c-diag", poc: "cp-1", status: "Active",
    description: "Blood glucose meter kit with strips and lancing device", start: -6, end: 110,
    items: [
      d("GM-11 Meter", "Main unit", 0, "In Progress", [-6, 4], {
        launch: { brief: "Glucose meter, 5 s result, 500-reading memory, no coding.", sample_status: "In making" },
      }),
      d("GM-11 Test Strips (50)", "Accessory", 0, "Not Started", [2, 9]),
    ],
  },
  {
    code: "PRJ-3107", name: "WC-2 Gel Cushion Launch", client: "c-mobility", poc: "cp-6", status: "On Hold",
    description: "Paused: the gel supplier could not meet the medical-grade spec", start: -30, end: 60,
    items: [
      d("WC-2 Gel Cushion", "Main unit", 0, "Changes Requested", [-8, -2], {
        sentBack: { note: "Unit cost ₹1,940 is above the ₹1,600 target. Find a cheaper medical-grade gel and make a new sample." },
        launch: {
          brief: "Pressure-relief wheelchair cushion with medical-grade gel insert.",
          sample_status: "Sample ready", spec_link: LINK("wc2-spec-v2"),
          materials: "Medical-grade gel, foam base, washable cover", vendors: "FlexiGel", materials_in_by: "2026-10-15",
          material_verified: "Verified", final_sample: "WC2-S2", unit_cost: 1940, target_cost: 1600,
        },
      }),
    ],
  },
  {
    code: "PRJ-3098", name: "TS-1 Digital Thermometer Launch", client: "c-diag", poc: "cp-2", status: "Completed",
    description: "Digital stick thermometer, rigid and flexible tip", start: -160, end: -20,
    items: [
      d("TS-1 Digital Thermometer", "Main unit", 6, "Completed", [-30, -20]),
      d("TS-1 Flexible Tip Variant", "Variant", 6, "Completed", [-28, -21]),
    ],
  },
  {
    code: "PRJ-3092", name: "RW-1 Rollator Walker Launch", client: "c-mobility", poc: "cp-6", status: "Completed",
    description: "Foldable rollator with seat and brakes", start: -200, end: -60,
    items: [
      d("RW-1 Rollator Walker", "Main unit", 6, "Completed", [-70, -60]),
    ],
  },
];


// ---------------------------------------------------------------- efficiency
// What each team closes in a month, and the minutes one unit takes.
const ACTIVITIES = {
  Product: [
    ["Product Brief", 240],
    ["Launch Projection", 180],
  ],
  Procurement: [
    ["Vendor Sourcing", 180],
    ["Raw Material Follow-up", 90],
  ],
  "R&D": [
    ["Bill of Materials", 360],
    ["Sample Development", 480],
  ],
  Graphics: [
    ["Box Artwork", 300],
    ["Label Design", 180],
  ],
  Purchase: [
    ["Purchase Order", 120],
  ],
  Production: [
    ["Production Run", 480],
    ["Quality Check", 120],
  ],
};

const monthKey = (iso) => iso.slice(0, 7);

const monthsBack = (count) => {
  const now = new Date();
  const out = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${m.getFullYear()}-${pad(m.getMonth() + 1)}`);
  }
  return out;
};

const workingDaysOf = (month) => {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  const days = [];
  for (let day = 1; day <= last; day += 1) {
    const iso = `${month}-${pad(day)}`;
    if (isWorkingDay(iso)) days.push(iso);
  }
  return days;
};

// ---------------------------------------------------------------- builder
export const buildSeed = () => {
  const rand = makeRandom(20260601);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const today = todayIso();

  const users = USERS.map((u) => ({ ...u, password_hash: "demo" }));
  const clients = CLIENTS.map((c) => ({ ...c }));
  const projects = [];
  const deliverables = [];
  const workItems = [];
  const approvalItems = [];
  const approvalWorkflows = [];
  const approvalHistory = [];

  let projectNo = 0;
  let deliverableNo = 0;
  let workNo = 0;
  let approvalNo = 0;

  const newWorkItem = (fields) => {
    workNo += 1;
    const workDate = fields.work_date;
    return {
      id: `wi-${workNo}`,
      work_date: workDate,
      month: monthKey(workDate),
      deliverable_name: "",
      deliverable_type: "",
      deliverable_link: "",
      work_category: "Core",
      version: "v1",
      time_taken_minutes: 0,
      time_source: "manual",
      time_benchmark_minutes: null,
      quantity: 1,
      quantity_items: [],
      deliverable_ids: [],
      video_duration_seconds: null,
      video_duration_minutes: null,
      creator_id: null,
      reviewer_id: null,
      manager_id: null,
      client_id: null,
      project_id: null,
      deliverable_id: null,
      deliverable_not_available: false,
      stage: null,
      remarks: "",
      status: "Not Started",
      collab_group_id: null,
      collab_source_id: null,
      collab_added_by: null,
      created_at: `${workDate}T09:30:00+00:00`,
      updated_at: `${workDate}T17:00:00+00:00`,
      ...fields,
    };
  };

  PROJECTS.forEach((spec, projectIndex) => {
    projectNo += 1;
    const projectId = `proj-${projectNo}`;
    projects.push({
      id: projectId,
      code: spec.code,
      name: spec.name,
      client_id: spec.client,
      description: spec.description,
      poc_id: spec.poc,
      start_date: dayOffset(spec.start),
      end_date: dayOffset(spec.end),
      status: spec.status,
      kanban_order: projectIndex,
      status_changed_at: stamp(Math.min(spec.end, -1)),
      hidden: false,
      hidden_at: null,
      hidden_by: null,
      created_at: stamp(spec.start),
      updated_at: stamp(Math.min(spec.end, -1) > -3 ? -1 : Math.min(spec.end, -1)),
    });

    spec.items.forEach((item) => {
      deliverableNo += 1;
      // PROTOTYPE: every hand-off needs the stage's manager; the two CEO gates also need the CEO.
      item.approvals = isGateStage(item.stages[item.idx]) ? ["MANAGER", "LEADERSHIP"] : ["MANAGER"];
      const deliverableId = `del-${deliverableNo}`;
      const schedule = {};
      const offsets = {};
      offsets[item.idx] = [item.win[0], item.win[1]];
      for (let i = item.idx - 1; i >= 0; i -= 1) {
        const endOff = offsets[i + 1][0];
        offsets[i] = [endOff - item.durs[i], endOff];
      }
      for (let i = item.idx + 1; i < item.stages.length; i += 1) {
        const startOff = offsets[i - 1][1];
        offsets[i] = [startOff, startOff + item.durs[i]];
      }
      item.stages.forEach((stage, i) => {
        schedule[stage] = { start_dt: dayOffset(offsets[i][0]), end_dt: dayOffset(offsets[i][1]) };
      });
      const firstStart = offsets[0][0];
      const lastEnd = offsets[item.stages.length - 1][1];
      const currentStage = item.stages[item.idx];
      const done = item.status === "Completed";
      deliverables.push({
        id: deliverableId,
        project_id: projectId,
        name: item.name,
        type: item.type,
        start_dt: schedule[item.stages[0]].start_dt,
        end_dt: schedule[item.stages[item.stages.length - 1]].end_dt,
        stage_schedule: schedule,
        required_stages: item.stages,
        current_stage: currentStage,
        stage_status: item.status,
        approval_types: item.approvals,
        // PROTOTYPE: what each launch stage recorded, and the last send-back.
        launch: { ...(item.launch || {}) },
        last_review_action: item.sentBack ? "sent_back" : null,
        last_review_note: item.sentBack ? item.sentBack.note : "",
        last_reviewer_id: item.sentBack ? "u-admin" : null,
        created_at: stamp(firstStart - 1),
        updated_at: done ? stamp(Math.min(lastEnd, -2)) : stamp(-1),
      });

      // ---- approvals waiting on this deliverable
      if (item.status === "Ready for Review" && item.approvals.length) {
        approvalNo += 1;
        const workflowId = `wf-${approvalNo}`;
        approvalWorkflows.push({
          id: workflowId,
          deliverable_id: deliverableId,
          required_types: item.approvals,
          created_at: stamp(-6),
        });
        const firstApproved = Boolean(item.approvedByManager) && item.approvals.length > 1;
        item.approvals.forEach((type, i) => {
          approvalNo += 1;
          let status = "NOT_STARTED";
          if (firstApproved) status = i === 0 ? "APPROVED" : i === 1 ? "PENDING" : "NOT_STARTED";
          else status = i === 0 ? "PENDING" : "NOT_STARTED";
          approvalItems.push({
            id: `ai-${approvalNo}`,
            approval_workflow_id: workflowId,
            deliverable_id: deliverableId,
            approval_type: type,
            status,
            assigned_to: type === "MANAGER" ? MANAGER_OF[currentStage] : type === "LEADERSHIP" ? "u-admin" : null,
            department: type === "LEADERSHIP" ? "Administration" : STAGE_TO_DEPARTMENT[currentStage],
            requested_at: stamp(-3 + i),
            approved_at: status === "APPROVED" ? stamp(-2) : null,
            sent_back_at: null,
            approved_by: status === "APPROVED" ? MANAGER_OF[currentStage] : null,
            sent_back_by: null,
            comments: "",
            hidden: false,
            hidden_at: null,
            hidden_by: null,
            created_at: stamp(-6),
            updated_at: stamp(-3 + i),
          });
        });
      }

      // ---- the work people logged on it, stage by stage
      item.stages.forEach((stage, stageIndex) => {
        if (stageIndex > item.idx) return;
        const window = schedule[stage];
        const members = MEMBERS_OF[stage];
        const owner = members[(deliverableNo + stageIndex) % members.length];
        const finishedStage = done || stageIndex < item.idx;
        const days = [];
        for (let off = offsets[stageIndex][0]; off <= offsets[stageIndex][1]; off += 1) {
          const iso = dayOffset(off);
          if (iso > today) break;
          if (isWorkingDay(iso)) days.push(iso);
        }
        if (!days.length) return;
        const rowCount = Math.min(days.length, finishedStage ? 3 : 2);
        const chosen = [];
        for (let k = 0; k < rowCount; k += 1) {
          chosen.push(days[Math.min(days.length - 1, Math.round((k * (days.length - 1)) / Math.max(rowCount - 1, 1)))]);
        }
        chosen.forEach((workDate, k) => {
          const last = k === chosen.length - 1;
          let status = "Ongoing";
          if (last) {
            if (finishedStage) status = "Closed";
            else if (item.status === "Ready for Review") status = "Ready for Review";
            else if (item.status === "Changes Requested") status = "Changes Requested";
            else if (item.status === "Not Started") status = "Not Started";
          }
          const perUnit = 90 + Math.round(rand() * 150);
          workItems.push(
            newWorkItem({
              work_date: workDate,
              deliverable_name: item.name,
              deliverable_type: item.type,
              deliverable_link: last && finishedStage ? "https://drive.example.com/demo-file" : "",
              time_taken_minutes: perUnit,
              quantity: 1,
              creator_id: owner,
              reviewer_id: MANAGER_OF[stage],
              manager_id: MANAGER_OF[stage],
              client_id: spec.client,
              project_id: projectId,
              deliverable_id: deliverableId,
              stage,
              remarks: last && status === "Changes Requested" && item.sentBack ? `Sent back by CEO: ${item.sentBack.note}` : "",
              status,
              version: finishedStage ? `v${Math.min(3, k + 1)}` : "v1",
            })
          );
        });
      });
    });
  });

  // ---- steady background work so the efficiency pages have six months of history
  const teamMembers = users.filter((u) => u.role === "member" || u.role === "manager");
  const months = monthsBack(6);
  const capacities = [];
  const targets = [];
  let capNo = 0;
  let targetNo = 0;

  teamMembers.forEach((user, userIndex) => {
    const pool = ACTIVITIES[user.department] || [];
    const activities = pool.length ? [pool[userIndex % pool.length]] : [];
    activities.forEach(([name, minutes]) => {
      targetNo += 1;
      targets.push({
        id: `tg-${targetNo}`,
        user_id: user.id,
        activity_name: name,
        time_per_unit_minutes: minutes,
        active: true,
        created_at: stamp(-120),
        updated_at: stamp(-120),
      });
    });

    months.forEach((month, monthIndex) => {
      const workingDays = workingDaysOf(month);
      const isCurrent = monthIndex === months.length - 1;
      const leave = userIndex % 4 === 0 ? 2 : userIndex % 3 === 0 ? 1 : 0;
      capNo += 1;
      capacities.push({
        id: `cap-${capNo}`,
        user_id: user.id,
        month,
        working_days: workingDays.length,
        leave_days: leave,
        working_hours_per_day: 8.5,
        include_in_team_average: user.role === "member",
        created_at: stamp(-30),
        updated_at: stamp(-30),
      });

      const nonCoreMinutes = 600 + Math.round(rand() * 900);
      const coreHours = (workingDays.length - leave) * 8.5 - nonCoreMinutes / 60;
      const elapsedDays = workingDays.filter((day) => day <= today);
      if (!elapsedDays.length) return;
      const share = isCurrent ? elapsedDays.length / workingDays.length : 1;

      activities.forEach(([name, minutes], activityIndex) => {
        // the main activity takes most of the core hours, the second one a little
        const portion = 0.62 + rand() * 0.3;
        const units = Math.max(2, Math.round((coreHours * 60 * portion * share) / minutes));
        const rowCount = Math.min(isCurrent ? 5 : 6, Math.max(2, Math.round(units / 4)));
        const stage = DEPARTMENT_TO_STAGE[user.department];
        const sameType = deliverables.filter((x) => x.type === name);
        for (let r = 0; r < rowCount; r += 1) {
          const workDate = elapsedDays[Math.min(elapsedDays.length - 1, Math.floor(((r + 0.5) * elapsedDays.length) / rowCount))];
          const linked = sameType.length ? sameType[(userIndex + monthIndex + r) % sameType.length] : null;
          const linkedProject = linked ? projects.find((p) => p.id === linked.project_id) : null;
          workItems.push(
            newWorkItem({
              work_date: workDate,
              deliverable_name: linked ? linked.name : `${name} - batch ${r + 1}`,
              deliverable_type: name,
              time_taken_minutes: Math.round((units / rowCount) * minutes),
              quantity: Math.max(1, Math.round(units / rowCount)),
              creator_id: user.id,
              reviewer_id: MANAGER_OF[stage],
              client_id: linkedProject ? linkedProject.client_id : null,
              project_id: linkedProject ? linkedProject.id : null,
              deliverable_id: linked ? linked.id : null,
              deliverable_not_available: !linked,
              stage,
              status: "Closed",
              version: "v1",
            })
          );
        }
      });

      // meetings, briefings and other non-core time
      const meetings = ["Project Briefing", "Core Team / CEO Discussions", "Vendor Meetings"];
      for (let k = 0; k < 3; k += 1) {
        const workDate = elapsedDays[Math.min(elapsedDays.length - 1, Math.floor(((k + 0.5) * elapsedDays.length) / 3))];
        workItems.push(
          newWorkItem({
            work_date: workDate,
            deliverable_name: pick(["Weekly launch sync", "Vendor call", "QA process training", "Review huddle"]),
            deliverable_type: meetings[k],
            work_category: "Non-Core",
            time_taken_minutes: Math.round(nonCoreMinutes / 3),
            creator_id: user.id,
            reviewer_id: MANAGER_OF[DEPARTMENT_TO_STAGE[user.department]],
            deliverable_not_available: true,
            stage: DEPARTMENT_TO_STAGE[user.department],
            status: "Closed",
          })
        );
      }
    });
  });

  // ---- a few rows waiting for the manager to review
  const reviewer = (stage) => MANAGER_OF[stage];
  workItems
    .filter((w) => w.status === "Ready for Review")
    .forEach((w) => {
      w.reviewer_id = reviewer(w.stage);
    });

  // ---- project tracking sheet ("Projects" tab on the Work Sheet)
  const projectTasks = [
    ["CEO review of PX-200 sample and cost sheet", "Internal Review", "c-diag", "proj-1", "u-admin", "On track", 1],
    ["Weekly launch status with the Respiratory Care head", "Client Meeting", "c-resp", "proj-3", "u-mgr-content", "On track", 0],
    ["BP-3 box: add certification marks and Hindi usage line", "Client & Internal Follow-up", "c-monitor", "proj-2", "u-mgr-design", "At risk", -1],
    ["Confirm IR sensor lead time with ThermoSense", "Client Follow-up", "c-diag", "proj-4", "u-mgr-proc", "Waiting on client", -2],
    ["NB-7 BOM sign-off with R&D", "Internal Review", "c-resp", "proj-3", "u-mgr-anim", "Delayed", -3],
    ["Costing for GM-11 strips with two vendors", "Cost Proposal", "c-diag", "proj-6", "u-mgr-proc", "On track", 2],
    ["New gel supplier search for WC-2", "Client Follow-up", "c-mobility", "proj-7", "u-mgr-proc", "Waiting on client", 3],
    ["OC-5L dispatch plan shared with warehouse", "Admin", "c-resp", "proj-5", "u-mgr-prod", "Done", -4],
  ].map(([task, type, client, project, owner, status, offset], i) => ({
    id: `pt-${i + 1}`,
    task,
    task_type: type,
    client_id: client,
    project_id: project,
    spoc: "",
    owner_id: owner,
    collaborator_ids: [],
    follow_up_teams: [],
    follow_up_user_ids: [],
    follow_up_others: "",
    internal_follow_up_date: dayOffset(offset),
    client_follow_up_date: dayOffset(offset + 1),
    status,
    delay_reason: status === "Delayed" ? "Waiting on the compressor supplier's datasheet" : "",
    meeting_time: type === "Client Meeting" ? "11:30" : "",
    deliverable_count: 1 + (i % 3),
    start_date: dayOffset(Math.min(offset, 0)),
    done_date: status === "Done" ? dayOffset(offset) : null,
    sort_order: i + 1,
    created_at: stamp(-5 + i),
    updated_at: stamp(-1),
  }));

  const notifications = [
    {
      id: "n-1",
      user_id: "u-admin",
      type: "approval_requested",
      title: "CEO approval needed",
      message: "PX-200 Fingertip Oximeter is waiting for your approval (sample & cost).",
      read_at: null,
      action_type: null,
      created_at: stamp(0, 9, 15),
    },
    {
      id: "n-2",
      user_id: "u-admin",
      type: "deadline",
      title: "Deadline passed",
      message: "BP-3 Large Cuff Accessory box design is past its deadline.",
      read_at: null,
      action_type: null,
      created_at: stamp(0, 8, 0),
    },
    {
      id: "n-3",
      user_id: "u-admin",
      type: "review",
      title: "Ready for review",
      message: "Kabir Shah approved the BP-3 Arm Monitor box design. It is waiting for your final approval.",
      read_at: new Date().toISOString(),
      action_type: null,
      created_at: stamp(-1, 16, 40),
    },
  ];

  return {
    users,
    clients,
    projects,
    deliverables,
    workItems,
    approvalItems,
    approvalWorkflows,
    approvalHistory,
    capacities,
    targets,
    projectTasks,
    projectTaskUpdates: [],
    notifications,
    counters: { project: projectNo, deliverable: deliverableNo, work: workNo, approval: approvalNo + 100 },
  };
};
