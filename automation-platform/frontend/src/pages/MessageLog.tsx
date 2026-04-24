import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Row = {
  id: string
  direction: string
  body: string | null
  wa_chat_jid: string | null
  node_id: string | null
  created_at: string
}

export default function MessageLog() {
  const { workspaceId } = useParams()
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    if (!workspaceId) return
    void supabase
      .from('message_events')
      .select('id, direction, body, wa_chat_jid, node_id, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => setRows((data as Row[]) ?? []))
  }, [workspaceId])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">Message log</h1>
      <p className="text-sm text-slate-400">Last 100 events (inbound and outbound).</p>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-900/80 text-slate-400">
            <tr>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Dir</th>
              <th className="px-3 py-2">Chat</th>
              <th className="px-3 py-2">Node</th>
              <th className="px-3 py-2">Body</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  No events yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="bg-slate-900/30">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-500">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        r.direction === 'inbound' ? 'text-sky-400' : 'text-emerald-400'
                      }
                    >
                      {r.direction}
                    </span>
                  </td>
                  <td className="max-w-[140px] truncate px-3 py-2 font-mono text-xs text-slate-500">
                    {r.wa_chat_jid}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{r.node_id}</td>
                  <td className="max-w-md px-3 py-2 text-slate-300">{r.body}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
