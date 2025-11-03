// Utility to clean old global categories and migrate to family-specific ones
export function cleanOldCategories() {
  try {
    // Remove the old global categories
    localStorage.removeItem('customCategories')
    console.log('✅ Cleaned old global categories from localStorage')
  } catch (error) {
    console.error('Error cleaning old categories:', error)
  }
}

// Run this when the app loads to ensure clean state
if (typeof window !== 'undefined') {
  // Clean old categories immediately
  cleanOldCategories()
}