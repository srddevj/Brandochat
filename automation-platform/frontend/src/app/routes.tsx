import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AppShell, WorkspaceShell } from '../components/Layout'
import Login from '../pages/Login'
import Workspaces from '../pages/Workspaces'
import WorkspaceHome from '../pages/WorkspaceHome'
import Contacts from '../pages/Contacts'
import Templates from '../pages/Templates'
import Automations from '../pages/Automations'
import WhatsApp from '../pages/WhatsApp'
import MessageLog from '../pages/MessageLog'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, configured } = useAuth()
  if (!configured) {
    return <>{children}</>
  }
  if (loading) {
    return <div className="p-8 text-slate-500">Loading…</div>
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/workspaces" element={<Workspaces />} />
        <Route path="/w/:workspaceId" element={<WorkspaceShell />}>
          <Route index element={<WorkspaceHome />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="templates" element={<Templates />} />
          <Route path="automations" element={<Automations />} />
          <Route path="whatsapp" element={<WhatsApp />} />
          <Route path="logs" element={<MessageLog />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/workspaces" replace />} />
      <Route path="*" element={<Navigate to="/workspaces" replace />} />
    </Routes>
  )
}
