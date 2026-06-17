import { supabase } from '../../../lib/supabaseClient'
import { requireAdmin } from '../../../lib/authMiddleware'
import { VALID_PACKAGES, isValidPackage, normalizeTier } from '../../../lib/tiers'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { familyId, package: rawPkg } = req.body

  if (!familyId) {
    return res.status(400).json({ error: 'familyId este obligatoriu' })
  }

  if (!isValidPackage(rawPkg)) {
    return res.status(400).json({
      error: `Pachet invalid. Valori permise: ${VALID_PACKAGES.join(', ')}`
    })
  }

  // Accept legacy aliases (free/premium) but always persist a current tier key.
  const pkg = normalizeTier(rawPkg)

  try {
    const { data, error } = await supabase
      .from('families')
      .update({ package: pkg })
      .eq('id', familyId)
      .select('id, name, package')
      .single()

    if (error) {
      console.error('Error updating family package:', error)
      return res.status(500).json({ error: 'Nu s-a putut actualiza pachetul' })
    }

    return res.status(200).json({
      success: true,
      family: data
    })
  } catch (error) {
    console.error('Set package error:', error)
    return res.status(500).json({ error: 'Eroare internă a serverului' })
  }
}

export default requireAdmin(handler)
