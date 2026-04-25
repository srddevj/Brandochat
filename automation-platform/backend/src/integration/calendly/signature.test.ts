import crypto from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifyCalendlySignature } from './signature.js'

describe('verifyCalendlySignature', () => {
  it('returns true for valid signature', () => {
    const signingKey = 'test_signing_key'
    const rawBody = '{"event":"invitee.created"}'
    const timestamp = '1714041111'
    const digest = crypto.createHmac('sha256', signingKey).update(`${timestamp}.${rawBody}`).digest('hex')
    const signatureHeader = `t=${timestamp},v1=${digest}`

    const ok = verifyCalendlySignature({ signingKey, signatureHeader, rawBody })
    expect(ok).toBe(true)
  })

  it('returns false for invalid signature', () => {
    const ok = verifyCalendlySignature({
      signingKey: 'test_signing_key',
      signatureHeader: 't=1714041111,v1=deadbeef',
      rawBody: '{"event":"invitee.created"}',
    })
    expect(ok).toBe(false)
  })
})
