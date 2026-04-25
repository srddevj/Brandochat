import type { WASocket } from '@whiskeysockets/baileys'
import type { SupabaseClient } from '@supabase/supabase-js'
import { continueAwaitingReply, continuePendingManualTrigger, routeTrigger } from '../flow/triggerRouter.js'
import { resolveConversation } from './conversations.js'

type ContactRow = {
  id: string
  wa_jid: string | null
  phone_e164: string | null
  display_name: string | null
  metadata: Record<string, unknown> | null
}

const CONTACT_SELECT = 'id, wa_jid, phone_e164, display_name, metadata'

function metadataFrom(contact?: ContactRow | null): Record<string, unknown> {
  return contact?.metadata && typeof contact.metadata === 'object' && !Array.isArray(contact.metadata) ? contact.metadata : {}
}

function phoneE164FromJid(jid: string): string | null {
  if (!jid.endsWith('@s.whatsapp.net')) return null
  const phone = jid.split('@')[0]?.replace(/\D/g, '')
  return phone ? `+${phone}` : null
}

async function findExistingContact(args: {
  admin: SupabaseClient
  workspaceId: string
  remoteJid: string
  alternateJid?: string
  phoneE164?: string | null
}): Promise<ContactRow | null> {
  const candidateJids = Array.from(new Set([args.remoteJid, args.alternateJid].filter(Boolean))) as string[]
  for (const jid of candidateJids) {
    const { data } = await args.admin
      .from('contacts')
      .select(CONTACT_SELECT)
      .eq('workspace_id', args.workspaceId)
      .eq('wa_jid', jid)
      .maybeSingle<ContactRow>()
    if (data) return data
  }

  const phoneCandidates = Array.from(
    new Set([args.phoneE164, ...candidateJids.map(phoneE164FromJid)].filter(Boolean)),
  ) as string[]
  for (const phone of phoneCandidates) {
    const { data } = await args.admin
      .from('contacts')
      .select(CONTACT_SELECT)
      .eq('workspace_id', args.workspaceId)
      .eq('phone_e164', phone)
      .maybeSingle<ContactRow>()
    if (data) return data
  }

  for (const jid of candidateJids) {
    const { data } = await args.admin
      .from('contacts')
      .select(CONTACT_SELECT)
      .eq('workspace_id', args.workspaceId)
      .or(`metadata->>wa_lid.eq.${jid},metadata->>wa_jid_alt.eq.${jid}`)
      .limit(1)
      .maybeSingle<ContactRow>()
    if (data) return data
  }

  return null
}

export async function handleInboundText(args: {
  admin: SupabaseClient
  workspaceId: string
  instanceId?: string
  sock: WASocket
  remoteJid: string
  alternateJid?: string
  phoneE164?: string | null
  participantJid?: string
  participantAltJid?: string
  text: string
  waMessageId: string | undefined
  raw: unknown
}): Promise<void> {
  const { admin, workspaceId, instanceId, sock, remoteJid, alternateJid, phoneE164, participantJid, participantAltJid, text, waMessageId, raw } = args
  const receivedAt = new Date().toISOString()
  const isGroup = remoteJid.endsWith('@g.us')

  const existingContact = await findExistingContact({ admin, workspaceId, remoteJid, alternateJid, phoneE164 })
  const canonicalJid =
    existingContact?.wa_jid?.endsWith('@s.whatsapp.net') || existingContact?.wa_jid?.endsWith('@g.us')
      ? existingContact.wa_jid
      : remoteJid
  const lidJid = remoteJid.endsWith('@lid') ? remoteJid : alternateJid?.endsWith('@lid') ? alternateJid : undefined
  const existingMetadata = metadataFrom(existingContact)

  const nextMetadata = {
    ...existingMetadata,
    ...(lidJid ? { wa_lid: lidJid, wa_jid_alt: lidJid } : {}),
    ...(canonicalJid !== remoteJid ? { wa_last_inbound_jid: remoteJid } : {}),
    ...(isGroup ? { wa_is_group: true, wa_last_participant_jid: participantJid ?? null, wa_last_participant_alt_jid: participantAltJid ?? null } : {}),
  }

  const upsertPayload = {
    workspace_id: workspaceId,
    wa_jid: canonicalJid,
    phone_e164: isGroup ? null : phoneE164 ?? (existingContact?.phone_e164 as string | null | undefined) ?? null,
    display_name:
      (existingContact?.display_name as string | null | undefined) ??
      phoneE164 ??
      canonicalJid.split('@')[0] ??
      canonicalJid,
    metadata: nextMetadata,
  }

  const contactResult = existingContact?.id
    ? await admin
        .from('contacts')
        .update(upsertPayload)
        .eq('id', existingContact.id)
        .select('id, metadata')
        .single()
    : await admin
        .from('contacts')
        .upsert(upsertPayload, { onConflict: 'workspace_id,wa_jid' })
        .select('id, metadata')
        .single()
  const { data: contact, error: cErr } = contactResult
  if (cErr || !contact) return

  const contactId = contact.id as string
  const contactStatus = existingContact?.id ? 'existing' : 'new'
  if (waMessageId) {
    const { data: existingMessage } = await admin
      .from('message_events')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('wa_chat_jid', canonicalJid)
      .eq('wa_message_id', waMessageId)
      .maybeSingle()
    if (existingMessage?.id) return
  }

  const conversation = await resolveConversation(admin, {
    workspaceId,
    contactId,
    contactJid: canonicalJid,
    instanceId,
    messageAt: receivedAt,
  })
  const conversationStatus = conversation.isNewConversation ? 'new' : 'existing'
  const metadata =
    contact.metadata && typeof contact.metadata === 'object' && !Array.isArray(contact.metadata)
      ? (contact.metadata as Record<string, unknown>)
      : {}
  const currentUnread = typeof metadata.wa_unread_count === 'number' ? metadata.wa_unread_count : 0

  await admin
    .from('contacts')
    .update({
      metadata: {
        ...metadata,
        wa_unread_count: currentUnread + 1,
        wa_last_message_at: receivedAt,
        wa_last_message_body: text,
        ...(isGroup ? { wa_is_group: true, wa_last_participant_jid: participantJid ?? null, wa_last_participant_alt_jid: participantAltJid ?? null } : {}),
      },
    })
    .eq('id', contactId)

  await admin.from('message_events').insert({
    workspace_id: workspaceId,
    whatsapp_instance_id: instanceId ?? null,
    contact_id: contactId,
    conversation_id: conversation.conversationId,
    direction: 'inbound',
    wa_message_id: waMessageId ?? null,
    wa_chat_jid: canonicalJid,
    body: text,
    raw: raw as Record<string, unknown>,
    created_at: receivedAt,
  })

  const handledManualWait = await continuePendingManualTrigger(admin, {
    workspaceId,
    contactId,
    contactJid: canonicalJid,
    conversationId: conversation.conversationId,
    text,
    whatsappInstanceId: instanceId,
    waMessageId,
    sock,
  })

  const handledReply = handledManualWait
    ? true
    : await continueAwaitingReply(admin, {
    workspaceId,
    contactId,
    contactJid: canonicalJid,
    conversationId: conversation.conversationId,
    text,
    sock,
  })

  if (conversation.isNewConversation) {
    await routeTrigger(
      admin,
      {
        workspaceId,
        type: 'conversation.created',
        contactId,
        contactJid: canonicalJid,
        conversationId: conversation.conversationId,
        whatsappInstanceId: instanceId,
        payload: {
          text,
          waMessageId,
          inboundJid: remoteJid,
          contactStatus,
          conversationStatus,
        },
      },
      { sock },
    )
  }

  if (!handledReply) {
    await routeTrigger(
      admin,
      {
        workspaceId,
        type: 'message.received',
        contactId,
        contactJid: canonicalJid,
        conversationId: conversation.conversationId,
        whatsappInstanceId: instanceId,
        payload: {
          text,
          waMessageId,
          inboundJid: remoteJid,
          contactStatus,
          conversationStatus,
        },
      },
      { sock },
    )
  }
}
