// COMPATIBILITY SHIM.
//
// The plan/tier system now lives in lib/tiers.js (3 tiers: starter/family/
// legacy). This file used to define the old free/premium "packages" and is
// still imported by a handful of call sites:
//   • pages/api/photos/upload.js
//   • pages/api/posts/create-multi.js
//   • components/UploadForm.js
//   • pages/api/admin/set-package.js
//
// Re-export the tier helpers under their old names so those imports keep
// working. New code should import from lib/tiers.js directly.

import {
  TIERS,
  VALID_PACKAGES,
  isValidPackage,
  getTierLimits,
  getImageCompressionOptions,
  getVideoLimits,
} from './tiers'

// Old name kept for any callers that referenced PACKAGES directly.
export const PACKAGES = TIERS

export { VALID_PACKAGES, isValidPackage, getImageCompressionOptions, getVideoLimits }

// getPackageLimits(pkg) was the old accessor; it now normalizes through tiers.
export const getPackageLimits = (pkg) => getTierLimits(pkg)
