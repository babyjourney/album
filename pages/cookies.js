import LegalPage from '../components/LegalPage'

const CONTACT = <a href="mailto:hello@babyjourney.life">hello@babyjourney.life</a>

const VERSIONS = {
  ro: {
    subtitle: 'Ce stocăm în browserul tău și de ce.',
    lastUpdated: 'Mai 2026',
    body: (
      <>
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
          {CONTACT}.
          Vezi și{' '}
          <a href="/privacy">Politica de confidențialitate</a>{' '}
          pentru detalii despre datele personale.
        </p>
      </>
    ),
  },
  ru: {
    subtitle: 'Что мы храним в вашем браузере и зачем.',
    lastUpdated: 'Май 2026',
    body: (
      <>
        <h2>1. Что такое cookie</h2>
        <p>
          Cookie — это небольшой файл, который сайт сохраняет в вашем браузере.
          Сайты используют cookie (и похожие технологии, например{' '}
          <strong>localStorage</strong>), чтобы запоминать настройки или
          поддерживать сеанс входа.
        </p>

        <h2>2. Какие cookie и хранилища мы используем</h2>

        <h3>Строго необходимые (их нельзя отключить)</h3>
        <ul>
          <li>
            <strong>Сеанс альбома</strong> — хранится в{' '}
            <code>localStorage</code> (ключ <code>family_session</code>).
            Содержит подписанный токен, благодаря которому альбом остаётся
            открытым 24 часа после входа.
          </li>
          <li>
            <strong>Сеанс администратора</strong> — хранится аналогичным
            образом для панели администрирования и доступен только
            администраторам.
          </li>
          <li>
            <strong>Ограничение частоты запросов</strong> — временные счётчики
            для защиты от подбора PIN-кода (brute-force).
          </li>
        </ul>

        <h3>Настройки (их можно отключить)</h3>
        <ul>
          <li>
            <strong>Тема оформления</strong> — <code>album-theme</code>,
            сохраняет выбранную тему (светлая / тёмная / синяя / розовая).
          </li>
          <li>
            <strong>Язык</strong> — ваш выбор между румынским и другими
            доступными языками.
          </li>
        </ul>

        <h3>Аналитика и производительность</h3>
        <p>
          Мы не используем cookie рекламных сетей (Google Ads, Meta, TikTok
          и т. д.). Если в будущем мы подключим анонимизированную аналитику
          (Plausible, PostHog), чтобы понимать, какие функции полезны, мы
          обновим эту страницу и запросим ваше согласие там, где это
          обязательно.
        </p>

        <h2>3. Как управлять cookie</h2>
        <ul>
          <li>
            Вы можете в любой момент очистить <code>localStorage</code> и
            cookie в настройках браузера. После этого вы выйдете из альбома.
          </li>
          <li>
            Большинство браузеров позволяют блокировать сторонние cookie —
            рекомендуем сделать это для большей безопасности.
          </li>
        </ul>

        <h2>4. Cookie поставщиков</h2>
        <p>
          Страница может устанавливать минимальные технические cookie от{' '}
          <strong>Supabase</strong> (аутентификация / серверный сеанс) и{' '}
          <strong>Vercel</strong> (маршрутизация / CDN). Эти cookie строго
          необходимы для работы Сервиса.
        </p>

        <h2>5. Вопросы</h2>
        <p>
          По любым вопросам о cookie пишите нам по адресу{' '}
          {CONTACT}.
          Подробнее о персональных данных — в{' '}
          <a href="/privacy">Политике конфиденциальности</a>.
        </p>
      </>
    ),
  },
  en: {
    subtitle: 'What we store in your browser and why.',
    lastUpdated: 'May 2026',
    body: (
      <>
        <h2>1. What a cookie is</h2>
        <p>
          A cookie is a small file that a website places in your browser.
          Websites use cookies (and similar technologies, such as{' '}
          <strong>localStorage</strong>) to remember preferences or to
          keep a signed-in session.
        </p>

        <h2>2. Which cookies / storage we use</h2>

        <h3>Strictly necessary (cannot be disabled)</h3>
        <ul>
          <li>
            <strong>Album session</strong> — kept in{' '}
            <code>localStorage</code> (key <code>family_session</code>).
            It contains a signed token that keeps your album open for 24h
            after login.
          </li>
          <li>
            <strong>Admin session</strong> — kept in the same way for the
            administration panel, visible only to administrators.
          </li>
          <li>
            <strong>Rate limiting</strong> — temporary counters that prevent
            brute-force attacks on the PIN.
          </li>
        </ul>

        <h3>Preferences (you can choose to disable them)</h3>
        <ul>
          <li>
            <strong>Visual theme</strong> — <code>album-theme</code>, remembers
            the chosen theme (light / dark / blue / pink).
          </li>
          <li>
            <strong>Language</strong> — your choice between Romanian and the
            other available languages.
          </li>
        </ul>

        <h3>Analytics and performance</h3>
        <p>
          We do not use cookies from advertising networks (Google Ads, Meta,
          TikTok, etc.). If in the future we enable anonymized analytics
          (Plausible, PostHog) to understand which features are useful, we will
          update this page and ask for your consent where required.
        </p>

        <h2>3. How to manage cookies</h2>
        <ul>
          <li>
            You can clear <code>localStorage</code> and cookies at any time in
            your browser settings. This will sign you out of the album.
          </li>
          <li>
            Most browsers let you block third-party cookies — we recommend
            doing so for extra security.
          </li>
        </ul>

        <h2>4. Cookies from providers</h2>
        <p>
          The page may set minimal technical cookies from{' '}
          <strong>Supabase</strong> (authentication / backend session) and{' '}
          <strong>Vercel</strong> (routing / CDN). These cookies are strictly
          necessary for the Service to work.
        </p>

        <h2>5. Questions</h2>
        <p>
          For any question about cookies, write to us at{' '}
          {CONTACT}.
          See also the{' '}
          <a href="/privacy">Privacy Policy</a>{' '}
          for details about personal data.
        </p>
      </>
    ),
  },
}

export default function Cookies() {
  return <LegalPage titleKey="legalCookiesFull" versions={VERSIONS} />
}
