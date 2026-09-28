import { supabase } from '../../../lib/supabaseClient'
import { requireAuthOrAdmin } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { familyId: rawFamilyId, isMultiChild } = req.body
  const familyId = req.auth.isAdmin ? rawFamilyId : req.auth.familyId

  if (!familyId || typeof isMultiChild !== 'boolean') {
    return res.status(400).json({ error: 'Câmpuri obligatorii lipsă sau invalide', errorKey: 'errRequiredFieldsInvalid' })
  }

  try {
    const { data: existing, error: selErr } = await supabase
      .from('album_settings')
      .select('id')
      .eq('family_id', familyId)
      .limit(1)
      .maybeSingle()
    if (selErr) throw selErr

    let data, error
    if (existing) {
      ;({ data, error } = await supabase
        .from('album_settings')
        .update({ is_multi_child: isMultiChild, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single())
    } else {
      ;({ data, error } = await supabase
        .from('album_settings')
        .insert({
          family_id: familyId,
          is_multi_child: isMultiChild,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single())
    }

    if (error) {
      throw error
    }

    return res.status(200).json({
      success: true,
      settings: data
    })

  } catch (error) {
    console.error('Album settings update error:', error)
    return res.status(500).json({ error: `Actualizarea setărilor albumului a eșuat: ${error.message}`, errorKey: 'errAlbumSettingsUpdateFailed' })
  }
}

export default requireAuthOrAdmin(handler, { editorOnlyForFamily: true })
