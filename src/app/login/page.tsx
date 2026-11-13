'use client'

import { useActionState } from 'react'
import { signIn } from './actions'

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, undefined)
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form action={action} className="card w-full max-w-sm space-y-4 p-6">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand">Launch Tracker</div>
          <h1>Sign in</h1>
          <p className="mt-1 text-sm text-ink-soft">Use the email and password your admin set up for you.</p>
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="username" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
        </div>
        {state?.error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>}
        <button className="btn-primary w-full" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  )
}
