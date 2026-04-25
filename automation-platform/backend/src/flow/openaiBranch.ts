import OpenAI from 'openai'
import { env } from '../config/env.js'
import { parseGptBranchChoice } from './graphRuntime.js'

export type BranchOption = { id: string; label: string; hint: string }

export async function chooseBranchOption(
  userMessage: string,
  options: BranchOption[],
  settings: { routingInstructions?: string; allowFallback?: boolean } = {},
): Promise<string | null> {
  if (!env.OPENAI_API_KEY) {
    return settings.allowFallback ? null : (options[0]?.id ?? null)
  }
  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })
  const fallbackRule = settings.allowFallback
    ? 'If the reply is unclear or does not match any route, return {"chosenOptionId":null}.'
    : 'If unclear, pick the most neutral route, else the first option.'
  const sys = `You route WhatsApp replies in a business automation. Pick the option id that best matches the user's latest message. Reply with JSON only: {"chosenOptionId":"<id>"} using one of these ids: ${options.map((o) => o.id).join(', ')}. ${fallbackRule}`
  const user = JSON.stringify({
    userMessage,
    routingInstructions: settings.routingInstructions ?? '',
    options: options.map((o) => ({ id: o.id, label: o.label, hint: o.hint })),
  })
  const res = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: user },
    ],
    temperature: 0.2,
  })
  const text = res.choices[0]?.message?.content?.trim() ?? ''
  const id = parseGptBranchChoice(text)
  if (id && options.some((o) => o.id === id)) return id
  return options[0]?.id ?? null
}
