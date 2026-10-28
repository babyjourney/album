export const TIER_ORDER = ['starter', 'family', 'legacy']

export const STORAGE_MAX_UPLOAD_MB = 200
export const STORAGE_MAX_UPLOAD_BYTES = STORAGE_MAX_UPLOAD_MB * 1024 * 1024

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
      video: { maxMB: 500, label: 'SD', encode: { maxEdge: 1280, videoBitsPerSecond: 1_500_000 } },
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
      maxVideoSeconds: 60,
      imageQuality: 'hd',
      image: { maxSizeMB: 3, maxWidthOrHeight: 2560, initialQuality: 0.88 },
      video: { maxMB: 500, label: 'HD', encode: { maxEdge: 1920, videoBitsPerSecond: 3_500_000 } },
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
      maxVideoSeconds: 60,
      imageQuality: 'hd',
      image: { maxSizeMB: 3, maxWidthOrHeight: 2560, initialQuality: 0.88 },
      video: { maxMB: 500, label: 'HD', encode: { maxEdge: 1920, videoBitsPerSecond: 3_500_000 } },
    },
  },
}

export const FEATURE_MIN_TIER = {
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

export const TIER_FEATURE_SUMMARY = {
  starter: [
    '1 Child Profile', 'Photo / Video / Text posts',
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

export const TIER_BADGE = {
  starter: { label: 'STARTER', color: 'var(--ink-2)',        border: 'var(--glass-hairline)',   bg: 'var(--glass-1)' },
  family:  { label: 'FAMILY',  color: 'var(--accent-iris)',  border: 'rgba(124,58,237,0.45)',   bg: 'rgba(124,58,237,0.12)' },
  legacy:  { label: 'LEGACY',  color: '#b45309',             border: 'rgba(217,119,6,0.45)',    bg: 'rgba(245,158,11,0.14)' },
}

export const getTierBadge = (value) => TIER_BADGE[normalizeTier(value)]

export function normalizeTier(value) {
  if (value === 'family' || value === 'starter' || value === 'legacy') return value
  if (value === 'premium') return 'family'
  return 'starter'
}

export function getTier(value) {
  return TIERS[normalizeTier(value)]
}

export function getTierLimits(value) {
  return getTier(value).limits
}

const rankOf = (value) => TIERS[normalizeTier(value)].rank

export function tierHasFeature(value, featureKey) {
  const min = FEATURE_MIN_TIER[featureKey]
  if (!min) return true
  return rankOf(value) >= TIERS[min].rank
}

export const VALID_PACKAGES = ['starter', 'family', 'legacy']
export const ACCEPTED_PACKAGE_INPUTS = ['starter', 'family', 'legacy', 'free', 'premium']

export const isValidPackage = (pkg) => ACCEPTED_PACKAGE_INPUTS.includes(pkg)

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

export const getVideoEncodeOptions = (value) =>
  getTierLimits(value).video.encode || { maxEdge: 1280, videoBitsPerSecond: 1_500_000 }
