import Link from 'next/link'
import { supabaseServer } from '@/lib/supabase/server'
import { fmtDateTime } from '@/lib/format'
import { Empty, PageHead } from '@/components/ui'
import { markAllRead } from '../actions'
import type { Notification } from '@/lib/types'

export default async function Notifications() {
  const supabase = await supabaseServer()
  const { data } = await supabase.from('ml_notifications').select('*').order('created_at', { ascending: false }).limit(50)
  const list = (data ?? []) as Notification[]
  const unread = list.some((n) => !n.is_read)
  return (
    <>
      <PageHead title="Notifications" action={unread ? <form action={markAllRead}><button className="btn-ghost">Mark all read</button></form> : undefined} />
      {list.length === 0 ? <Empty>You are all caught up.</Empty> : (
        <ul className="card divide-y divide-slate-100">
          {list.map((n) => {
            const href = n.launch_id && n.product_id ? `/launches/${n.launch_id}/products/${n.product_id}` : n.launch_id ? `/launches/${n.launch_id}` : null
            const body = (
              <>
                <span className="flex items-baseline justify-between gap-3"><span className={`text-sm ${n.is_read ? '' : 'font-semibold'}`}>{n.title}</span><span className="shrink-0 text-xs text-ink-faint">{fmtDateTime(n.created_at)}</span></span>
                {n.body && <span className="mt-0.5 block text-sm text-ink-soft">{n.body}</span>}
              </>
            )
            return <li key={n.id} className={n.is_read ? '' : 'bg-brand-tint/50'}>{href ? <Link href={href} className="block px-4 py-3 hover:bg-slate-50">{body}</Link> : <div className="px-4 py-3">{body}</div>}</li>
          })}
        </ul>
      )}
    </>
  )
}
