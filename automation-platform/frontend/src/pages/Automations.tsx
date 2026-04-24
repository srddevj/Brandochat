import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

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
}

export default function Automations() {
  const { workspaceId } = useParams()
  const [rows, setRows] = useState<Row[]>([])
  const [name, setName] = useState('')
  const [graphText, setGraphText] = useState(DEFAULT_GRAPH)
  const [entry, setEntry] = useState('start')
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!workspaceId) return
    const { data, error: loadErr } = await supabase
      .from('automations')
      .select('id, name, description, is_active, entry_node_id, graph')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
    if (loadErr) setError(loadErr.message)
    else setRows((data as Row[]) ?? [])
  }

  useEffect(() => {
    void load()
  }, [workspaceId])

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Automations</h1>
      <p className="text-sm text-slate-400">
        Graph JSON: <code className="text-emerald-300">send</code> nodes need <code className="text-emerald-300">templateId</code>{' '}
        and <code className="text-emerald-300">next</code>. <code className="text-emerald-300">branch</code> nodes list GPT options with{' '}
        <code className="text-emerald-300">id</code>, <code className="text-emerald-300">next</code>, <code className="text-emerald-300">label</code>,{' '}
        <code className="text-emerald-300">hint</code>. Only one automation should be <code className="text-emerald-300">is_active</code> per workspace for inbound routing.
      </p>

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
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
          Create automation
        </button>
      </form>

      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-white">{r.name}</p>
              <p className="font-mono text-xs text-slate-500">{r.id}</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={r.is_active}
                onChange={(e) => void toggleActive(r, e.target.checked)}
              />
              Active
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
