import { describe, expect, it } from 'vitest'
import { extractInviteePhone, normalizePhone, toCalendlyTriggerPayload } from './mapper.js'

describe('calendly mapper', () => {
  it('normalizes phone formats', () => {
    expect(normalizePhone('+49 163 7779775')).toBe('+491637779775')
    expect(normalizePhone('0049 163 7779775')).toBe('+491637779775')
    expect(normalizePhone('(916) 377-79775')).toBe('+91637779775')
  })

  it('extracts phone from text reminder number first', () => {
    const phone = extractInviteePhone({
      payload: {
        text_reminder_number: '+49 163 7779775',
        questions_and_answers: [{ question: 'Handynummer', answer: '+49 1111111111' }],
      },
    })
    expect(phone).toBe('+491637779775')
  })

  it('extracts phone from invitee questions fallback', () => {
    const phone = extractInviteePhone({
      payload: {
        questions_and_answers: [{ question: 'Handynummer', answer: '+49 163 7779775' }],
      },
    })
    expect(phone).toBe('+491637779775')
  })

  it('maps trigger payload fields', () => {
    const payload = toCalendlyTriggerPayload({
      event: 'invitee.created',
      payload: {
        invitee: { name: 'Thomas Wiest', email: 'thomas@example.com' },
        text_reminder_number: '+49 163 7779775',
        scheduled_event: {
          start_time: '2026-04-25T10:00:00Z',
          end_time: '2026-04-25T10:30:00Z',
          event_type: 'https://api.calendly.com/event_types/AAA',
          uri: 'https://api.calendly.com/scheduled_events/BBB',
        },
      },
    })

    expect(payload.calendlyEvent).toBe('invitee.created')
    expect(payload.inviteeName).toBe('Thomas Wiest')
    expect(payload.inviteeEmail).toBe('thomas@example.com')
    expect(payload.inviteePhone).toBe('+491637779775')
    expect(payload.meetingStart).toBe('2026-04-25T10:00:00Z')
  })
})
