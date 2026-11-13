// Creates the first CEO / admin sign-in (the Team page needs an admin to exist already).
//   npm run seed:admin -- ceo@company.com "Full Name" "a-long-password"
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
import { createClient } from '@supabase/supabase-js'

const [email, name, password] = process.argv.slice(2)
if (!email || !name || !password || password.length < 10) {
  console.error('Usage: npm run seed:admin -- <email> "<full name>" "<password, 10+ characters>"')
  process.exit(1)
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.')
  process.exit(1)
}
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const { data: created, error } = await admin.auth.admin.createUser({
  email: email.toLowerCase(),
  password,
  email_confirm: true,
  user_metadata: { full_name: name },
})
let id = created?.user?.id
if (error) {
  if (!/already|registered|exists/i.test(error.message)) {
    console.error('Could not create the sign-in:', error.message)
    process.exit(1)
  }
  // The email already has a Supabase sign-in (shared project): reuse it.
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
  id = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id
  if (!id) {
    console.error('That email exists but could not be found.')
    process.exit(1)
  }
  console.log('That email already had a sign-in; keeping its existing password.')
}
const { error: perr } = await admin
  .from('ml_profiles')
  .upsert({ id, full_name: name, email: email.toLowerCase(), role: 'admin', department: 'Administration', active: true })
if (perr) {
  console.error('Could not add the admin profile:', perr.message)
  process.exit(1)
}
console.log(`Done. ${email} can sign in as CEO / admin.`)
