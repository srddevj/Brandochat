import type { SupabaseClient } from '@supabase/supabase-js'
import type { WASocket } from '@whiskeysockets/baileys'
import { applyTemplateVars, buildContactPlaceholderVars, type AutomationGraph } from './graphRuntime.js'

export type FlowStateRow = {
  id: string
  current_node_id: string
  status: string
  variables: Record<string, unknown>
}

export async function executeGraphUntilBlocked(
  admin: SupabaseClient,
  args: {
    workspaceId: string
    contactId: string
    contactJid: string
    automationId: string
    graph: AutomationGraph
    state: FlowStateRow
    sock: WASocket
  },
): Promise<void> {
  let current = args.state.current_node_id
  let variables = { ...(args.state.variables as Record<string, string>) }

  const patchState = async (patch: Partial<FlowStateRow>) => {
    await admin
      .from('contact_flow_state')
      .update({
        current_node_id: patch.current_node_id ?? current,
        status: patch.status ?? 'running',
        variables: (patch.variables ?? variables) as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq('id', args.state.id)
  }

  while (true) {
    const node = args.graph.nodes[current]
    if (!node) {
      await patchState({ status: 'completed', current_node_id: current })
      return
    }
    if (node.type === 'end') {
      await patchState({ status: 'completed', current_node_id: current })
      return
    }
    if (node.type === 'branch') {
      await patchState({ status: 'awaiting_reply', current_node_id: current, variables })
      return
    }
    if (node.type === 'send') {
      const { data: tpl } = await admin
        .from('message_templates')
        .select('body')
        .eq('id', node.templateId)
        .maybeSingle()
      const { data: contactRow } = await admin
        .from('contacts')
        .select('display_name, phone_e164, wa_jid, notes, metadata')
        .eq('id', args.contactId)
        .maybeSingle()
      const contactVars = contactRow
        ? buildContactPlaceholderVars({
            display_name: contactRow.display_name as string | null,
            phone_e164: contactRow.phone_e164 as string | null,
            wa_jid: contactRow.wa_jid as string,
            notes: contactRow.notes as string | null,
            metadata: contactRow.metadata as Record<string, unknown> | null,
          })
        : {}
      const mergedVars = { ...contactVars, ...variables }
      const body = applyTemplateVars((tpl?.body as string) ?? '[missing template]', mergedVars)
      await args.sock.sendMessage(args.contactJid, { text: body })
      await admin.from('message_events').insert({
        workspace_id: args.workspaceId,
        contact_id: args.contactId,
        direction: 'outbound',
        wa_chat_jid: args.contactJid,
        body,
        automation_id: args.automationId,
        node_id: current,
      })
      const next = node.next
      if (!next) {
        await patchState({ status: 'completed', current_node_id: current, variables })
        return
      }
      const nextNode = args.graph.nodes[next]
      if (!nextNode || nextNode.type === 'end') {
        await patchState({ status: 'completed', current_node_id: next, variables })
        return
      }
      current = next
      await patchState({ status: 'running', current_node_id: current, variables })
      continue
    }
    return
  }
}
