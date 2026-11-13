'use client'

import { useState } from 'react'
import { ActionForm } from '@/components/Form'
import { createLaunch } from '../../actions'
import { PRODUCT_KINDS } from '@/lib/types'

const CATEGORIES = ['Diagnostics', 'Monitoring', 'Therapy devices', 'Consumables', 'Wellness', 'Other']

export default function NewLaunchForm() {
  const [products, setProducts] = useState([{ name: '', kind: 'Main unit' }])
  const upd = (i: number, patch: Partial<{ name: string; kind: string }>) => setProducts((p) => p.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const today = new Date().toISOString().slice(0, 10)
  return (
    <ActionForm action={createLaunch} className="card space-y-5 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="label" htmlFor="name">Launch name</label><input id="name" name="name" required className="input" placeholder="e.g. Pulse oximeter PX200" /></div>
        <div><label className="label" htmlFor="category">Category</label><select id="category" name="category" className="input" defaultValue="Other">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div />
        <div><label className="label" htmlFor="start_date">Start date</label><input id="start_date" name="start_date" type="date" required defaultValue={today} className="input" /></div>
        <div><label className="label" htmlFor="target_date">Target launch date</label><input id="target_date" name="target_date" type="date" required className="input" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="description">What is this launch? (optional)</label><textarea id="description" name="description" rows={2} className="input" /></div>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between"><h2>Products in this launch</h2><button type="button" className="btn-ghost px-2.5 py-1.5" onClick={() => setProducts((p) => [...p, { name: '', kind: 'Accessory' }])}>Add product</button></div>
        <p className="mb-3 text-xs text-ink-soft">The main unit, its variants, accessories and parts each move through the stages on their own.</p>
        <ul className="space-y-2">
          {products.map((p, i) => (
            <li key={i} className="flex gap-2">
              <input aria-label={`Product ${i + 1} name`} className="input" placeholder="Product name" value={p.name} onChange={(e) => upd(i, { name: e.target.value })} />
              <select aria-label={`Product ${i + 1} type`} className="input max-w-44" value={p.kind} onChange={(e) => upd(i, { kind: e.target.value })}>{PRODUCT_KINDS.map((k) => <option key={k}>{k}</option>)}</select>
              <button type="button" className="btn-ghost px-3" aria-label={`Remove product ${i + 1}`} disabled={products.length === 1} onClick={() => setProducts((x) => x.filter((_, j) => j !== i))}>×</button>
            </li>
          ))}
        </ul>
        <input type="hidden" name="products" value={JSON.stringify(products.filter((p) => p.name.trim()))} />
      </div>
      <p className="text-xs text-ink-soft">The window is split across the seven stages automatically, in proportion to how long each usually takes. Managers can adjust the dates later.</p>
      <button className="btn-primary">Create launch</button>
    </ActionForm>
  )
}
