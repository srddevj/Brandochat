export type TriggerType = 'conversation.created' | 'message.received' | 'contact.datetime' | 'webhook.received' | 'calendly.event'

export type TriggerEvent = {
  workspaceId: string
  type: TriggerType
  contactId?: string
  contactJid?: string
  conversationId?: string
  whatsappInstanceId?: string
  payload: Record<string, unknown>
}

export type AutomationRow = {
  id: string
  workspace_id: string
  name: string
  is_active: boolean
  entry_node_id: string | null
  graph: unknown
  trigger_type?: TriggerType | string | null
  trigger_config?: Record<string, unknown> | null
}

export type AutomationRunRow = {
  id: string
  workspace_id: string
  automation_id: string
  contact_id: string | null
  conversation_id: string | null
  current_node_id: string
  status: string
  variables: Record<string, unknown>
  trigger_type: string
  trigger_payload: Record<string, unknown>
}
