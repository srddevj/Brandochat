import crypto from 'node:crypto'

export function verifyCalendlySignature(args: {
  signingKey: string
  signatureHeader: string | undefined
  rawBody: string
}): boolean {
  const { signingKey, signatureHeader, rawBody } = args
  if (!signatureHeader) return false

  const parts = Object.fromEntries(
    signatureHeader
      .split(',')
      .map((chunk) => chunk.trim().split('=', 2))
      .filter((entry): entry is [string, string] => entry.length === 2),
  )
  const timestamp = parts.t
  const signature = parts.v1
  if (!timestamp || !signature) return false

  const signedPayload = `${timestamp}.${rawBody}`
  const digest = crypto.createHmac('sha256', signingKey).update(signedPayload).digest('hex')
  const left = Buffer.from(digest, 'utf8')
  const right = Buffer.from(signature, 'utf8')
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}
