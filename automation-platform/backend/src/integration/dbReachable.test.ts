/**
 * Automated checks: `npm run test:integration` (Vitest).
 *
 * Manual end-to-end (after `supabase db push` and env files filled):
 * 1. `npm run dev` in backend; `npm run dev` in frontend.
 * 2. Sign up / sign in, create a workspace, add message templates, copy template UUIDs into an automation graph JSON, set automation active.
 * 3. Workspace → WhatsApp → Start session, scan QR, wait for status connected.
 * 4. From another phone, send a message to the paired number; reply at a branch step and confirm Message log shows inbound/outbound rows and contact_flow_state advances.
 */
import 'dotenv/config'
import { describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

describe('Supabase connectivity', () => {
  it.skipIf(!url || !key)('service role can read public.profiles', async () => {
    const admin = createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error } = await admin.from('profiles').select('id').limit(1)
    expect(error).toBeNull()
  })
})
