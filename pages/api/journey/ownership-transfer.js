// Ownership Transfer at 18 — hand the album to the (now adult) child.
// Reassigns the account contact email and issues a fresh editor PIN, emailed to
// the new owner. Family tier. Editor-only.
import crypto from 'crypto'
import { supabase } from '../../../lib/supabaseClient'
import { requireAuthOrAdmin } from '../../../lib/authMiddleware'
import { requireFeature } from '../../../lib/requireFeature'
import { resolveFamilyId, canWrite } from '../../../lib/childRecord'
import { sendEmail } from '../../../lib/notifications'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function randomPin(length) {
  const max = 10 ** length
  let n
  try { n = crypto.randomInt(0, max) } catch { n = Math.floor(Math.random() * max) }
  return n.toString().padStart(length, '0')
}

async function generateUniqueEditorPin() {
  for (let i = 0; i < 100; i++) {
    const pin = randomPin(8)
    const { data } = await supabase.from('families').select('id').eq('editor_pin', pin).limit(1)
    if (!data || data.length === 0) return pin
  }
  throw new Error('Nu s-a putut genera un PIN unic')
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metoda nu este permisă' })
  if (!canWrite(req)) return res.status(403).json({ error: 'Necesită rol de editor' })

  const familyId = resolveFamilyId(req)
  if (!familyId) return res.status(400).json({ error: 'familyId lipsește' })

  const newEmail = (req.body?.newEmail || '').trim().toLowerCase()
  if (!EMAIL_REGEX.test(newEmail)) {
    return res.status(400).json({ error: 'Adresa de email a noului proprietar nu este validă' })
  }

  try {
    const newPin = await generateUniqueEditorPin()
    const { data: fam, error } = await supabase
      .from('families')
      .update({ email: newEmail, editor_pin: newPin, updated_at: new Date().toISOString() })
      .eq('id', familyId)
      .select('name')
      .single()
    if (error) throw error

    await sendEmail({
      to: newEmail,
      subject: `Ai primit acces complet la albumul ${fam?.name || ''}`,
      text: `Felicitări! Albumul "${fam?.name || ''}" îți aparține acum.\n\nNoul tău PIN de editor (8 cifre): ${newPin}\n\nFolosește-l împreună cu acest email pentru a te autentifica. Păstrează-l în siguranță.\n\n— BabyJourney`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2>Albumul îți aparține acum 🎉</h2>
        <p>Albumul <strong>${fam?.name || ''}</strong> a fost transferat ție.</p>
        <p>Noul tău PIN de editor:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:5px;color:#7c3aed">${newPin}</p>
        <p style="color:#888;font-size:13px">Folosește-l împreună cu acest email pentru a te autentifica.</p>
      </div>`,
    })

    // Return the new PIN so the current editor can confirm/hand it over too.
    return res.status(200).json({ success: true, newEditorPin: newPin, newEmail })
  } catch (err) {
    console.error('ownership-transfer error:', err)
    return res.status(500).json({ error: err.message || 'Eroare internă' })
  }
}

export default requireAuthOrAdmin(requireFeature('ownershipTransfer', handler))
