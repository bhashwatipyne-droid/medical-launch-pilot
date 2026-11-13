import { DEPARTMENTS as LAUNCH_DEPARTMENTS, STAGES as LAUNCH_STAGES } from "@/lib/launchFlow";
// Copies of the backend's fixed lists (backend/constants.py, domain_constants.py)
// that the demo's /config/options answer needs.

// PROTOTYPE: activity types for a medical-equipment launch team.
const CORE = [
  "Main unit",
  "Variant",
  "Accessory",
  "Component / part",
  "Consumable",
  "Product Brief",
  "Sample Development",
  "Vendor Sourcing",
  "Raw Material Follow-up",
  "Material Verification",
  "Costing Sheet",
  "Bill of Materials",
  "Box Content & Claims",
  "Approval Form",
  "Launch Projection",
  "Box Artwork",
  "Label Design",
  "Purchase Order",
  "Production Run",
  "Quality Check",
  "Regulatory Documentation",
  "Team Reviews and Feedback",
  "Other Initiatives",
  "Hiring and Interviews",
];

const NON_CORE = [
  "Project Briefing",
  "Vendor Meetings",
  "Core Team / CEO Discussions",
  "Trainings / Committee / Reviews Meetings",
  "SOP and Process Improvements - Documentation",
  "Follow Up (Over 10-15 mins)",
];

export const CORE_TYPES = CORE;
export const NON_CORE_TYPES = NON_CORE;
export const DELIVERABLE_TYPES = [...CORE, ...NON_CORE];

export const DELIVERABLE_TYPE_CATEGORIES = Object.fromEntries([
  ...CORE.map((t) => [t, "Core"]),
  ...NON_CORE.map((t) => [t, "Non-Core"]),
]);

export const DELIVERABLE_TYPE_UNITS = {};

export const OPTIONS = {
  deliverable_types: DELIVERABLE_TYPES,
  deliverable_type_categories: DELIVERABLE_TYPE_CATEGORIES,
  deliverable_type_units: DELIVERABLE_TYPE_UNITS,
  work_categories: ["Core", "Non-Core"],
  statuses: [
    "Not Started",
    "Ongoing",
    "On Hold",
    "Ready for Review",
    "Changes Requested",
    "Rework",
    "Closed",
    "Scrap",
  ],
  member_forward_statuses: ["Not Started", "Ongoing", "On Hold", "Ready for Review", "Scrap"],
  project_statuses: [
    "Active",
    "Approval Pending",
    "Completed",
    "On Hold",
    "Scrapped",
  ],
  stages: LAUNCH_STAGES,
  stage_statuses: ["Not Started", "In Progress", "Ready for Review", "Changes Requested", "Completed"],
  client_statuses: ["Active", "Inactive"],
  departments: LAUNCH_DEPARTMENTS,
  roles: ["admin", "manager", "member", "hr"],
  approval_types: ["MANAGER", "LEADERSHIP", "CLIENT_SPOC", "COMPLIANCE"],
};

export { DEPARTMENT_TO_STAGE, STAGE_TO_DEPARTMENT } from "@/lib/launchFlow";
