import { supabase } from '../../../lib/supabaseClient'
import { requireEditor } from '../../../lib/authMiddleware'
import { ensureFamilyCategories } from '../../../lib/categoryMigration'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const familyId = req.auth.familyId

  try {
    // Use the auto-migration function
    const categories = await ensureFamilyCategories(familyId)

    res.status(200).json({
      success: true,
      categories: categories
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    // Fallback to defaults on any error
    res.status(200).json({
      success: true,
      categories: [
        { value: 'memories', label: 'Amintiri', emoji: '💭' },
        { value: 'milestones', label: 'Etape importante', emoji: '🎯' },
        { value: 'everyday', label: 'Zilnic', emoji: '☀️' },
        { value: 'special', label: 'Special', emoji: '✨' },
        { value: 'family', label: 'Familie', emoji: '👨‍👩‍👧‍👦' },
        { value: 'play', label: 'Joacă', emoji: '🎮' },
        { value: 'learning', label: 'Învățare', emoji: '📚' }
      ]
    })
  }
}

export default requireEditor(handler)