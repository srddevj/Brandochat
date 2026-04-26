import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Row = { id: string; name: string; body: string }
type PlaceholderOption = { value: string; label: string; group: string }

const BASE_PLACEHOLDERS: PlaceholderOption[] = [
  { value: 'contact.display_name', label: 'Display name', group: 'Contact' },
  { value: 'contact.first_name', label: 'First name', group: 'Contact' },
  { value: 'contact.last_name', label: 'Last name', group: 'Contact' },
  { value: 'contact.phone_e164', label: 'Phone number', group: 'Contact' },
  { value: 'contact.wa_jid', label: 'WhatsApp JID', group: 'Contact' },
  { value: 'contact.gender', label: 'Gender', group: 'Contact' },
  { value: 'contact.birthday', label: 'Birthday', group: 'Contact' },
  { value: 'contact.notes', label: 'Notes', group: 'Contact' },
  { value: 'latestReply', label: 'Latest reply', group: 'Automation' },
  { value: 'chosenRouteLabel', label: 'AI route label', group: 'Automation' },
  { value: 'skillReply', label: 'AI skill output', group: 'Automation' },
]

const CALENDLY_PLACEHOLDERS: PlaceholderOption[] = [
  { value: 'calendlyEvent', label: 'Event name', group: 'Calendly' },
  { value: 'inviteeName', label: 'Invitee name', group: 'Calendly' },
  { value: 'inviteeEmail', label: 'Invitee email', group: 'Calendly' },
  { value: 'inviteePhone', label: 'Invitee phone', group: 'Calendly' },
  { value: 'inviteeStatus', label: 'Invitee status', group: 'Calendly' },
  { value: 'inviteeRescheduleUrl', label: 'Reschedule URL', group: 'Calendly' },
  { value: 'inviteeCancelUrl', label: 'Cancel URL', group: 'Calendly' },
  { value: 'schedulingMethod', label: 'Scheduling method', group: 'Calendly' },
  { value: 'meetingName', label: 'Meeting name', group: 'Calendly' },
  { value: 'meetingStart', label: 'Meeting start', group: 'Calendly' },
  { value: 'meetingEnd', label: 'Meeting end', group: 'Calendly' },
  { value: 'meetingJoinUrl', label: 'Meeting join URL', group: 'Calendly' },
  { value: 'meetingStatus', label: 'Meeting status', group: 'Calendly' },
  { value: 'eventType', label: 'Event type URI', group: 'Calendly' },
  { value: 'eventUri', label: 'Scheduled event URI', group: 'Calendly' },
  { value: 'timezone', label: 'Timezone', group: 'Calendly' },
  { value: 'qa.handynummer', label: 'Q&A: Handynummer', group: 'Calendly' },
]

export default function Templates() {
  const { workspaceId } = useParams()
  const [rows, setRows] = useState<Row[]>([])
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [placeholders, setPlaceholders] = useState<PlaceholderOption[]>(BASE_PLACEHOLDERS)
  const [error, setError] = useState<string | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement | null>(null)

  async function load() {
    if (!workspaceId) return
    const { data, error: loadErr } = await supabase
      .from('message_templates')
      .select('id, name, body')
      .eq('workspace_id', workspaceId)
      .order('name')
    if (loadErr) setError(loadErr.message)
    else {
      const nextRows = (data as Row[]) ?? []
      setRows(nextRows)
      setSelectedId((current) => current ?? nextRows[0]?.id ?? null)
    }
  }

  useEffect(() => {
    void load()
    if (!workspaceId) return
    void (async () => {
      const [{ data: integrations }, { data: workspaceFields }] = await Promise.all([
        supabase
          .from('workspace_integrations')
          .select('provider')
          .eq('workspace_id', workspaceId)
          .eq('status', 'active'),
        supabase.from('workspace_contact_fields').select('key, label').eq('workspace_id', workspaceId).order('created_at', { ascending: true }),
      ])

      const providers = ((integrations ?? []) as Array<{ provider: string }>).map((row) => row.provider)

      const customPlaceholders = ((workspaceFields ?? []) as Array<{ key: string; label: string }>).map((field) => ({
        value: `contact.attr.${field.key.replace(/[^\w.-]/g, '_')}`,
        label: field.label || field.key,
        group: 'Custom attributes',
      }))
      const integrationPlaceholders = providers.includes('calendly') ? CALENDLY_PLACEHOLDERS : []
      setPlaceholders([...BASE_PLACEHOLDERS, ...integrationPlaceholders, ...customPlaceholders])
    })()
  }, [workspaceId])

  function insertPlaceholder(value: string) {
    const token = `{{${value}}}`
    const textarea = bodyRef.current
    if (!textarea) {
      setBody((current) => `${current}${token}`)
      return
    }
    const start = textarea.selectionStart ?? body.length
    const end = textarea.selectionEnd ?? body.length
    const nextBody = `${body.slice(0, start)}${token}${body.slice(end)}`
    setBody(nextBody)
    window.requestAnimationFrame(() => {
      textarea.focus()
      const cursor = start + token.length
      textarea.setSelectionRange(cursor, cursor)
    })
  }

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
    setShowCreate(false)
    await load()
  }

  const selectedTemplate = rows.find((row) => row.id === selectedId) ?? null

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Message templates</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Select an existing template to preview it, or create a new template from scratch.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((value) => !value)}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
        >
          {showCreate ? 'Close create form' : 'Create new template'}
        </button>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Templates are plain WhatsApp text messages, not Meta button templates. Add numbered choices in the
        message body when needed, then use automation skills/branches to interpret replies. Placeholders:
        flow variables <code className="text-cyan-600 dark:text-cyan-300">{'{{name}}'}</code> from automation
        state, plus contact fields{' '}
        <code className="text-cyan-600 dark:text-cyan-300">{'{{contact.display_name}}'}</code>,{' '}
        <code className="text-cyan-600 dark:text-cyan-300">{'{{contact.phone_e164}}'}</code>,{' '}
        <code className="text-cyan-600 dark:text-cyan-300">{'{{contact.wa_jid}}'}</code>,{' '}
        <code className="text-cyan-600 dark:text-cyan-300">{'{{contact.notes}}'}</code>, and{' '}
        <code className="text-cyan-600 dark:text-cyan-300">{'{{contact.attr.plan}}'}</code> for each key in contact metadata
        JSON, plus Calendly fields like <code className="text-cyan-600 dark:text-cyan-300">{'{{meetingJoinUrl}}'}</code> and Q&A keys like{' '}
        <code className="text-cyan-600 dark:text-cyan-300">{'{{qa.handynummer}}'}</code>.
      </p>
      {showCreate ? (
      <form onSubmit={add} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
        <input
          required
          placeholder="Template name (unique in workspace)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
        <textarea
          ref={bodyRef}
          required
          placeholder="Message body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
          <div>
            <h2 className="text-sm font-medium text-slate-900 dark:text-white">Insert placeholders</h2>
            <p className="mt-1 text-xs text-slate-500">Click a variable to add it to the message body at your cursor.</p>
          </div>
          {Array.from(new Set(placeholders.map((item) => item.group))).map((group) => (
            <div key={group} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group}</p>
              <div className="flex flex-wrap gap-2">
                {placeholders.filter((item) => item.group === group).map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => insertPlaceholder(item.value)}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:border-cyan-500/60 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-cyan-300"
                    title={`Insert {{${item.value}}}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button type="submit" className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500">
          Save template
        </button>
      </form>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Templates list</h2>
          <div className="space-y-2">
            {rows.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedId(r.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left ${
                  selectedId === r.id
                    ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <p className="truncate text-sm font-medium">{r.name}</p>
              </button>
            ))}
            {rows.length === 0 ? <p className="text-sm text-slate-500">No templates yet.</p> : null}
          </div>
        </aside>
        <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
          {!selectedTemplate ? (
            <p className="text-sm text-slate-500">Select a template from the list to preview.</p>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{selectedTemplate.name}</h3>
              <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                {selectedTemplate.body}
              </pre>
            </>
          )}
        </article>
      </section>
    </div>
  )
}
