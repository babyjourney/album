// Life chapters (colored date ranges) — GET list, POST create, DELETE.
// Family tier.
import { supabase } from '../../../lib/supabaseClient'
import { requireAuthOrAdmin } from '../../../lib/authMiddleware'
import { requireFeature } from '../../../lib/requireFeature'
import { resolveFamilyId, canWrite } from '../../../lib/childRecord'

async function handler(req, res) {
  const familyId = resolveFamilyId(req)
  if (!familyId) return res.status(400).json({ error: 'familyId lipsește', errorKey: 'errFamilyIdRequired' })

  try {
    if (req.method === 'GET') {
      const childId = req.query.childId || null
      let q = supabase.from('life_chapters').select('*').eq('family_id', familyId)
      if (childId) q = q.eq('child_id', childId)
      const { data, error } = await q
        .order('display_order', { ascending: true })
        .order('start_date', { ascending: true })
      if (error) throw error
      return res.status(200).json({ success: true, chapters: data || [] })
    }

    if (req.method === 'POST') {
      if (!canWrite(req)) return res.status(403).json({ error: 'Necesită rol de editor', errorKey: 'errEditorRole' })
      const { childId, title, description, hashtags, color, startDate, endDate, displayOrder } = req.body || {}
      if (!title || !title.trim()) return res.status(400).json({ error: 'Titlul este obligatoriu', errorKey: 'errTitleRequired' })

      // (Item 11) Hashtags let an event pull in matching posts even when they
      // fall outside its date range. Accept a raw string or an array; normalize
      // to bare lowercase tags so they agree with how posts store them.
      const tagList = (Array.isArray(hashtags) ? hashtags : String(hashtags || '').split(/[\s,]+/))
        .map((t) => String(t).trim().toLowerCase().replace(/^#/, ''))
        .filter(Boolean)
        .slice(0, 10)

      const payload = {
        family_id: familyId,
        child_id: childId || null,
        title: title.trim(),
        color: color || '#7c3aed',
        start_date: startDate || null,
        end_date: endDate || null,
        display_order: displayOrder || 0,
        description: (description || '').trim(),
        hashtags: tagList.length ? tagList : null,
      }

      let { data, error } = await supabase
        .from('life_chapters').insert(payload).select().single()

      // description/hashtags come from sql/sergiu_batch2.sql. On a deployment
      // that hasn't run it, still save the event rather than failing outright —
      // but TELL the client what was dropped, so the user isn't shown a clean
      // success for an event that silently lost its text and tags.
      let warning = null
      if (error && /description|hashtags/i.test(error.message || '')) {
        console.warn('life_chapters missing description/hashtags — run sql/sergiu_batch2.sql')
        const { description: _d, hashtags: _h, ...legacy } = payload
        ;({ data, error } = await supabase
          .from('life_chapters').insert(legacy).select().single())
        if (!error && (payload.description || payload.hashtags)) warning = 'chapterFieldsDroppedWarning'
      }

      if (error) throw error
      return res.status(200).json({ success: true, chapter: data, warning })
    }

    if (req.method === 'DELETE') {
      if (!canWrite(req)) return res.status(403).json({ error: 'Necesită rol de editor', errorKey: 'errEditorRole' })
      const id = req.query.id || req.body?.id
      if (!id) return res.status(400).json({ error: 'id lipsește', errorKey: 'errIdRequired' })
      const { error } = await supabase
        .from('life_chapters').delete().eq('id', id).eq('family_id', familyId)
      if (error) throw error
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Metoda nu este permisă' })
  } catch (err) {
    console.error('chapters api error:', err)
    return res.status(500).json({ error: err.message || 'Eroare internă', errorKey: 'errServerInternal' })
  }
}

export default requireAuthOrAdmin(requireFeature('lifeChapters', handler))
