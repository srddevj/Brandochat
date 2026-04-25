import type { SupabaseClient } from '@supabase/supabase-js'

export type ConversationResolution = {
  conversationId: string
  isNewConversation: boolean
}

export async function resolveConversation(
  admin: SupabaseClient,
  args: {
    workspaceId: string
    contactId: string
    contactJid: string
    instanceId?: string
    messageAt?: string
  },
): Promise<ConversationResolution> {
  const { data: openConversation, error: openError } = await admin
    .from('conversations')
    .select('id')
    .eq('workspace_id', args.workspaceId)
    .eq('contact_id', args.contactId)
    .eq('status', 'open')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (openError) throw new Error(`Failed to load conversation: ${openError.message}`)

  if (openConversation?.id) {
    await admin
      .from('conversations')
      .update({
        last_message_at: args.messageAt ?? new Date().toISOString(),
        source_whatsapp_instance_id: args.instanceId ?? null,
      })
      .eq('id', openConversation.id)
    return { conversationId: openConversation.id as string, isNewConversation: false }
  }

  const { data: created, error: createError } = await admin
    .from('conversations')
    .insert({
      workspace_id: args.workspaceId,
      contact_id: args.contactId,
      wa_chat_jid: args.contactJid,
      source_whatsapp_instance_id: args.instanceId ?? null,
      last_message_at: args.messageAt ?? new Date().toISOString(),
      status: 'open',
    })
    .select('id')
    .single()

  if (createError || !created) {
    throw new Error(createError?.message ?? 'Failed to create conversation')
  }

  return { conversationId: created.id as string, isNewConversation: true }
}
