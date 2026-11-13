import Link from 'next/link'
import { getMe, getStages } from '@/lib/session'
import { getMyApprovals } from '@/lib/data'
import { fmtDate } from '@/lib/format'
import { Empty, PageHead } from '@/components/ui'

export default async function Approvals() {
  const me = (await getMe())!
  const stages = await getStages()
  const list = await getMyApprovals(me, stages)
  return (
    <>
      <PageHead title="Approvals" sub="Submitted work waiting for your decision." />
      {list.length === 0 ? <Empty>Nothing is waiting on you.</Empty> : (
        <ul className="card divide-y divide-slate-100">
          {list.map((a) => (
            <li key={a.id}>
              <Link href={`/launches/${a.ml_products.launch_id}/products/${a.product_id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 hover:bg-slate-50">
                <span>
                  <span className="block text-sm font-medium">{a.ml_products.name}</span>
                  <span className="block text-xs text-ink-soft">{a.ml_products.ml_launches.name} · {a.stage}</span>
                </span>
                <span className="flex items-center gap-3">
                  {a.approval_type === 'LEADERSHIP' && <span className="pill bg-violet-50 text-violet-700">CEO gate</span>}
                  <span className="text-xs text-ink-soft">Submitted {fmtDate(a.requested_at)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
