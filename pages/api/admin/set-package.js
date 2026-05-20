import { supabase } from '../../../lib/supabaseClient'
import { requireAdmin } from '../../../lib/authMiddleware'
import { VALID_PACKAGES } from '../../../lib/packages'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { familyId, package: pkg } = req.body

  if (!familyId) {
    return res.status(400).json({ error: 'familyId este obligatoriu' })
  }

  if (!VALID_PACKAGES.includes(pkg)) {
    return res.status(400).json({
      error: `Pachet invalid. Valori permise: ${VALID_PACKAGES.join(', ')}`
    })
  }

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
