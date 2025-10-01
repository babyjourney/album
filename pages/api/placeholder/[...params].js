export default function handler(req, res) {
  const { params } = req.query
  
  // Extract dimensions from params like [width, height] or just [size]
  let width = 80, height = 80
  
  if (params && params.length >= 1) {
    width = parseInt(params[0]) || 80
    height = params.length >= 2 ? (parseInt(params[1]) || width) : width
  }
  
  // Generate a simple SVG placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#e5e7eb"/>
      <rect width="60%" height="60%" x="20%" y="20%" fill="#d1d5db" rx="8"/>
      <circle cx="40%" cy="35%" r="8%" fill="#9ca3af"/>
      <path d="M25% 60% L35% 50% L45% 60% L65% 40% L75% 60% Z" fill="#9ca3af"/>
    </svg>
  `.trim()
  
  res.setHeader('Content-Type', 'image/svg+xml')
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  res.status(200).send(svg)
}