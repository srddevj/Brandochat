import type { WASocket } from '@whiskeysockets/baileys'
import type { SupabaseClient } from '@supabase/supabase-js'
import { parseGraph } from '../flow/graphRuntime.js'
import { chooseBranchOption } from '../flow/openaiBranch.js'
import { executeGraphUntilBlocked, type FlowStateRow } from '../flow/runAutomation.js'

type AutomationRow = { id: string; entry_node_id: string | null; graph: unknown }

async function handleAwaitingReply(
  admin: SupabaseClient,
  args: {
    workspaceId: string
    contactId: string
    contactJid: string
    automation: AutomationRow
    graph: NonNullable<ReturnType<typeof parseGraph>>
    stateId: string
    text: string
    sock: WASocket
  },
): Promise<boolean> {
  const { data: st } = await admin
    .from('contact_flow_state')
    .select('id, current_node_id, status, variables')
    .eq('id', args.stateId)
    .single()
  if (!st || st.status !== 'awaiting_reply') return false

  const state = st as FlowStateRow
  const node = args.graph.nodes[state.current_node_id]
  if (!node || node.type !== 'branch') return false

  const chosen = await chooseBranchOption(
    args.text,
    node.options.map((o) => ({ id: o.id, label: o.label, hint: o.hint })),
  )
  const opt = node.options.find((o) => o.id === chosen) ?? node.options[0]
  if (!opt) return false

  await admin
    .from('contact_flow_state')
    .update({
      current_node_id: opt.next,
      status: 'running',
      updated_at: new Date().toISOString(),
    })
    .eq('id', state.id)

  const { data: refreshed } = await admin
    .from('contact_flow_state')
    .select('id, current_node_id, status, variables')
    .eq('id', state.id)
    .single()
  if (!refreshed) return true

  await executeGraphUntilBlocked(admin, {
    workspaceId: args.workspaceId,
    contactId: args.contactId,
    contactJid: args.contactJid,
    automationId: args.automation.id,
    graph: args.graph,
    state: refreshed as FlowStateRow,
    sock: args.sock,
  })
  return true
}

export async function handleInboundText(args: {
  admin: SupabaseClient
  workspaceId: string
  sock: WASocket
  remoteJid: string
  text: string
  waMessageId: string | undefined
  raw: unknown
}): Promise<void> {
  const { admin, workspaceId, sock, remoteJid, text, waMessageId, raw } = args

  const { data: contact, error: cErr } = await admin
    .from('contacts')
    .upsert(
      {
        workspace_id: workspaceId,
        wa_jid: remoteJid,
        display_name: remoteJid.split('@')[0] ?? remoteJid,
      },
      { onConflict: 'workspace_id,wa_jid' },
    )
    .select('id')
    .single()
  if (cErr || !contact) return

  const contactId = contact.id as string

  await admin.from('message_events').insert({
    workspace_id: workspaceId,
    contact_id: contactId,
    direction: 'inbound',
    wa_message_id: waMessageId ?? null,
    wa_chat_jid: remoteJid,
    body: text,
    raw: raw as Record<string, unknown>,
  })

  const { data: automation } = await admin
    .from('automations')
    .select('id, entry_node_id, graph')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!automation) return

  const graph = parseGraph(automation.graph)
  if (!graph) return

  const entry = (automation.entry_node_id as string) || graph.entry

  const { data: existingState } = await admin
    .from('contact_flow_state')
    .select('id, current_node_id, status, variables')
    .eq('contact_id', contactId)
    .eq('automation_id', automation.id)
    .maybeSingle()

  let state: FlowStateRow | null = existingState as FlowStateRow | null

  if (!state) {
    const { data: inserted, error: insErr } = await admin
      .from('contact_flow_state')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        automation_id: automation.id,
        current_node_id: entry,
        status: 'running',
        variables: {},
      })
      .select('id, current_node_id, status, variables')
      .single()
    if (insErr || !inserted) return
    state = inserted as FlowStateRow
    await executeGraphUntilBlocked(admin, {
      workspaceId,
      contactId,
      contactJid: remoteJid,
      automationId: automation.id as string,
      graph,
      state,
      sock,
    })
    await handleAwaitingReply(admin, {
      workspaceId,
      contactId,
      contactJid: remoteJid,
      automation: automation as AutomationRow,
      graph,
      stateId: state.id,
      text,
      sock,
    })
    return
  }

  if (state.status === 'completed') {
    await admin
      .from('contact_flow_state')
      .update({
        current_node_id: entry,
        status: 'running',
        variables: {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', state.id)
    const { data: refreshed } = await admin
      .from('contact_flow_state')
      .select('id, current_node_id, status, variables')
      .eq('id', state.id)
      .single()
    if (!refreshed) return
    state = refreshed as FlowStateRow
    await executeGraphUntilBlocked(admin, {
      workspaceId,
      contactId,
      contactJid: remoteJid,
      automationId: automation.id as string,
      graph,
      state,
      sock,
    })
    await handleAwaitingReply(admin, {
      workspaceId,
      contactId,
      contactJid: remoteJid,
      automation: automation as AutomationRow,
      graph,
      stateId: state.id,
      text,
      sock,
    })
    return
  }

  if (state.status === 'running') {
    return
  }

  if (state.status === 'awaiting_reply') {
    await handleAwaitingReply(admin, {
      workspaceId,
      contactId,
      contactJid: remoteJid,
      automation: automation as AutomationRow,
      graph,
      stateId: state.id,
      text,
      sock,
    })
  }
}
