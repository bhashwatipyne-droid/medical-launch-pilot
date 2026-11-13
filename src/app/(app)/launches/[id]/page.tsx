import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getMe, getStages } from '@/lib/session'
import { supabaseServer } from '@/lib/supabase/server'
import { fmtDate, fmtDateTime, isOverdue, progressPct } from '@/lib/format'
import { isProduct, isProductManager } from '@/lib/perm'
import { PageHead, StageTrack, StatusPill } from '@/components/ui'
import { ActionForm } from '@/components/Form'
import { addProduct, updateLaunch } from '../../actions'
import { PRODUCT_KINDS, type Launch, type LaunchEvent, type Product, type Profile } from '@/lib/types'

export default async function LaunchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const me = (await getMe())!
  const stages = await getStages()
  const supabase = await supabaseServer()
  const [{ data: launch }, { data: products }, { data: events }, { data: people }] = await Promise.all([
    supabase.from('ml_launches').select('*').eq('id', id).maybeSingle(),
    supabase.from('ml_products').select('*').eq('launch_id', id).order('position'),
    supabase.from('ml_events').select('*').eq('launch_id', id).order('created_at', { ascending: false }).limit(40),
    supabase.from('ml_profiles').select('id, full_name'),
  ])
  if (!launch) notFound()
  const l = launch as Launch
  const ps = (products ?? []) as Product[]
  const who = Object.fromEntries(((people ?? []) as Pick<Profile, 'id' | 'full_name'>[]).map((p) => [p.id, p.full_name]))
  const names = Object.fromEntries(ps.map((p) => [p.id, p.name]))

  return (
    <>
      <PageHead title={l.name} sub={`${l.code} · ${l.category} · ${fmtDate(l.start_date)} to ${fmtDate(l.target_date)} · ${l.status}`} action={<Link href="/launches" className="btn-ghost">All launches</Link>} />
      {l.description && <p className="mb-6 max-w-3xl text-sm text-ink-soft">{l.description}</p>}

      <section className="mb-8">
        <h2 className="mb-2">Products</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs text-ink-soft">
              <tr><th className="px-4 py-3 font-medium">Product</th><th className="px-4 py-3 font-medium">Stage</th><th className="px-4 py-3 font-medium">Pipeline</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Stage due</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ps.map((p) => {
                const due = p.stage_schedule?.[p.current_stage]?.end_dt
                const late = isOverdue(p)
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><Link href={`/launches/${l.id}/products/${p.id}`} className="font-medium text-brand">{p.name}</Link><div className="text-xs text-ink-faint">{p.kind}</div></td>
                    <td className="px-4 py-3">{p.stage_status === 'Completed' ? 'Done' : p.current_stage}<div className="text-xs text-ink-faint">{progressPct(p, stages)}%</div></td>
                    <td className="px-4 py-3"><StageTrack stages={stages} current={p.current_stage} status={p.stage_status} /></td>
                    <td className="px-4 py-3"><StatusPill status={p.stage_status} /></td>
                    <td className={`px-4 py-3 ${late ? 'font-medium text-rose-600' : 'text-ink-soft'}`}>{p.stage_status === 'Completed' ? '—' : fmtDate(due)}{late && ' · late'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {isProduct(me) && (
          <section>
            <h2 className="mb-2">Add a product</h2>
            <ActionForm action={addProduct} resetOnOk className="card space-y-3 p-4">
              <input type="hidden" name="launch_id" value={l.id} />
              <div><label className="label" htmlFor="pname">Name</label><input id="pname" name="name" required className="input" /></div>
              <div><label className="label" htmlFor="pkind">Type</label><select id="pkind" name="kind" className="input" defaultValue="Accessory">{PRODUCT_KINDS.map((k) => <option key={k}>{k}</option>)}</select></div>
              <button className="btn-primary">Add product</button>
            </ActionForm>
          </section>
        )}
        {isProductManager(me) && (
          <section>
            <h2 className="mb-2">Edit launch</h2>
            <ActionForm action={updateLaunch} className="card space-y-3 p-4">
              <input type="hidden" name="id" value={l.id} />
              <div><label className="label" htmlFor="lname">Name</label><input id="lname" name="name" required defaultValue={l.name} className="input" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label" htmlFor="lcat">Category</label><input id="lcat" name="category" defaultValue={l.category} className="input" /></div>
                <div><label className="label" htmlFor="lstatus">Status</label><select id="lstatus" name="status" defaultValue={l.status} className="input">{['Active', 'Completed', 'On Hold', 'Scrapped'].map((s) => <option key={s}>{s}</option>)}</select></div>
              </div>
              <div><label className="label" htmlFor="ltarget">Target launch date</label><input id="ltarget" name="target_date" type="date" required defaultValue={l.target_date} className="input" /></div>
              <div><label className="label" htmlFor="ldesc">Description</label><textarea id="ldesc" name="description" rows={2} defaultValue={l.description} className="input" /></div>
              <button className="btn-primary">Save changes</button>
            </ActionForm>
          </section>
        )}
      </div>

      <section className="mt-8">
        <h2 className="mb-2">Activity</h2>
        <ul className="card divide-y divide-slate-100 text-sm">
          {((events ?? []) as LaunchEvent[]).map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5">
              <span><strong className="font-medium">{e.actor_id ? who[e.actor_id] ?? 'Someone' : 'System'}</strong> {describe(e)}{e.product_id && names[e.product_id] ? <> on <span className="font-medium">{names[e.product_id]}</span></> : null}{e.note && e.action !== 'created' && e.action !== 'product_added' ? <span className="text-ink-soft"> — {e.note}</span> : null}</span>
              <span className="text-xs text-ink-faint">{fmtDateTime(e.created_at)}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

function describe(e: LaunchEvent): string {
  switch (e.action) {
    case 'created': return 'added a product'
    case 'product_added': return 'added a product'
    case 'submitted': return `submitted ${e.stage}`
    case 'approved': return `approved ${e.stage}`
    case 'advanced': return `moved it from ${e.from_stage} to ${e.to_stage}`
    case 'sent_back': return `sent it back to ${e.to_stage}`
    case 'completed': return 'marked it complete'
    case 'dates_changed': return `changed the ${e.stage} dates`
    default: return e.action
  }
}
