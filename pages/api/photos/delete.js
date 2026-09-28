import { supabase } from '../../../lib/supabaseClient'
import { requireEditor, verifyFamilyOwnership } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { photoId, fileUrl } = req.body

  if (!photoId) {
    return res.status(400).json({ error: 'ID-ul fotografiei este obligatoriu', errorKey: 'errPhotoIdRequired' })
  }

  try {
    const ownershipCheck = await verifyFamilyOwnership(req.auth.familyId, 'photos', photoId)

    if (!ownershipCheck.isOwner) {
      return res.status(403).json({
        error: ownershipCheck.error || 'Nu aveți permisiunea să ștergeți această fotografie',
        errorKey: ownershipCheck.errorKey || 'errPhotoDeleteForbidden',
        code: 'FORBIDDEN'
      })
    }

    let ownedUrls = []
    try {
      let row = null
      for (const cols of ['file_url, file_urls, poster_urls', 'file_url, file_urls', 'file_url']) {
        const { data, error } = await supabase
          .from('photos')
          .select(cols)
          .eq('id', photoId)
          .single()
        if (!error) { row = data; break }
        const missingColumn = error.code === '42703' || /column|does not exist/i.test(error.message || '')
        if (!missingColumn) throw error
      }

      const asArray = (v) => {
        if (Array.isArray(v)) return v
        if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] } }
        return []
      }
      ownedUrls = [
        row?.file_url,
        ...asArray(row?.file_urls),
        ...asArray(row?.poster_urls),
      ].filter(Boolean)
    } catch (lookupErr) {
      console.warn('delete: could not read owned files:', lookupErr?.message)
    }

    const { error: dbError } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId)
      .eq('family_id', req.auth.familyId)

    if (dbError) {
      throw dbError
    }

    const urlsToRemove = ownedUrls.length ? ownedUrls : (fileUrl ? [fileUrl] : [])
    if (urlsToRemove.length) {
      try {
        const paths = [...new Set(
          urlsToRemove.map((url) => url.split('/').slice(-2).join('/'))
        )]

        await supabase.storage
          .from('album_uploads')
          .remove(paths)
      } catch (storageError) {
        console.warn('Failed to delete files from storage:', storageError)
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Fotografia a fost ștearsă cu succes'
    })

  } catch (error) {
    console.error('Photo delete error:', error)
    return res.status(500).json({ error: 'Ștergerea fotografiei a eșuat', errorKey: 'errPhotoDeleteFailed' })
  }
}

export default requireEditor(handler)