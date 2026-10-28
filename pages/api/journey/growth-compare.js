import { requireAuthOrAdmin } from '../../../lib/authMiddleware'
import { requireFeature } from '../../../lib/requireFeature'
import { getChildRecord, upsertChildRecord, resolveFamilyId, canWrite } from '../../../lib/childRecord'
import { isAllowedStoredImageUrl, isOwnStorageUrl } from '../../../lib/fileTypes'

function compareUrlError(url, familyId) {
  if (url === undefined || url === null || url === '') return null
  if (typeof url !== 'string' || !isAllowedStoredImageUrl(url)) {
    return {
      error: 'Tip de fișier neacceptat. Pentru comparație sunt permise doar fotografii (JPG, PNG, GIF, HEIC/HEIF, WebP, JXL).',
      errorKey: 'errCompareImageTypeNotAllowed',
    }
  }
  if (!isOwnStorageUrl(url, familyId)) {
    return {
      error: 'Fișierul nu aparține acestui album. Încarcă-l din nou și încearcă iar.',
      errorKey: 'errFileNotInAlbum',
    }
  }
  return null
}

async function handler(req, res) {
  const familyId = resolveFamilyId(req)
  if (!familyId) return res.status(400).json({ error: 'familyId lipsește', errorKey: 'errFamilyIdRequired' })

  try {
    if (req.method === 'GET') {
      const childId = req.query.childId || null
      const row = await getChildRecord('growth_compare', familyId, childId)
      return res.status(200).json({ success: true, compare: row })
    }
    if (req.method === 'POST') {
      if (!canWrite(req)) return res.status(403).json({ error: 'Necesită rol de editor', errorKey: 'errEditorRole' })
      const childId = req.body?.childId || null
      const urlError = compareUrlError(req.body?.thenUrl, familyId) || compareUrlError(req.body?.nowUrl, familyId)
      if (urlError) return res.status(400).json(urlError)
      const patch = {}
      if (req.body?.thenUrl !== undefined) patch.then_url = req.body.thenUrl || null
      if (req.body?.nowUrl !== undefined) patch.now_url = req.body.nowUrl || null
      const row = await upsertChildRecord('growth_compare', familyId, childId, patch)
      return res.status(200).json({ success: true, compare: row })
    }
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  } catch (err) {
    console.error('growth-compare api error:', err)
    return res.status(500).json({ error: err.message || 'Eroare internă', errorKey: 'errServerInternal' })
  }
}

export default requireAuthOrAdmin(requireFeature('growthTracking', handler))
