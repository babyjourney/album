import { supabase } from '../../../lib/supabaseClient'
import { requireEditor, verifyFamilyOwnership } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Metoda nu este permisă' })
  }

  const { photoId, fileUrl } = req.body

  if (!photoId) {
    return res.status(400).json({ error: 'ID-ul fotografiei este obligatoriu' })
  }

  try {
    // Verify the photo belongs to the authenticated family
    const ownershipCheck = await verifyFamilyOwnership(req.auth.familyId, 'photos', photoId)

    if (!ownershipCheck.isOwner) {
      return res.status(403).json({
        error: ownershipCheck.error || 'Nu aveți permisiunea să ștergeți această fotografie',
        code: 'FORBIDDEN'
      })
    }

    // Read every storage object this post owns BEFORE deleting the row —
    // afterwards there's nothing left to tell us which files to clean up.
    // Includes the video posters (item 2), which would otherwise be orphaned in
    // the bucket forever, quietly costing storage.
    let ownedUrls = []
    try {
      const { data: row } = await supabase
        .from('photos')
        .select('file_url, file_urls, poster_urls')
        .eq('id', photoId)
        .single()

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
      // poster_urls may not exist yet (sql/sergiu_batch2.sql) — fall back to the
      // single fileUrl the client sent, which is the old behaviour.
      console.warn('delete: could not read owned files:', lookupErr?.message)
    }

    // Delete from database - now with family verification
    const { error: dbError } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId)
      .eq('family_id', req.auth.familyId) // Double-check family ownership

    if (dbError) {
      throw dbError
    }

    // Delete every object this post owned: all media plus their posters. Falls
    // back to the single fileUrl the client sent if the lookup above failed.
    const urlsToRemove = ownedUrls.length ? ownedUrls : (fileUrl ? [fileUrl] : [])
    if (urlsToRemove.length) {
      try {
        // Public URLs look like .../album_uploads/<familyId>/<file>; the storage
        // path is the last two segments.
        const paths = [...new Set(
          urlsToRemove.map((url) => url.split('/').slice(-2).join('/'))
        )]

        await supabase.storage
          .from('album_uploads')
          .remove(paths)
      } catch (storageError) {
        console.warn('Failed to delete files from storage:', storageError)
        // Don't fail the entire operation if storage deletion fails
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Fotografia a fost ștearsă cu succes'
    })

  } catch (error) {
    console.error('Photo delete error:', error)
    return res.status(500).json({ error: 'Ștergerea fotografiei a eșuat' })
  }
}

// Export with authentication middleware
export default requireEditor(handler)