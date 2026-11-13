'use client'

import { useState, useTransition } from 'react'
import type { Result } from '@/app/(app)/actions'
import { Banner } from './ui'

type Action = (prev: Result | undefined, fd: FormData) => Promise<Result>

/**
 * A form bound to a server action. It keeps what the person typed when the action
 * fails (React's own action prop would reset the fields), and shows the message.
 */
export function ActionForm({ action, children, className, resetOnOk = false }: { action: Action; children: React.ReactNode; className?: string; resetOnOk?: boolean }) {
  const [state, setState] = useState<Result>()
  const [pending, start] = useTransition()
  return (
    <form
      className={className}
      aria-busy={pending}
      onSubmit={(e) => {
        e.preventDefault()
        const form = e.currentTarget
        const fd = new FormData(form, (e.nativeEvent as SubmitEvent).submitter)
        start(async () => {
          const res = await action(undefined, fd)
          setState(res)
          if (res?.ok && resetOnOk) form.reset()
        })
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {state?.error && <div className="mt-3"><Banner tone="error">{state.error}</Banner></div>}
      {state?.ok && <div className="mt-3"><Banner tone="ok">{state.ok}</Banner></div>}
    </form>
  )
}
