import { useState } from 'react'

export default function AuthForm({ mode = 'login', onSubmit }) {
  const isSignup = mode === 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = { name: name.trim(), email: email.trim(), password }
    if (!onSubmit || isSubmitting) return

    setError('')
    setIsSubmitting(true)
    try {
      await onSubmit(payload)
    } catch (submitError) {
      setError(submitError.message || 'Could not complete your request.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full px-4 py-8 sm:px-6">
      <form
        className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-3xl border border-white/50 bg-white/80 p-6 text-left shadow-2xl shadow-slate-950/20 backdrop-blur-xl sm:p-8"
        onSubmit={handleSubmit}
      >
        {isSubmitting && (
          <div className="-mx-6 -mt-6 h-1 overflow-hidden rounded-t-3xl bg-indigo-100 sm:-mx-8 sm:-mt-8" role="progressbar" aria-label="Signing in">
            <div className="h-full w-1/3 animate-pulse bg-gradient-to-r from-indigo-500 via-teal-400 to-amber-300" />
          </div>
        )}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Realtime chat</p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {isSignup ? 'Create account' : 'Welcome back'}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {isSignup ? 'Connect and start a conversation.' : 'Sign in to continue to your chats.'}
          </p>
        </div>
        {isSignup && (
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            <span>Full name</span>
            <input
              value={name}
              name='name'
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
              autoComplete="name"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          <span>Email</span>
          <input
            type="email"
            value={email}
            name= "email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          <span>Password</span>
          <input
            type="password"
            value={password}
            name ="password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
          />
        </label>

        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}

        <button
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-teal-400 to-amber-300 px-4 py-3 font-semibold text-slate-950 shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5 hover:shadow-indigo-500/30 disabled:cursor-wait disabled:opacity-70"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting && <span className="size-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" />}
          {isSubmitting ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}
        </button>
      </form>
    </div>
  )
}
