import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AppShell, WorkspaceShell } from '../components/Layout'
import Login from '../pages/Login'
import Workspaces from '../pages/Workspaces'
import Contacts from '../pages/Contacts'
import Chats from '../pages/Chats'
import Templates from '../pages/Templates'
import Automations from '../pages/Automations'
import AutomationActivity from '../pages/AutomationActivity'
import AutomationBuilder from '../pages/AutomationBuilder'
import WhatsApp from '../pages/WhatsApp'
import MessageLog from '../pages/MessageLog'
import Settings from '../pages/Settings'
import AccountSettings from '../pages/AccountSettings'
import Integrations from '../pages/Integrations'

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
        <Route path="/account/settings" element={<AccountSettings />} />
        <Route path="/w/:workspaceId" element={<WorkspaceShell />}>
          <Route index element={<Chats />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="chats" element={<Chats />} />
          <Route path="templates" element={<Templates />} />
          <Route path="automations" element={<Automations />} />
          <Route path="automations/activity" element={<AutomationActivity />} />
                      <Route path="automations/new/builder" element={<AutomationBuilder />} />
                      <Route path="automations/:automationId/builder" element={<AutomationBuilder />} />
          <Route path="whatsapp" element={<WhatsApp />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="logs" element={<MessageLog />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/workspaces" replace />} />
      <Route path="*" element={<Navigate to="/workspaces" replace />} />
    </Routes>
  )
}
