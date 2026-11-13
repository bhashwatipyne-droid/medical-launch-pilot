import Link from 'next/link'
import { getMe, getStages } from '@/lib/session'
import { getLaunches } from '@/lib/data'
import { fmtDate, progressPct } from '@/lib/format'
import { Empty, PageHead } from '@/components/ui'
import { isProduct } from '@/lib/perm'

export default async function Launches() {
  const me = (await getMe())!
  const stages = await getStages()
  const launches = await getLaunches()
  return (
    <>
      <PageHead title="Launches" sub="Every product programme, from sample to dispatch." action={isProduct(me) ? <Link href="/launches/new" className="btn-primary">New launch</Link> : undefined} />
      {launches.length === 0 ? <Empty>No launches yet.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs text-ink-soft">
              <tr><th className="px-4 py-3 font-medium">Launch</th><th className="px-4 py-3 font-medium">Category</th><th className="px-4 py-3 font-medium">Products</th><th className="px-4 py-3 font-medium">Progress</th><th className="px-4 py-3 font-medium">Target</th><th className="px-4 py-3 font-medium">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {launches.map((l) => {
                const pcts = l.ml_products.map((p) => progressPct(p, stages))
                const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0
                return (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><Link href={`/launches/${l.id}`} className="font-medium text-brand">{l.name}</Link><div className="text-xs text-ink-faint">{l.code}</div></td>
                    <td className="px-4 py-3 text-ink-soft">{l.category}</td>
                    <td className="px-4 py-3">{l.ml_products.length}</td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-brand" style={{ width: `${avg}%` }} /></div><span className="text-xs text-ink-soft">{avg}%</span></div></td>
                    <td className="px-4 py-3 text-ink-soft">{fmtDate(l.target_date)}</td>
                    <td className="px-4 py-3">{l.status}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
