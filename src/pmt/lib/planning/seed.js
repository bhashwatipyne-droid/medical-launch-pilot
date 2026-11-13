// Reference data for the Planning and Task card screens, copied from the design
// prototype. Task, card and people lists now come from the API (services/planningApi.js);
// what is left here is the display metadata (categories, decline reasons) and the
// per-person efficiency stats that have no data source yet (on-time %, feedback,
// revisions), which planningApi merges onto real people by name.

// PROTOTYPE: no real staff or client names in a build shared outside the company.
export const NOTES = [];

export const P_PEOPLE = [
  ['Kabir Shah', 'Product', 91, 4.5, 1.4, []], ['Ishaan Verma', 'Product', 86, 4.4, 1.5, []], ['Tara Menon', 'Product', 88, 4.6, 1.2, []],
  ['Neha Kulkarni', 'Procurement', 84, 4.2, 1.6, []], ['Rohan Bose', 'Procurement', 79, 4.1, 1.9, []],
  ['Dev Malhotra', 'R&D', 90, 4.5, 1.3, []], ['Arjun Nair', 'R&D', 83, 4.0, 2.0, []], ['Sana Qureshi', 'R&D', 77, 4.1, 2.2, []],
  ['Naina Rao', 'Graphics', 88, 4.4, 1.5, []], ['Anika Sen', 'Graphics', 81, 4.2, 1.8, []], ['Vikram Joshi', 'Graphics', 74, 4.0, 2.1, []],
  ['Sandeep Rao', 'Purchase', 92, 4.5, 1.2, []], ['Leela Pillai', 'Purchase', 85, 4.3, 1.4, []],
  ['Imran Qureshi', 'Production', 89, 4.4, 1.3, []], ['Farhan Ali', 'Production', 80, 4.1, 1.7, []], ['Priya Nair', 'Production', 83, 4.2, 1.6, []],
];

export const P_TASKS = [];

export const P_DAYS = ['Mon 5', 'Tue 6', 'Wed 7', 'Thu 8', 'Fri 9'];
export const P_TODAY = 3;
export const P_HPD = 8.5;
export const P_NOW = 13.67;

export const P_CATS = {
  rolled: ['Delayed', 'var(--error-50)', 'rgb(153,27,27)', 'inset 0 0 0 1px rgb(252,165,165)', 'var(--error-500)'],
  admin: ['Held for admin', 'rgb(255,241,242)', 'rgb(159,18,57)', 'inset 0 0 0 1px rgb(253,164,175)', 'rgb(244,63,94)'],
  hold: ['On hold', 'var(--neutral-100)', 'var(--neutral-700)', 'inset 0 0 0 1px var(--neutral-300)', 'var(--neutral-500)'],
  review: ['Stuck in review', 'var(--info-100)', 'rgb(30,64,175)', 'inset 0 0 0 1px rgb(147,197,253)', 'var(--info-500)'],
  changes: ['Changes', 'var(--warning-100)', 'rgb(146,64,14)', 'inset 0 0 0 1px rgb(252,211,77)', 'var(--warning-500)'],
  new: ['New', 'var(--brand-50)', 'var(--brand-700)', 'inset 0 0 0 1px var(--brand-200)', 'var(--brand-500)'],
  planned: ['Extra work', 'var(--neutral-100)', 'var(--neutral-700)', 'inset 0 0 0 1px var(--neutral-200)', 'var(--neutral-400)'],
};

export const P_ORDER = ['new', 'planned', 'rolled', 'admin', 'hold', 'changes'];

export const NOTE_REASONS = ['Workload is full', 'Need more details', 'Deadline not possible', 'Not my skill area', 'Other'];
