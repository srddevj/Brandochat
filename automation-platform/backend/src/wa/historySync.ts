import type { SupabaseClient } from '@supabase/supabase-js'
import { isJidNewsletter, type WAMessage } from '@whiskeysockets/baileys'
import type { Chat, Contact } from '@whiskeysockets/baileys'

type SyncArgs = {
  admin: SupabaseClient
  workspaceId: string
  instanceId: string
}

function isSyncableJid(jid?: string | null): jid is string {
  if (!jid) return false
  if (jid === 'status@broadcast') return false
  if (isJidNewsletter(jid)) return false
  return jid.endsWith('@s.whatsapp.net') || jid.endsWith('@g.us')
}

function phoneE164FromJid(jid?: string | null): string | null {
  if (!jid?.endsWith('@s.whatsapp.net')) return null
  const phone = jid.split('@')[0]?.replace(/\D/g, '')
  return phone ? `+${phone}` : null
}

function normalizePhoneE164(value?: string | null): string | null {
  const digits = value?.replace(/\D/g, '')
  return digits ? `+${digits}` : null
}

function splitDisplayName(name?: string | null): { firstName: string; lastName: string } {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  }
}

function contactDisplayName(contact: Contact): string {
  return contact.name ?? contact.notify ?? contact.verifiedName ?? contactNameFromJid(contact.id)
}

function mergeContactMetadata(
  existing: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...(existing && typeof existing === 'object' && !Array.isArray(existing) ? (existing as Record<string, unknown>) : {}),
    ...patch,
  }
}

function messageChatJid(message: WAMessage): { jid: string | null; alternateJid?: string; phoneE164?: string | null } {
  const remoteJid = message.key.remoteJid ?? null
  if (remoteJid?.endsWith('@g.us')) {
    return { jid: remoteJid, phoneE164: null }
  }
  const remoteJidAlt = message.key.remoteJidAlt ?? null
  const participantAlt = message.key.participantAlt ?? null
  const candidates = [remoteJidAlt, participantAlt, remoteJid].filter(Boolean) as string[]
  const phoneJid = candidates.find((jid) => jid.endsWith('@s.whatsapp.net'))
  const lidJid = candidates.find((jid) => jid.endsWith('@lid'))
  const jid = phoneJid ?? remoteJid
  return { jid, alternateJid: lidJid && lidJid !== jid ? lidJid : undefined, phoneE164: phoneE164FromJid(phoneJid ?? jid) }
}

function contactNameFromJid(jid: string): string {
  return jid.split('@')[0] || jid
}

function unwrapMessage(message: unknown): Record<string, unknown> | null {
  if (!message || typeof message !== 'object' || Array.isArray(message)) return null
  const content = message as Record<string, unknown>
  const wrappers = ['ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'documentWithCaptionMessage'] as const
  for (const key of wrappers) {
    const wrapped = content[key] as { message?: unknown } | undefined
    if (wrapped?.message) return unwrapMessage(wrapped.message)
  }
  return content
}

function messageBody(message: WAMessage): string | null {
  const content = unwrapMessage(message.message)
  if (!content) return null
  if (typeof content.conversation === 'string') return content.conversation
  const extendedTextMessage = content.extendedTextMessage as { text?: string } | undefined
  if (extendedTextMessage?.text) return extendedTextMessage.text
  const imageMessage = content.imageMessage as { caption?: string } | undefined
  if (imageMessage?.caption) return imageMessage.caption
  const videoMessage = content.videoMessage as { caption?: string } | undefined
  if (videoMessage?.caption) return videoMessage.caption
  const documentMessage = content.documentMessage as { caption?: string } | undefined
  if (documentMessage?.caption) return documentMessage.caption
  if (content.audioMessage) return '[audio]'
  if (content.imageMessage) return '[image]'
  if (content.videoMessage) return '[video]'
  if (content.documentMessage) return '[document]'
  if (content.stickerMessage) return '[sticker]'
  if (content.locationMessage) return '[location]'
  const buttonsResponse = content.buttonsResponseMessage as { selectedDisplayText?: string; selectedButtonId?: string } | undefined
  if (buttonsResponse?.selectedDisplayText || buttonsResponse?.selectedButtonId) return buttonsResponse.selectedDisplayText ?? buttonsResponse.selectedButtonId ?? null
  const listResponse = content.listResponseMessage as { title?: string; singleSelectReply?: { selectedRowId?: string } } | undefined
  if (listResponse?.title || listResponse?.singleSelectReply?.selectedRowId) return listResponse.title ?? listResponse.singleSelectReply?.selectedRowId ?? null
  return null
}

function timestampSeconds(ts: unknown): number | undefined {
  const seconds =
    typeof ts === 'number'
      ? ts
      : typeof ts === 'object' && ts != null && 'toNumber' in ts
        ? (ts as { toNumber: () => number }).toNumber()
        : undefined
  return seconds
}

function timestampIso(message: WAMessage): string | undefined {
  const seconds = timestampSeconds(message.messageTimestamp)
  return seconds ? new Date(seconds * 1000).toISOString() : undefined
}

function jsonSafe(value: unknown): Record<string, unknown> | null {
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function upsertHistoryContacts(
  { admin, workspaceId }: SyncArgs,
  contacts: Contact[],
): Promise<void> {
  const syncableContacts = contacts.filter((contact) => isSyncableJid(contact.id))
  const jids = syncableContacts.map((contact) => contact.id)
  const { data: existingContacts, error: existingError } = jids.length
    ? await admin.from('contacts').select('wa_jid, metadata').eq('workspace_id', workspaceId).in('wa_jid', jids)
    : { data: [], error: null }
  if (existingError) throw new Error(`Failed to load existing contacts: ${existingError.message}`)

  const existingByJid = new Map((existingContacts ?? []).map((contact) => [contact.wa_jid as string, contact.metadata]))
  const rows = contacts
    .filter((contact) => isSyncableJid(contact.id))
    .map((contact) => {
      const name = contactDisplayName(contact)
      const { firstName, lastName } = splitDisplayName(name)
      return {
        workspace_id: workspaceId,
        wa_jid: contact.id,
        phone_e164: normalizePhoneE164(contact.phoneNumber) ?? phoneE164FromJid(contact.id),
        display_name: name,
        metadata: mergeContactMetadata(existingByJid.get(contact.id), {
          first_name: firstName,
          last_name: lastName,
          wa_lid: contact.lid ?? null,
          wa_notify: contact.notify ?? null,
          wa_verified_name: contact.verifiedName ?? null,
        }),
      }
    })

  if (rows.length === 0) return

  const { error } = await admin.from('contacts').upsert(rows, {
    onConflict: 'workspace_id,wa_jid',
    ignoreDuplicates: false,
  })
  if (error) throw new Error(`Failed to sync contacts: ${error.message}`)
}

export async function upsertHistoryChats({ admin, workspaceId }: SyncArgs, chats: Chat[]): Promise<void> {
  const syncableChats = chats.filter((chat) => isSyncableJid(chat.id))
  const jids = syncableChats.map((chat) => chat.id)
  const { data: existingContacts, error: existingError } = jids.length
    ? await admin.from('contacts').select('wa_jid, metadata').eq('workspace_id', workspaceId).in('wa_jid', jids)
    : { data: [], error: null }
  if (existingError) throw new Error(`Failed to load existing chat contacts: ${existingError.message}`)

  const existingByJid = new Map((existingContacts ?? []).map((contact) => [contact.wa_jid as string, contact.metadata]))
  const rows = chats
    .flatMap((chat) => {
      const jid = chat.id
      if (!isSyncableJid(jid)) return []
      const name = chat.name ?? contactNameFromJid(jid)
      const { firstName, lastName } = splitDisplayName(name)
      return [
        {
          workspace_id: workspaceId,
          wa_jid: jid,
          phone_e164: phoneE164FromJid(jid),
          display_name: name,
          metadata: mergeContactMetadata(existingByJid.get(jid), {
            first_name: firstName,
            last_name: lastName,
            ...(jid.endsWith('@g.us') ? { wa_is_group: true } : {}),
            wa_unread_count: chat.unreadCount ?? 0,
            wa_conversation_timestamp: timestampSeconds(chat.conversationTimestamp)
              ? new Date(timestampSeconds(chat.conversationTimestamp)! * 1000).toISOString()
              : null,
          }),
        },
      ]
    })

  if (rows.length === 0) return

  const { error } = await admin.from('contacts').upsert(rows, {
    onConflict: 'workspace_id,wa_jid',
    ignoreDuplicates: false,
  })
  if (error) throw new Error(`Failed to sync chats: ${error.message}`)
}

export async function upsertHistoryMessages(args: SyncArgs, messages: WAMessage[]): Promise<void> {
  const syncable = messages
    .map((message) => ({ message, address: messageChatJid(message) }))
    .filter((item) => isSyncableJid(item.address.jid))
  if (syncable.length === 0) return

  const jids = Array.from(new Set(syncable.map((item) => item.address.jid!)))
  const contactRows = jids.map((jid) => {
    const address = syncable.find((item) => item.address.jid === jid)?.address
    return {
      workspace_id: args.workspaceId,
      wa_jid: jid,
      phone_e164: jid.endsWith('@g.us') ? null : address?.phoneE164 ?? null,
      display_name: address?.phoneE164 ?? contactNameFromJid(jid),
      metadata: {
        ...(jid.endsWith('@g.us') ? { wa_is_group: true } : {}),
        ...(address?.alternateJid ? { wa_lid: address.alternateJid, wa_jid_alt: address.alternateJid } : {}),
      },
    }
  })
  const { error: upsertContactsError } = await args.admin.from('contacts').upsert(contactRows, {
    onConflict: 'workspace_id,wa_jid',
    ignoreDuplicates: true,
  })
  if (upsertContactsError) throw new Error(`Failed to upsert message contacts: ${upsertContactsError.message}`)

  const { data: contacts, error: contactsError } = await args.admin
    .from('contacts')
    .select('id, wa_jid, phone_e164, metadata')
    .eq('workspace_id', args.workspaceId)
    .in('wa_jid', jids)

  if (contactsError) throw new Error(`Failed to load synced contacts: ${contactsError.message}`)

  const contactByJid = new Map((contacts ?? []).map((contact) => [contact.wa_jid as string, contact]))
  const rows = syncable
    .map(({ message, address }) => {
      const jid = address.jid!
      const waMessageId = message.key.id
      if (!waMessageId) return null
      const createdAt = timestampIso(message) ?? new Date().toISOString()
      return {
        workspace_id: args.workspaceId,
        whatsapp_instance_id: args.instanceId,
        contact_id: (contactByJid.get(jid)?.id as string | undefined) ?? null,
        direction: message.key.fromMe ? 'outbound' : 'inbound',
        wa_message_id: waMessageId,
        wa_chat_jid: jid,
        body: messageBody(message),
        raw: jsonSafe(message),
        created_at: createdAt,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row != null)

  if (rows.length === 0) return

  const { error } = await args.admin.from('message_events').upsert(rows, {
    onConflict: 'workspace_id,wa_chat_jid,wa_message_id',
    ignoreDuplicates: false,
  })
  if (error) throw new Error(`Failed to sync messages: ${error.message}`)

  const latestByJid = new Map<string, { createdAt: string; body: string | null }>()
  for (const row of rows) {
    const current = latestByJid.get(row.wa_chat_jid)
    if (!current || Date.parse(row.created_at) > Date.parse(current.createdAt)) {
      latestByJid.set(row.wa_chat_jid, { createdAt: row.created_at, body: row.body })
    }
  }

  for (const [jid, latest] of latestByJid) {
    const contact = contactByJid.get(jid)
    if (!contact?.id) continue
    const metadata =
      contact.metadata && typeof contact.metadata === 'object' && !Array.isArray(contact.metadata)
        ? (contact.metadata as Record<string, unknown>)
        : {}
    await args.admin
      .from('contacts')
      .update({
        metadata: {
          ...metadata,
          wa_last_message_at: latest.createdAt,
          wa_last_message_body: latest.body,
        },
      })
      .eq('id', contact.id)
  }

  for (const { address } of syncable) {
    const jid = address.jid!
    const contact = contactByJid.get(jid)
    if (!contact?.id) continue
    const metadata =
      contact.metadata && typeof contact.metadata === 'object' && !Array.isArray(contact.metadata)
        ? (contact.metadata as Record<string, unknown>)
        : {}
    if (!address.alternateJid && !address.phoneE164) continue
    await args.admin
      .from('contacts')
      .update({
        phone_e164: address.phoneE164 ?? (contact.phone_e164 as string | null | undefined) ?? null,
        metadata: {
          ...metadata,
          ...(address.alternateJid ? { wa_lid: address.alternateJid, wa_jid_alt: address.alternateJid } : {}),
        },
      })
      .eq('id', contact.id)
  }
}

export async function importHistorySyncBatch(args: SyncArgs & { contacts: Contact[]; chats: Chat[]; messages: WAMessage[] }) {
  await upsertHistoryContacts(args, args.contacts)
  await upsertHistoryChats(args, args.chats)
  await upsertHistoryMessages(args, args.messages)
}
