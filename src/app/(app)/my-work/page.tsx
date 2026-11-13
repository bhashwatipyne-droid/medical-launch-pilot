import Link from 'next/link'
import { getMe, getStages } from '@/lib/session'
import { getMyWork } from '@/lib/data'
import { fmtDate, isOverdue } from '@/lib/format'
import { Empty, PageHead, StatusPill } from '@/components/ui'

export default async function MyWork() {
  const me = (await getMe())!
  const stages = await getStages()
  const work = await getMyWork(me, stages)
  return (
    <>
      <PageHead title="My work" sub={me.role === 'admin' ? 'Everything in flight.' : `Products waiting on the ${me.department} team.`} />
      {work.length === 0 ? <Empty>Nothing is waiting on you. New products show up here when they reach your stage.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs text-ink-soft"><tr><th className="px-4 py-3 font-medium">Product</th><th className="px-4 py-3 font-medium">Launch</th><th className="px-4 py-3 font-medium">Stage</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Due</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {work.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><Link href={`/launches/${p.launch_id}/products/${p.id}`} className="font-medium text-brand">{p.name}</Link></td>
                  <td className="px-4 py-3 text-ink-soft">{p.ml_launches.name}</td>
                  <td className="px-4 py-3">{p.current_stage}</td>
                  <td className="px-4 py-3"><StatusPill status={p.stage_status} /></td>
                  <td className={`px-4 py-3 ${isOverdue(p) ? 'font-medium text-rose-600' : 'text-ink-soft'}`}>{fmtDate(p.stage_schedule?.[p.current_stage]?.end_dt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
