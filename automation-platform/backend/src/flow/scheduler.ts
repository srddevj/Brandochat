import type { SupabaseClient } from '@supabase/supabase-js'
import { getServiceRoleClient } from '../lib/supabase-clients.js'
import { routeTrigger } from './triggerRouter.js'

const TICK_MS = 60_000

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function readPath(source: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.').filter(Boolean)
  let current: unknown = source
  for (const part of parts) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  if (current && typeof current === 'object' && !Array.isArray(current) && 'value' in current) {
    return (current as { value?: unknown }).value
  }
  return current
}

function isDue(value: unknown, now: Date, offsetMinutes: number): boolean {
  if (typeof value !== 'string' || !value) return false
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return false
  const target = timestamp - offsetMinutes * 60_000
  return target <= now.getTime() && target > now.getTime() - TICK_MS * 2
}

async function processAutomation(admin: SupabaseClient, automation: Record<string, unknown>, now: Date) {
  const config = asObject(automation.trigger_config)
  const attributePath = typeof config.attributePath === 'string' ? config.attributePath : ''
  if (!attributePath) return
  const offsetMinutes = typeof config.offsetMinutes === 'number' ? config.offsetMinutes : 0
  const workspaceId = automation.workspace_id as string

  const { data: contacts, error } = await admin
    .from('contacts')
    .select('id, wa_jid, metadata')
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(`Failed to load scheduled contacts: ${error.message}`)

  for (const contact of contacts ?? []) {
    const metadata = asObject(contact.metadata)
    const value = readPath({ ...metadata, custom_attributes: metadata.custom_attributes }, attributePath)
    if (!isDue(value, now, offsetMinutes)) continue

    const lockKey = `${attributePath}:${String(value)}:${now.toISOString().slice(0, 16)}`
    const { error: lockError } = await admin.from('scheduled_trigger_locks').insert({
      workspace_id: workspaceId,
      automation_id: automation.id,
      contact_id: contact.id,
      lock_key: lockKey,
    })
    if (lockError) continue

    await routeTrigger(admin, {
      workspaceId,
      type: 'contact.datetime',
      contactId: contact.id as string,
      contactJid: contact.wa_jid as string,
      payload: {
        attributePath,
        value,
        offsetMinutes,
      },
    })
  }
}

export async function runScheduledTriggers(): Promise<void> {
  const admin = getServiceRoleClient()
  const now = new Date()
  const { data, error } = await admin
    .from('automations')
    .select('id, workspace_id, trigger_config')
    .eq('is_active', true)
    .eq('trigger_type', 'contact.datetime')

  if (error) throw new Error(`Failed to load scheduled automations: ${error.message}`)

  for (const automation of data ?? []) {
    await processAutomation(admin, automation, now)
  }
}

export function startScheduler(): NodeJS.Timeout {
  return setInterval(() => {
    void runScheduledTriggers().catch((error) => {
      console.error('[scheduler]', error)
    })
  }, TICK_MS)
}
