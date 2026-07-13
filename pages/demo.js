import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

// Public-facing /demo route.
//
// Goal (per product brief): a static showcase users can visit before signing
// up so they understand what BabyJourney's album feels like. No auth, no
// data fetching — pure marketing surface with screenshots / sample feed.
//
// Real demo album content is not wired up; this page presents a curated
// fake feed that mirrors the dashboard's layout so the visual language is
// continuous between marketing and product.

// The sample feed is translated like the rest of the UI, so it holds
// translation keys rather than literals (see contexts/translations/auth.js).
const SAMPLE_POSTS = [
  {
    id: 1,
    titleKey: 'demoPost1Title',
    dateKey: 'demoPost1Date',
    categoryKey: 'demoCategoryTravel',
    emoji: '🏖️',
    descriptionKey: 'demoPost1Desc',
    accent: 'linear-gradient(135deg, #38bdf8, #6366f1)',
  },
  {
    id: 2,
    titleKey: 'demoPost2Title',
    dateKey: 'demoPost2Date',
    categoryKey: 'demoCategoryMilestones',
    emoji: '👣',
    descriptionKey: 'demoPost2Desc',
    accent: 'linear-gradient(135deg, #34d399, #10b981)',
  },
  {
    id: 3,
    titleKey: 'demoPost3Title',
    dateKey: 'demoPost3Date',
    categoryKey: 'demoCategoryCelebrations',
    emoji: '🎂',
    descriptionKey: 'demoPost3Desc',
    accent: 'linear-gradient(135deg, #fb7185, #ec4899)',
  },
  {
    id: 4,
    titleKey: 'demoPost4Title',
    dateKey: 'demoPost4Date',
    categoryKey: 'demoCategoryWalks',
    emoji: '🍂',
    descriptionKey: 'demoPost4Desc',
    accent: 'linear-gradient(135deg, #f59e0b, #ea580c)',
  },
  {
    id: 5,
    titleKey: 'demoPost5Title',
    dateKey: 'demoPost5Date',
    categoryKey: 'demoCategoryMilestones',
    emoji: '💬',
    descriptionKey: 'demoPost5Desc',
    accent: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
  },
  {
    id: 6,
    titleKey: 'demoPost6Title',
    dateKey: 'demoPost6Date',
    categoryKey: 'demoCategoryMilestones',
    emoji: '🎒',
    descriptionKey: 'demoPost6Desc',
    accent: 'linear-gradient(135deg, #06b6d4, #0891b2)',
  },
]

export default function Demo() {
  const { t } = useLanguage()
  const [activeCategory, setActiveCategory] = useState('all')

  const categories = ['all', ...Array.from(new Set(SAMPLE_POSTS.map(p => p.categoryKey)))]
  const visiblePosts = activeCategory === 'all'
    ? SAMPLE_POSTS
    : SAMPLE_POSTS.filter(p => p.categoryKey === activeCategory)

  return (
    <>
      <Head>
        {/* TODO (Task #13): replace /img/pfp.webp with a proper 1200×630
            screenshot card (BabyJourney_album_screenshot.webp per
            public/img/SEO.md). For now we point at the only real image
            so the link doesn't 404. */}
        <title>Demo · BabyJourney — Album privat de familie din Chișinău</title>
        <meta name="description" content="Vezi cum arată albumul BabyJourney înainte să-l încerci. Un tur al feed-ului, categoriilor și momentelor copilăriei — albumul privat de familie #1 din Moldova." />
        <meta name="keywords" content="album familie, BabyJourney, jurnal bebe, demo album, amintiri copii, Chișinău, Moldova" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="BabyJourney Demo — vezi albumul tău de familie" />
        <meta property="og:description" content="Toate momentele copilăriei într-un singur loc privat. Vezi demo-ul interactiv." />
        <meta property="og:image" content="https://album.babyjourney.life/img/pfp.webp" />
        <meta property="og:image:alt" content="Logo BabyJourney — demo album privat din Chișinău" />
        <meta property="og:locale" content="ro_RO" />
        <meta property="og:site_name" content="BabyJourney" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="geo.region" content="MD-CU" />
        <meta name="geo.placename" content="Chișinău, Moldova" />
        <link rel="canonical" href="https://album.babyjourney.life/demo" />
      </Head>

      <div style={{ minHeight: '100vh', position: 'relative' }}>
        {/* Decorative orbs */}
        <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
          <div style={{
            position: 'absolute', top: '-10%', left: '-8%',
            width: 520, height: 520, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.30) 0%, transparent 60%)',
            filter: 'blur(50px)',
          }} />
          <div style={{
            position: 'absolute', bottom: '-12%', right: '-10%',
            width: 480, height: 480, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56,189,248,0.28) 0%, transparent 60%)',
            filter: 'blur(48px)',
          }} />
        </div>

        <main style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1180,
          margin: '0 auto',
          padding: '48px 24px 80px',
        }}>
          {/* Header */}
          <header style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="glass-pill" style={{ padding: '6px 14px', fontSize: 12, color: 'var(--accent-iris)', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
              {t('demoEyebrow')}
            </span>
            <h1 className="text-display" style={{
              fontSize: 'clamp(36px, 6vw, 56px)',
              margin: '18px 0 12px',
              lineHeight: 1.1,
            }}>
              {t('demoHeading')}
            </h1>
            <p className="text-body" style={{
              maxWidth: 620,
              margin: '0 auto',
              color: 'var(--ink-2)',
              fontSize: 17,
            }}>
              {t('demoIntro')}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
              <Link href="/login" legacyBehavior>
                <a className="btn-iris sheen" style={{ padding: '12px 22px', textDecoration: 'none', fontSize: 15 }}>
                  {t('demoCtaMyAlbum')}
                </a>
              </Link>
              <a
                href="https://babyjourney.life"
                className="btn-glass"
                style={{ padding: '12px 22px', textDecoration: 'none', fontSize: 15 }}
              >
                {t('demoAboutLink')}
              </a>
            </div>
          </header>

          {/* Category filter pills */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 28,
          }}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`category-pill${activeCategory === cat ? ' category-pill--selected sheen' : ''}`}
              >
                {t(cat)}
              </button>
            ))}
          </div>

          {/* Sample feed grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 18,
          }}>
            {visiblePosts.map((post) => (
              <article
                key={post.id}
                className="card-glass"
                style={{
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 22,
                }}
              >
                <div style={{
                  aspectRatio: '4/3',
                  background: post.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 88,
                  filter: 'saturate(1.1)',
                }}>
                  <span aria-hidden>{post.emoji}</span>
                </div>
                <div style={{ padding: '18px 20px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                    <span className="text-eyebrow" style={{ color: 'var(--accent-iris)' }}>{t(post.categoryKey)}</span>
                    <span className="text-tertiary nums">{t(post.dateKey)}</span>
                  </div>
                  <h3 className="text-section-title" style={{ fontSize: 18, marginBottom: 8 }}>{t(post.titleKey)}</h3>
                  <p className="text-body" style={{ color: 'var(--ink-2)', fontSize: 14.5, lineHeight: 1.55, margin: 0 }}>
                    {t(post.descriptionKey)}
                  </p>
                </div>
              </article>
            ))}
          </div>

          {/* CTA bottom */}
          <section className="card-glass" style={{
            marginTop: 56,
            padding: '36px 28px',
            textAlign: 'center',
            borderRadius: 24,
          }}>
            <h2 className="text-section-title" style={{ marginBottom: 10 }}>
              {t('demoStartTitle')}
            </h2>
            <p className="text-body" style={{ color: 'var(--ink-2)', marginBottom: 22, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
              {t('demoStartText')}
            </p>
            <Link href="/login" legacyBehavior>
              <a className="btn-iris sheen" style={{ padding: '13px 28px', textDecoration: 'none', fontSize: 15 }}>
                {t('loginSubmit')}
              </a>
            </Link>
          </section>

          {/* Footer with legal links */}
          <footer style={{
            marginTop: 56,
            textAlign: 'center',
            color: 'var(--ink-3)',
            fontSize: 13,
            display: 'flex',
            justifyContent: 'center',
            gap: 18,
            flexWrap: 'wrap',
          }}>
            <Link href="/terms" legacyBehavior><a style={{ color: 'inherit' }}>{t('demoFooterTerms')}</a></Link>
            <span aria-hidden>·</span>
            <Link href="/privacy" legacyBehavior><a style={{ color: 'inherit' }}>{t('demoFooterPrivacy')}</a></Link>
            <span aria-hidden>·</span>
            <Link href="/cookies" legacyBehavior><a style={{ color: 'inherit' }}>{t('demoFooterCookies')}</a></Link>
          </footer>
        </main>
      </div>
    </>
  )
}
