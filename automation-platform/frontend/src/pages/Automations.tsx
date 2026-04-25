import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { waTestAutomation } from '../lib/api'
import { supabase } from '../lib/supabase'
import { Button } from '../shared/ui/button'
import { FormError } from '../shared/ui/form-error'
import { PageHeader } from '../shared/ui/page-header'
import { TextInput } from '../shared/ui/text-input'

const DEFAULT_GRAPH = `{
  "entry": "start",
  "nodes": {
    "start": {
      "type": "send",
      "templateId": "REPLACE_WITH_TEMPLATE_UUID",
      "next": "ask"
    },
    "ask": {
      "type": "branch",
      "options": [
        { "id": "yes", "next": "thanks", "label": "Positive", "hint": "User agrees or is interested" },
        { "id": "no", "next": "bye", "label": "Negative", "hint": "User declines or opts out" }
      ]
    },
    "thanks": { "type": "send", "templateId": "REPLACE_WITH_TEMPLATE_UUID", "next": "end" },
    "bye": { "type": "send", "templateId": "REPLACE_WITH_TEMPLATE_UUID", "next": "end" },
    "end": { "type": "end" }
  }
}`

type Row = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  entry_node_id: string
  graph: unknown
  trigger_type?: string | null
}

type ContactOption = {
  id: string
  display_name: string | null
  wa_jid: string
  phone_e164: string | null
}

export default function Automations() {
  const { workspaceId } = useParams()
  const [rows, setRows] = useState<Row[]>([])
  const [name, setName] = useState('')
  const [graphText, setGraphText] = useState(DEFAULT_GRAPH)
  const [entry, setEntry] = useState('start')
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [testAutomation, setTestAutomation] = useState<Row | null>(null)
  const [contactSearch, setContactSearch] = useState('')
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [selectedContactId, setSelectedContactId] = useState('')
  const [runningTest, setRunningTest] = useState(false)

  async function load() {
    if (!workspaceId) return
    const { data, error: loadErr } = await supabase
      .from('automations')
      .select('id, name, description, is_active, entry_node_id, graph, trigger_type')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
    if (loadErr) setError(loadErr.message)
    else setRows((data as Row[]) ?? [])
  }

  useEffect(() => {
    void load()
  }, [workspaceId])

  useEffect(() => {
    if (!workspaceId || !testAutomation) return
    let cancelled = false
    const query = contactSearch.trim()
    let request = supabase
      .from('contacts')
      .select('id, display_name, wa_jid, phone_e164')
      .eq('workspace_id', workspaceId)
      .order('display_name', { ascending: true })
      .limit(25)
    if (query) {
      request = request.or(`display_name.ilike.%${query}%,wa_jid.ilike.%${query}%,phone_e164.ilike.%${query}%`)
    }
    void request.then(({ data, error: contactsErr }) => {
      if (cancelled) return
      if (contactsErr) {
        setError(contactsErr.message)
        return
      }
      const nextContacts = (data as ContactOption[]) ?? []
      setContacts(nextContacts)
      if (!selectedContactId && nextContacts[0]) setSelectedContactId(nextContacts[0].id)
    })
    return () => {
      cancelled = true
    }
  }, [contactSearch, selectedContactId, testAutomation, workspaceId])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!workspaceId) return
    setError(null)
    let graph: object
    try {
      graph = JSON.parse(graphText) as object
    } catch {
      setError('Invalid JSON graph')
      return
    }
    const { error: insErr } = await supabase.from('automations').insert({
      workspace_id: workspaceId,
      name: name.trim(),
      description: null,
      is_active: active,
      entry_node_id: entry.trim() || 'start',
      graph,
    })
    if (insErr) {
      setError(insErr.message)
      return
    }
    setName('')
    setGraphText(DEFAULT_GRAPH)
    setEntry('start')
    setActive(false)
    await load()
  }

  async function toggleActive(row: Row, on: boolean) {
    if (!workspaceId) return
    const { error: updErr } = await supabase.from('automations').update({ is_active: on }).eq('id', row.id)
    if (updErr) setError(updErr.message)
    else await load()
  }

  async function runTestAutomation(mode: 'run_now' | 'wait_for_message') {
    if (!workspaceId || !testAutomation || !selectedContactId) return
    setError(null)
    setRunningTest(true)
    try {
      const result = await waTestAutomation(workspaceId, testAutomation.id, selectedContactId, mode)
      setTestAutomation(null)
      setSelectedContactId('')
      window.location.href = `/w/${workspaceId}/automations/activity?run=${result.runId}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run automation test')
    } finally {
      setRunningTest(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
          <PageHeader
            title="Automations"
            description="Build WhatsApp flows, route replies with GPT, and monitor active workspace automations."
          />
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <p className="text-sm font-medium text-white">Automation usage</p>
          <div className="mt-4 space-y-3 text-sm text-slate-400">
            <div>
              <div className="flex justify-between">
                <span>Active flows</span>
                <span>{rows.filter((row) => row.is_active).length}/{rows.length}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-800">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${rows.length ? (rows.filter((row) => row.is_active).length / rows.length) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <FormError message={error} />

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-xl border border-slate-800 bg-slate-950/60 p-1 text-sm">
            <button className="rounded-lg bg-slate-800 px-3 py-1.5 text-white">Automations</button>
            <Link to={`/w/${workspaceId}/automations/activity`} className="rounded-lg px-3 py-1.5 text-slate-400 hover:text-white">
              Activity log
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary">Create folder</Button>
            <Link to={`/w/${workspaceId}/automations/new/builder`} className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
              New visual automation
            </Link>
            <Button type="button" variant="secondary" onClick={() => setShowCreate((value) => !value)}>
              {showCreate ? 'Close JSON form' : 'New JSON automation'}
            </Button>
          </div>
        </div>
        <TextInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search..." className="max-w-md" />
      </div>

      {showCreate ? (
      <form onSubmit={add} className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <input
          required
          placeholder="Automation name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <input
          placeholder="Entry node id"
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active (first inbound message can start this flow)
        </label>
        <textarea
          value={graphText}
          onChange={(e) => setGraphText(e.target.value)}
          rows={18}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-200"
        />
        <Button type="submit">
          Create automation
        </Button>
      </form>
      ) : null}

      {testAutomation ? (
        <section className="space-y-4 rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-4 shadow-xl shadow-emerald-950/10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Test automation: {testAutomation.name}</p>
              <p className="mt-1 text-sm text-slate-400">
                Run immediately, or arm the automation so the next message from this contact becomes the test trigger.
              </p>
            </div>
            <button type="button" onClick={() => setTestAutomation(null)} className="text-sm text-slate-400 hover:text-white">
              Close
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-300">Find contact</span>
              <TextInput
                value={contactSearch}
                onChange={(event) => setContactSearch(event.target.value)}
                placeholder="Search name, phone, or WhatsApp JID"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-300">Contact</span>
              <select
                value={selectedContactId}
                onChange={(event) => setSelectedContactId(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              >
                {contacts.length === 0 ? <option value="">No contacts found</option> : null}
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.display_name || contact.phone_e164 || contact.wa_jid} - {contact.wa_jid}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void runTestAutomation('run_now')} disabled={!selectedContactId || runningTest}>
                {runningTest ? 'Starting...' : 'Run now'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => void runTestAutomation('wait_for_message')} disabled={!selectedContactId || runningTest}>
                {runningTest ? 'Arming...' : 'Wait for next message'}
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-950/50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Created by</th>
              <th className="px-4 py-3">Last edited</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Trigger</th>
              <th className="px-4 py-3">Runs</th>
              <th className="px-4 py-3">Tasks</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.filter((row) => row.name.toLowerCase().includes(search.toLowerCase())).map((r) => (
              <tr key={r.id} className="hover:bg-slate-800/30">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{r.name}</p>
                  <p className="font-mono text-xs text-slate-500">{r.id}</p>
                </td>
                <td className="px-4 py-3 text-slate-400">Workspace owner</td>
                <td className="px-4 py-3 text-slate-400">Recently</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${r.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                    {r.is_active ? 'Active' : 'Paused'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">{r.trigger_type ?? 'message.received'}</td>
                <td className="px-4 py-3 text-slate-300">0</td>
                <td className="px-4 py-3 text-slate-300">0</td>
                <td className="px-4 py-3 text-right">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" checked={r.is_active} onChange={(e) => void toggleActive(r, e.target.checked)} />
                    Active
                  </label>
                  <Link to={`/w/${workspaceId}/automations/${r.id}/builder`} className="ml-3 text-sm text-emerald-300 hover:text-emerald-200">
                    Builder
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setTestAutomation(r)
                      setContactSearch('')
                      setSelectedContactId('')
                    }}
                    className="ml-3 text-sm text-sky-300 hover:text-sky-200"
                  >
                    Test run
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
