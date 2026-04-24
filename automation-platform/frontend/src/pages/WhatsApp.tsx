import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import QRCode from 'react-qr-code'
import { waConnect, waDisconnect, waStatus } from '../lib/api'

export default function WhatsApp() {
  const { workspaceId } = useParams()
  const [status, setStatus] = useState<string>('unknown')
  const [qr, setQr] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const poll = useCallback(async () => {
    if (!workspaceId) return
    try {
      const s = await waStatus(workspaceId)
      setStatus(s.pairing_status)
      setQr(s.qr)
      setError(s.last_error ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Status failed')
    }
  }, [workspaceId])

  useEffect(() => {
    const t = setInterval(() => void poll(), 2500)
    void poll()
    return () => clearInterval(t)
  }, [poll])

  async function connect() {
    if (!workspaceId) return
    setBusy(true)
    setError(null)
    try {
      await waConnect(workspaceId)
      await poll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connect failed')
    } finally {
      setBusy(false)
    }
  }

  async function disconnect() {
    if (!workspaceId) return
    setBusy(true)
    try {
      await waDisconnect(workspaceId)
      setQr(undefined)
      await poll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Disconnect failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">WhatsApp session</h1>
      <p className="text-sm text-slate-400">
        Pairing runs on the Node backend (Baileys). Ensure the API server is running and <code className="text-emerald-300">OPENAI_API_KEY</code> is set for branch routing.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void connect()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Start / refresh session
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void disconnect()}
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          Disconnect
        </button>
      </div>
      <p className="text-sm text-slate-400">
        Status: <span className="font-mono text-emerald-300">{status}</span>
      </p>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {qr ? (
        <div className="rounded-xl border border-slate-800 bg-white p-4 inline-block">
          <QRCode value={qr} size={220} />
        </div>
      ) : status === 'connected' ? (
        <p className="text-emerald-400">Connected.</p>
      ) : (
        <p className="text-slate-500 text-sm">No QR yet. Click start session and scan with WhatsApp.</p>
      )}
    </div>
  )
}
