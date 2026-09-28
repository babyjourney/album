import { supabase } from '../../../lib/supabaseClient'
import { requireAuthOrAdmin } from '../../../lib/authMiddleware'
import { getTierLimits, TIERS, FEATURE_MIN_TIER } from '../../../lib/tiers'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { familyId: rawFamilyId, name, profilePictureUrl, birthDate, displayOrder } = req.body

  const familyId = req.auth.isAdmin ? rawFamilyId : req.auth.familyId

  if (!familyId || !name) {
    return res.status(400).json({ error: 'ID-ul familiei și numele sunt obligatorii' })
  }

  if (!req.auth.isAdmin) {
    const { data: fam } = await supabase
      .from('families').select('package').eq('id', familyId).single()
    const maxChildren = getTierLimits(fam?.package).maxChildren
    if (Number.isFinite(maxChildren)) {
      const { count } = await supabase
        .from('children')
        .select('id', { count: 'exact', head: true })
        .eq('family_id', familyId)
      if ((count || 0) >= maxChildren) {
        const min = FEATURE_MIN_TIER.multipleChildren
        return res.status(403).json({
          error: `Planul curent permite ${maxChildren} copil. Treci la planul ${TIERS[min]?.label} pentru mai mulți copii.`,
          code: 'FEATURE_LOCKED',
          feature: 'multipleChildren',
          requiredTier: min,
        })
      }
    }
  }

  try {
    const insertData = {
      family_id: familyId,
      name: name.trim(),
      display_order: displayOrder || 0
    }

    if (profilePictureUrl) {
      insertData.profile_picture_url = profilePictureUrl
    }

    if (birthDate) {
      insertData.birth_date = birthDate
    }

    const { count: priorChildren } = await supabase
      .from('children')
      .select('id', { count: 'exact', head: true })
      .eq('family_id', familyId)

    const { data, error } = await supabase
      .from('children')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      throw error
    }

    if ((priorChildren || 0) === 0) {
      const { error: adoptErr } = await supabase
        .from('skills_progress')
        .update({ child_id: data.id })
        .eq('family_id', familyId)
        .is('child_id', null)

      if (adoptErr) {
        console.warn('Could not attach existing skills to first child:', adoptErr.message)
      }
    }

    return res.status(200).json({
      success: true,
      child: data
    })

  } catch (error) {
    console.error('Child creation error:', error)
    return res.status(500).json({ error: `Crearea copilului a eșuat: ${error.message}` })
  }
}

export default requireAuthOrAdmin(handler, { editorOnlyForFamily: true })
