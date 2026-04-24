/**
 * Validates JSON for `contacts.metadata` (custom attributes object).
 */
export function parseContactMetadataJson(json: string): Record<string, unknown> {
  const trimmed = json.trim()
  if (!trimmed || trimmed === '{}') {
    return {}
  }
  const parsed: unknown = JSON.parse(trimmed)
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Custom attributes must be a JSON object, e.g. {"plan":"Pro"}')
  }
  return parsed as Record<string, unknown>
}
