// End-to-end check of the live server: the prototype's launch rules running on
// the server against Postgres, as each role. Run: npm run test:flow
import assert from 'node:assert/strict'
import { runAsUser } from '../server/workspace'
import { setPushDeps } from '../server/push'
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

// push: browsers register a token; pushes go out after saves that notify someone
const sent = []
const removed = []
setPushDeps({
  enabled: () => true,
  schedule: (job) => job(),
  send: async (tokens, data) => { sent.push({ tokens, data }); return tokens.filter((t) => t === 'tok-dead') },
  remove: async (tokens) => { removed.push(...tokens) },
})
await as('pm')('POST', '/push/register', { token: 'tok-pm' })
await as('pm')('POST', '/push/register', { token: 'tok-dead' })
await as('prm')('POST', '/push/register', { token: 'tok-prm' })
await as('prm')('POST', '/push/register', { token: 'tok-shared' })
await as('pmem')('POST', '/push/register', { token: 'tok-shared' }) // same browser, new account: moves to the new person
await assert.rejects(as('pm')('POST', '/push/register', {}), (e) => e.status === 400)
const tokenOwners = Object.fromEntries((await query(`select data->>'token' t, data->>'user_id' u from ml_ws_records where collection = 'pushTokens'`)).rows.map((r) => [r.t, r.u]))
assert.equal(tokenOwners['tok-shared'], U.pmem[0])
await as('prm')('POST', '/push/unregister', { token: 'tok-shared' }) // not theirs any more: untouched
assert.equal((await query(`select count(*)::int n from ml_ws_records where collection = 'pushTokens' and data->>'token' = 'tok-shared'`)).rows[0].n, 1)

// 2. stage work: other teams cannot touch it; the team cannot skip stages
await denied(as('prmem')('PATCH', `/deliverables/${lead.id}`, { launch: { brief: 'x' } }))
await denied(as('pmem')('PATCH', `/deliverables/${lead.id}`, { current_stage: 'Production' }))
await denied(as('pmem')('PATCH', `/deliverables/${lead.id}`, { stage_status: 'Completed' }))
await as('pmem')('PATCH', `/deliverables/${lead.id}`, { launch: { brief: 'Fingertip SpO2 monitor' }, stage_status: 'Ready for Review' })
// details stay editable while waiting; status and plan changes do not
await as('pm')('GET', '/approvals/board') // opens the review
const readySent = sent.find((x) => x.data.title === 'Sample approval ready')
assert.ok(readySent, 'push sent when the approval opened')
assert.deepEqual(readySent.tokens.sort(), ['tok-dead', 'tok-pm'], 'only the approver\'s browsers')
assert.equal(readySent.data.url, `/#/approvals?deliverable=${lead.id}`)
assert.ok(removed.includes('tok-dead'), 'dead token removed')
await as('pmem')('PATCH', `/deliverables/${lead.id}`, { launch: { brief: 'Fingertip SpO2 monitor v2' } })
await denied(as('pmem')('PATCH', `/deliverables/${lead.id}`, { launch: { brief: 'x' }, stage_status: 'In Progress', current_stage: 'Costing' }))
await denied(as('prmem')('PATCH', `/deliverables/${lead.id}`, { launch: { brief: 'other team' } }))

// 3. review: the board opens a manager item; only Product's manager (or CEO) approves
let board = await as('pm')('GET', '/approvals/board')
const item = board.MANAGER.find((i) => i.deliverable_id === lead.id)
assert.ok(item, 'manager approval opened')
assert.equal(item.launch.brief, 'Fingertip SpO2 monitor v2', 'approver sees the edited brief')
assert.match(item.last_edit.what, /Product brief/, 'edit is logged against the approval')
// the approver can fix details too, and it is logged
await as('pm')('PATCH', `/deliverables/${lead.id}`, { launch: { ...item.launch, spec_link: 'https://spec.example/x' } })
board = await as('pm')('GET', '/approvals/board')
assert.equal(board.MANAGER.find((i) => i.deliverable_id === lead.id).launch.spec_link, 'https://spec.example/x')
await denied(as('pmem')('POST', `/approval-items/${item.id}/approve`, {}))
await denied(as('prm')('POST', `/approval-items/${item.id}/approve`, {}))
await as('pm')('POST', `/approval-items/${item.id}/approve`, { note: 'ok' })
let d = (await as('pm')('GET', '/deliverables', {}, { project_id: launch.id })).find((x) => x.id === lead.id)
assert.equal(d.current_stage, 'Sourcing')
const handoff = sent.find((x) => /Sourcing has a new deliverable/.test(x.data.title))
assert.ok(handoff && handoff.tokens.join() === 'tok-prm', 'next team pushed on approval')
assert.match(handoff.data.url, /^\/#\/projects\//)
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
await new Promise((r) => setTimeout(r, 15100)) // a hand edit shows once the held copy expires
await assert.rejects(as('pmem')('GET', '/auth/me'), (e) => e.status === 401)

console.log('FLOW PASSED')
await end()
