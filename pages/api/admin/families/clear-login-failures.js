import { supabase } from '../../../../lib/supabaseClient'
import { requireAdmin } from '../../../../lib/authMiddleware'
import { clearLoginFailures } from '../../../../lib/loginFailures'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const UNLOCK_FAILED = { error: 'Nu s-a putut ridica pauza. Încearcă din nou.', errorKey: 'errServerInternal' }

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă', errorKey: 'authErrServer' })
  }

  const familyId = String(req.body?.familyId || '').trim()
  if (!UUID.test(familyId)) {
    return res.status(400).json({ error: 'ID-ul familiei este obligatoriu', errorKey: 'errFamilyIdRequired' })
  }

  const { data: family, error: familyError } = await supabase
    .from('families')
    .select('id, name, email, phone_number')
    .eq('id', familyId)
    .maybeSingle()
  if (familyError) {
    console.error('[admin] clear-login-failures: family lookup failed:', familyError.message || familyError)
    return res.status(500).json(UNLOCK_FAILED)
  }
  if (!family) {
    return res.status(404).json({ error: 'Familia nu există.', errorKey: 'errResourceNotFound' })
  }

  const result = await clearLoginFailures(family)
  if (!result.ok) {
    return res.status(500).json(UNLOCK_FAILED)
  }

  console.info(`[admin] cleared the wrong-PIN count of family ${familyId} (store: ${result.store})`)
  return res.status(200).json({
    success: true,
    stored: result.store === 'on',
    family: { id: family.id, name: family.name },
  })
}

export default requireAdmin(handler)
