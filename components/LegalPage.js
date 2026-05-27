import Head from 'next/head'
import Link from 'next/link'

// Shared shell for the Terms / Privacy / Cookies pages. Keeps the visual
// language consistent across legal surfaces and centralizes layout/footer.
export default function LegalPage({ title, subtitle, lastUpdated, children }) {
  return (
    <>
      <Head>
        <title>{title} · BabyJourney</title>
      </Head>

      <div style={{ minHeight: '100vh', position: 'relative' }}>
        <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
          <div style={{
            position: 'absolute', top: '-12%', right: '-8%',
            width: 460, height: 460, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 60%)',
            filter: 'blur(50px)',
          }} />
        </div>

        <main style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 820,
          margin: '0 auto',
          padding: '48px 24px 80px',
        }}>
          <header style={{ marginBottom: 36 }}>
            <Link href="/" legacyBehavior>
              <a className="glass-pill" style={{
                padding: '6px 12px',
                fontSize: 12,
                color: 'var(--ink-2)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 22,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Înapoi
              </a>
            </Link>
            <h1 className="text-display" style={{ fontSize: 'clamp(32px, 5vw, 44px)', marginBottom: 10, lineHeight: 1.1 }}>
              {title}
            </h1>
            {subtitle && (
              <p className="text-body" style={{ color: 'var(--ink-2)', fontSize: 16, margin: 0 }}>
                {subtitle}
              </p>
            )}
            {lastUpdated && (
              <p className="text-tertiary nums" style={{ marginTop: 10, fontSize: 13 }}>
                Ultima actualizare: {lastUpdated}
              </p>
            )}
          </header>

          <article className="card-glass" style={{
            padding: '32px 28px',
            borderRadius: 22,
            lineHeight: 1.65,
            color: 'var(--ink-1)',
          }}>
            <div className="legal-body">
              {children}
            </div>
          </article>

          <footer style={{
            marginTop: 36,
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

        <style jsx>{`
          .legal-body :global(h2) {
            font-size: 20px;
            font-weight: 700;
            margin: 28px 0 10px;
            color: var(--ink-1);
          }
          .legal-body :global(h2):first-child { margin-top: 0; }
          .legal-body :global(h3) {
            font-size: 16px;
            font-weight: 700;
            margin: 20px 0 8px;
            color: var(--ink-1);
          }
          .legal-body :global(p) {
            margin: 0 0 14px;
            color: var(--ink-2);
            font-size: 15px;
          }
          .legal-body :global(ul), .legal-body :global(ol) {
            margin: 0 0 14px 22px;
            color: var(--ink-2);
            font-size: 15px;
          }
          .legal-body :global(li) {
            margin-bottom: 6px;
          }
          .legal-body :global(strong) { color: var(--ink-1); }
          .legal-body :global(a) {
            color: var(--accent-iris);
            text-decoration: underline;
            text-decoration-color: rgba(124,58,237,0.4);
            text-underline-offset: 2px;
          }
        `}</style>
      </div>
    </>
  )
}
