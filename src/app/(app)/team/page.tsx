import { redirect } from 'next/navigation'
import { getMe } from '@/lib/session'
import { supabaseServer } from '@/lib/supabase/server'
import { PageHead } from '@/components/ui'
import { ActionForm } from '@/components/Form'
import { DEPARTMENTS, type Profile } from '@/lib/types'
import { createMember, resetPassword, setActive } from './actions'

export default async function Team() {
  const me = (await getMe())!
  if (me.role !== 'admin') redirect('/')
  const supabase = await supabaseServer()
  const { data } = await supabase.from('ml_profiles').select('*').order('department').order('role').order('full_name')
  const people = (data ?? []) as Profile[]
  return (
    <>
      <PageHead title="Team" sub="Who can sign in, and what they can do." />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs text-ink-soft"><tr><th className="px-4 py-3 font-medium">Person</th><th className="px-4 py-3 font-medium">Team</th><th className="px-4 py-3 font-medium">Role</th><th className="px-4 py-3 font-medium" /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {people.map((p) => (
                <tr key={p.id} className={p.active ? '' : 'opacity-60'}>
                  <td className="px-4 py-3"><div className="font-medium">{p.full_name}</div><div className="text-xs text-ink-soft">{p.email}</div></td>
                  <td className="px-4 py-3">{p.department}</td>
                  <td className="px-4 py-3 capitalize">{p.role === 'admin' ? 'CEO / admin' : p.role}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-end gap-2">
                      <ActionForm action={setActive}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="active" value={String(!p.active)} />
                        <button className="btn-ghost px-2.5 py-1" disabled={p.id === me.id}>{p.active ? 'Switch off' : 'Switch on'}</button>
                      </ActionForm>
                      <details className="text-right">
                        <summary className="cursor-pointer text-xs text-brand">Reset password</summary>
                        <ActionForm action={resetPassword} className="mt-2 flex gap-2">
                          <input type="hidden" name="id" value={p.id} />
                          <input name="password" type="text" autoComplete="off" minLength={10} required placeholder="New password" className="input w-40 py-1" />
                          <button className="btn-ghost px-2.5 py-1">Set</button>
                        </ActionForm>
                      </details>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <section>
          <h2 className="mb-2">Add a person</h2>
          <ActionForm action={createMember} resetOnOk className="card space-y-3 p-4">
            <div><label className="label" htmlFor="full_name">Full name</label><input id="full_name" name="full_name" required className="input" /></div>
            <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="input" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label" htmlFor="role">Role</label><select id="role" name="role" defaultValue="member" className="input"><option value="member">Member</option><option value="manager">Manager</option><option value="admin">CEO / admin</option></select></div>
              <div><label className="label" htmlFor="department">Team</label><select id="department" name="department" defaultValue="Product" className="input">{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select></div>
            </div>
            <p className="text-xs text-ink-soft">The team is ignored for CEO / admin.</p>
            <div><label className="label" htmlFor="password">Starting password</label><input id="password" name="password" type="text" autoComplete="off" required minLength={10} className="input" placeholder="At least 10 characters" /></div>
            <button className="btn-primary">Create sign-in</button>
          </ActionForm>
        </section>
      </div>
    </>
  )
}
