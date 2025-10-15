import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="ro">
      <Head>
        {/* Mobile viewport optimization for Chrome and Safari */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no" />
        
        {/* PWA and mobile app behavior */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#000000" />
        <meta name="msapplication-navbutton-color" content="#000000" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Prevent automatic phone number linking */}
        <meta name="format-detection" content="telephone=no" />
        
        {/* CSS environment variables support for safe areas */}
        <style jsx global>{`
          :root {
            --safe-area-inset-top: env(safe-area-inset-top);
            --safe-area-inset-right: env(safe-area-inset-right);
            --safe-area-inset-bottom: env(safe-area-inset-bottom);
            --safe-area-inset-left: env(safe-area-inset-left);
          }
          
          /* Fix for Chrome mobile viewport issues */
          html {
            height: 100vh;
            height: 100dvh; /* Dynamic viewport height for modern browsers */
          }
          
          body {
            height: 100vh;
            height: 100dvh;
            overflow-x: hidden;
            /* Prevent scrollbar issues in mobile Chrome */
            -webkit-overflow-scrolling: touch;
          }
          
          /* Fix for iOS Safari bottom safe area */
          @supports (padding-bottom: env(safe-area-inset-bottom)) {
            .safe-bottom {
              padding-bottom: env(safe-area-inset-bottom);
            }
          }
          
          /* Prevent zoom on input focus in iOS */
          input, textarea, select {
            font-size: 16px !important;
          }
        `}</style>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}