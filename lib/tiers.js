// Single source of truth for the plan/tier system.
//
// Imported by BOTH server-side API routes AND client-side components, so keep
// this file free of platform-only dependencies (no `next`, no `process.env`,
// no DOM access).
//
// Tiers (replaces the old free/premium scheme — see lib/packages.js shim):
//   • starter — free baseline. 1 child, SD media, fixed categories, basic tree.
//   • family  — everything in starter + multi-child, custom categories, all the
//               timeline/health/growth/biography tools, HD media.
//   • legacy  — everything in family + PDF/book export, concierge services,
//               external imports, early access, ownership transfer.
//
// The DB column is still called `package` (we kept the name to avoid churn).
// Old rows may still read 'free'/'premium' until the migration runs — every
// accessor normalizes through normalizeTier() so nothing breaks mid-migration.

export const TIER_ORDER = ['starter', 'family', 'legacy']

export const TIERS = {
  starter: {
    key: 'starter',
    label: 'Starter',
    rank: 0,
    blurb: 'Free — preserve your child’s most important memories.',
    limits: {
      maxChildren: 1,
      familyTreeMaxNodes: 20,
      maxVideoSeconds: 60,
      imageQuality: 'sd',
      image: { maxSizeMB: 1, maxWidthOrHeight: 1280, initialQuality: 0.72 },
      video: { maxMB: 60, label: 'SD' },
    },
  },
  family: {
    key: 'family',
    label: 'Family',
    rank: 1,
    blurb: 'Everything in Starter + the complete life-story toolkit.',
    limits: {
      maxChildren: Infinity,
      familyTreeMaxNodes: Infinity,
      maxVideoSeconds: 600,
      imageQuality: 'hd',
      image: { maxSizeMB: 3, maxWidthOrHeight: 2560, initialQuality: 0.88 },
      video: { maxMB: 200, label: 'HD' },
    },
  },
  legacy: {
    key: 'legacy',
    label: 'Legacy',
    rank: 2,
    blurb: 'Everything in Family + preservation, export & premium services.',
    limits: {
      maxChildren: Infinity,
      familyTreeMaxNodes: Infinity,
      maxVideoSeconds: 600,
      imageQuality: 'hd',
      image: { maxSizeMB: 3, maxWidthOrHeight: 2560, initialQuality: 0.88 },
      video: { maxMB: 200, label: 'HD' },
    },
  },
}

// feature key -> minimum tier required to use it. Anything NOT listed here is a
// baseline capability available to every tier (uploads, search, tags, fixed
// categories, calendar, on-this-day, data export, basic family tree, sharing,
// audio + document/PDF uploads, skills tracking).
export const FEATURE_MIN_TIER = {
  // ---- Family and up ----
  multipleChildren: 'family',
  extendedFamilyTree: 'family',
  customCategories: 'family',
  biography: 'family',
  lifeChapters: 'family',
  birthTimeline: 'family',
  toddlerYears: 'family',
  schoolYears: 'family',
  teenageYears: 'family',
  skillsAchievementsTimeline: 'family',
  healthDashboard: 'family',
  growthTracking: 'family',
  educationalProgress: 'family',
  ownershipTransfer: 'family',

  // ---- Legacy only ----
  pdfExport: 'legacy',
  importExternal: 'legacy',
  earlyAccess: 'legacy',
  lifetimePreservation: 'legacy',
  printedFamilyTreePoster: 'legacy',
  printedYearbook: 'legacy',
  doneForYouSetup: 'legacy',
  contentUploadAssistance: 'legacy',
  memoryOrganization: 'legacy',
  dataMigration: 'legacy',
}

// Human-readable grouping used by the admin "what each plan includes" panel and
// any pricing/marketing surface. Order matters — it's the display order.
export const TIER_FEATURE_SUMMARY = {
  starter: [
    '1 Child Profile', 'Photo / Video / Text / Audio / Document uploads',
    'Basic Family Tree', 'Skills Tracking', 'On This Day', 'Data Export',
    'Search, Tags, Fixed Categories, Timeline Filters, Calendar View',
    'Private, invite-only sharing',
  ],
  family: [
    'Everything in Starter, plus:',
    'Multiple Children', 'Extended Family Tree', 'Customized Categories',
    'Biography & Life Story', 'Life Chapters',
    'Birth / Toddler / School / Teenage timelines',
    'Skills & Achievements Timeline', 'Health Dashboard', 'Growth Tracking',
    'Educational Progress', 'Ownership Transfer at 18', 'HD media',
  ],
  legacy: [
    'Everything in Family, plus:',
    'Lifetime Preservation', 'Export Timeline to PDF / Book',
    'Printed Family Tree Poster', 'Printed Yearbook 20×20cm',
    'Done-For-You Setup', 'Content Upload Assistance',
    'Memory Organization', 'Data Migration', 'Early Access',
    'Import from Google/Apple/Facebook/Instagram/Dropbox/OneDrive/Telegram',
  ],
}

// Badge colors per tier (CSS custom properties from the app theme). Shared by
// the admin dashboard and any client-side tier badge.
export const TIER_BADGE = {
  starter: { label: 'STARTER', color: 'var(--ink-2)',        border: 'var(--glass-hairline)',   bg: 'var(--glass-1)' },
  family:  { label: 'FAMILY',  color: 'var(--accent-iris)',  border: 'rgba(124,58,237,0.45)',   bg: 'rgba(124,58,237,0.12)' },
  legacy:  { label: 'LEGACY',  color: '#b45309',             border: 'rgba(217,119,6,0.45)',    bg: 'rgba(245,158,11,0.14)' },
}

export const getTierBadge = (value) => TIER_BADGE[normalizeTier(value)]

// Map any stored/legacy value to a current tier key. free->starter,
// premium->family; unknown/empty -> starter.
export function normalizeTier(value) {
  if (value === 'family' || value === 'starter' || value === 'legacy') return value
  if (value === 'premium') return 'family'
  // 'free', '', null, undefined, anything else
  return 'starter'
}

export function getTier(value) {
  return TIERS[normalizeTier(value)]
}

export function getTierLimits(value) {
  return getTier(value).limits
}

const rankOf = (value) => TIERS[normalizeTier(value)].rank

// Does this tier unlock the given feature key? Baseline features (not in the
// matrix) are always true.
export function tierHasFeature(value, featureKey) {
  const min = FEATURE_MIN_TIER[featureKey]
  if (!min) return true // baseline / unknown -> available to everyone
  return rankOf(value) >= TIERS[min].rank
}

// Accepted input values for admin endpoints. We accept the legacy aliases too
// and normalize them so old admin clients / scripts keep working.
export const VALID_PACKAGES = ['starter', 'family', 'legacy']
export const ACCEPTED_PACKAGE_INPUTS = ['starter', 'family', 'legacy', 'free', 'premium']

export const isValidPackage = (pkg) => ACCEPTED_PACKAGE_INPUTS.includes(pkg)

// ---- Upload helpers (ported from the old lib/packages.js) ----
export const getImageCompressionOptions = (value) => {
  const cfg = getTierLimits(value).image
  return {
    maxSizeMB: cfg.maxSizeMB,
    maxWidthOrHeight: cfg.maxWidthOrHeight,
    initialQuality: cfg.initialQuality,
    useWebWorker: true,
    alwaysKeepResolution: false,
  }
}

export const getVideoLimits = (value) => getTierLimits(value).video
