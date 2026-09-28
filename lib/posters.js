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

export const getPosterMap = (post) => {
  const map = new Map()
  const posters = getPosterUrls(post)
  if (!posters || posters.length === 0) return map

  const urls = asArray(post?.file_urls)

  if (urls && urls.length) {
    urls.forEach((url, i) => {
      if (url && posters[i]) map.set(url, posters[i])
    })
  } else if (post?.file_url && posters[0]) {
    map.set(post.file_url, posters[0])
  }

  return map
}

export const getPosterForUrl = (post, url) => {
  if (!url) return null
  return getPosterMap(post).get(url) || null
}

export const getCoverPoster = (post) => {
  const map = getPosterMap(post)
  if (map.size === 0) return null

  const direct = post?.file_url ? map.get(post.file_url) : null
  if (direct) return direct

  for (const poster of map.values()) {
    if (poster) return poster
  }
  return null
}
