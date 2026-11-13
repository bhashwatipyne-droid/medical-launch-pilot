'use server'

import { revalidatePath } from 'next/cache'
import { getMe } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { DEPARTMENTS } from '@/lib/types'
import type { Result } from '../actions'

const clean = (v: FormDataEntryValue | null) => String(v ?? '').trim()

async function requireAdmin() {
  const me = await getMe()
  if (!me || me.role !== 'admin') throw new Error('Only the CEO or an admin can manage the team')
  return me
}

export async function createMember(_p: Result | undefined, fd: FormData): Promise<Result> {
  try {
    await requireAdmin()
  } catch (e) {
    return { error: (e as Error).message }
  }
  const email = clean(fd.get('email')).toLowerCase()
  const name = clean(fd.get('full_name'))
  const role = clean(fd.get('role'))
  const dept = role === 'admin' ? 'Administration' : clean(fd.get('department'))
  const password = String(fd.get('password') ?? '')
  if (!name) return { error: 'Enter their name.' }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Enter a valid email.' }
  if (!['admin', 'manager', 'member'].includes(role)) return { error: 'Choose a role.' }
  if (role !== 'admin' && !(DEPARTMENTS as readonly string[]).includes(dept)) return { error: 'Choose a department.' }
  if (password.length < 10) return { error: 'The password must be at least 10 characters.' }

  let admin
  try {
    admin = supabaseAdmin()
  } catch {
    return { error: 'The server is missing SUPABASE_SERVICE_ROLE_KEY, so sign-ins cannot be created here yet.' }
  }
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } })
  if (created.error || !created.data.user) {
    return { error: /already|registered|exists/i.test(created.error?.message ?? '') ? 'That email already has a sign-in. Use a different email.' : 'Could not create the sign-in.' }
  }
  const { error } = await admin.from('ml_profiles').insert({ id: created.data.user.id, full_name: name, email, role, department: dept })
  if (error) {
    await admin.auth.admin.deleteUser(created.data.user.id)
    return { error: 'Could not add the person to the tracker.' }
  }
  revalidatePath('/team')
  return { ok: `${name} can now sign in.` }
}

export async function setActive(_p: Result | undefined, fd: FormData): Promise<Result> {
  const me = await requireAdmin().catch(() => null)
  if (!me) return { error: 'Only the CEO or an admin can manage the team' }
  const id = clean(fd.get('id'))
  const active = clean(fd.get('active')) === 'true'
  if (id === me.id && !active) return { error: 'You cannot switch off your own account.' }
  const admin = supabaseAdmin()
  const { error } = await admin.from('ml_profiles').update({ active }).eq('id', id)
  if (error) return { error: 'Could not update the account.' }
  revalidatePath('/team')
  return { ok: active ? 'Account switched on.' : 'Account switched off.' }
}

export async function resetPassword(_p: Result | undefined, fd: FormData): Promise<Result> {
  const me = await requireAdmin().catch(() => null)
  if (!me) return { error: 'Only the CEO or an admin can manage the team' }
  const password = String(fd.get('password') ?? '')
  if (password.length < 10) return { error: 'The password must be at least 10 characters.' }
  const admin = supabaseAdmin()
  const { error } = await admin.auth.admin.updateUserById(clean(fd.get('id')), { password })
  if (error) return { error: 'Could not reset the password.' }
  return { ok: 'Password changed. Share it with them privately.' }
}
