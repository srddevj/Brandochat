import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { parseContactMetadataJson } from '../lib/contact-metadata'
import { useWorkspaceId } from '../shared/hooks/useWorkspaceId'
import { Button } from '../shared/ui/button'
import { FormError } from '../shared/ui/form-error'
import { FormField } from '../shared/ui/form-field'
import { PageHeader } from '../shared/ui/page-header'
import { TextInput } from '../shared/ui/text-input'

type Contact = {
  id: string
  wa_jid: string
  phone_e164: string | null
  display_name: string | null
  notes: string | null
  metadata: Record<string, unknown> | null
}

const EMPTY_METADATA_JSON = '{\n  \n}'

export default function ContactsPage() {
  const workspaceId = useWorkspaceId()
  const [rows, setRows] = useState<Contact[]>([])
  const [waJid, setWaJid] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [notes, setNotes] = useState('')
  const [metadataJson, setMetadataJson] = useState(EMPTY_METADATA_JSON)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editMetaJson, setEditMetaJson] = useState('')

  const load = useCallback(async () => {
    if (!workspaceId) return
    const { data, error: loadErr } = await supabase
      .from('contacts')
      .select('id, wa_jid, phone_e164, display_name, notes, metadata')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
    if (loadErr) {
      setError(loadErr.message)
      return
    }
    setRows((data as Contact[]) ?? [])
  }, [workspaceId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    if (!workspaceId) return
    setError(null)
    let metadata: Record<string, unknown>
    try {
      metadata = parseContactMetadataJson(metadataJson)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON')
      return
    }
    const { error: insertErr } = await supabase.from('contacts').insert({
      workspace_id: workspaceId,
      wa_jid: waJid.trim(),
      display_name: displayName.trim() || null,
      notes: notes.trim() || null,
      metadata,
    })
    if (insertErr) {
      setError(insertErr.message)
      return
    }
    setWaJid('')
    setDisplayName('')
    setNotes('')
    setMetadataJson(EMPTY_METADATA_JSON)
    await load()
  }

  function openMetadataEditor(row: Contact) {
    setEditingId(row.id)
    setEditMetaJson(JSON.stringify(row.metadata ?? {}, null, 2))
    setError(null)
  }

  async function saveMetadata(rowId: string) {
    setError(null)
    let metadata: Record<string, unknown>
    try {
      metadata = parseContactMetadataJson(editMetaJson)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON')
      return
    }
    const { error: updateErr } = await supabase.from('contacts').update({ metadata }).eq('id', rowId)
    if (updateErr) {
      setError(updateErr.message)
      return
    }
    setEditingId(null)
    await load()
  }

  if (!workspaceId) {
    return <p className="text-slate-500">Missing workspace.</p>
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Contacts"
        description="WhatsApp identities and JSON metadata used as {{contact.attr.*}} placeholders in templates."
      />
      <FormError message={error} />

      <form onSubmit={handleCreate} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <p className="text-sm text-slate-400">
          JID example: <code className="text-emerald-300">491234567890@s.whatsapp.net</code>
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="WhatsApp JID" className="sm:col-span-2">
            <TextInput required value={waJid} onChange={(e) => setWaJid(e.target.value)} placeholder="wa_jid" />
          </FormField>
          <FormField label="Display name">
            <TextInput value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-emerald-500/50 focus:ring-2"
          />
        </FormField>
        <FormField
          label="Custom attributes (JSON object)"
          hint='Templates can use e.g. {{contact.attr.plan}} for {"plan":"Pro"}.'
        >
          <textarea
            value={metadataJson}
            onChange={(e) => setMetadataJson(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-200"
          />
        </FormField>
        <Button type="submit" variant="primary">
          Add contact
        </Button>
      </form>

      <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
        {rows.length === 0 ? (
          <li className="p-4 text-sm text-slate-500">No contacts yet.</li>
        ) : (
          rows.map((row) => (
            <li key={row.id} className="p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium text-white">{row.display_name || row.wa_jid}</p>
                  <p className="font-mono text-xs text-slate-500">{row.wa_jid}</p>
                  {row.notes ? <p className="mt-1 max-w-md text-sm text-slate-400">{row.notes}</p> : null}
                  {row.metadata && Object.keys(row.metadata).length > 0 ? (
                    <pre className="mt-2 max-w-xl overflow-x-auto rounded bg-slate-950/80 p-2 font-mono text-xs text-slate-400">
                      {JSON.stringify(row.metadata, null, 2)}
                    </pre>
                  ) : null}
                </div>
                <Button type="button" variant="secondary" className="shrink-0 self-start py-1.5 text-xs" onClick={() => openMetadataEditor(row)}>
                  Edit attributes
                </Button>
              </div>
              {editingId === row.id ? (
                <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
                  <textarea
                    value={editMetaJson}
                    onChange={(e) => setEditMetaJson(e.target.value)}
                    rows={5}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-200"
                  />
                  <div className="flex gap-2">
                    <Button type="button" variant="primary" className="py-1.5 text-xs" onClick={() => void saveMetadata(row.id)}>
                      Save JSON
                    </Button>
                    <Button type="button" variant="secondary" className="py-1.5 text-xs" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
