export type GraphNode =
  | { type: 'send'; templateId: string; next?: string }
  | {
      type: 'branch'
      options: Array<{ id: string; next: string; label: string; hint: string }>
    }
  | { type: 'end' }

export type AutomationGraph = {
  entry: string
  nodes: Record<string, GraphNode>
}

export function applyTemplateVars(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key: string) => {
    const k = key.trim()
    return vars[k] ?? ''
  })
}

function stringifyAttrValue(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return value.map((v) => stringifyAttrValue(v)).filter(Boolean).join(', ')
  }
  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

/**
 * Maps DB contact row + JSON `metadata` (custom attributes) into template keys.
 * Use in templates: {{contact.display_name}}, {{contact.phone_e164}}, {{contact.wa_jid}}, {{contact.notes}},
 * and for each metadata entry `plan: "Pro"` → {{contact.attr.plan}}
 */
export function buildContactPlaceholderVars(contact: {
  display_name: string | null
  phone_e164: string | null
  wa_jid: string
  notes: string | null
  metadata: Record<string, unknown> | null | undefined
}): Record<string, string> {
  const meta =
    contact.metadata && typeof contact.metadata === 'object' && !Array.isArray(contact.metadata)
      ? contact.metadata
      : {}
  const out: Record<string, string> = {
    'contact.display_name': contact.display_name ?? '',
    'contact.phone_e164': contact.phone_e164 ?? '',
    'contact.wa_jid': contact.wa_jid,
    'contact.notes': contact.notes ?? '',
  }
  for (const [rawKey, value] of Object.entries(meta)) {
    const safe = rawKey.replace(/[^\w.-]/g, '_')
    out[`contact.attr.${safe}`] = stringifyAttrValue(value)
  }
  return out
}

export function parseGraph(raw: unknown): AutomationGraph | null {
  if (!raw || typeof raw !== 'object') return null
  const g = raw as Record<string, unknown>
  if (typeof g.entry !== 'string' || !g.nodes || typeof g.nodes !== 'object') return null
  return { entry: g.entry, nodes: g.nodes as Record<string, GraphNode> }
}

export function parseGptBranchChoice(content: string): string | null {
  const trimmed = content.trim()
  try {
    const j = JSON.parse(trimmed) as { chosenOptionId?: string }
    if (j.chosenOptionId && typeof j.chosenOptionId === 'string') return j.chosenOptionId
  } catch {
    const m = trimmed.match(/"chosenOptionId"\s*:\s*"([^"]+)"/)
    if (m) return m[1] ?? null
  }
  return null
}
