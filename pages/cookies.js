import LegalPage from '../components/LegalPage'

export default function Cookies() {
  return (
    <LegalPage
      title="Politica de cookies"
      subtitle="Ce stocăm în browserul tău și de ce."
      lastUpdated="Mai 2026"
    >
      <h2>1. Ce este un cookie</h2>
      <p>
        Un cookie este un fișier mic pe care un site îl plasează în browserul
        tău. Site-urile folosesc cookies (și tehnologii similare, precum{' '}
        <strong>localStorage</strong>) pentru a-și aminti preferințe sau
        pentru a menține o sesiune autentificată.
      </p>

      <h2>2. Ce cookies / storage folosim</h2>

      <h3>Strict necesare (nu pot fi dezactivate)</h3>
      <ul>
        <li>
          <strong>Sesiunea de album</strong> — păstrată în{' '}
          <code>localStorage</code> (cheia <code>family_session</code>).
          Conține un token semnat care îți menține albumul deschis 24h
          după login.
        </li>
        <li>
          <strong>Sesiunea de admin</strong> — păstrată similar pentru
          panoul de administrare, vizibilă doar administratorilor.
        </li>
        <li>
          <strong>Rate limiting</strong> — contoare temporare pentru a
          preveni atacuri de tip brute-force pe PIN.
        </li>
      </ul>

      <h3>Preferințe (poți alege să le dezactivezi)</h3>
      <ul>
        <li>
          <strong>Tema vizuală</strong> — <code>album-theme</code>, păstrează
          tema aleasă (lumină / întuneric / albastru / roz).
        </li>
        <li>
          <strong>Limba</strong> — alegerea ta între română și alte limbi
          disponibile.
        </li>
      </ul>

      <h3>Analiză și performanță</h3>
      <p>
        Nu folosim cookies de la rețele de publicitate (Google Ads, Meta,
        TikTok etc.). Dacă în viitor activăm analiză anonimizată (Plausible,
        PostHog) pentru a înțelege ce funcționalități sunt utile, vom actualiza
        această pagină și îți vom cere consimțământul unde este obligatoriu.
      </p>

      <h2>3. Cum gestionezi cookies</h2>
      <ul>
        <li>
          Poți șterge oricând <code>localStorage</code> și cookies prin
          setările browserului tău. Acest lucru te va deconecta din album.
        </li>
        <li>
          Majoritatea browserelor permit blocarea cookies-urilor terțe — îți
          recomandăm să o faci pentru siguranță sporită.
        </li>
      </ul>

      <h2>4. Cookies de la furnizori</h2>
      <p>
        Pagina poate seta cookies tehnice minime de la{' '}
        <strong>Supabase</strong> (autentificare / sesiune backend) și{' '}
        <strong>Vercel</strong> (rutare / CDN). Aceste cookies sunt strict
        necesare pentru funcționarea Serviciului.
      </p>

      <h2>5. Întrebări</h2>
      <p>
        Pentru orice întrebare despre cookies, scrie-ne la{' '}
        <a href="mailto:hello@babyjourney.life">hello@babyjourney.life</a>.
        Vezi și{' '}
        <a href="/privacy">Politica de confidențialitate</a>{' '}
        pentru detalii despre datele personale.
      </p>
    </LegalPage>
  )
}
