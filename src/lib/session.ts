import 'server-only'
import { cache } from 'react'
import { supabaseServer } from '@/lib/supabase/server'
import type { Profile, Stage } from '@/lib/types'

/** The signed-in user's ml_profiles row, or null when they have no access to this app. */
export const getMe = cache(async (): Promise<Profile | null> => {
  const supabase = await supabaseServer()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data } = await supabase.from('ml_profiles').select('*').eq('id', auth.user.id).eq('active', true).maybeSingle()
  return (data as Profile | null) ?? null
})

export const getStages = cache(async (): Promise<Stage[]> => {
  const supabase = await supabaseServer()
  const { data } = await supabase.from('ml_stages').select('*').order('position')
  return (data ?? []) as Stage[]
})

export const stageMap = (stages: Stage[]) => Object.fromEntries(stages.map((s) => [s.stage, s])) as Record<string, Stage>
