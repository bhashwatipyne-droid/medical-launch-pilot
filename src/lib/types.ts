export type Role = 'admin' | 'manager' | 'member'
export const DEPARTMENTS = ['Product', 'Procurement', 'R&D', 'Graphics', 'Purchase', 'Production'] as const
export type Department = (typeof DEPARTMENTS)[number] | 'Administration'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: Role
  department: Department
  active: boolean
  created_at: string
}

export type FieldType = 'text' | 'area' | 'select' | 'date' | 'number' | 'money' | 'link'
export interface StageField {
  key: string
  label: string
  type: FieldType
  required?: boolean
  placeholder?: string
  options?: string[]
  group?: 'Product' | 'Graphics' | 'Both'
}

export interface Stage {
  stage: string
  position: number
  label: string
  department: string
  contributor_departments: string[]
  weight: number
  color: string
  gate_title: string | null
  gate_return_to: string | null
  fields: StageField[]
}

export type StageStatus = 'Not Started' | 'In Progress' | 'Ready for Review' | 'Changes Requested' | 'Completed'
export type LaunchStatus = 'Active' | 'Completed' | 'On Hold' | 'Scrapped'

export interface Product {
  id: string
  launch_id: string
  name: string
  kind: string
  position: number
  current_stage: string
  stage_status: StageStatus
  details: Record<string, string | number | null>
  stage_schedule: Record<string, { start_dt: string; end_dt: string }>
  last_review_action: 'approved' | 'sent_back' | null
  last_review_note: string
  completed_at: string | null
}

export interface Launch {
  id: string
  code: string
  name: string
  category: string
  description: string
  start_date: string
  target_date: string
  status: LaunchStatus
  created_at: string
}

export interface Approval {
  id: string
  product_id: string
  stage: string
  cycle: number
  approval_type: 'MANAGER' | 'LEADERSHIP'
  status: 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'CANCELLED'
  requested_by: string | null
  requested_at: string
  decided_by: string | null
  decided_at: string | null
  note: string
}

export interface LaunchEvent {
  id: string
  launch_id: string
  product_id: string | null
  stage: string | null
  action: string
  actor_id: string | null
  from_stage: string | null
  to_stage: string | null
  note: string
  created_at: string
}

export interface Notification {
  id: string
  title: string
  body: string
  launch_id: string | null
  product_id: string | null
  is_read: boolean
  created_at: string
}

export const PRODUCT_KINDS = ['Main unit', 'Variant', 'Accessory', 'Component / part', 'Consumable'] as const
