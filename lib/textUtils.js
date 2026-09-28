export function normalizeText(text) {
  if (!text || typeof text !== 'string') return ''
  
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[șş]/g, 's')
    .replace(/[țţ]/g, 't')
    .replace(/[ăâ]/g, 'a')
    .replace(/[îi]/g, 'i')
    .trim()
}

export function matchesSearch(content, searchTerm) {
  if (!content || !searchTerm) return false
  
  const normalizedContent = normalizeText(content)
  const normalizedSearch = normalizeText(searchTerm)
  
  return normalizedContent.includes(normalizedSearch)
}

export function filterBySearch(items, searchTerm, fields = []) {
  if (!searchTerm || !Array.isArray(items)) return items
  
  const normalizedSearch = normalizeText(searchTerm)
  
  return items.filter(item => {
    return fields.some(field => {
      const fieldValue = item[field]
      if (!fieldValue) return false
      
      if (Array.isArray(fieldValue)) {
        return fieldValue.some(val => matchesSearch(String(val), normalizedSearch))
      }
      
      return matchesSearch(String(fieldValue), normalizedSearch)
    })
  })
}