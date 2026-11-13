import type { StageStatus } from '@/lib/types'
import { STATUS_TONE } from '@/lib/format'

export function StatusPill({ status }: { status: StageStatus }) {
  return <span className={`pill ${STATUS_TONE[status]}`}>{status}</span>
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-ink-soft">{children}</div>
}

export function PageHead({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1>{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink-soft">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

/** The seven stages as a row of dots: done, current, upcoming. */
export function StageTrack({ stages, current, status }: { stages: { stage: string; position: number; color: string }[]; current: string; status: StageStatus }) {
  const cur = stages.find((s) => s.stage === current)?.position ?? 0
  return (
    <ol className="flex items-center gap-1" aria-label={`Stage ${current}, ${status}`}>
      {stages.map((s) => {
        const done = status === 'Completed' || s.position < cur
        const active = status !== 'Completed' && s.position === cur
        return (
          <li key={s.stage} title={s.stage} className="flex items-center gap-1">
            <span
              className={`h-2.5 rounded-full ${active ? 'w-6' : 'w-2.5'} ${done ? 'bg-emerald-500' : active ? '' : 'bg-slate-200'}`}
              style={active ? { background: s.color } : undefined}
            />
          </li>
        )
      })}
    </ol>
  )
}

export function Banner({ tone, children }: { tone: 'error' | 'ok' | 'warn'; children: React.ReactNode }) {
  const t = tone === 'error' ? 'bg-rose-50 text-rose-700' : tone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
  return <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg px-3 py-2 text-sm ${t}`}>{children}</p>
}
