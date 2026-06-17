// Presentational tile for audio / document posts in grid feeds (where an
// <img>/<video> can't represent the file). Mirrors the look of the text-post
// card. The actual playback/preview happens in PostModal.

import { documentMeta } from '../lib/fileTypes'

export default function MediaTypeCard({ kind, url, title }) {
  const isAudio = kind === 'audio'
  const meta = isAudio ? null : documentMeta(url)
  const icon = isAudio ? '🎧' : (meta?.icon || '📄')
  const label = title || (isAudio ? 'Audio' : (meta?.name || 'Document'))
  const gradient = isAudio
    ? 'linear-gradient(135deg, #f0abfc 0%, #c026d3 50%, #7e22ce 100%)'
    : 'linear-gradient(135deg, #93c5fd 0%, #2563eb 50%, #1e3a8a 100%)'

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: gradient,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 10, padding: 24, textAlign: 'center', overflow: 'hidden',
    }}>
      <div aria-hidden style={{
        position: 'absolute', top: '-30%', left: '-20%', width: '160%', height: '160%',
        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.20) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', zIndex: 1, fontSize: 48 }}>{icon}</div>
      <p style={{
        position: 'relative', zIndex: 1, margin: 0,
        color: '#fff', fontSize: 14, fontWeight: 600, lineHeight: 1.3,
        textShadow: '0 1px 6px rgba(0,0,0,0.25)',
        maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>
        {label}
      </p>
    </div>
  )
}
