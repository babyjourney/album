export function cleanOldCategories() {
  try {
    localStorage.removeItem('customCategories')
    console.log('✅ Cleaned old global categories from localStorage')
  } catch (error) {
    console.error('Error cleaning old categories:', error)
  }
}

if (typeof window !== 'undefined') {
  cleanOldCategories()
}