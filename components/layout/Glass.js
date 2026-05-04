import dynamic from 'next/dynamic'

const LiquidGlass = dynamic(
  () => import('@liquidglass/react').then((m) => m.LiquidGlass),
  { ssr: false }
)

const PRESETS = {
  dock: {
    borderRadius: 999,
    blur: 0.4,
    contrast: 1.18,
    brightness: 1.08,
    saturation: 1.25,
    shadowIntensity: 0.22,
    displacementScale: 60,
    elasticity: 0.18,
  },
  orb: {
    borderRadius: 999,
    blur: 0.45,
    contrast: 1.20,
    brightness: 1.10,
    saturation: 1.30,
    shadowIntensity: 0.28,
    displacementScale: 80,
    elasticity: 0.20,
  },
  rail: {
    borderRadius: 36,
    blur: 0.40,
    contrast: 1.15,
    brightness: 1.06,
    saturation: 1.20,
    shadowIntensity: 0.20,
    displacementScale: 50,
    elasticity: 0.16,
  },
  sheet: {
    borderRadius: 28,
    blur: 0.35,
    contrast: 1.14,
    brightness: 1.05,
    saturation: 1.18,
    shadowIntensity: 0.30,
    displacementScale: 40,
    elasticity: 0.14,
  },
  card: {
    borderRadius: 24,
    blur: 0.32,
    contrast: 1.12,
    brightness: 1.04,
    saturation: 1.15,
    shadowIntensity: 0.18,
    displacementScale: 30,
    elasticity: 0.12,
  },
  pill: {
    borderRadius: 999,
    blur: 0.35,
    contrast: 1.15,
    brightness: 1.05,
    saturation: 1.20,
    shadowIntensity: 0.18,
    displacementScale: 40,
    elasticity: 0.15,
  },
}

export default function Glass({
  variant = 'card',
  zIndex = 1,
  className,
  children,
  ...overrides
}) {
  const preset = PRESETS[variant] || PRESETS.card
  return (
    <LiquidGlass {...preset} {...overrides} zIndex={zIndex} className={className}>
      {children}
    </LiquidGlass>
  )
}
