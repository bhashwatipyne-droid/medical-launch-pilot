import 'server-only'
import { supabaseServer } from '@/lib/supabase/server'
import { canApprove, canEditStage } from '@/lib/perm'
import type { Approval, Launch, Product, Profile, Stage } from '@/lib/types'

export type LaunchWithProducts = Launch & { ml_products: Product[] }

export async function getLaunches(): Promise<LaunchWithProducts[]> {
  const supabase = await supabaseServer()
  const { data } = await supabase
    .from('ml_launches')
    .select('*, ml_products(*)')
    .order('created_at', { ascending: false })
    .order('position', { referencedTable: 'ml_products' })
  return (data ?? []) as LaunchWithProducts[]
}

export type PendingApproval = Approval & {
  ml_products: Pick<Product, 'id' | 'name' | 'launch_id' | 'current_stage'> & { ml_launches: Pick<Launch, 'id' | 'name' | 'code'> }
}

/** Open approvals this person is allowed to decide, oldest first. */
export async function getMyApprovals(me: Profile, stages: Stage[]): Promise<PendingApproval[]> {
  const supabase = await supabaseServer()
  const { data } = await supabase
    .from('ml_approvals')
    .select('*, ml_products(id, name, launch_id, current_stage, ml_launches(id, name, code))')
    .eq('status', 'PENDING')
    .order('requested_at')
  const byStage = Object.fromEntries(stages.map((s) => [s.stage, s]))
  return ((data ?? []) as unknown as PendingApproval[]).filter((a) => byStage[a.stage] && canApprove(me, a, byStage[a.stage]))
}

export type WorkItem = Product & { ml_launches: Pick<Launch, 'id' | 'name' | 'code'> }

/** Products sitting at a stage this person's team can edit right now. */
export async function getMyWork(me: Profile, stages: Stage[]): Promise<WorkItem[]> {
  const supabase = await supabaseServer()
  const { data } = await supabase
    .from('ml_products')
    .select('*, ml_launches!inner(id, name, code, status)')
    .neq('stage_status', 'Completed')
    .eq('ml_launches.status', 'Active')
    .order('updated_at')
  const byStage = Object.fromEntries(stages.map((s) => [s.stage, s]))
  return ((data ?? []) as unknown as WorkItem[]).filter((p) => byStage[p.current_stage] && canEditStage(me, byStage[p.current_stage], p.stage_status))
}
