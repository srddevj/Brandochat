import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Row = { id: string; name: string; body: string }

export default function Templates() {
  const { workspaceId } = useParams()
  const [rows, setRows] = useState<Row[]>([])
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!workspaceId) return
    const { data, error: loadErr } = await supabase
      .from('message_templates')
      .select('id, name, body')
      .eq('workspace_id', workspaceId)
      .order('name')
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
    const { error: insErr } = await supabase.from('message_templates').insert({
      workspace_id: workspaceId,
      name: name.trim(),
      body,
    })
    if (insErr) {
      setError(insErr.message)
      return
    }
    setName('')
    setBody('')
    await load()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Message templates</h1>
      <p className="text-sm text-slate-400">
        Placeholders: flow variables <code className="text-emerald-300">{'{{name}}'}</code> from automation
        state, plus contact fields{' '}
        <code className="text-emerald-300">{'{{contact.display_name}}'}</code>,{' '}
        <code className="text-emerald-300">{'{{contact.phone_e164}}'}</code>,{' '}
        <code className="text-emerald-300">{'{{contact.wa_jid}}'}</code>,{' '}
        <code className="text-emerald-300">{'{{contact.notes}}'}</code>, and{' '}
        <code className="text-emerald-300">{'{{contact.attr.plan}}'}</code> for each key in contact metadata
        JSON.
      </p>
      <form onSubmit={add} className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <input
          required
          placeholder="Template name (unique in workspace)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <textarea
          required
          placeholder="Message body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
          Save template
        </button>
      </form>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <h2 className="font-medium text-emerald-300">{r.name}</h2>
            <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{r.body}</pre>
          </li>
        ))}
      </ul>
    </div>
  )
}
