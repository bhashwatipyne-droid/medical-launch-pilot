'use client'

import { ActionForm } from '@/components/Form'
import { approve, sendBack } from '../../../../actions'

export function ApproveForm({ approvalId, label }: { approvalId: string; label: string }) {
  return (
    <ActionForm action={approve} className="space-y-2">
      <input type="hidden" name="approval_id" value={approvalId} />
      <label className="label" htmlFor={`note-${approvalId}`}>Note (optional)</label>
      <input id={`note-${approvalId}`} name="note" className="input" placeholder="Anything the team should know" />
      <button className="btn-primary">{label}</button>
    </ActionForm>
  )
}

export function SendBackForm({ productId, options, defaultStage }: { productId: string; options: string[]; defaultStage: string }) {
  return (
    <ActionForm action={sendBack} className="space-y-2">
      <input type="hidden" name="product_id" value={productId} />
      <label className="label" htmlFor="back-stage">Send back to</label>
      <select id="back-stage" name="to_stage" defaultValue={defaultStage} className="input">{options.map((o) => <option key={o}>{o}</option>)}</select>
      <label className="label" htmlFor="back-note">What needs to change</label>
      <textarea id="back-note" name="note" rows={2} required className="input" />
      <button className="btn-danger">Send back</button>
    </ActionForm>
  )
}
