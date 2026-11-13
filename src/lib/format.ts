import type { Product, Stage, StageStatus } from './types'

export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  const dt = new Date(d.length === 10 ? d + 'T00:00:00' : d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtDateTime(d: string): string {
  const dt = new Date(d)
  return dt.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

export function fmtValue(type: string, v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  if (type === 'money') {
    const n = Number(v)
    return Number.isFinite(n) ? '₹' + n.toLocaleString('en-IN') : String(v)
  }
  if (type === 'number') {
    const n = Number(v)
    return Number.isFinite(n) ? n.toLocaleString('en-IN') : String(v)
  }
  if (type === 'date') return fmtDate(String(v))
  return String(v)
}

/** Whole-number percentage of the pipeline a product has finished. */
export function progressPct(p: Pick<Product, 'current_stage' | 'stage_status'>, stages: Pick<Stage, 'stage' | 'position' | 'weight'>[]): number {
  if (p.stage_status === 'Completed') return 100
  const total = stages.reduce((s, x) => s + x.weight, 0)
  const cur = stages.find((s) => s.stage === p.current_stage)
  if (!cur || total === 0) return 0
  const done = stages.filter((s) => s.position < cur.position).reduce((s, x) => s + x.weight, 0)
  return Math.round((done / total) * 100)
}

export const STATUS_TONE: Record<StageStatus, string> = {
  'Not Started': 'bg-slate-100 text-slate-700',
  'In Progress': 'bg-blue-50 text-blue-700',
  'Ready for Review': 'bg-amber-50 text-amber-800',
  'Changes Requested': 'bg-rose-50 text-rose-700',
  Completed: 'bg-emerald-50 text-emerald-700',
}

export function isOverdue(p: Pick<Product, 'current_stage' | 'stage_status' | 'stage_schedule'>, today = new Date()): boolean {
  if (p.stage_status === 'Completed') return false
  const end = p.stage_schedule?.[p.current_stage]?.end_dt
  if (!end) return false
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  return new Date(end + 'T00:00:00').getTime() < t
}
