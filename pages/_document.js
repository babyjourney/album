import { Html, Head, Main, NextScript } from 'next/document'

const languageBootstrapScript = `
(function () {
  try {
    if ((window.location.pathname || '').indexOf('/admin') === 0) return;
    var lang = null;
    try {
      var saved = localStorage.getItem('selectedLanguage');
      if (saved === 'ro' || saved === 'ru' || saved === 'en') lang = saved;
    } catch (e) {}
    if (!lang) {
      var map = { ro: 'ro', mo: 'ro', ru: 'ru', en: 'en' };
      var prefs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language];
      for (var i = 0; i < prefs.length && !lang; i++) {
        var primary = String(prefs[i] || '').trim().toLowerCase().split(/[-_]/)[0];
        if (Object.prototype.hasOwnProperty.call(map, primary)) lang = map[primary];
      }
    }
    var root = document.documentElement;
    root.setAttribute('lang', lang || 'ro');
    if (lang && lang !== 'ro') {
      root.setAttribute('data-lang-pending', '1');
      setTimeout(function () { root.removeAttribute('data-lang-pending'); }, 1500);
    }
  } catch (e) {}
})();
`

const themeBootstrapScript = `
(function () {
  try {
    var path = window.location.pathname || '';
    var theme;
    if (path.indexOf('/admin') === 0) {
      theme = 'dark';
    } else {
      var saved = localStorage.getItem('album-theme');
      var valid = { light: 1, dark: 1, blue: 1, pink: 1 };
      theme = (saved && valid[saved]) ? saved : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      var map = { light: '#f4f5fb', dark: '#07070d', blue: '#dde9f4', pink: '#faecf2' };
      meta.setAttribute('content', map[theme] || '#f4f5fb');
    }
  } catch (e) {}
})();
`

export default function Document() {
  return (
    <Html lang="ro">
      <Head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#f4f5fb" />
        <meta name="msapplication-navbutton-color" content="#f4f5fb" />

        <meta name="format-detection" content="telephone=no" />

        <script dangerouslySetInnerHTML={{ __html: languageBootstrapScript }} />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        <style jsx global>{`
          :root {
            --safe-area-inset-top: env(safe-area-inset-top);
            --safe-area-inset-right: env(safe-area-inset-right);
            --safe-area-inset-bottom: env(safe-area-inset-bottom);
            --safe-area-inset-left: env(safe-area-inset-left);
          }
          html { height: 100vh; height: 100dvh; }
          body { height: 100vh; height: 100dvh; overflow-x: hidden; -webkit-overflow-scrolling: touch; }
          @supports (padding-bottom: env(safe-area-inset-bottom)) {
            .safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
            .safe-top { padding-top: env(safe-area-inset-top); }
          }
          input, textarea, select { font-size: 16px !important; }
        `}</style>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
