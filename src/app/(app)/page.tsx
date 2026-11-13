import Link from 'next/link'
import { getMe, getStages } from '@/lib/session'
import { getLaunches, getMyApprovals, getMyWork } from '@/lib/data'
import { isOverdue, progressPct, fmtDate } from '@/lib/format'
import { Empty, PageHead, StageTrack, StatusPill } from '@/components/ui'
import { isProduct } from '@/lib/perm'

export default async function Dashboard() {
  const me = (await getMe())!
  const stages = await getStages()
  const [launches, approvals, work] = await Promise.all([getLaunches(), getMyApprovals(me, stages), getMyWork(me, stages)])

  const active = launches.filter((l) => l.status === 'Active')
  const inFlight = active.flatMap((l) => l.ml_products).filter((p) => p.stage_status !== 'Completed')
  const overdue = inFlight.filter((p) => isOverdue(p))
  const stats = [
    { label: 'Active launches', value: active.length },
    { label: 'Products in flight', value: inFlight.length },
    { label: 'Waiting for your approval', value: approvals.length, hot: approvals.length > 0 },
    { label: 'Past their stage date', value: overdue.length, hot: overdue.length > 0 },
  ]

  return (
    <>
      <PageHead
        title={`Hello, ${me.full_name.split(' ')[0]}`}
        sub="Where every launch stands, and what needs you."
        action={isProduct(me) ? <Link href="/launches/new" className="btn-primary">New launch</Link> : undefined}
      />
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className={`text-3xl font-semibold ${s.hot ? 'text-rose-600' : ''}`}>{s.value}</div>
            <div className="mt-1 text-xs text-ink-soft">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-2 flex items-center justify-between"><h2>Needs your approval</h2><Link href="/approvals" className="text-sm text-brand">See all</Link></div>
          {approvals.length === 0 ? <Empty>Nothing is waiting on you.</Empty> : (
            <ul className="card divide-y divide-slate-100">
              {approvals.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <Link href={`/launches/${a.ml_products.launch_id}/products/${a.product_id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                    <span>
                      <span className="block text-sm font-medium">{a.ml_products.name}</span>
                      <span className="block text-xs text-ink-soft">{a.ml_products.ml_launches.name} · {a.stage}{a.approval_type === 'LEADERSHIP' ? ' · CEO gate' : ''}</span>
                    </span>
                    <span className="text-xs text-ink-soft">{fmtDate(a.requested_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <div className="mb-2 flex items-center justify-between"><h2>Your work</h2><Link href="/my-work" className="text-sm text-brand">See all</Link></div>
          {work.length === 0 ? <Empty>No product is waiting on your team right now.</Empty> : (
            <ul className="card divide-y divide-slate-100">
              {work.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <Link href={`/launches/${p.launch_id}/products/${p.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                    <span>
                      <span className="block text-sm font-medium">{p.name}</span>
                      <span className="block text-xs text-ink-soft">{p.ml_launches.name} · {p.current_stage}</span>
                    </span>
                    <StatusPill status={p.stage_status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-8">
        <div className="mb-2 flex items-center justify-between"><h2>Launches</h2><Link href="/launches" className="text-sm text-brand">See all</Link></div>
        {launches.length === 0 ? <Empty>No launches yet.{isProduct(me) ? ' Start the first one.' : ''}</Empty> : (
          <ul className="card divide-y divide-slate-100">
            {launches.slice(0, 6).map((l) => {
              const pcts = l.ml_products.map((p) => progressPct(p, stages))
              const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0
              return (
                <li key={l.id}>
                  <Link href={`/launches/${l.id}`} className="block px-4 py-3 hover:bg-slate-50">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{l.name} <span className="ml-1 text-xs font-normal text-ink-faint">{l.code}</span></span>
                      <span className="text-xs text-ink-soft">{l.status} · target {fmtDate(l.target_date)}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand" style={{ width: `${avg}%` }} /></div>
                      <span className="w-10 text-right text-xs text-ink-soft">{avg}%</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                      {l.ml_products.slice(0, 3).map((p) => (
                        <span key={p.id} className="flex items-center gap-2 text-xs text-ink-soft"><span>{p.name}</span><StageTrack stages={stages} current={p.current_stage} status={p.stage_status} /></span>
                      ))}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
