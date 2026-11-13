import { describe, expect, it } from 'vitest'
import { canApprove, canEditStage, canSendBack, canSetDates, fieldAllowed } from '../perm'
import type { Approval, Profile, Stage, StageField } from '../types'

const person = (role: Profile['role'], department: Profile['department'], id = role + department): Profile => ({
  id, full_name: id, email: id + '@x.test', role, department, active: true, created_at: '',
})
const stage = (name: string, department: string, contributors: string[] = [], gate: string | null = null): Stage => ({
  stage: name, position: 1, label: name, department, contributor_departments: contributors, weight: 10, color: '#000',
  gate_title: gate, gate_return_to: null, fields: [],
})
const approval = (type: Approval['approval_type'], requestedBy: string | null = null, status: Approval['status'] = 'PENDING'): Approval => ({
  id: 'a', product_id: 'p', stage: 'S', cycle: 1, approval_type: type, status, requested_by: requestedBy,
  requested_at: '', decided_by: null, decided_at: null, note: '',
})

const ceo = person('admin', 'Administration')
const sample = stage('Sample', 'Product')
const packaging = stage('Packaging', 'Graphics', ['Product'], 'CEO gate')

describe('who can edit a stage', () => {
  it('lets the owner team and contributors edit while work is open', () => {
    expect(canEditStage(person('member', 'Product'), sample, 'In Progress')).toBe(true)
    expect(canEditStage(person('member', 'Product'), packaging, 'In Progress')).toBe(true)
    expect(canEditStage(person('member', 'Graphics'), packaging, 'Changes Requested')).toBe(true)
  })
  it('keeps other teams out and locks submitted or finished stages', () => {
    expect(canEditStage(person('member', 'Procurement'), sample, 'In Progress')).toBe(false)
    expect(canEditStage(person('member', 'Product'), sample, 'Ready for Review')).toBe(false)
    expect(canEditStage(person('member', 'Product'), sample, 'Completed')).toBe(false)
  })
  it('lets the CEO step into any open stage', () => {
    expect(canEditStage(ceo, sample, 'In Progress')).toBe(true)
  })
})

describe('shared stage fields', () => {
  const f = (group?: StageField['group']): StageField => ({ key: 'k', label: 'K', type: 'text', group })
  it('limits grouped fields to their team', () => {
    expect(fieldAllowed(person('member', 'Product'), f('Product'))).toBe(true)
    expect(fieldAllowed(person('member', 'Product'), f('Graphics'))).toBe(false)
    expect(fieldAllowed(person('member', 'Graphics'), f('Both'))).toBe(true)
    expect(fieldAllowed(person('member', 'Graphics'), f())).toBe(true)
    expect(fieldAllowed(ceo, f('Graphics'))).toBe(true)
  })
})

describe('approvals', () => {
  it('lets only the owning team manager (or the CEO) approve the manager step', () => {
    const a = approval('MANAGER', 'someone')
    expect(canApprove(person('manager', 'Product'), a, sample)).toBe(true)
    expect(canApprove(person('manager', 'Procurement'), a, sample)).toBe(false)
    expect(canApprove(person('member', 'Product'), a, sample)).toBe(false)
    expect(canApprove(ceo, a, sample)).toBe(true)
  })
  it('stops a manager approving what they submitted themselves', () => {
    const mgr = person('manager', 'Product', 'm1')
    expect(canApprove(mgr, approval('MANAGER', 'm1'), sample)).toBe(false)
    expect(canApprove(ceo, approval('MANAGER', ceo.id), sample)).toBe(true)
  })
  it('reserves the gate for the CEO', () => {
    expect(canApprove(person('manager', 'Graphics'), approval('LEADERSHIP'), packaging)).toBe(false)
    expect(canApprove(ceo, approval('LEADERSHIP'), packaging)).toBe(true)
  })
  it('ignores approvals that are not open', () => {
    expect(canApprove(ceo, approval('MANAGER', null, 'APPROVED'), sample)).toBe(false)
    expect(canApprove(ceo, approval('LEADERSHIP', null, 'NOT_STARTED'), packaging)).toBe(false)
  })
})

describe('send back and dates', () => {
  it('allows the stage manager and CEO to send back', () => {
    expect(canSendBack(person('manager', 'Graphics'), packaging)).toBe(true)
    expect(canSendBack(person('manager', 'Product'), packaging)).toBe(false)
    expect(canSendBack(person('member', 'Graphics'), packaging)).toBe(false)
    expect(canSendBack(ceo, packaging)).toBe(true)
  })
  it('lets the stage manager, the Product manager and the CEO move dates', () => {
    expect(canSetDates(person('manager', 'Product'), packaging)).toBe(true)
    expect(canSetDates(person('manager', 'Graphics'), packaging)).toBe(true)
    expect(canSetDates(person('manager', 'Purchase'), packaging)).toBe(false)
    expect(canSetDates(person('member', 'Product'), packaging)).toBe(false)
  })
})
