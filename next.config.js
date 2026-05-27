/** @type {import('next').NextConfig} */

// ─── Security headers (Sergiu 10.03.2026) ──────────────────────────────────
//
// Goals:
//   • Pass Mozilla Observatory / securityheaders.com / SSL Labs scans
//   • No clickjacking (X-Frame-Options DENY)
//   • No MIME sniffing (X-Content-Type-Options nosniff)
//   • Force HTTPS via HSTS (Vercel + custom domain)
//   • Minimum-privilege Permissions-Policy
//   • CSP that allows what we actually load (Supabase, Google Fonts,
//     placeholder avatars, Resend/Twilio are server-side so no browser hit).
//
// We use `'unsafe-inline'` for script-src because pages/_document.js injects
// the theme-bootstrap script via dangerouslySetInnerHTML, and Next.js dev's
// React Refresh also injects inline scripts. Eliminating this requires
// nonce-based CSP via middleware — tracked as a follow-up. Even with
// `unsafe-inline`, the overall posture is dramatically stronger than today
// (no CSP at all).

const SUPABASE_HOST = 'https://*.supabase.co'
const SUPABASE_HOST_2 = 'https://*.supabase.in'
const FONTS_HOST_API = 'https://fonts.googleapis.com'
const FONTS_HOST_STATIC = 'https://fonts.gstatic.com'
const AVATAR_HOST = 'https://ui-avatars.com'

const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
  `style-src 'self' 'unsafe-inline' ${FONTS_HOST_API}`,
  `img-src 'self' data: blob: https: ${SUPABASE_HOST} ${AVATAR_HOST}`,
  `media-src 'self' data: blob: ${SUPABASE_HOST}`,
  `font-src 'self' data: ${FONTS_HOST_STATIC}`,
  `connect-src 'self' ${SUPABASE_HOST} ${SUPABASE_HOST_2} wss://*.supabase.co`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
  `upgrade-insecure-requests`,
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    // Browsers we don't ask for: camera/mic/geo/payment/usb/etc.
    // Without this, third-party scripts could in theory request them.
    value: [
      'accelerometer=()',
      'autoplay=(self)',
      'camera=()',
      'display-capture=()',
      'encrypted-media=()',
      'fullscreen=(self)',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'payment=()',
      'picture-in-picture=(self)',
      'sync-xhr=(self)',
      'usb=()',
    ].join(', '),
  },
  // HSTS — 1 year, all subdomains, preload-eligible.
  // Vercel terminates TLS, so this is safe.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // Cross-Origin isolation — opt-in but harmless and improves spectre/iframe posture.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
]

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['woordcrxapqshfunnvlv.supabase.co'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig
