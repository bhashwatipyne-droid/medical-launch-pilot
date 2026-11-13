import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getMe, getStages, stageMap } from '@/lib/session'
import { supabaseServer } from '@/lib/supabase/server'
import { canApprove, canEditStage, canSendBack, canSetDates, canWork, fieldAllowed } from '@/lib/perm'
import { fmtDate, fmtDateTime, fmtValue, isOverdue } from '@/lib/format'
import { Banner, PageHead, StageTrack, StatusPill } from '@/components/ui'
import StageForm from './StageForm'
import { ApproveForm, SendBackForm } from './ReviewPanel'
import DatesForm from './DatesForm'
import type { Approval, Launch, LaunchEvent, Product, Profile } from '@/lib/types'

export default async function ProductPage({ params }: { params: Promise<{ id: string; pid: string }> }) {
  const { id, pid } = await params
  const me = (await getMe())!
  const stages = await getStages()
  const byStage = stageMap(stages)
  const supabase = await supabaseServer()
  const [{ data: prod }, { data: launch }, { data: appr }, { data: evs }, { data: people }] = await Promise.all([
    supabase.from('ml_products').select('*').eq('id', pid).eq('launch_id', id).maybeSingle(),
    supabase.from('ml_launches').select('id, name, code').eq('id', id).maybeSingle(),
    supabase.from('ml_approvals').select('*').eq('product_id', pid).order('requested_at', { ascending: false }),
    supabase.from('ml_events').select('*').eq('product_id', pid).order('created_at', { ascending: false }).limit(40),
    supabase.from('ml_profiles').select('id, full_name'),
  ])
  if (!prod || !launch) notFound()
  const p = prod as Product
  const l = launch as Pick<Launch, 'id' | 'name' | 'code'>
  const approvals = (appr ?? []) as Approval[]
  const events = (evs ?? []) as LaunchEvent[]
  const who = Object.fromEntries(((people ?? []) as Pick<Profile, 'id' | 'full_name'>[]).map((x) => [x.id, x.full_name]))
  const cur = byStage[p.current_stage]
  const done = p.stage_status === 'Completed'
  const editable = !done && canEditStage(me, cur, p.stage_status)
  const allowedKeys = cur.fields.filter((f) => fieldAllowed(me, f)).map((f) => f.key)
  const open = approvals.filter((a) => a.status === 'PENDING' || a.status === 'NOT_STARTED')
  const earlier = stages.filter((s) => s.position < cur.position || done)
  const sendBackOptions = stages.filter((s) => s.position <= cur.position).map((s) => s.stage)
  const late = isOverdue(p)

  return (
    <>
      <PageHead
        title={p.name}
        sub={`${p.kind} · ${l.name} (${l.code})`}
        action={<Link href={`/launches/${l.id}`} className="btn-ghost">Back to launch</Link>}
      />
      <div className="card mb-6 flex flex-wrap items-center gap-x-8 gap-y-3 p-4">
        <StageTrack stages={stages} current={p.current_stage} status={p.stage_status} />
        <div className="text-sm"><span className="text-ink-soft">Now: </span><strong className="font-medium">{done ? 'Complete, ready for dispatch' : cur.label}</strong></div>
        <StatusPill status={p.stage_status} />
        {!done && <div className={`text-sm ${late ? 'font-medium text-rose-600' : 'text-ink-soft'}`}>Due {fmtDate(p.stage_schedule?.[p.current_stage]?.end_dt)}{late && ' · late'}</div>}
        {!done && <div className="text-sm text-ink-soft">Owner: {cur.department}{cur.contributor_departments.length ? ` with ${cur.contributor_departments.join(', ')}` : ''}</div>}
      </div>

      {p.stage_status === 'Changes Requested' && p.last_review_note && (
        <div className="mb-6"><Banner tone="warn"><strong>Sent back:</strong> {p.last_review_note}</Banner></div>
      )}

      {!done && (
        <section className="card mb-6 p-5">
          <h2 className="mb-1">{cur.stage}: {cur.label}</h2>
          {p.stage_status === 'Ready for Review' ? (
            <p className="mb-4 text-sm text-ink-soft">Submitted. Waiting for approval, so details are locked.</p>
          ) : !editable ? (
            <p className="mb-4 text-sm text-ink-soft">{canWork(me, cur) ? 'This stage cannot be edited right now.' : `Only the ${cur.department} team can edit this stage.`}</p>
          ) : null}
          {editable ? (
            <StageForm productId={p.id} fields={cur.fields} values={p.details} allowedKeys={allowedKeys} shared={cur.contributor_departments.length > 0} />
          ) : (
            <Details fields={cur.fields} values={p.details} />
          )}
        </section>
      )}

      {open.length > 0 && p.stage_status === 'Ready for Review' && (
        <section className="card mb-6 space-y-5 p-5">
          <h2>Approval</h2>
          <ul className="space-y-4">
            {[...open].reverse().map((a) => (
              <li key={a.id} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm font-medium">{a.approval_type === 'LEADERSHIP' ? `CEO: ${byStage[a.stage].gate_title}` : `${byStage[a.stage].department} manager`}</strong>
                  <span className={`pill ${a.status === 'PENDING' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{a.status === 'PENDING' ? 'Waiting' : 'After the manager'}</span>
                </div>
                {a.status === 'PENDING' && canApprove(me, a, byStage[a.stage]) && <ApproveForm approvalId={a.id} label={a.approval_type === 'LEADERSHIP' ? 'Approve as CEO' : 'Approve'} />}
                {a.status === 'PENDING' && !canApprove(me, a, byStage[a.stage]) && <p className="text-xs text-ink-soft">{a.approval_type === 'MANAGER' && a.requested_by === me.id ? 'You submitted this, so someone else approves it.' : 'Waiting for the approver.'}</p>}
              </li>
            ))}
          </ul>
          {canSendBack(me, cur) && <div className="max-w-md"><SendBackForm productId={p.id} options={sendBackOptions} defaultStage={byStage[p.current_stage].gate_return_to ?? p.current_stage} /></div>}
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-2">Timeline</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs text-ink-soft"><tr><th className="px-4 py-3 font-medium">Stage</th><th className="px-4 py-3 font-medium">Team</th><th className="px-4 py-3 font-medium">Dates</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {stages.map((s) => {
                const d = p.stage_schedule?.[s.stage]
                const isCur = !done && s.stage === p.current_stage
                const past = done || s.position < cur.position
                return (
                  <tr key={s.stage} className={isCur ? 'bg-brand-tint' : ''}>
                    <td className="px-4 py-2.5"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: past ? '#10b981' : s.color }} />{s.stage}{s.gate_title && <span className="ml-2 text-xs text-ink-faint">CEO gate</span>}</td>
                    <td className="px-4 py-2.5 text-ink-soft">{s.department}</td>
                    <td className="px-4 py-2.5">
                      {canSetDates(me, s) && !past && d ? <DatesForm productId={p.id} stage={s.stage} start={d.start_dt} end={d.end_dt} /> : <span className="text-ink-soft">{d ? `${fmtDate(d.start_dt)} to ${fmtDate(d.end_dt)}` : '—'}</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {earlier.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2">Recorded so far</h2>
          <div className="space-y-2">
            {earlier.map((s) => (
              <details key={s.stage} className="card p-4">
                <summary className="cursor-pointer text-sm font-medium">{s.stage}: {s.label}</summary>
                <div className="mt-3"><Details fields={s.fields} values={p.details} /></div>
              </details>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2">History</h2>
        <ul className="card divide-y divide-slate-100 text-sm">
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5">
              <span><strong className="font-medium">{e.actor_id ? who[e.actor_id] ?? 'Someone' : 'System'}</strong> {e.action === 'sent_back' ? `sent it back to ${e.to_stage}` : e.action === 'advanced' ? `moved it from ${e.from_stage} to ${e.to_stage}` : e.action === 'submitted' ? `submitted ${e.stage}` : e.action === 'approved' ? `approved ${e.stage}` : e.action === 'completed' ? 'marked it complete' : e.action === 'dates_changed' ? `changed the ${e.stage} dates` : 'added it to the launch'}{e.note && !['created', 'product_added', 'submitted', 'advanced', 'completed'].includes(e.action) ? <span className="text-ink-soft"> — {e.note}</span> : null}</span>
              <span className="text-xs text-ink-faint">{fmtDateTime(e.created_at)}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

function Details({ fields, values }: { fields: { key: string; label: string; type: string }[]; values: Record<string, string | number | null> }) {
  const filled = fields.filter((f) => values[f.key] !== undefined && values[f.key] !== null && values[f.key] !== '')
  if (filled.length === 0) return <p className="text-sm text-ink-soft">Nothing recorded for this stage.</p>
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {filled.map((f) => {
        const v = values[f.key]
        return (
          <div key={f.key} className={f.type === 'area' || f.type === 'link' ? 'sm:col-span-2' : ''}>
            <dt className="text-xs text-ink-soft">{f.label}</dt>
            <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm">
              {f.type === 'link' && /^https?:\/\//i.test(String(v)) ? <a href={String(v)} target="_blank" rel="noopener noreferrer" className="text-brand underline">{String(v)}</a> : fmtValue(f.type, v)}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
