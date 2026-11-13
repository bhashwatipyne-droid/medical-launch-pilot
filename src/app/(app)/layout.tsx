import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getMe } from '@/lib/session'
import { supabaseServer } from '@/lib/supabase/server'
import { signOut } from '@/app/login/actions'
import { isAdmin } from '@/lib/perm'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe()
  if (!me) {
    // Signed in to Supabase but not set up for this app (or deactivated).
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="card max-w-md space-y-3 p-6">
          <h1>No access yet</h1>
          <p className="text-sm text-ink-soft">
            You are signed in, but your account has not been added to the launch tracker, or it was switched off. Ask the CEO or an admin to add you.
          </p>
          <form action={signOut}><button className="btn-ghost">Sign out</button></form>
        </div>
      </main>
    )
  }
  const supabase = await supabaseServer()
  const { count } = await supabase.from('ml_notifications').select('id', { count: 'exact', head: true }).eq('is_read', false)

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/launches', label: 'Launches' },
    { href: '/my-work', label: 'My work' },
    { href: '/approvals', label: 'Approvals' },
    ...(isAdmin(me) ? [{ href: '/team', label: 'Team' }] : []),
  ]
  if (!me.active) redirect('/login')

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="text-sm font-semibold tracking-tight text-brand">Launch Tracker</Link>
          <nav className="flex flex-wrap gap-1 text-sm" aria-label="Main">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-md px-2.5 py-1.5 text-ink-soft hover:bg-slate-100 hover:text-ink">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link href="/notifications" className="relative rounded-md px-2.5 py-1.5 text-ink-soft hover:bg-slate-100 hover:text-ink">
              Notifications
              {!!count && <span className="ml-1.5 rounded-full bg-rose-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">{count}</span>}
            </Link>
            <span className="hidden text-ink-soft sm:inline">{me.full_name} · {me.role === 'admin' ? 'CEO / Admin' : `${me.department} ${me.role}`}</span>
            <form action={signOut}><button className="btn-ghost px-2.5 py-1.5">Sign out</button></form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
