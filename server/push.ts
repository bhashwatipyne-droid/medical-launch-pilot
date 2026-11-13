import 'server-only'
import { supabaseAdmin } from './supabase'

// Browser push (Firebase Cloud Messaging). After a save that created in-app
// notifications, each recipient's registered browsers get a push. Off until
// FIREBASE_SERVICE_ACCOUNT is set; in-app notifications work either way.

type Rec = Record<string, unknown> & { id: string }
export type PushData = { notification_id: string; title: string; body: string; url: string }

type Deps = {
  send: (tokens: string[], data: PushData) => Promise<string[]> // returns tokens Firebase says are dead
  remove: (tokens: string[]) => Promise<void>
  schedule: (job: () => Promise<void>) => Promise<void>
  enabled: () => boolean
}

// Send the push after the response has gone out, so a save never waits on Firebase.
// Outside a request (scripts, tests) it simply runs the job.
const defaultSchedule: Deps['schedule'] = async (job) => {
  try {
    const { after } = await import('next/server')
    after(job)
  } catch {
    await job()
  }
}

let messagingPromise: Promise<import('firebase-admin/messaging').Messaging | null> | null = null
function messaging() {
  messagingPromise ??= (async () => {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim()
    if (!raw) return null
    try {
      // Plain JSON, or the same JSON base64-encoded (easier to paste into a host's settings).
      const account = JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'))
      const { initializeApp, getApps, cert } = await import('firebase-admin/app')
      const { getMessaging } = await import('firebase-admin/messaging')
      return getMessaging(getApps()[0] ?? initializeApp({ credential: cert(account) }))
    } catch (e) {
      console.error('[push] FIREBASE_SERVICE_ACCOUNT could not be used:', (e as Error).message)
      return null
    }
  })()
  return messagingPromise
}

const DEAD = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument'])

const deps: Deps = {
  enabled: () => Boolean(process.env.FIREBASE_SERVICE_ACCOUNT),
  schedule: defaultSchedule,
  send: async (tokens, data) => {
    const m = await messaging()
    if (!m) return []
    // Data-only: public/firebase-messaging-sw.js decides how to show it.
    const res = await m.sendEachForMulticast({ tokens, data, webpush: { headers: { TTL: '86400', Urgency: 'high' } } })
    return res.responses.flatMap((r, i) => (!r.success && DEAD.has(r.error?.code ?? '') ? [tokens[i]] : []))
  },
  remove: async (tokens) => {
    // Straight delete: a token record is never edited by two requests at once.
    await supabaseAdmin().from('ml_ws_records').delete().eq('collection', 'pushTokens').in('data->>token', tokens)
  },
}

/** For tests: replace how pushes are sent. */
export function setPushDeps(overrides: Partial<Deps>) {
  Object.assign(deps, overrides)
}

// Where a click on the push goes: what the notification is about (the app routes on the URL hash).
export function pushUrl(n: Rec) {
  if (n.action_type === 'open_approvals' && n.deliverable_id) return `/#/approvals?deliverable=${encodeURIComponent(String(n.deliverable_id))}`
  if (n.project_id) return `/#/projects/${encodeURIComponent(String(n.project_id))}`
  return '/'
}

/** Pushes the notifications this request created to their recipients' browsers. Never throws. */
export async function pushNewNotifications(fresh: Rec[], tokens: Rec[]) {
  try {
    if (!fresh.length || !tokens.length || !deps.enabled()) return
    await deps.schedule(async () => {
      for (const n of fresh) {
        const mine = tokens.filter((t) => t.user_id === n.user_id).map((t) => String(t.token))
        if (!mine.length) continue
        try {
          const dead = await deps.send(mine, {
            notification_id: String(n.id),
            title: String(n.title ?? ''),
            body: String(n.message ?? ''),
            url: pushUrl(n),
          })
          if (dead.length) await deps.remove(dead)
        } catch (e) {
          console.error('[push] could not send:', (e as Error).message)
        }
      }
    })
  } catch (e) {
    console.error('[push]', (e as Error).message)
  }
}
