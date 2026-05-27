import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'

// Public-facing /demo route.
//
// Goal (per product brief): a static showcase users can visit before signing
// up so they understand what BabyJourney's album feels like. No auth, no
// data fetching — pure marketing surface with screenshots / sample feed.
//
// Real demo album content is not wired up; this page presents a curated
// fake feed that mirrors the dashboard's layout so the visual language is
// continuous between marketing and product.

const SAMPLE_POSTS = [
  {
    id: 1,
    title: 'Prima dată la mare',
    date: '12 Iulie 2025',
    category: 'Călătorii',
    emoji: '🏖️',
    description: 'Maia a descoperit valurile. Râsete, nisip și o pălărioară pierdută.',
    accent: 'linear-gradient(135deg, #38bdf8, #6366f1)',
  },
  {
    id: 2,
    title: 'Primii pași',
    date: '3 Iunie 2025',
    category: 'Repere',
    emoji: '👣',
    description: '4 pași până la canapea. Tati a strigat. Maia a căzut și a râs.',
    accent: 'linear-gradient(135deg, #34d399, #10b981)',
  },
  {
    id: 3,
    title: 'Tortul de 1 an',
    date: '21 Mai 2025',
    category: 'Sărbători',
    emoji: '🎂',
    description: 'Lumânarea, glazura pe nas, bunica plângând. Toate într-o singură poză.',
    accent: 'linear-gradient(135deg, #fb7185, #ec4899)',
  },
  {
    id: 4,
    title: 'Pădurea de toamnă',
    date: '18 Octombrie 2024',
    category: 'Plimbări',
    emoji: '🍂',
    description: 'Frunze adunate în buzunarele jachetei. Multe. Multe frunze.',
    accent: 'linear-gradient(135deg, #f59e0b, #ea580c)',
  },
  {
    id: 5,
    title: 'A spus „mama"',
    date: '7 Aprilie 2024',
    category: 'Repere',
    emoji: '💬',
    description: 'Lângă pătuț, la 7:42 dimineața. Înregistrarea o avem.',
    accent: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
  },
  {
    id: 6,
    title: 'Prima zi de creșă',
    date: '1 Septembrie 2025',
    category: 'Repere',
    emoji: '🎒',
    description: 'A intrat singură. Eu am plâns în mașină.',
    accent: 'linear-gradient(135deg, #06b6d4, #0891b2)',
  },
]

export default function Demo() {
  const [activeCategory, setActiveCategory] = useState('Toate')

  const categories = ['Toate', ...Array.from(new Set(SAMPLE_POSTS.map(p => p.category)))]
  const visiblePosts = activeCategory === 'Toate'
    ? SAMPLE_POSTS
    : SAMPLE_POSTS.filter(p => p.category === activeCategory)

  return (
    <>
      <Head>
        <title>Demo · BabyJourney — Album privat de familie din Chișinău</title>
        <meta name="description" content="Vezi cum arată albumul BabyJourney înainte să-l încerci. Un tur al feed-ului, categoriilor și momentelor copilăriei — albumul privat de familie #1 din Moldova." />
        <meta name="keywords" content="album familie, BabyJourney, jurnal bebe, demo album, amintiri copii, Chișinău, Moldova" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="BabyJourney Demo — vezi albumul tău de familie" />
        <meta property="og:description" content="Toate momentele copilăriei într-un singur loc privat. Vezi demo-ul interactiv." />
        <meta property="og:image" content="https://album.babyjourney.life/img/BabyJourney_album_screenshot.webp" />
        <meta property="og:image:alt" content="Captură de ecran a albumului BabyJourney — feed cu poze de familie din Chișinău" />
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
              Demo · Tur de produs
            </span>
            <h1 className="text-display" style={{
              fontSize: 'clamp(36px, 6vw, 56px)',
              margin: '18px 0 12px',
              lineHeight: 1.1,
            }}>
              Așa arată albumul familiei tale
            </h1>
            <p className="text-body" style={{
              maxWidth: 620,
              margin: '0 auto',
              color: 'var(--ink-2)',
              fontSize: 17,
            }}>
              Sub e o mostră de feed. Filtrele, categoriile și aspectul sunt identice cu albumul real.
              Nici un cont nu e necesar pentru a derula.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
              <Link href="/login" legacyBehavior>
                <a className="btn-iris sheen" style={{ padding: '12px 22px', textDecoration: 'none', fontSize: 15 }}>
                  Intră în albumul meu
                </a>
              </Link>
              <a
                href="https://babyjourney.life"
                className="btn-glass"
                style={{ padding: '12px 22px', textDecoration: 'none', fontSize: 15 }}
              >
                Despre BabyJourney
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
                {cat}
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
                    <span className="text-eyebrow" style={{ color: 'var(--accent-iris)' }}>{post.category}</span>
                    <span className="text-tertiary nums">{post.date}</span>
                  </div>
                  <h3 className="text-section-title" style={{ fontSize: 18, marginBottom: 8 }}>{post.title}</h3>
                  <p className="text-body" style={{ color: 'var(--ink-2)', fontSize: 14.5, lineHeight: 1.55, margin: 0 }}>
                    {post.description}
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
              Începe-ți propriul album
            </h2>
            <p className="text-body" style={{ color: 'var(--ink-2)', marginBottom: 22, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
              Albumul tău e privat și sigur. Doar familia ta îl vede, cu PIN-urile pe care le alegi.
            </p>
            <Link href="/login" legacyBehavior>
              <a className="btn-iris sheen" style={{ padding: '13px 28px', textDecoration: 'none', fontSize: 15 }}>
                Intră în album
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
            <Link href="/terms" legacyBehavior><a style={{ color: 'inherit' }}>Termeni și condiții</a></Link>
            <span aria-hidden>·</span>
            <Link href="/privacy" legacyBehavior><a style={{ color: 'inherit' }}>Politica de confidențialitate</a></Link>
            <span aria-hidden>·</span>
            <Link href="/cookies" legacyBehavior><a style={{ color: 'inherit' }}>Politica de cookies</a></Link>
          </footer>
        </main>
      </div>
    </>
  )
}
