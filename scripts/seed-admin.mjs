// Adds (or re-activates) a CEO / admin who can sign in. Use it for the first
// admin; after that, admins add people from the Team page.
//   npm run seed:admin -- ceo@company.com "Full Name" "a-long-password"
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
import { createClient } from '@supabase/supabase-js'

const [emailIn, name, password] = process.argv.slice(2)
if (!emailIn || !name || !password || password.length < 8) {
  console.error('Usage: npm run seed:admin -- <email> "<full name>" "<password, 8+ characters>"')
  process.exit(1)
}
const email = emailIn.toLowerCase()
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

let id
const created = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } })
if (created.data?.user) id = created.data.user.id
else {
  // Already has a sign-in in this Supabase project: reuse it, keep its password.
  const { data } = await sb.auth.admin.listUsers({ perPage: 1000 })
  id = data?.users.find((u) => u.email?.toLowerCase() === email)?.id
  if (!id) throw new Error(created.error?.message || 'Could not create the sign-in')
  console.log('That email already had a sign-in; its password was not changed.')
}

for (let i = 0; i < 5; i++) {
  const { data: meta } = await sb.from('ml_ws_meta').select('version').eq('id', 1).single()
  const record = { id, name, email, username: email.split('@')[0], role: 'admin', department: 'Administration', active: true, removed: false }
  const { data: v, error } = await sb.rpc('ml_ws_commit', {
    p_version: meta.version, p_counters: null, p_upserts: [{ c: 'users', id, data: record }], p_deletes: [],
  })
  if (error) throw new Error(error.message)
  if (v !== null) {
    console.log(`Done. ${email} can sign in as CEO / admin.`)
    process.exit(0)
  }
}
throw new Error('Busy, try again')
