'use client'

import { ActionForm } from '@/components/Form'
import { saveStage } from '../../../../actions'
import type { StageField } from '@/lib/types'

export default function StageForm({
  productId, fields, values, allowedKeys, shared,
}: {
  productId: string
  fields: StageField[]
  values: Record<string, string | number | null>
  allowedKeys: string[]
  shared: boolean
}) {
  const allowed = new Set(allowedKeys)
  return (
    <ActionForm action={saveStage} className="space-y-4">
      <input type="hidden" name="product_id" value={productId} />
      {shared && (
        <p className="rounded-lg bg-brand-tint px-3 py-2 text-xs text-brand-dark">
          Two teams fill this stage together. You can edit your own fields; the other team&apos;s are shown greyed out. It can be submitted once every required field is filled.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => {
          const id = `f_${f.key}`
          const enabled = allowed.has(f.key)
          const v = values[f.key] ?? ''
          const wide = f.type === 'area' || f.type === 'link'
          return (
            <div key={f.key} className={wide ? 'sm:col-span-2' : ''}>
              <label className="label" htmlFor={id}>
                {f.label}{f.required && <span className="text-rose-600"> *</span>}
                {shared && f.group && f.group !== 'Both' && <span className="ml-1 font-normal text-ink-faint">· {f.group}</span>}
              </label>
              {f.type === 'area' ? (
                <textarea id={id} name={id} rows={3} defaultValue={String(v)} disabled={!enabled} placeholder={f.placeholder} className="input" />
              ) : f.type === 'select' ? (
                <select id={id} name={id} defaultValue={String(v)} disabled={!enabled} className="input">
                  <option value="">Choose…</option>
                  {f.options?.map((o) => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  id={id} name={id} disabled={!enabled} placeholder={f.placeholder} defaultValue={String(v)} className="input"
                  type={f.type === 'date' ? 'date' : f.type === 'link' ? 'url' : 'text'}
                  inputMode={f.type === 'number' || f.type === 'money' ? 'decimal' : undefined}
                />
              )}
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <button name="intent" value="save" className="btn-ghost">Save progress</button>
        <button name="intent" value="submit" className="btn-primary">Save and submit for approval</button>
      </div>
    </ActionForm>
  )
}
