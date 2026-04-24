import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, loading, signIn, signUp, configured } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-500">Loading…</div>
    )
  }
  if (!configured) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-100">
        <h1 className="text-lg font-semibold">Configure Supabase</h1>
        <p className="mt-2 text-sm text-amber-200/90">
          Add <code className="rounded bg-slate-900 px-1">VITE_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-slate-900 px-1">VITE_SUPABASE_ANON_KEY</code> to{' '}
          <code className="rounded bg-slate-900 px-1">frontend/.env</code>, then restart the dev
          server.
        </p>
      </div>
    )
  }
  if (user) return <Navigate to="/workspaces" replace />

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'signin') await signIn(email, password)
      else await signUp(email, password)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Sign in</h1>
        <p className="mt-1 text-sm text-slate-400">Use your Supabase project credentials.</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <label className="block text-sm">
          <span className="text-slate-400">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-emerald-500/50 focus:ring-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-emerald-500/50 focus:ring-2"
          />
        </label>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
        <button
          type="button"
          className="text-center text-sm text-emerald-400 hover:underline"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
