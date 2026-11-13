// Who may do what. This mirrors the checks inside the database functions so the
// screens only offer actions that will succeed. The database is the real gate:
// if these ever disagree, the function raises an error and the UI shows it.
import type { Approval, Profile, Stage, StageField, StageStatus } from './types'

export const EDITABLE: StageStatus[] = ['Not Started', 'In Progress', 'Changes Requested']

export const isAdmin = (me: Profile) => me.role === 'admin'
export const isProduct = (me: Profile) => me.role === 'admin' || me.department === 'Product'
export const isProductManager = (me: Profile) => me.role === 'admin' || (me.role === 'manager' && me.department === 'Product')

export function canWork(me: Profile, stage: Stage): boolean {
  if (!me.active) return false
  return me.role === 'admin' || stage.department === me.department || stage.contributor_departments.includes(me.department)
}

export function fieldAllowed(me: Profile, field: StageField): boolean {
  if (me.role === 'admin') return true
  const g = field.group ?? 'Both'
  return g === 'Both' || g === me.department
}

export function canEditStage(me: Profile, stage: Stage, status: StageStatus): boolean {
  return EDITABLE.includes(status) && canWork(me, stage)
}

export function canApprove(me: Profile, approval: Approval, stage: Stage): boolean {
  if (approval.status !== 'PENDING') return false
  if (approval.approval_type === 'LEADERSHIP') return me.role === 'admin'
  if (me.role === 'admin') return true
  if (me.role !== 'manager' || me.department !== stage.department) return false
  return approval.requested_by !== me.id
}

export function canSendBack(me: Profile, stage: Stage): boolean {
  return me.role === 'admin' || (me.role === 'manager' && me.department === stage.department)
}

export function canSetDates(me: Profile, stage: Stage): boolean {
  return me.role === 'admin' || (me.role === 'manager' && (me.department === stage.department || me.department === 'Product'))
}
