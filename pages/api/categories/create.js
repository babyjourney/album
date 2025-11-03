import { supabase } from '../../../lib/supabaseClient'
import { requireEditor } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { value, label, emoji } = req.body
  const familyId = req.auth.familyId

  if (!value || !label) {
    return res.status(400).json({ error: 'Value and label are required' })
  }

  try {
    // Check if table exists first
    const { data: testData, error: testError } = await supabase
      .from('family_categories')
      .select('id')
      .limit(1)

    // If table doesn't exist, return error with migration info
    if (testError && (testError.message.includes('does not exist') || testError.code === '42P01')) {
      return res.status(400).json({ 
        error: 'Categories system needs migration. Please run migration first.',
        needsMigration: true
      })
    }

    // Check if category value already exists for this family
    const { data: existing } = await supabase
      .from('family_categories')
      .select('id')
      .eq('family_id', familyId)
      .eq('category_value', value)
      .single()

    if (existing) {
      return res.status(400).json({ error: 'Category with this value already exists' })
    }

    // Create new category
    const { data: newCategory, error } = await supabase
      .from('family_categories')
      .insert({
        family_id: familyId,
        category_value: value,
        category_label: label,
        category_emoji: emoji || '📝'
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    res.status(201).json({
      success: true,
      category: {
        value: newCategory.category_value,
        label: newCategory.category_label,
        emoji: newCategory.category_emoji
      }
    })
  } catch (error) {
    console.error('Error creating category:', error)
    res.status(500).json({ error: 'Failed to create category' })
  }
}

export default requireEditor(handler)