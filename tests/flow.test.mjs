// End-to-end check of the live server: the prototype's launch rules running on
// the server against Postgres, as each role. Run: npm run test:flow
import assert from 'node:assert/strict'
import { runAsUser } from '../server/workspace'
import { query, end } from './fakeSupabase.mjs'

const U = {
  ceo: ['00000000-0000-0000-0000-0000000000a1', 'CEO', 'admin', 'Administration'],
  pm: ['00000000-0000-0000-0000-0000000000b1', 'Product Manager', 'manager', 'Product'],
  pmem: ['00000000-0000-0000-0000-0000000000b2', 'Product Member', 'member', 'Product'],
  prm: ['00000000-0000-0000-0000-0000000000c1', 'Procurement Manager', 'manager', 'Procurement'],
  prmem: ['00000000-0000-0000-0000-0000000000c2', 'Procurement Member', 'member', 'Procurement'],
  gm: ['00000000-0000-0000-0000-0000000000d1', 'Graphics Manager', 'manager', 'Graphics'],
}
for (const [id, name, role, department] of Object.values(U)) {
  await query(`insert into ml_ws_records (collection, id, data) values ('users', $1, $2) on conflict do nothing`,
    [id, { id, name, username: name.toLowerCase().replace(' ', '.'), email: id + '@t.local', role, department, active: true, removed: false }])
}
const as = (who) => (method, path, body = {}, q = {}) => runAsUser(U[who][0], { method, path, body, query: q })
const denied = async (p, re) => {
  await assert.rejects(p, (e) => e.status === 403 && (!re || re.test(e.detail)))
}

// 1. only the Product manager starts a launch
await denied(as('pmem')('POST', '/projects', { name: 'X', client_id: 'c-diag' }))
await denied(as('ceo')('POST', '/projects', { name: 'X', client_id: 'c-diag' }))
const plan = { Sample: { start_dt: '2026-12-01', end_dt: '2026-12-10' } }
const launch = await as('pm')('POST', '/projects', {
  name: 'Pulse oximeter PX200', client_id: 'c-diag', start_date: '2026-12-01', end_date: '2027-02-28', status: 'Active',
  deliverables: [{ name: 'PX200 main unit', type: 'Main unit', stage_schedule: plan }, { name: 'Finger probe', type: 'Accessory', stage_schedule: plan }],
})
assert.equal(launch.name, 'Pulse oximeter PX200')
const dels = await as('pmem')('GET', '/deliverables', {}, { project_id: launch.id })
assert.equal(dels.length, 2)
const lead = dels.find((d) => d.name === 'PX200 main unit')
assert.equal(lead.current_stage, 'Sample')

// 2. stage work: other teams cannot touch it; the team cannot skip stages
await denied(as('prmem')('PATCH', `/deliverables/${lead.id}`, { launch: { brief: 'x' } }))
await denied(as('pmem')('PATCH', `/deliverables/${lead.id}`, { current_stage: 'Production' }))
await denied(as('pmem')('PATCH', `/deliverables/${lead.id}`, { stage_status: 'Completed' }))
await as('pmem')('PATCH', `/deliverables/${lead.id}`, { launch: { brief: 'Fingertip SpO2 monitor' }, stage_status: 'Ready for Review' })
await denied(as('pmem')('PATCH', `/deliverables/${lead.id}`, { launch: { brief: 'edit while waiting' } }))

// 3. review: the board opens a manager item; only Product's manager (or CEO) approves
let board = await as('pm')('GET', '/approvals/board')
const item = board.MANAGER.find((i) => i.deliverable_id === lead.id)
assert.ok(item, 'manager approval opened')
await denied(as('pmem')('POST', `/approval-items/${item.id}/approve`, {}))
await denied(as('prm')('POST', `/approval-items/${item.id}/approve`, {}))
await as('pm')('POST', `/approval-items/${item.id}/approve`, { note: 'ok' })
let d = (await as('pm')('GET', '/deliverables', {}, { project_id: launch.id })).find((x) => x.id === lead.id)
assert.equal(d.current_stage, 'Sourcing')
const prmNotes = await as('prm')('GET', '/notifications')
assert.ok(prmNotes.some((n) => /Sourcing/.test(n.title)), 'Procurement manager notified')
assert.ok(!(await as('pmem')('GET', '/notifications')).some((n) => n.user_id !== U.pmem[0]), 'only own notifications')

// 4. Sourcing -> Costing (CEO gate)
await as('prmem')('PATCH', `/deliverables/${lead.id}`, { launch: { materials: 'PCB' }, stage_status: 'Ready for Review' })
board = await as('prm')('GET', '/approvals/board')
await as('prm')('POST', `/approval-items/${board.MANAGER.find((i) => i.deliverable_id === lead.id).id}/approve`, {})
await as('pmem')('PATCH', `/deliverables/${lead.id}`, { launch: { unit_cost: '842' }, stage_status: 'Ready for Review' })
board = await as('pm')('GET', '/approvals/board')
await as('pm')('POST', `/approval-items/${board.MANAGER.find((i) => i.deliverable_id === lead.id).id}/approve`, {})
board = await as('ceo')('GET', '/approvals/board')
const gate = board.LEADERSHIP.find((i) => i.deliverable_id === lead.id)
assert.ok(gate, 'CEO gate opened')
await denied(as('pm')('POST', `/approval-items/${gate.id}/approve`, {}), /CEO/)

// 5. CEO sends it back to Sample with a note
await denied(as('pmem')('POST', `/approval-items/${gate.id}/send-back`, { to_stage: 'Sample', note: 'x' }))
await as('ceo')('POST', `/approval-items/${gate.id}/send-back`, { to_stage: 'Sample', note: 'Cost over target' })
d = (await as('ceo')('GET', '/deliverables', {}, { project_id: launch.id })).find((x) => x.id === lead.id)
assert.equal(d.current_stage, 'Sample')
assert.equal(d.stage_status, 'Changes Requested')
assert.equal(d.last_review_note, 'Cost over target')

// 6. dashboard and project pages answer for the CEO and the PM
const home = await as('ceo')('GET', '/dashboard/home')
assert.ok(home && typeof home === 'object')
const projects = await as('pm')('GET', '/projects', {}, { include_deliverables: 'true' })
assert.equal(projects.length, 1)

// 7. concurrent saves never lose one another
await Promise.all([
  as('pm')('PATCH', `/projects/${launch.id}`, { description: 'A' }),
  as('pm')('POST', '/deliverables', { project_id: launch.id, name: 'Carry case', type: 'Accessory' }),
  as('pm')('POST', '/deliverables', { project_id: launch.id, name: 'Charger', type: 'Accessory' }),
])
const after = await as('pm')('GET', '/deliverables', {}, { project_id: launch.id })
assert.equal(after.length, 4)

// 8. a removed person is locked out
await query(`update ml_ws_records set data = data || '{"removed": true, "active": false}' where id = $1`, [U.pmem[0]])
await assert.rejects(as('pmem')('GET', '/auth/me'), (e) => e.status === 401)

console.log('FLOW PASSED')
await end()
