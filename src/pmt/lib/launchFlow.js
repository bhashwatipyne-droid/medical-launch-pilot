// PROTOTYPE: the medical-equipment product launch flow.
//
// One place that defines the pipeline every screen reads: the seven team
// stages a new product goes through, which department owns each, the two CEO
// approval gates, the colours, and the details each stage records. The real
// backend still has Content / Design / Animate; this branch swaps the frontend
// (and the in-browser demo server) to the launch flow so it can be shown.
//
// Flow (client's numbering):
//   1 Sample        Product      define the product, get a sample made
//   2 Sourcing      Procurement  raw material for development + timeline
//   3 Costing       Product      verify material and cost, final sample
//   4   CEO gate                 reject -> back to Product (Sample)
//   5 BOM           R&D          bill of materials
//   6+7 Packaging   Graphics     box content, approval form and launch projection
//                   (+ Product)  (Product), then the box design (Graphics)
//   8   CEO gate                 reject -> back to Packaging (Graphics)
//   9 Purchase      Purchase     order for the first launch
//  10 Production    Production   launch quantity ready for dispatch
//
// Client steps 6 and 7 are one stage (Packaging); Procurement and Purchase
// keep their own stages.

export const STAGES = [
  "Sample",
  "Sourcing",
  "Costing",
  "BOM",
  "Packaging",
  "Purchase",
  "Production",
];

export const STAGE_LABEL = {
  Sample: "Product brief & first sample",
  Sourcing: "Raw material sourcing & timeline",
  Costing: "Material & cost verification, final sample",
  BOM: "Bill of materials",
  Packaging: "Packaging: box content, approval form, projection & box design",
  Purchase: "Purchase order for first launch",
  Production: "Production for dispatch",
};

// What a launch is made of. A launch is one product; its deliverables are
// the related pieces tracked through the stages (the main unit, variants,
// accessories, parts, consumables).
export const DELIVERABLE_KINDS = ["Main unit", "Variant", "Accessory", "Component / part", "Consumable"];

// Teams that own a stage. "Administration" (CEO, admin, finance) owns none.
export const TEAMS = ["Product", "Procurement", "R&D", "Graphics", "Purchase", "Production"];
export const DEPARTMENTS = [...TEAMS, "Administration"];

export const STAGE_TO_DEPARTMENT = {
  Sample: "Product",
  Sourcing: "Procurement",
  Costing: "Product",
  BOM: "R&D",
  Packaging: "Graphics",
  Purchase: "Purchase",
  Production: "Production",
};

export const DEPARTMENT_STAGES = TEAMS.reduce((acc, team) => {
  acc[team] = STAGES.filter((s) => STAGE_TO_DEPARTMENT[s] === team);
  return acc;
}, {});

// A department's first stage: where its new work sheet rows start.
export const DEPARTMENT_TO_STAGE = Object.fromEntries(
  TEAMS.map((team) => [team, DEPARTMENT_STAGES[team][0]])
);

// Teams that also work on a stage they do not lead (they log work on it and
// fill their part of its details). Packaging: Product writes the box content,
// approval form and projection before Graphics designs the box.
export const STAGE_CONTRIBUTORS = { Packaging: ["Product"] };

export const departmentOfStage = (stage) => STAGE_TO_DEPARTMENT[stage] || null;
export const isOwnStage = (department, stage) =>
  Boolean(stage) &&
  (STAGE_TO_DEPARTMENT[stage] === department || (STAGE_CONTRIBUTORS[stage] || []).includes(department));

// CEO approval gates: the stage whose hand-off needs the CEO, and where a
// rejection sends the product by default.
export const CEO_GATES = {
  Costing: { step: 4, title: "CEO approval: sample & cost", returnTo: "Sample" },
  Packaging: { step: 8, title: "CEO final approval: pack & launch", returnTo: "Packaging" },
};
export const isGateStage = (stage) => Boolean(CEO_GATES[stage]);

// Colours: each team keeps one hue; Product's three stages are shades of it.
export const STAGE_HEX = {
  Sample: "#2b2bb5",
  Sourcing: "#f59e0b",
  Costing: "#5b5bd6",
  BOM: "#0891b2",
  Packaging: "#db2777",
  Purchase: "#16a34a",
  Production: "#0f766e",
};
export const TEAM_HEX = {
  Product: "#2b2bb5",
  Procurement: "#f59e0b",
  "R&D": "#0891b2",
  Graphics: "#db2777",
  Purchase: "#16a34a",
  Production: "#0f766e",
};
// Stage or team name -> colour (dashboards colour by either).
export const colorOf = (key) => STAGE_HEX[key] || TEAM_HEX[key] || "#8a97b5";

// Tailwind classes, written out in full so Tailwind keeps them.
export const STAGE_DOT_CLASS = {
  Sample: "bg-[#2b2bb5]",
  Sourcing: "bg-[#f59e0b]",
  Costing: "bg-[#5b5bd6]",
  BOM: "bg-[#0891b2]",
  Packaging: "bg-[#db2777]",
  Purchase: "bg-[#16a34a]",
  Production: "bg-[#0f766e]",
};
export const STAGE_TEXT_CLASS = {
  Sample: "text-[#2b2bb5]",
  Sourcing: "text-[#b45309]",
  Costing: "text-[#4747c2]",
  BOM: "text-[#0e7490]",
  Packaging: "text-[#be185d]",
  Purchase: "text-[#15803d]",
  Production: "text-[#0f766e]",
};

// What each stage records about the product (kept on deliverable.launch).
export const STAGE_FIELDS = {
  Sample: [
    { key: "brief", label: "Product brief", type: "area", required: true, placeholder: "What the product is, key specs, standards to meet" },
    { key: "sample_status", label: "Sample status", type: "select", options: ["Not started", "In making", "Sample ready"] },
    { key: "spec_link", label: "Spec sheet link", type: "link", placeholder: "https://" },
  ],
  Sourcing: [
    { key: "materials", label: "Raw materials requested", type: "area", required: true, placeholder: "Materials and components for development" },
    { key: "vendors", label: "Vendors", type: "text" },
    { key: "materials_in_by", label: "Materials in by", type: "date", required: true },
  ],
  Costing: [
    { key: "material_verified", label: "Material verification", type: "select", options: ["Pending", "Verified", "Partly verified"] },
    { key: "final_sample", label: "Final sample ref", type: "text", required: true, placeholder: "e.g. PX200-S3" },
    { key: "unit_cost", label: "Final unit cost (₹)", type: "money", required: true },
    { key: "target_cost", label: "Target unit cost (₹)", type: "money" },
  ],
  BOM: [
    { key: "bom_link", label: "BOM link", type: "link", required: true, placeholder: "https://" },
    { key: "bom_version", label: "BOM version", type: "text", placeholder: "e.g. v1.2" },
    { key: "bom_items", label: "Line items", type: "number" },
  ],
  // Two parts: Product's content first, then Graphics' box design.
  Packaging: [
    { key: "box_content", label: "Box content and claims", type: "area", required: true, group: "Product", placeholder: "Text, claims, usage lines, certifications to print" },
    { key: "approval_form", label: "Approval form link", type: "link", group: "Product", placeholder: "https://" },
    { key: "launch_projection", label: "Launch projection (units, first 3 months)", type: "number", required: true, group: "Product" },
    { key: "box_design_link", label: "Box design link", type: "link", required: true, group: "Graphics", placeholder: "https://" },
    { key: "artwork_version", label: "Artwork version", type: "text", group: "Graphics", placeholder: "e.g. v2" },
  ],
  Purchase: [
    { key: "po_number", label: "PO number", type: "text", required: true },
    { key: "order_qty", label: "First order quantity", type: "number", required: true },
    { key: "suppliers", label: "Supplier(s)", type: "text" },
  ],
  Production: [
    { key: "qty_ready", label: "Quantity ready", type: "number", required: true },
    { key: "dispatch_date", label: "Ready for dispatch on", type: "date", required: true },
    { key: "factory_line", label: "Factory line", type: "text", placeholder: "e.g. Line 2, Unit B" },
  ],
};
// Every stage also takes a link to its files and comments for the approver.
// Packaging is worked by two teams, so there they sit under both.
export const stageFilesKey = (stage) => `${stage.toLowerCase()}_files`;
export const stageCommentsKey = (stage) => `${stage.toLowerCase()}_comments`;
STAGES.forEach((stage) => {
  const group = STAGE_FIELDS[stage].some((f) => f.group) ? "Both" : undefined;
  STAGE_FIELDS[stage].push(
    { key: stageFilesKey(stage), label: "Drive / files link", type: "link", group, placeholder: "https://drive.google.com/…" },
    { key: stageCommentsKey(stage), label: "Comments for the approver", type: "area", group, placeholder: "What changed, what to check, open questions" }
  );
});

export const FIELD_BY_KEY = Object.fromEntries(
  Object.values(STAGE_FIELDS).flat().map((f) => [f.key, f])
);

// What the CEO sees at each gate.
export const GATE_FACTS = {
  Costing: ["brief", "final_sample", "material_verified", "unit_cost", "target_cost", "materials_in_by"],
  Packaging: ["launch_projection", "box_design_link", "bom_link", "approval_form", "unit_cost", "box_content"],
};
Object.keys(GATE_FACTS).forEach((stage) => GATE_FACTS[stage].push(stageFilesKey(stage), stageCommentsKey(stage)));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const formatFieldValue = (field, value) => {
  if (value === undefined || value === null || value === "") return "—";
  if (field?.type === "money") return `₹${Number(value).toLocaleString("en-IN")}`;
  if (field?.type === "number") return Number(value).toLocaleString("en-IN");
  if (field?.type === "date") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
    return m ? `${m[3]} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : String(value);
  }
  return String(value);
};

export const missingFields = (stage, launch = {}) =>
  (STAGE_FIELDS[stage] || []).filter((f) => f.required && !String(launch[f.key] ?? "").trim());

// What each part of a multi-team stage is called in the product's details.
export const FIELD_GROUP_LABEL = {
  Product: "Product: box content, approval form & launch projection",
  Graphics: "Graphics: box design",
  Both: "Both teams: files & comments",
};

// Stages a deliverable has passed or is on, for showing what was recorded.
export const stagesUpTo = (stage) => {
  const at = STAGES.indexOf(stage);
  return at < 0 ? [] : STAGES.slice(0, at + 1);
};
