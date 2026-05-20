// Shared package / tier definitions. Imported by both server-side API
// routes and client-side components — keep this file free of platform-only
// dependencies (no `next`, no `process.env`, no DOM access).

export const PACKAGES = {
  free:    { label: 'Free',    maxVideoSeconds: 60  },
  premium: { label: 'Premium', maxVideoSeconds: 600 },
}

export const VALID_PACKAGES = Object.keys(PACKAGES)

export const getPackageLimits = (pkg) => PACKAGES[pkg] || PACKAGES.free

export const isValidPackage = (pkg) => VALID_PACKAGES.includes(pkg)
