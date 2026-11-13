'use client'

import { ActionForm } from '@/components/Form'
import { setDates } from '../../../../actions'

export default function DatesForm({ productId, stage, start, end }: { productId: string; stage: string; start: string; end: string }) {
  return (
    <ActionForm action={setDates} className="flex items-center gap-2">
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="stage" value={stage} />
      <input aria-label={`${stage} start`} name="start_dt" type="date" defaultValue={start} className="input w-36 py-1" />
      <input aria-label={`${stage} end`} name="end_dt" type="date" defaultValue={end} className="input w-36 py-1" />
      <button className="btn-ghost px-2.5 py-1">Save</button>
    </ActionForm>
  )
}
