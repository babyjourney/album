import { supabase } from '../../../lib/supabaseClient'
import { requireAuthOrAdmin } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { childId } = req.body

  if (!childId) {
    return res.status(400).json({ error: 'Child ID is required' })
  }

  try {
    // First check if the child exists and get family info
    const { data: childData, error: fetchError } = await supabase
      .from('children')
      .select('id, family_id, name')
      .eq('id', childId)
      .single()

    if (fetchError || !childData) {
      return res.status(404).json({ error: 'Child not found' })
    }

    // SECURITY: family sessions can only delete their own family's children
    if (!req.auth.isAdmin && childData.family_id !== req.auth.familyId) {
      return res.status(403).json({ error: 'Accesul la această resursă este interzis' })
    }

    // Delete the child from the database
    const { error: deleteError } = await supabase
      .from('children')
      .delete()
      .eq('id', childId)
      .eq('family_id', childData.family_id) // belt-and-suspenders

    if (deleteError) {
      console.error('Error deleting child:', deleteError)
      return res.status(500).json({ error: 'Failed to delete child' })
    }

    res.status(200).json({
      success: true,
      message: `Child ${childData.name} has been removed successfully`,
      deletedChild: childData
    })
  } catch (error) {
    console.error('Error in delete child API:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export default requireAuthOrAdmin(handler, { editorOnlyForFamily: true })
