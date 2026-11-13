import 'server-only'
import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'
import { handleDemoRequest, HttpError, setDemoProvider } from '@/demo/server'
import { supabaseAdmin } from './supabase'

// The prototype keeps its data as named lists. These are stored one record per row.
export const COLLECTIONS = [
  'users', 'clients', 'projects', 'deliverables', 'workItems', 'approvalItems', 'approvalWorkflows',
  'approvalHistory', 'capacities', 'targets', 'projectTasks', 'projectTaskUpdates', 'notifications',
] as const

type Rec = Record<string, unknown> & { id: string }
export type Workspace = Record<string, Rec[]> & { counters: Record<string, number> }
type Ctx = { db: Workspace; userId: string }

const als = new AsyncLocalStorage<Ctx>()
setDemoProvider({
  db: () => als.getStore()!.db,
  actingUser: () => {
    const ctx = als.getStore()!
    return ctx.db.users.find((u) => u.id === ctx.userId)
  },
  uid: () => randomUUID().replace(/-/g, '').slice(0, 12),
})

export class Conflict extends Error {}

export async function loadWorkspace(): Promise<{ db: Workspace; version: number }> {
  const sb = supabaseAdmin()
  const [{ data: meta, error: e1 }, rows] = await Promise.all([
    sb.from('ml_ws_meta').select('version, counters').eq('id', 1).single(),
    fetchAllRecords(),
  ])
  if (e1 || !meta) throw new Error('Workspace is not set up: ' + (e1?.message ?? 'no meta row'))
  const db = Object.fromEntries(COLLECTIONS.map((c) => [c, [] as Rec[]])) as unknown as Workspace
  for (const r of rows) (db[r.collection] ??= []).push(r.data as Rec)
  // Newest first where the prototype expects it (it unshifts notifications).
  db.notifications.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  db.counters = (meta.counters as Record<string, number>) ?? {}
  return { db, version: Number(meta.version) }
}

async function fetchAllRecords() {
  const sb = supabaseAdmin()
  const out: { collection: string; data: unknown }[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('ml_ws_records').select('collection, data').order('collection').order('id').range(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) return out
  }
}

const snapshot = (db: Workspace) =>
  Object.fromEntries(COLLECTIONS.map((c) => [c, new Map((db[c] ?? []).map((r) => [String(r.id), JSON.stringify(r)]))]))

export async function commit(before: ReturnType<typeof snapshot>, db: Workspace, version: number, countersBefore: string) {
  const upserts: { c: string; id: string; data: unknown }[] = []
  const deletes: { c: string; id: string }[] = []
  for (const c of COLLECTIONS) {
    const prev = before[c]
    const seen = new Set<string>()
    for (const r of db[c] ?? []) {
      const id = String(r.id)
      seen.add(id)
      const json = JSON.stringify(r)
      if (prev.get(id) !== json) upserts.push({ c, id, data: JSON.parse(json) })
    }
    for (const id of prev.keys()) if (!seen.has(id)) deletes.push({ c, id })
  }
  const countersNow = JSON.stringify(db.counters ?? {})
  if (!upserts.length && !deletes.length && countersNow === countersBefore) return
  const { data, error } = await supabaseAdmin().rpc('ml_ws_commit', {
    p_version: version, p_counters: JSON.parse(countersNow), p_upserts: upserts, p_deletes: deletes,
  })
  if (error) throw new Error(error.message)
  if (data === null) throw new Conflict()
}

export type ApiRequest = { method: string; path: string; query: Record<string, unknown>; body: Record<string, unknown> }

/**
 * Answers one API call with the prototype's own route logic, acting as `userId`,
 * against the stored workspace; saves what changed. Retries if someone else saved first.
 */
export async function runAsUser(userId: string, req: ApiRequest, before?: (db: Workspace) => void) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { db, version } = await loadWorkspace()
    const snap = snapshot(db)
    const counters = JSON.stringify(db.counters ?? {})
    if (before) before(db)
    if (!db.users.some((u) => u.id === userId && u.active !== false && !u.removed)) throw new HttpError(401, 'Your account is not set up for the launch tracker')
    const result = await als.run({ db, userId }, async () => handleDemoRequest(req))
    try {
      await commit(snap, db, version, counters)
      return result === undefined ? {} : JSON.parse(JSON.stringify(result))
    } catch (e) {
      if (e instanceof Conflict) {
        await new Promise((r) => setTimeout(r, 40 + Math.random() * 120))
        continue
      }
      throw e
    }
  }
  throw new HttpError(503, 'The server is busy. Please try again.')
}

/** Reads the workspace without the prototype's routes (sign-in lookups). */
export async function findUser(pred: (u: Rec) => boolean) {
  const { db } = await loadWorkspace()
  return db.users.find(pred) ?? null
}
