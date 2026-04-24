import { supabase } from './supabase'

const base = '/api'

async function authHeader(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not signed in')
  return { Authorization: `Bearer ${token}` }
}

export async function waConnect(workspaceId: string) {
  const h = await authHeader()
  const res = await fetch(`${base}/wa/${workspaceId}/connect`, {
    method: 'POST',
    headers: { ...h, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ ok: boolean }>
}

export async function waStatus(workspaceId: string) {
  const h = await authHeader()
  const res = await fetch(`${base}/wa/${workspaceId}/status`, { headers: h })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{
    pairing_status: string
    qr?: string
    phone_label?: string | null
    last_error?: string | null
  }>
}

export async function waDisconnect(workspaceId: string) {
  const h = await authHeader()
  const res = await fetch(`${base}/wa/${workspaceId}/disconnect`, {
    method: 'POST',
    headers: h,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ ok: boolean }>
}
