import makeWASocket, {
  fetchLatestBaileysVersion,
  isJidNewsletter,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  type CacheStore,
  type WASocket,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import NodeCache from '@cacheable/node-cache'
import pino from 'pino'
import path from 'node:path'
import fs from 'node:fs/promises'
import qrcodeTerminal from 'qrcode-terminal'
import { env } from '../config/env.js'
import { getServiceRoleClient } from '../lib/supabase-clients.js'
import { handleInboundText } from './inboundPipeline.js'

const logger = pino({ level: 'warn' })
const msgRetryCounterCache = new NodeCache() as CacheStore

type PairingStatus = 'disconnected' | 'qr' | 'connected' | 'error'

type SessionEntry = {
  workspaceId: string
  sock: WASocket | null
  pairing_status: PairingStatus
  qr?: string
  lastError?: string
  phoneLabel?: string
  starting: boolean
}

const sessions = new Map<string, SessionEntry>()

function authDir(workspaceId: string) {
  return path.join(env.WA_AUTH_ROOT, workspaceId)
}

async function upsertInstance(
  workspaceId: string,
  patch: Partial<{
    pairing_status: PairingStatus
    last_error: string | null
    phone_label: string | null
    last_connected_at: string
  }>,
) {
  const admin = getServiceRoleClient()
  await admin.from('whatsapp_instances').upsert(
    {
      workspace_id: workspaceId,
      updated_at: new Date().toISOString(),
      ...patch,
    },
    { onConflict: 'workspace_id' },
  )
}

function extractText(msg: Record<string, unknown>): string | null {
  const m = msg.message as Record<string, unknown> | undefined
  if (!m) return null
  if (typeof m.conversation === 'string') return m.conversation
  const ext = m.extendedTextMessage as { text?: string } | undefined
  if (ext?.text) return ext.text
  return null
}

export function getSession(workspaceId: string): SessionEntry | undefined {
  return sessions.get(workspaceId)
}

export function getQr(workspaceId: string): string | undefined {
  return sessions.get(workspaceId)?.qr
}

export async function disconnectWorkspace(workspaceId: string): Promise<void> {
  const s = sessions.get(workspaceId)
  if (s?.sock) {
    try {
      s.sock.end(undefined)
    } catch {
      /* ignore */
    }
  }
  sessions.delete(workspaceId)
  await upsertInstance(workspaceId, { pairing_status: 'disconnected', last_error: null })
}

export async function ensureWorkspaceSocket(workspaceId: string): Promise<void> {
  const existing = sessions.get(workspaceId)
  if (existing?.sock && existing.pairing_status === 'connected') return
  if (existing?.starting) return
  if (existing?.sock) {
    try {
      existing.sock.end(undefined)
    } catch {
      /* ignore */
    }
    existing.sock = null
  }
  if (!existing) {
    sessions.set(workspaceId, {
      workspaceId,
      sock: null,
      pairing_status: 'disconnected',
      starting: true,
    })
  } else {
    existing.starting = true
  }

  const dir = authDir(workspaceId)
  await fs.mkdir(dir, { recursive: true })

  const admin = getServiceRoleClient()
  const { state, saveCreds } = await useMultiFileAuthState(dir)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    msgRetryCounterCache,
    getMessage: async () => undefined,
  })

  const entry = sessions.get(workspaceId)!
  entry.sock = sock
  entry.starting = false

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update
    const cur = sessions.get(workspaceId)
    if (!cur) return
    if (qr) {
      cur.qr = qr
      cur.pairing_status = 'qr'
      qrcodeTerminal.generate(qr, { small: true })
      await upsertInstance(workspaceId, { pairing_status: 'qr', last_error: null })
    }
    if (connection === 'open') {
      cur.pairing_status = 'connected'
      cur.qr = undefined
      cur.phoneLabel = sock.user?.id ?? undefined
      await upsertInstance(workspaceId, {
        pairing_status: 'connected',
        last_error: null,
        phone_label: cur.phoneLabel ?? null,
        last_connected_at: new Date().toISOString(),
      })
    }
    if (connection === 'close') {
      cur.pairing_status = 'disconnected'
      cur.qr = undefined
      cur.lastError = (lastDisconnect?.error as Boom | undefined)?.message ?? 'closed'
      await upsertInstance(workspaceId, {
        pairing_status: 'error',
        last_error: cur.lastError ?? null,
      })
    }
  })

  sock.ev.on('creds.update', async () => {
    await saveCreds()
  })

  sock.ev.on('messages.upsert', async (upsert) => {
    if (upsert.type !== 'notify') return
    for (const msg of upsert.messages) {
      const jid = msg.key?.remoteJid
      if (!jid || msg.key.fromMe) continue
      if (jid.endsWith('@g.us')) continue
      if (isJidNewsletter(jid)) continue
      const text = extractText(msg as unknown as Record<string, unknown>)
      if (!text) continue
      await handleInboundText({
        admin,
        workspaceId,
        sock,
        remoteJid: jid,
        text,
        waMessageId: msg.key.id ?? undefined,
        raw: msg,
      })
    }
  })
}
