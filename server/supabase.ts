import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const url = () => {
  const v = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!v) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  return v
}
const anonKey = () => {
  const v = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!v) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')
  return v
}

let admin: SupabaseClient | null = null
/** Secret-key client: server only. Reads and writes the workspace, manages sign-ins. */
export function supabaseAdmin(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  if (!admin) admin = createClient(url(), key, { auth: { persistSession: false, autoRefreshToken: false } })
  return admin
}

/** Session client: signs people in and out using this site's cookies. */
export async function supabaseSession() {
  const store = await cookies()
  return createServerClient(url(), anonKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => store.set(name, value, options)),
    },
  })
}
