import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="ro" data-theme="light">
      <Head>
        {/* PWA + mobile chrome */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#f4f5fb" />
        <meta name="msapplication-navbutton-color" content="#f4f5fb" />

        {/* Don't autolink phone numbers (album content) */}
        <meta name="format-detection" content="telephone=no" />

        {/* Preconnect to font CDN for faster paint */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Inline critical bits — safe area + iOS input zoom fix */}
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
