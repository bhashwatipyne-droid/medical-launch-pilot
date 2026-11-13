import { describe, expect, it } from 'vitest'
import { fmtValue, isOverdue, progressPct } from '../format'

const stages = [
  { stage: 'Sample', position: 1, weight: 15 },
  { stage: 'Sourcing', position: 2, weight: 15 },
  { stage: 'Costing', position: 3, weight: 10 },
  { stage: 'BOM', position: 4, weight: 15 },
  { stage: 'Packaging', position: 5, weight: 21 },
  { stage: 'Purchase', position: 6, weight: 15 },
  { stage: 'Production', position: 7, weight: 10 },
]

describe('progressPct', () => {
  it('is 0 at the first stage and 100 once complete', () => {
    expect(progressPct({ current_stage: 'Sample', stage_status: 'In Progress' }, stages)).toBe(0)
    expect(progressPct({ current_stage: 'Production', stage_status: 'Completed' }, stages)).toBe(100)
  })
  it('counts finished stages by weight', () => {
    expect(progressPct({ current_stage: 'BOM', stage_status: 'In Progress' }, stages)).toBe(Math.round((40 / 101) * 100))
  })
  it('does not divide by zero with no stages', () => {
    expect(progressPct({ current_stage: 'X', stage_status: 'In Progress' }, [])).toBe(0)
  })
})

describe('isOverdue', () => {
  const p = (end: string, status: 'In Progress' | 'Completed' = 'In Progress') => ({
    current_stage: 'Sample', stage_status: status, stage_schedule: { Sample: { start_dt: '2026-01-01', end_dt: end } },
  })
  const today = new Date(2026, 5, 10)
  it('flags a stage past its end date, not one ending today', () => {
    expect(isOverdue(p('2026-06-09'), today)).toBe(true)
    expect(isOverdue(p('2026-06-10'), today)).toBe(false)
    expect(isOverdue(p('2026-06-11'), today)).toBe(false)
  })
  it('never flags finished products or missing dates', () => {
    expect(isOverdue(p('2020-01-01', 'Completed'), today)).toBe(false)
    expect(isOverdue({ current_stage: 'Sample', stage_status: 'In Progress', stage_schedule: {} }, today)).toBe(false)
  })
})

describe('fmtValue', () => {
  it('formats money, numbers and blanks', () => {
    expect(fmtValue('money', '842.5')).toBe('₹842.5')
    expect(fmtValue('number', '12000')).toBe('12,000')
    expect(fmtValue('text', '')).toBe('—')
    expect(fmtValue('text', null)).toBe('—')
    expect(fmtValue('money', 'abc')).toBe('abc')
  })
})
