import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import QRCode from 'react-qr-code'
import {
  waConnectInstance,
  waCreateInstance,
  waDisconnectInstance,
  waInstances,
  waSyncInstance,
  waUpdateInstanceSettings,
  type WhatsAppInstance,
} from '../lib/api'
import { Button } from '../shared/ui/button'
import { FormError } from '../shared/ui/form-error'
import { PageHeader } from '../shared/ui/page-header'
import { TextInput } from '../shared/ui/text-input'

export default function WhatsApp() {
  const { workspaceId } = useParams()
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    if (!workspaceId) return
    try {
      const data = await waInstances(workspaceId)
      setInstances(data.instances)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Status failed')
    }
  }, [workspaceId])

  useEffect(() => {
    const t = setInterval(() => void load(), 2500)
    void load()
    return () => clearInterval(t)
  }, [load])

  async function createInstance(event: React.FormEvent) {
    event.preventDefault()
    if (!workspaceId) return
    setCreating(true)
    setError(null)
    try {
      await waCreateInstance(workspaceId, newName)
      setNewName('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setCreating(false)
    }
  }

  async function connect(instanceId: string) {
    if (!workspaceId) return
    setBusyId(instanceId)
    try {
      await waConnectInstance(workspaceId, instanceId)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connect failed')
    } finally {
      setBusyId(null)
    }
  }

  async function disconnect(instanceId: string) {
    if (!workspaceId) return
    setBusyId(instanceId)
    try {
      await waDisconnectInstance(workspaceId, instanceId)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Disconnect failed')
    } finally {
      setBusyId(null)
    }
  }

  async function sync(instanceId: string) {
    if (!workspaceId) return
    setBusyId(instanceId)
    setError(null)
    try {
      await waSyncInstance(workspaceId, instanceId)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp numbers"
        description="Connect one or more WhatsApp Web sessions to this workspace. Chats and contacts auto-sync after connection; use manual sync as a retry."
      />
      <FormError message={error} />

      <form onSubmit={createInstance} className="flex max-w-xl gap-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
        <TextInput
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="New number label, e.g. Sales WhatsApp"
        />
        <Button type="submit" disabled={creating}>
          {creating ? 'Adding…' : 'Add number'}
        </Button>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        {instances.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40">
            No WhatsApp numbers yet. Add one above.
          </div>
        ) : (
          instances.map((instance) => (
            <article key={instance.id} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-medium text-slate-900 dark:text-white">
                    {instance.display_name || 'WhatsApp number'}{' '}
                    {instance.is_default ? <span className="text-xs text-cyan-600 dark:text-cyan-300">(default)</span> : null}
                  </h2>
                  <p className="font-mono text-xs text-slate-500">{instance.phone_label || instance.id}</p>
                </div>
                <span className="rounded-full border border-slate-300 px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:text-slate-300">
                  {instance.pairing_status}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={busyId === instance.id}
                  onClick={() => void connect(instance.id)}
                >
                  Start / refresh
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busyId === instance.id}
                  onClick={() => void disconnect(instance.id)}
                >
                  Disconnect
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busyId === instance.id || instance.pairing_status !== 'connected'}
                  onClick={() => void sync(instance.id)}
                >
                  Retry chat sync
                </Button>
              </div>

              {instance.last_error ? <p className="text-sm text-red-400">{instance.last_error}</p> : null}

              <SyncActivity instance={instance} />
              <ConnectionSettings
                instance={instance}
                workspaceId={workspaceId}
                onSaved={() => void load()}
                onError={(message) => setError(message)}
              />

              {instance.qr ? (
                <div className="inline-block rounded-xl border border-slate-800 bg-white p-4">
                  <QRCode value={instance.qr} size={220} />
                </div>
              ) : instance.pairing_status === 'connected' ? (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">Connected.</p>
              ) : (
                <p className="text-sm text-slate-500">No QR yet. Click start and scan with WhatsApp.</p>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  )
}

function SyncActivity({ instance }: { instance: WhatsAppInstance }) {
  const sync = instance.sync
  if (!sync) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/40">
        No live sync telemetry yet. Click Start / refresh to attach the backend socket.
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-900 dark:text-white">Sync activity</p>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            sync.state === 'syncing'
              ? 'bg-sky-500/15 text-sky-300'
              : sync.state === 'error'
                ? 'bg-red-500/15 text-red-300'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {sync.state}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Metric label="Chats" value={sync.chats} />
        <Metric label="Contacts" value={sync.contacts} />
        <Metric label="Messages" value={sync.messages} />
      </div>

      {typeof sync.progress === 'number' ? (
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>Baileys progress</span>
            <span>{Math.round(sync.progress)}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="h-2 rounded-full bg-cyan-500" style={{ width: `${Math.max(0, Math.min(sync.progress, 100))}%` }} />
          </div>
        </div>
      ) : null}

      {sync.lastBatch ? (
        <p className="text-xs text-slate-400">
          Last batch: {sync.lastBatch.chats} chats, {sync.lastBatch.contacts} contacts, {sync.lastBatch.messages} messages
          {sync.lastBatch.isLatest ? ' (latest)' : ''}.
        </p>
      ) : null}

      <div className="space-y-1 text-xs text-slate-500">
        {sync.startedAt ? <p>Started: {new Date(sync.startedAt).toLocaleString()}</p> : null}
        {sync.lastBatchAt ? <p>Last batch: {new Date(sync.lastBatchAt).toLocaleString()}</p> : null}
        {sync.lastFinishedAt ? <p>Finished: {new Date(sync.lastFinishedAt).toLocaleString()}</p> : null}
        {sync.syncType != null ? <p>Baileys sync type: {sync.syncType}</p> : null}
      </div>

      {sync.lastError ? <p className="text-xs text-red-300">{sync.lastError}</p> : null}
    </div>
  )
}

function ConnectionSettings({
  instance,
  workspaceId,
  onSaved,
  onError,
}: {
  instance: WhatsAppInstance
  workspaceId?: string
  onSaved: () => void
  onError: (message: string) => void
}) {
  const [alwaysSyncHistory, setAlwaysSyncHistory] = useState(instance.settings?.always_sync_history !== false)
  const [skipPhoneNotifications, setSkipPhoneNotifications] = useState(instance.settings?.skip_phone_notifications === true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setAlwaysSyncHistory(instance.settings?.always_sync_history !== false)
    setSkipPhoneNotifications(instance.settings?.skip_phone_notifications === true)
  }, [instance.id, instance.settings?.always_sync_history, instance.settings?.skip_phone_notifications])

  async function saveSettings() {
    if (!workspaceId) return
    setSaving(true)
    try {
      await waUpdateInstanceSettings(workspaceId, instance.id, {
        always_sync_history: alwaysSyncHistory,
        skip_phone_notifications: skipPhoneNotifications,
      })
      onSaved()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
      <p className="text-sm font-medium text-slate-900 dark:text-white">Connection settings</p>
      <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" checked={alwaysSyncHistory} onChange={(event) => setAlwaysSyncHistory(event.target.checked)} />
        <span>
          <span className="block">Always sync message history</span>
          <span className="text-xs text-slate-500">Keeps history sync active on connect so new/older chats are fetched.</span>
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" checked={skipPhoneNotifications} onChange={(event) => setSkipPhoneNotifications(event.target.checked)} />
        <span>
          <span className="block">Skip phone notifications while connected</span>
          <span className="text-xs text-slate-500">
            Marks this WhatsApp as online on desktop/web session. This can reduce push notifications on the mobile phone.
          </span>
        </span>
      </label>
      <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" disabled={saving} onClick={() => void saveSettings()}>
        {saving ? 'Saving…' : 'Save connection settings'}
      </Button>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white p-2 border border-slate-200 dark:border-0 dark:bg-slate-900/70">
      <p className="text-base font-semibold text-slate-900 dark:text-white">{value}</p>
      <p className="text-slate-500">{label}</p>
    </div>
  )
}
