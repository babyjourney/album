import { DEFAULT_CATEGORIES, ESSENTIAL_CATEGORIES, canonicalCategoryLabel } from './defaultCategories'
export { DEFAULT_CATEGORIES } from './defaultCategories'

let categoriesCache = null
let cacheTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000

export async function getCategories() {
  if (typeof window === 'undefined') return DEFAULT_CATEGORIES
  
  const now = Date.now()
  if (categoriesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return categoriesCache
  }
  
  try {
    let authenticatedFetch
    try {
      const authModule = await import('./pinAuth')
      authenticatedFetch = authModule.authenticatedFetch
    } catch {
      authenticatedFetch = fetch
    }
    
    const response = await authenticatedFetch('/api/categories/list', {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const result = await response.json()
      if (result.success && result.categories) {
        categoriesCache = result.categories
        cacheTimestamp = now
        return result.categories
      }
    }
  } catch (error) {
    console.log('API not available, using localStorage fallback:', error.message)
  }
  
  try {
    const categories = getCategoriesFromLocalStorage()
    if (categories && categories.length > 0) {
      categoriesCache = categories
      cacheTimestamp = now
      return categories
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error)
  }
  
  categoriesCache = DEFAULT_CATEGORIES
  cacheTimestamp = now
  return DEFAULT_CATEGORIES
}

export function getCategoriesSync() {
  if (categoriesCache) {
    return categoriesCache
  }
  return DEFAULT_CATEGORIES
}

function clearCache() {
  categoriesCache = null
  cacheTimestamp = 0
}

export function clearCategoriesCache() {
  clearCache()
}

const withCanonicalLabel = (category, fallbackValue) => {
  const value = category?.value || fallbackValue
  const label = typeof category?.label === 'string' && category.label.trim()
    ? canonicalCategoryLabel(value, category.label)
    : category?.label
  return { ...category, value, label }
}

export async function addCategory(rawCategory) {
  const newCategory = withCanonicalLabel(rawCategory)
  try {
    let authenticatedFetch
    try {
      const authModule = await import('./pinAuth')
      authenticatedFetch = authModule.authenticatedFetch
    } catch {
      authenticatedFetch = fetch
    }
    
    const response = await authenticatedFetch('/api/categories/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newCategory)
    })
    
    if (response.ok) {
      const result = await response.json()
      if (result.success) {
        clearCache()
        return await getCategories()
      }
    }
    
    throw new Error('API failed')
  } catch (error) {
    console.log('API add failed, using localStorage fallback:', error.message)
    
    try {
      const categories = await getCategoriesFromLocalStorage()
      
      if (categories.some(cat => cat.value === newCategory.value)) {
        throw new Error('Category with this value already exists')
      }
      
      const updatedCategories = [...categories, newCategory]
      saveCategoriesToLocalStorage(updatedCategories)
      clearCache()
      return updatedCategories
    } catch (localError) {
      console.error('localStorage fallback failed:', localError)
      throw localError
    }
  }
}

function getCategoriesFromLocalStorage() {
  try {
    const familyId = getCurrentFamilyId()
    if (!familyId) return DEFAULT_CATEGORIES
    
    const stored = localStorage.getItem(`customCategories_${familyId}`)
    if (stored) {
      const customCategories = JSON.parse(stored)
      return customCategories.length > 0 ? customCategories : DEFAULT_CATEGORIES
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error)
  }
  return DEFAULT_CATEGORIES
}

function saveCategoriesToLocalStorage(categories) {
  try {
    const familyId = getCurrentFamilyId()
    if (familyId) {
      localStorage.setItem(`customCategories_${familyId}`, JSON.stringify(categories))
    }
  } catch (error) {
    console.error('Error saving to localStorage:', error)
  }
}

function getCurrentFamilyId() {
  try {
    const authSession = localStorage.getItem('family_session')
    if (authSession) {
      const parsed = JSON.parse(authSession)
      return parsed.familyId
    }
  } catch (error) {
    console.error('Error getting family ID:', error)
  }
  return null
}

export async function updateCategory(categoryValue, rawCategory) {
  const updatedCategory = withCanonicalLabel(rawCategory, categoryValue)
  try {
    const { authenticatedFetch } = await import('./pinAuth')
    const response = await authenticatedFetch('/api/categories/update', {
      method: 'PUT',
      body: JSON.stringify({
        oldValue: categoryValue,
        ...updatedCategory
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      if (result.success) {
        clearCache()
        return await getCategories()
      }
    }
    
    throw new Error('API failed')
  } catch (error) {
    console.log('API update failed, using localStorage fallback:', error.message)
    
    const categories = getCategoriesFromLocalStorage()
    const updatedCategories = categories.map(cat => 
      cat.value === categoryValue ? updatedCategory : cat
    )
    saveCategoriesToLocalStorage(updatedCategories)
    clearCache()
    return updatedCategories
  }
}

export async function deleteCategory(categoryValue) {
  if (ESSENTIAL_CATEGORIES.includes(categoryValue)) {
    throw new Error('Cannot delete essential categories')
  }
  
  try {
    const { authenticatedFetch } = await import('./pinAuth')
    const response = await authenticatedFetch('/api/categories/delete', {
      method: 'DELETE',
      body: JSON.stringify({ value: categoryValue })
    })
    
    if (response.ok) {
      const result = await response.json()
      if (result.success) {
        clearCache()
        return await getCategories()
      }
    }
    
    throw new Error('API failed')
  } catch (error) {
    console.log('API delete failed, using localStorage fallback:', error.message)
    
    const categories = getCategoriesFromLocalStorage()
    const updatedCategories = categories.filter(cat => cat.value !== categoryValue)
    saveCategoriesToLocalStorage(updatedCategories)
    clearCache()
    return updatedCategories
  }
}

export async function resetToDefaults() {
  try {
    const { authenticatedFetch } = await import('./pinAuth')
    const response = await authenticatedFetch('/api/categories/reset', {
      method: 'POST'
    })
    
    if (response.ok) {
      const result = await response.json()
      if (result.success) {
        clearCache()
        return result.categories
      }
    }
    
    throw new Error('API failed')
  } catch (error) {
    console.log('API reset failed, using localStorage fallback:', error.message)
    
    saveCategoriesToLocalStorage(DEFAULT_CATEGORIES)
    clearCache()
    return DEFAULT_CATEGORIES
  }
}