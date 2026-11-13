'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'

export type Result = { error?: string; ok?: string }

const clean = (v: FormDataEntryValue | null) => String(v ?? '').trim()

async function rpc(fn: string, args: Record<string, unknown>): Promise<{ error?: string; data?: unknown }> {
  const supabase = await supabaseServer()
  const { data, error } = await supabase.rpc(fn, args)
  if (error) {
    // The functions raise plain-language messages; anything else is a real fault.
    const known = error.code === 'P0001' || error.code === '28000'
    return { error: known ? error.message : 'Something went wrong. Please try again.' }
  }
  return { data }
}

export async function createLaunch(_p: Result | undefined, fd: FormData): Promise<Result> {
  let products: unknown
  try {
    products = JSON.parse(clean(fd.get('products')) || '[]')
  } catch {
    return { error: 'The product list could not be read. Please re-add the products.' }
  }
  const res = await rpc('ml_create_launch', {
    p_name: clean(fd.get('name')),
    p_category: clean(fd.get('category')),
    p_description: clean(fd.get('description')),
    p_start: clean(fd.get('start_date')) || null,
    p_target: clean(fd.get('target_date')) || null,
    p_products: products,
  })
  if (res.error) return { error: res.error }
  revalidatePath('/', 'layout')
  redirect(`/launches/${res.data}`)
}

export async function updateLaunch(_p: Result | undefined, fd: FormData): Promise<Result> {
  const id = clean(fd.get('id'))
  const res = await rpc('ml_update_launch', {
    p_id: id,
    p_name: clean(fd.get('name')),
    p_category: clean(fd.get('category')),
    p_description: clean(fd.get('description')),
    p_target: clean(fd.get('target_date')) || null,
    p_status: clean(fd.get('status')),
  })
  if (res.error) return { error: res.error }
  revalidatePath(`/launches/${id}`)
  return { ok: 'Launch updated.' }
}

export async function addProduct(_p: Result | undefined, fd: FormData): Promise<Result> {
  const launch = clean(fd.get('launch_id'))
  const res = await rpc('ml_add_product', { p_launch: launch, p_name: clean(fd.get('name')), p_kind: clean(fd.get('kind')) })
  if (res.error) return { error: res.error }
  revalidatePath(`/launches/${launch}`)
  return { ok: 'Product added.' }
}

export async function saveStage(_p: Result | undefined, fd: FormData): Promise<Result> {
  const product = clean(fd.get('product_id'))
  const intent = clean(fd.get('intent'))
  const patch: Record<string, string> = {}
  for (const [k, v] of fd.entries()) if (k.startsWith('f_') && typeof v === 'string') patch[k.slice(2)] = v
  if (Object.keys(patch).length) {
    const saved = await rpc('ml_save_details', { p_product: product, p_patch: patch })
    if (saved.error) return { error: saved.error }
  }
  if (intent === 'submit') {
    const sub = await rpc('ml_submit_stage', { p_product: product })
    if (sub.error) return { error: sub.error }
    revalidatePath('/', 'layout')
    return { ok: 'Submitted for approval.' }
  }
  revalidatePath(`/launches`, 'layout')
  return { ok: 'Saved.' }
}

export async function approve(_p: Result | undefined, fd: FormData): Promise<Result> {
  const res = await rpc('ml_approve', { p_approval: clean(fd.get('approval_id')), p_note: clean(fd.get('note')) })
  if (res.error) return { error: res.error }
  revalidatePath('/', 'layout')
  return { ok: 'Approved.' }
}

export async function sendBack(_p: Result | undefined, fd: FormData): Promise<Result> {
  const res = await rpc('ml_send_back', {
    p_product: clean(fd.get('product_id')),
    p_to_stage: clean(fd.get('to_stage')),
    p_note: clean(fd.get('note')),
  })
  if (res.error) return { error: res.error }
  revalidatePath('/', 'layout')
  return { ok: 'Sent back.' }
}

export async function setDates(_p: Result | undefined, fd: FormData): Promise<Result> {
  const res = await rpc('ml_set_stage_dates', {
    p_product: clean(fd.get('product_id')),
    p_stage: clean(fd.get('stage')),
    p_start: clean(fd.get('start_dt')) || null,
    p_end: clean(fd.get('end_dt')) || null,
  })
  if (res.error) return { error: res.error }
  revalidatePath('/', 'layout')
  return { ok: 'Dates saved.' }
}

export async function markAllRead() {
  const supabase = await supabaseServer()
  await supabase.from('ml_notifications').update({ is_read: true }).eq('is_read', false)
  revalidatePath('/', 'layout')
}
