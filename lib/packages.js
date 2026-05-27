// Shared package / tier definitions. Imported by both server-side API
// routes and client-side components — keep this file free of platform-only
// dependencies (no `next`, no `process.env`, no DOM access).
//
// Quality tiers (Task #15):
//   • SD (Standard Definition) — capped width 1280px, lower compression
//   • HD (High Definition)     — capped width 2560px, higher quality
// Free families get SD media; Premium gets HD. Video duration is also tied
// to package level: Free=60s, Premium=60s but at HD quality.
//
// Per the product brief: "Video SD or Video HD with a 1-minute limit". Both
// tiers are capped at 60s of video for now; the differentiator is quality.

export const PACKAGES = {
  free: {
    label: 'Free',
    maxVideoSeconds: 60,
    imageQuality: 'sd',
    // Image compression budget for the client. SD = aggressive, smaller files.
    image: {
      maxSizeMB: 1,
      maxWidthOrHeight: 1280,
      initialQuality: 0.72,
    },
    // Video upload guidance shown in the UI. We don't transcode server-side
    // yet, so this is informational + drives the file-size check.
    video: {
      maxMB: 60,
      label: 'SD',
    },
  },
  premium: {
    label: 'Premium',
    // Sergiu's explicit spec (04.04.2026): "premium v-a fi ceva de genul
    // pana la 10min". Keeping this at 600s differentiates the tier from
    // Free (60s) — otherwise both tiers have identical video limits and
    // the tier system is meaningless.
    maxVideoSeconds: 600,
    imageQuality: 'hd',
    image: {
      maxSizeMB: 3,
      maxWidthOrHeight: 2560,
      initialQuality: 0.88,
    },
    video: {
      maxMB: 200,
      label: 'HD',
    },
  },
}

export const VALID_PACKAGES = Object.keys(PACKAGES)

export const getPackageLimits = (pkg) => PACKAGES[pkg] || PACKAGES.free

export const isValidPackage = (pkg) => VALID_PACKAGES.includes(pkg)

// Convenience accessors used by upload code so the call site stays compact.
export const getImageCompressionOptions = (pkg) => {
  const cfg = getPackageLimits(pkg).image
  return {
    maxSizeMB: cfg.maxSizeMB,
    maxWidthOrHeight: cfg.maxWidthOrHeight,
    initialQuality: cfg.initialQuality,
    useWebWorker: true,
    alwaysKeepResolution: false,
  }
}

export const getVideoLimits = (pkg) => getPackageLimits(pkg).video
