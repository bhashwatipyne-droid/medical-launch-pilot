import { NextResponse, type NextRequest } from 'next/server'
import { HttpError } from '@/demo/server'
import { supabaseAdmin, supabaseSession } from '../../../server/supabase'
import { findUser, runAsUser, type ApiRequest, type Workspace } from '../../../server/workspace'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Json = Record<string, unknown>
const publicUser = (u: Json) => {
  const { password_hash: _drop, ...rest } = u
  return rest
}
const fail = (status: number, detail: string) => NextResponse.json({ detail }, { status })

async function readBody(req: NextRequest): Promise<Json> {
  if (req.method === 'GET' || req.method === 'HEAD') return {}
  try {
    const text = await req.text()
    return text ? (JSON.parse(text) as Json) : {}
  } catch {
    return {}
  }
}

function readQuery(req: NextRequest): Json {
  const out: Json = {}
  req.nextUrl.searchParams.forEach((v, k) => {
    out[k] = out[k] === undefined ? v : ([] as unknown[]).concat(out[k], v)
  })
  return out
}

/** The signed-in Supabase user: session cookie first, then the Bearer token the app keeps as a fallback. */
async function whoIsAsking(req: NextRequest): Promise<string | null> {
  const session = await supabaseSession()
  const { data } = await session.auth.getUser()
  if (data.user) return data.user.id
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return null
  const { data: viaToken } = await supabaseAdmin().auth.getUser(token)
  return viaToken.user?.id ?? null
}

const isActive = (u: Json | null) => !!u && u.active !== false && !u.removed

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params
  const path = '/' + parts.join('/')
  const method = req.method.toUpperCase()
  const body = await readBody(req)
  const query = readQuery(req)

  try {
    // ---------------------------------------------------------- sign-in
    if (method === 'POST' && path === '/auth/login') {
      const login = String(body.login ?? '').trim().toLowerCase()
      const password = String(body.password ?? '')
      if (!login || !password) return fail(400, 'Enter your email and password')
      const person = login.includes('@') ? null : await findUser((u) => String(u.username ?? '').toLowerCase() === login)
      const email = login.includes('@') ? login : String(person?.email ?? '')
      if (!email) return fail(401, 'Incorrect email or password')
      const session = await supabaseSession()
      const { data, error } = await session.auth.signInWithPassword({ email, password })
      if (error || !data.user || !data.session) return fail(401, 'Incorrect email or password')
      const me = await findUser((u) => u.id === data.user!.id)
      if (!isActive(me)) {
        await session.auth.signOut()
        return fail(403, 'Your account is not set up for the launch tracker. Ask your admin.')
      }
      return NextResponse.json({ ...publicUser(me!), access_token: data.session.access_token })
    }
    if (method === 'POST' && path === '/auth/logout') {
      const session = await supabaseSession()
      await session.auth.signOut()
      return NextResponse.json({ message: 'Logged out' })
    }
    if (method === 'POST' && (path === '/auth/forgot-password' || path === '/auth/reset-password')) {
      return NextResponse.json({ message: 'Ask your admin to set a new password for you from the Team page.' })
    }

    const userId = await whoIsAsking(req)
    if (!userId) return fail(401, 'Not signed in')

    // ---------------------------------------------------------- own password
    if (method === 'PATCH' && path === '/auth/profile' && body.new_password) {
      const me = await findUser((u) => u.id === userId)
      if (!isActive(me)) return fail(401, 'Not signed in')
      const newPassword = String(body.new_password)
      if (newPassword.length < 8) return fail(400, 'New password must be at least 8 characters.')
      const session = await supabaseSession()
      const check = await session.auth.signInWithPassword({ email: String(me!.email), password: String(body.current_password ?? '') })
      if (check.error) return fail(400, 'Your current password is not correct.')
      const { error } = await supabaseAdmin().auth.admin.updateUserById(userId, { password: newPassword })
      if (error) return fail(400, 'Could not change the password.')
      return NextResponse.json(publicUser(me!))
    }

    // ---------------------------------------------------------- team (sign-ins live in Supabase Auth)
    if (method === 'POST' && path === '/users') {
      const me = await findUser((u) => u.id === userId)
      if (me?.role !== 'admin') return fail(403, 'Only an admin can do this')
      const email = String(body.email ?? '').trim().toLowerCase()
      const password = String(body.password ?? '')
      const name = String(body.name ?? '').trim()
      if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(400, 'Enter a name and a valid email')
      if (password.length < 8) return fail(400, 'The temporary password must be at least 8 characters')
      const created = await supabaseAdmin().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } })
      if (created.error || !created.data.user) {
        const taken = /already|registered|exists/i.test(created.error?.message ?? '')
        return fail(400, taken ? 'That email already has a sign-in' : 'Could not create the sign-in')
      }
      const newId = created.data.user.id
      const record = {
        id: newId, name, email, username: String(body.username ?? email.split('@')[0]).trim().toLowerCase(),
        role: String(body.role ?? 'member'), department: String(body.department ?? ''), active: true, removed: false,
      }
      try {
        await runAsUser(userId, { method: 'GET', path: '/auth/me', query: {}, body: {} }, (db: Workspace) => {
          db.users.push(record)
        })
      } catch (e) {
        await supabaseAdmin().auth.admin.deleteUser(newId)
        throw e
      }
      return NextResponse.json(record)
    }
    const userMatch = path.match(/^\/users\/([^/]+)$/)
    if (userMatch && (method === 'PATCH' || method === 'DELETE')) {
      const me = await findUser((u) => u.id === userId)
      if (me?.role !== 'admin') return fail(403, 'Only an admin can do this')
      const target = userMatch[1]
      if (method === 'DELETE' && target === userId) return fail(400, 'You cannot remove your own account')
      if (method === 'PATCH') {
        const changes: { password?: string; email?: string } = {}
        if (body.password) {
          if (String(body.password).length < 8) return fail(400, 'The password must be at least 8 characters')
          changes.password = String(body.password)
        }
        if (body.email) changes.email = String(body.email).trim().toLowerCase()
        if (changes.password || changes.email) {
          const { error } = await supabaseAdmin().auth.admin.updateUserById(target, { ...changes, email_confirm: true })
          if (error) return fail(400, 'Could not update the sign-in')
        }
      }
      // falls through: the prototype's route updates the person's record
    }

    // ---------------------------------------------------------- everything else: the prototype's routes
    const result = await runAsUser(userId, { method, path, query, body } as ApiRequest)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof HttpError) return fail(err.status, err.detail)
    console.error('[api]', method, path, err)
    return fail(500, 'Something went wrong. Please try again.')
  }
}

export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE }
