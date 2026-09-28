import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

const isServer = typeof window === 'undefined'

export const HAS_SERVICE_ROLE = isServer && !!serviceRoleKey

if (isServer && !serviceRoleKey) {
  console.error(
    '\n[supabase] ⛔ SUPABASE_SERVICE_ROLE_KEY is MISSING from .env.local.\n' +
    '           Server-side writes to RLS-locked tables (families, photos,\n' +
    '           verification_codes, ...) WILL FAIL with:\n' +
    '             "new row violates row-level security policy"\n' +
    '           To fix:\n' +
    '             1. Supabase Dashboard → Settings → API → copy "service_role" secret\n' +
    '             2. Add to .env.local:  SUPABASE_SERVICE_ROLE_KEY=<that secret>\n' +
    '             3. RESTART the dev server (Ctrl+C, then `npm run dev`)\n'
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

export function assertServerHasServiceRole() {
  if (!isServer) {
    return { error: 'assertServerHasServiceRole called from the browser', code: 'CLIENT_CALL' }
  }
  if (!serviceRoleKey) {
    return {
      error:
        'Configurare incompletă: SUPABASE_SERVICE_ROLE_KEY lipsește din .env.local.\n' +
        'Adaugă cheia service_role (Supabase Dashboard → Settings → API) și ' +
        'repornește serverul (npm run dev).',
      code: 'MISSING_SERVICE_ROLE_KEY',
      hint: 'Fără service_role, scrierile în tabele cu RLS strict sunt blocate ' +
            '— exact așa cum trebuie să fie pentru securitate.',
    }
  }
  return null
}
