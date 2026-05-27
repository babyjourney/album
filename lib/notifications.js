// Notification dispatch — email (Resend HTTP API) + SMS (Twilio HTTP API).
//
// Both transports are optional: if the required environment variables aren't
// set, the helper logs the payload to the server console and returns success.
// That keeps local dev usable without provisioning external services and lets
// production drop-in real credentials when ready.
//
// REQUIRED ENV (production):
//   RESEND_API_KEY            — for sendEmail()
//   RESEND_FROM_EMAIL         — default sender (e.g. "BabyJourney <hello@babyjourney.life>")
//   TWILIO_ACCOUNT_SID        — for sendSms()
//   TWILIO_AUTH_TOKEN
//   TWILIO_FROM_NUMBER        — e.g. "+15555555555"
//
// All functions return a Promise<{ ok: boolean, channel: string, mocked?: boolean, error?: string }>.

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || 'BabyJourney <noreply@babyjourney.life>'

  if (!apiKey) {
    // Dev / unconfigured fallback — log so a developer can complete the flow.
    console.log('[notifications] EMAIL (MOCKED — no RESEND_API_KEY):', {
      from, to, subject,
      preview: (text || html || '').slice(0, 200),
    })
    return { ok: true, channel: 'email', mocked: true }
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html, text }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[notifications] Resend send failed:', res.status, body)
      return { ok: false, channel: 'email', error: `Resend HTTP ${res.status}` }
    }
    return { ok: true, channel: 'email' }
  } catch (err) {
    console.error('[notifications] Resend error:', err)
    return { ok: false, channel: 'email', error: err.message }
  }
}

export async function sendSms({ to, body }) {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM_NUMBER

  if (!sid || !token || !from) {
    console.log('[notifications] SMS (MOCKED — Twilio not configured):', {
      from, to, body,
    })
    return { ok: true, channel: 'sms', mocked: true }
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`
    const params = new URLSearchParams({ From: from, To: to, Body: body })
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[notifications] Twilio send failed:', res.status, body)
      return { ok: false, channel: 'sms', error: `Twilio HTTP ${res.status}` }
    }
    return { ok: true, channel: 'sms' }
  } catch (err) {
    console.error('[notifications] Twilio error:', err)
    return { ok: false, channel: 'sms', error: err.message }
  }
}

// Convenience wrappers for the OTP / PIN-reset emails so the templates live
// in one place. Each returns the same shape as sendEmail/sendSms.
export function sendOtpEmail({ to, code, purpose }) {
  const purposeText = purpose === 'reset_pin'
    ? 'pentru a-ți reseta PIN-ul'
    : 'pentru a finaliza autentificarea'
  return sendEmail({
    to,
    subject: `Codul tău BabyJourney: ${code}`,
    text: `Salut,\n\nCodul tău de verificare ${purposeText} este: ${code}\n\nCodul este valabil 10 minute. Dacă nu ai inițiat această cerere, ignoră acest mesaj.\n\n— BabyJourney`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="font-size: 20px; margin: 0 0 16px;">Codul tău BabyJourney</h2>
        <p style="color: #555; margin: 0 0 20px;">Codul tău de verificare ${purposeText}:</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #7c3aed; margin: 0 0 20px; font-family: 'JetBrains Mono', monospace;">${code}</p>
        <p style="color: #888; font-size: 13px; margin: 0;">Codul este valabil 10 minute. Dacă nu ai inițiat această cerere, ignoră acest mesaj.</p>
      </div>
    `,
  })
}

export function sendOtpSms({ to, code, purpose }) {
  const purposeText = purpose === 'reset_pin' ? 'pentru resetare PIN' : 'pentru login'
  return sendSms({
    to,
    body: `BabyJourney: codul tau ${purposeText} este ${code}. Valabil 10 min. Daca nu ai cerut acest cod, ignora.`,
  })
}
