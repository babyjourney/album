import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { pin } = req.body

  if (!pin) {
    return res.status(400).json({ error: 'PIN-ul este obligatoriu' })
  }

  // Remove any spaces and validate PIN format
  const cleanPin = pin.toString().replace(/\s/g, '')
  
  if (!/^\d{4}$|^\d{8}$/.test(cleanPin)) {
    return res.status(400).json({ error: 'PIN-ul trebuie să aibă 4 sau 8 cifre' })
  }

  try {
    let family = null
    let role = null

    // Check if it's a 4-digit viewer PIN
    if (cleanPin.length === 4) {
      const { data, error } = await supabase
        .from('families')
        .select('id, name, viewer_pin')
        .eq('viewer_pin', cleanPin)
        .single()

      if (!error && data) {
        family = data
        role = 'viewer'
      }
    }

    // Check if it's an 8-digit editor PIN
    if (cleanPin.length === 8 && !family) {
      const { data, error } = await supabase
        .from('families')
        .select('id, name, editor_pin')
        .eq('editor_pin', cleanPin)
        .single()

      if (!error && data) {
        family = data
        role = 'editor'
      }
    }

    // If no family found with this PIN
    if (!family) {
      return res.status(401).json({ error: 'PIN invalid' })
    }

    // Return success with family info and role
    return res.status(200).json({
      success: true,
      family: {
        id: family.id,
        name: family.name
      },
      role,
      message: `Conectat ca ${role === 'viewer' ? 'vizualizator' : 'editor'} pentru ${family.name}`
    })

  } catch (error) {
    console.error('PIN login error:', error)
    return res.status(500).json({ error: 'Eroare internă a serverului' })
  }
}