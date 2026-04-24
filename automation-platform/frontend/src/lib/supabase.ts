import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseBrowserConfig, isSupabaseConfigured } from '../config/public-env'

const { url, anonKey } = getSupabaseBrowserConfig()

export const supabase: SupabaseClient = createClient(url, anonKey)

export { isSupabaseConfigured as supabaseConfigured }
