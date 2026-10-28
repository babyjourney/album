import { supabase } from '../../../lib/supabaseClient'
import { requireAuthOrAdmin } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { childId } = req.body

  if (!childId) {
    return res.status(400).json({ error: 'ID-ul copilului este obligatoriu', errorKey: 'errIdRequired' })
  }

  try {
    const { data: childData, error: fetchError } = await supabase
      .from('children')
      .select('id, family_id, name')
      .eq('id', childId)
      .single()

    if (fetchError || !childData) {
      return res.status(404).json({ error: 'Copilul nu a fost găsit', errorKey: 'errChildNotFound' })
    }

    if (!req.auth.isAdmin && childData.family_id !== req.auth.familyId) {
      return res.status(403).json({ error: 'Accesul la această resursă este interzis', errorKey: 'errResourceForbidden' })
    }

    const { error: deleteError } = await supabase
      .from('children')
      .delete()
      .eq('id', childId)
      .eq('family_id', childData.family_id)

    if (deleteError) {
      console.error('Error deleting child:', deleteError)
      return res.status(500).json({ error: 'Ștergerea copilului a eșuat', errorKey: 'errServerInternal' })
    }

    res.status(200).json({
      success: true,
      message: `Copilul ${childData.name} a fost eliminat`,
      deletedChild: childData
    })
  } catch (error) {
    console.error('Error in delete child API:', error)
    res.status(500).json({ error: 'Eroare internă', errorKey: 'errServerInternal' })
  }
}

export default requireAuthOrAdmin(handler, { editorOnlyForFamily: true })
