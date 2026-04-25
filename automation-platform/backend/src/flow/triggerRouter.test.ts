import { describe, expect, it } from 'vitest'
import { triggerMatches } from './triggerRouter.js'
import type { AutomationRow, TriggerEvent } from './types.js'

const baseAutomation: AutomationRow = {
  id: 'automation-1',
  workspace_id: 'workspace-1',
  name: 'Inbound router',
  is_active: true,
  entry_node_id: 'start',
  graph: {},
  trigger_type: 'message.received',
  trigger_config: {},
}

const baseEvent: TriggerEvent = {
  workspaceId: 'workspace-1',
  type: 'message.received',
  contactId: 'contact-1',
  contactJid: '491234@s.whatsapp.net',
  conversationId: 'conversation-1',
  whatsappInstanceId: 'wa-1',
  payload: {
    contactStatus: 'existing',
    conversationStatus: 'existing',
  },
}

describe('triggerMatches', () => {
  it('allows all WhatsApp numbers when no instance filter is set', () => {
    expect(triggerMatches(baseAutomation, baseEvent)).toBe(true)
  })

  it('matches only selected WhatsApp instance ids', () => {
    expect(
      triggerMatches(
        { ...baseAutomation, trigger_config: { whatsappInstanceIds: ['wa-1'] } },
        baseEvent,
      ),
    ).toBe(true)

    expect(
      triggerMatches(
        { ...baseAutomation, trigger_config: { whatsappInstanceIds: ['wa-2'] } },
        baseEvent,
      ),
    ).toBe(false)
  })

  it('matches contact.datetime by field key', () => {
    const automation: AutomationRow = {
      ...baseAutomation,
      trigger_type: 'contact.datetime',
      trigger_config: { fieldKey: 'meeting_datetime' },
    }
    const event: TriggerEvent = {
      ...baseEvent,
      type: 'contact.datetime',
      payload: { fieldKey: 'meeting_datetime', attributePath: 'custom_attributes.meeting_datetime' },
    }
    expect(triggerMatches(automation, event)).toBe(true)
    expect(triggerMatches(automation, { ...event, payload: { fieldKey: 'other_field', attributePath: 'custom_attributes.other_field' } })).toBe(false)
  })
})
