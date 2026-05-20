import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// On the server (API routes, getServerSideProps) we want service_role so
// RLS-locked tables are readable/writable by our authenticated API code.
// On the browser we MUST stay on the anon key (the service role key must
// never reach the bundle).
const isServer = typeof window === 'undefined'

if (isServer && !serviceRoleKey) {
  // Don't crash dev — but make it loud. Without service_role, every
  // table query returns empty because RLS denies anon.
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] SUPABASE_SERVICE_ROLE_KEY is missing. API queries will run as anon ' +
    'and be denied by RLS. Set it in .env.local (Supabase Dashboard → Settings → API).'
  )
}

const keyToUse = isServer && serviceRoleKey ? serviceRoleKey : supabaseAnonKey

export const supabase = createClient(supabaseUrl, keyToUse, {
  auth: {
    autoRefreshToken: !isServer,
    persistSession:   !isServer,
    detectSessionInUrl: !isServer,
  },
})
