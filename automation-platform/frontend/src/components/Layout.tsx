import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navCls = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
  }`

export function AppShell() {
  const { signOut, user } = useAuth()
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/workspaces" className="text-lg font-semibold tracking-tight text-white">
            BrandoChat <span className="text-emerald-400">Automation</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">{user?.email}</span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

export function WorkspaceShell() {
  const { workspaceId } = useParams()
  const base = `/w/${workspaceId}`
  return (
    <div className="flex flex-1 flex-col gap-6 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-52">
        <nav className="flex flex-wrap gap-1 lg:flex-col">
          <NavLink to={base} end className={navCls}>
            Overview
          </NavLink>
          <NavLink to={`${base}/contacts`} className={navCls}>
            Contacts
          </NavLink>
          <NavLink to={`${base}/templates`} className={navCls}>
            Templates
          </NavLink>
          <NavLink to={`${base}/automations`} className={navCls}>
            Automations
          </NavLink>
          <NavLink to={`${base}/whatsapp`} className={navCls}>
            WhatsApp
          </NavLink>
          <NavLink to={`${base}/logs`} className={navCls}>
            Message log
          </NavLink>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  )
}
