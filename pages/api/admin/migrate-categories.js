import { requireAuthOrAdmin } from '../../../lib/authMiddleware'
import { healAllFamiliesCategories } from '../../../lib/categoryMigration'

// Moves every family off the retired category set (Memories/Special/Play/
// Learning → Everyday/Milestones/Adventures/Education), remapping their posts
// first. The same thing happens lazily per family in /api/categories/list, and
// sql/sergiu_batch2.sql does it in SQL — this is the one-shot "do it for
// everyone now" button. Idempotent.
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const { migrated } = await healAllFamiliesCategories()
    res.status(200).json({
      success: true,
      migrated,
      message: `${migrated} famili${migrated === 1 ? 'e' : 'i'} mutate pe noul set de categorii`,
    })
  } catch (error) {
    console.error('Migration error:', error)
    res.status(500).json({ error: 'Migration failed', details: error.message })
  }
}

export default requireAuthOrAdmin(handler, { editorOnlyForFamily: true })
