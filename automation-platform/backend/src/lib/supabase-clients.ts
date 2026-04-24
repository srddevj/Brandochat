import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '../config/env.js'

let adminClient: SupabaseClient | null = null

/** RLS-aware client for the signed-in user (pass their JWT from Authorization header). */
export function createUserClient(accessToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

/** Service role — bypasses RLS. Use only on the server for Baileys sync and trusted writes. */
export function getServiceRoleClient(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return adminClient
}
