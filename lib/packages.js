import {
  TIERS,
  VALID_PACKAGES,
  isValidPackage,
  getTierLimits,
  getImageCompressionOptions,
  getVideoLimits,
  getVideoEncodeOptions,
  STORAGE_MAX_UPLOAD_MB,
  STORAGE_MAX_UPLOAD_BYTES,
} from './tiers'

export const PACKAGES = TIERS

export {
  VALID_PACKAGES,
  isValidPackage,
  getImageCompressionOptions,
  getVideoLimits,
  getVideoEncodeOptions,
  STORAGE_MAX_UPLOAD_MB,
  STORAGE_MAX_UPLOAD_BYTES,
}

export const getPackageLimits = (pkg) => getTierLimits(pkg)
