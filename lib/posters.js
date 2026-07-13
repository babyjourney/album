// Video poster frames (item 2).
//
// `photos.poster_urls` is a JSONB array index-aligned with `photos.file_urls`:
// poster_urls[i] is a JPEG of the first non-black frame of file_urls[i], or
// null when that entry isn't a video. Captured in the browser at upload time
// (lib/videoCompress.js) so the feed never has to download and decode a video
// just to draw a thumbnail — which is what produced black tiles.
//
// IMPORTANT: lookups here are keyed by URL, not by array index. The UI reorders
// media (the cover is hoisted to the front of the carousel), so an index into
// the displayed list does not match an index into file_urls. Matching on the URL
// is immune to that.
//
// Everything tolerates posts that predate the column: they simply have no
// posters, and callers fall back to runtime frame capture.

// Supabase returns JSONB already parsed, but some code paths hand back a JSON
// string. Accept both.
const asArray = (value) => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : null
    } catch {
      return null
    }
  }
  return null
}

export const getPosterUrls = (post) => asArray(post?.poster_urls)

// Map of media URL -> poster URL for a post. Empty map when the post has none.
export const getPosterMap = (post) => {
  const map = new Map()
  const posters = getPosterUrls(post)
  if (!posters || posters.length === 0) return map

  const urls = asArray(post?.file_urls)

  // `urls.length` matters: an empty JSONB array is still truthy, so testing only
  // `if (urls)` would take this branch, map nothing, and skip the single-file
  // fallback below — losing a poster we actually have.
  if (urls && urls.length) {
    urls.forEach((url, i) => {
      if (url && posters[i]) map.set(url, posters[i])
    })
  } else if (post?.file_url && posters[0]) {
    // Single-file post saved before file_urls existed.
    map.set(post.file_url, posters[0])
  }

  return map
}

// Poster for one specific media URL.
export const getPosterForUrl = (post, url) => {
  if (!url) return null
  return getPosterMap(post).get(url) || null
}

// Poster for whatever the post shows as its cover. `file_url` is set to the
// chosen cover at write time (see /api/posts/create-multi), so this is just a
// lookup — no cover_index arithmetic needed.
export const getCoverPoster = (post) => {
  const map = getPosterMap(post)
  if (map.size === 0) return null

  const direct = post?.file_url ? map.get(post.file_url) : null
  if (direct) return direct

  // Mixed album whose cover is a photo (no poster of its own) but which
  // contains a video — show that video's frame rather than nothing.
  for (const poster of map.values()) {
    if (poster) return poster
  }
  return null
}
