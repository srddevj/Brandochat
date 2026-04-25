import { describe, expect, it } from 'vitest'
import {
  applyTemplateVars,
  buildContactPlaceholderVars,
  parseGptBranchChoice,
  parseGraph,
  readVariable,
} from './graphRuntime.js'

describe('applyTemplateVars', () => {
  it('replaces known keys', () => {
    expect(applyTemplateVars('Hi {{name}}', { name: 'Ada' })).toBe('Hi Ada')
  })
  it('trims key whitespace', () => {
    expect(applyTemplateVars('{{  x  }}', { x: 'y' })).toBe('y')
  })
})

describe('parseGptBranchChoice', () => {
  it('parses strict json', () => {
    expect(parseGptBranchChoice('{"chosenOptionId":"yes"}')).toBe('yes')
  })
  it('falls back to regex', () => {
    expect(parseGptBranchChoice('prefix {"chosenOptionId": "no"} suffix')).toBe('no')
  })
})

describe('buildContactPlaceholderVars', () => {
  it('maps columns and metadata keys', () => {
    const v = buildContactPlaceholderVars({
      display_name: 'Ada',
      phone_e164: '+491234',
      wa_jid: '491234@s.whatsapp.net',
      notes: 'VIP',
      metadata: {
        first_name: 'Ada',
        last_name: 'Lovelace',
        birthday: '1815-12-10',
        custom_attributes: {
          plan: { type: 'string', value: 'Pro' },
          seats: { type: 'integer', value: 12 },
        },
        legacy_tags: ['a', 'b'],
      },
    })
    expect(v['contact.display_name']).toBe('Ada')
    expect(v['contact.first_name']).toBe('Ada')
    expect(v['contact.birthday']).toBe('1815-12-10')
    expect(v['contact.attr.plan']).toBe('Pro')
    expect(v['contact.attr.seats']).toBe('12')
    expect(v['contact.attr.legacy_tags']).toBe('a, b')
  })
})

describe('parseGraph', () => {
  it('accepts valid graph', () => {
    const g = parseGraph({
      entry: 'start',
      nodes: { start: { type: 'end' } },
    })
    expect(g?.entry).toBe('start')
    expect(g?.nodes.start.type).toBe('end')
  })
  it('rejects invalid', () => {
    expect(parseGraph(null)).toBeNull()
    expect(parseGraph({})).toBeNull()
  })
})

describe('extended graph nodes', () => {
  it('accepts ai reply router and skill nodes', () => {
    const g = parseGraph({
      entry: 'ask',
      nodes: {
        ask: {
          type: 'branch',
          expectedReplyCount: 2,
          routingInstructions: 'Route pricing questions to sales and problems to support.',
          fallbackNext: 'end',
          options: [
            { id: 'sales', label: 'Sales', hint: 'customer wants pricing, buying, or demos', next: 'skill' },
            { id: 'support', label: 'Support', hint: 'customer needs help', next: 'end' },
          ],
        },
        skill: {
          type: 'aiSkill',
          instructions: 'Ask one follow-up question',
          outputVariable: 'skillReply',
          sendAsMessage: true,
          next: 'end',
        },
        end: { type: 'end' },
      },
    })

    expect(g?.nodes.ask.type).toBe('branch')
    expect(g?.nodes.ask.type === 'branch' ? g.nodes.ask.fallbackNext : '').toBe('end')
    expect(g?.nodes.skill.type).toBe('aiSkill')
  })

  it('reads variables by exact key', () => {
    expect(readVariable('contact.attr.plan', { 'contact.attr.plan': 'Pro' })).toBe('Pro')
    expect(readVariable('missing', {})).toBe('')
  })
})
