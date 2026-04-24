import { describe, expect, it } from 'vitest'
import {
  applyTemplateVars,
  buildContactPlaceholderVars,
  parseGptBranchChoice,
  parseGraph,
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
      metadata: { plan: 'Pro', tags: ['a', 'b'] },
    })
    expect(v['contact.display_name']).toBe('Ada')
    expect(v['contact.attr.plan']).toBe('Pro')
    expect(v['contact.attr.tags']).toBe('a, b')
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
