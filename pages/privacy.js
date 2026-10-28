import LegalPage from '../components/LegalPage'

const CONTACT = <a href="mailto:hello@babyjourney.life">hello@babyjourney.life</a>

const VERSIONS = {
  ro: {
    subtitle: 'Cum colectăm, folosim și protejăm datele tale.',
    lastUpdated: 'Mai 2026',
    body: (
      <>
        <h2>1. Cine este operatorul</h2>
        <p>
          Operatorul datelor cu caracter personal este echipa BabyJourney.
          Ne poți contacta la{' '}
          {CONTACT}.
        </p>

        <h2>2. Ce date colectăm</h2>
        <ul>
          <li>
            <strong>Date de cont:</strong> numele familiei, numărul de telefon,
            adresa de email (opțional), PIN-urile de acces (stocate pentru
            autentificare).
          </li>
          <li>
            <strong>Conținut încărcat:</strong> fotografii, video, descrieri,
            metadate ale fișierelor (EXIF — dată, locație dacă există),
            categorii și etichete.
          </li>
          <li>
            <strong>Date despre copii:</strong> nume, data nașterii, fotografie
            de profil — adăugate de tine pentru organizare.
          </li>
          <li>
            <strong>Date tehnice:</strong> data și ora ultimei accesări,
            informații minime de logare pentru detectarea fraudelor și
            securitate (rate limiting).
          </li>
        </ul>

        <h2>3. Pentru ce folosim datele</h2>
        <ul>
          <li>Pentru a-ți oferi accesul la album și a păstra conținutul tău în siguranță.</li>
          <li>Pentru a permite altor membri ai familiei tale (cu PIN valid) să vadă conținutul.</li>
          <li>Pentru a îmbunătăți Serviciul — performanță, fiabilitate, funcționalități noi.</li>
          <li>Pentru a-ți răspunde la întrebări sau cereri de suport.</li>
          <li>Pentru a respecta obligații legale.</li>
        </ul>
        <p>
          <strong>Nu vindem datele tale.</strong> Nu folosim conținutul tău
          pentru publicitate sau pentru a antrena modele de inteligență
          artificială.
        </p>

        <h2>4. Cu cine partajăm datele</h2>
        <ul>
          <li>
            <strong>Furnizori de infrastructură:</strong> Supabase (baza de date
            și stocare fișiere), Vercel (găzduire). Aceștia procesează date doar
            pentru a opera Serviciul, conform contractelor noastre.
          </li>
          <li>
            <strong>Autorități:</strong> când suntem obligați legal să furnizăm
            date (de exemplu, în cadrul unei anchete penale).
          </li>
        </ul>

        <h2>5. Unde sunt stocate datele</h2>
        <p>
          Datele sunt stocate în centre de date din Uniunea Europeană
          (sau, după caz, în jurisdicții cu protecție echivalentă, conform
          regulilor GDPR pentru transferuri internaționale).
        </p>

        <h2>6. Cât timp păstrăm datele</h2>
        <ul>
          <li>
            Conținutul tău este păstrat cât timp contul este activ.
          </li>
          <li>
            La cererea de ștergere, datele sunt eliminate în maxim 30 de zile.
          </li>
          <li>
            Loguri tehnice / de securitate sunt păstrate maximum 12 luni.
          </li>
        </ul>

        <h2>7. Drepturile tale (GDPR)</h2>
        <p>Ai dreptul:</p>
        <ul>
          <li>să accesezi datele pe care le avem despre tine,</li>
          <li>să le corectezi dacă sunt greșite,</li>
          <li>să le ștergi („dreptul de a fi uitat”),</li>
          <li>să primești o copie a lor într-un format portabil (export complet din admin),</li>
          <li>să te opui anumitor prelucrări,</li>
          <li>să depui o plângere la autoritatea de protecție a datelor.</li>
        </ul>
        <p>
          Pentru exercitarea drepturilor, scrie-ne la{' '}
          {CONTACT}.
        </p>

        <h2>8. Securitate</h2>
        <ul>
          <li>Conexiuni criptate (HTTPS) pentru tot traficul.</li>
          <li>Acces la baza de date doar prin API-ul nostru, cu chei de serviciu securizate.</li>
          <li>Rate limiting pe autentificare pentru a împiedica încercări de forțare.</li>
          <li>Conturile pot fi suspendate temporar de către administrator în caz de activitate suspectă.</li>
        </ul>

        <h2>9. Copii și minori</h2>
        <p>
          Albumul este destinat părinților sau tutorilor legali care
          documentează viața copiilor lor. Nu colectăm intenționat date
          despre minori sub 18 ani care folosesc Serviciul în nume propriu.
        </p>

        <h2>10. Modificări</h2>
        <p>
          Această politică poate fi actualizată periodic. Vei fi anunțat
          prin email sau printr-o notă vizibilă în album pentru schimbări
          importante.
        </p>
      </>
    ),
  },
  ru: {
    subtitle: 'Как мы собираем, используем и защищаем ваши данные.',
    lastUpdated: 'Май 2026',
    body: (
      <>
        <h2>1. Кто является оператором</h2>
        <p>
          Оператором персональных данных является команда BabyJourney.
          Связаться с нами можно по адресу{' '}
          {CONTACT}.
        </p>

        <h2>2. Какие данные мы собираем</h2>
        <ul>
          <li>
            <strong>Данные учётной записи:</strong> название семьи, номер
            телефона, адрес электронной почты (необязательно), PIN-коды доступа
            (хранятся для аутентификации).
          </li>
          <li>
            <strong>Загруженный контент:</strong> фотографии, видео, описания,
            метаданные файлов (EXIF — дата, местоположение, если оно есть),
            категории и метки.
          </li>
          <li>
            <strong>Данные о детях:</strong> имя, дата рождения, фотография
            профиля — вы добавляете их сами для организации альбома.
          </li>
          <li>
            <strong>Технические данные:</strong> дата и время последнего
            доступа, минимальные данные журналов для выявления мошенничества и
            обеспечения безопасности (ограничение частоты запросов).
          </li>
        </ul>

        <h2>3. Для чего мы используем данные</h2>
        <ul>
          <li>Чтобы предоставить вам доступ к альбому и хранить ваш контент в безопасности.</li>
          <li>Чтобы другие члены вашей семьи (с действующим PIN-кодом) могли просматривать контент.</li>
          <li>Чтобы улучшать Сервис — производительность, надёжность, новые функции.</li>
          <li>Чтобы отвечать на ваши вопросы и обращения в поддержку.</li>
          <li>Чтобы выполнять требования законодательства.</li>
        </ul>
        <p>
          <strong>Мы не продаём ваши данные.</strong> Мы не используем ваш
          контент для рекламы или для обучения моделей искусственного
          интеллекта.
        </p>

        <h2>4. С кем мы делимся данными</h2>
        <ul>
          <li>
            <strong>Поставщики инфраструктуры:</strong> Supabase (база данных
            и хранение файлов), Vercel (хостинг). Они обрабатывают данные только
            для обеспечения работы Сервиса, в соответствии с нашими договорами.
          </li>
          <li>
            <strong>Государственные органы:</strong> когда закон обязывает нас
            предоставить данные (например, в рамках уголовного расследования).
          </li>
        </ul>

        <h2>5. Где хранятся данные</h2>
        <p>
          Данные хранятся в дата-центрах на территории Европейского союза
          (или, в соответствующих случаях, в юрисдикциях с равноценным уровнем
          защиты — согласно правилам GDPR о международной передаче данных).
        </p>

        <h2>6. Как долго мы храним данные</h2>
        <ul>
          <li>
            Ваш контент хранится, пока учётная запись активна.
          </li>
          <li>
            По запросу на удаление данные удаляются не позднее чем через 30 дней.
          </li>
          <li>
            Технические журналы и журналы безопасности хранятся не более 12 месяцев.
          </li>
        </ul>

        <h2>7. Ваши права (GDPR)</h2>
        <p>Вы имеете право:</p>
        <ul>
          <li>получить доступ к данным, которые у нас есть о вас;</li>
          <li>исправить их, если они неверны;</li>
          <li>удалить их («право на забвение»);</li>
          <li>получить их копию в переносимом формате (полный экспорт из панели администратора);</li>
          <li>возражать против определённых видов обработки;</li>
          <li>подать жалобу в орган по защите данных.</li>
        </ul>
        <p>
          Чтобы воспользоваться своими правами, напишите нам по адресу{' '}
          {CONTACT}.
        </p>

        <h2>8. Безопасность</h2>
        <ul>
          <li>Зашифрованные соединения (HTTPS) для всего трафика.</li>
          <li>Доступ к базе данных — только через наш API, с защищёнными служебными ключами.</li>
          <li>Ограничение частоты попыток входа для защиты от подбора.</li>
          <li>Администратор может временно приостановить учётную запись при подозрительной активности.</li>
        </ul>

        <h2>9. Дети и несовершеннолетние</h2>
        <p>
          Альбом предназначен для родителей или законных опекунов, которые
          документируют жизнь своих детей. Мы намеренно не собираем данные о
          несовершеннолетних младше 18 лет, которые пользуются Сервисом от
          своего имени.
        </p>

        <h2>10. Изменения</h2>
        <p>
          Эта политика может периодически обновляться. О важных изменениях мы
          сообщим по электронной почте или заметным уведомлением в альбоме.
        </p>
      </>
    ),
  },
  en: {
    subtitle: 'How we collect, use and protect your data.',
    lastUpdated: 'May 2026',
    body: (
      <>
        <h2>1. Who the data controller is</h2>
        <p>
          The controller of your personal data is the BabyJourney team.
          You can contact us at{' '}
          {CONTACT}.
        </p>

        <h2>2. What data we collect</h2>
        <ul>
          <li>
            <strong>Account data:</strong> the family name, phone number,
            email address (optional), access PINs (stored for
            authentication).
          </li>
          <li>
            <strong>Uploaded content:</strong> photos, videos, descriptions,
            file metadata (EXIF — date, and location if present),
            categories and tags.
          </li>
          <li>
            <strong>Children’s data:</strong> name, date of birth, profile
            photo — added by you to organize the album.
          </li>
          <li>
            <strong>Technical data:</strong> date and time of the last access,
            minimal logging information for fraud detection and
            security (rate limiting).
          </li>
        </ul>

        <h2>3. What we use the data for</h2>
        <ul>
          <li>To give you access to the album and keep your content safe.</li>
          <li>To let other members of your family (with a valid PIN) view the content.</li>
          <li>To improve the Service — performance, reliability, new features.</li>
          <li>To answer your questions or support requests.</li>
          <li>To comply with legal obligations.</li>
        </ul>
        <p>
          <strong>We do not sell your data.</strong> We do not use your content
          for advertising or to train artificial intelligence models.
        </p>

        <h2>4. Who we share data with</h2>
        <ul>
          <li>
            <strong>Infrastructure providers:</strong> Supabase (database
            and file storage), Vercel (hosting). They process data only
            to operate the Service, in accordance with our contracts.
          </li>
          <li>
            <strong>Authorities:</strong> when we are legally required to provide
            data (for example, as part of a criminal investigation).
          </li>
        </ul>

        <h2>5. Where the data is stored</h2>
        <p>
          The data is stored in data centres in the European Union
          (or, where applicable, in jurisdictions with equivalent protection,
          in line with the GDPR rules on international transfers).
        </p>

        <h2>6. How long we keep the data</h2>
        <ul>
          <li>
            Your content is kept for as long as the account is active.
          </li>
          <li>
            When you request deletion, the data is removed within 30 days at most.
          </li>
          <li>
            Technical / security logs are kept for a maximum of 12 months.
          </li>
        </ul>

        <h2>7. Your rights (GDPR)</h2>
        <p>You have the right:</p>
        <ul>
          <li>to access the data we hold about you,</li>
          <li>to have it corrected if it is wrong,</li>
          <li>to have it erased (the “right to be forgotten”),</li>
          <li>to receive a copy of it in a portable format (full export from the admin panel),</li>
          <li>to object to certain processing,</li>
          <li>to lodge a complaint with the data protection authority.</li>
        </ul>
        <p>
          To exercise your rights, write to us at{' '}
          {CONTACT}.
        </p>

        <h2>8. Security</h2>
        <ul>
          <li>Encrypted connections (HTTPS) for all traffic.</li>
          <li>Database access only through our API, with secured service keys.</li>
          <li>Rate limiting on authentication to prevent brute-force attempts.</li>
          <li>Accounts may be temporarily suspended by the administrator in case of suspicious activity.</li>
        </ul>

        <h2>9. Children and minors</h2>
        <p>
          The album is intended for parents or legal guardians who
          document their children’s lives. We do not knowingly collect data
          about minors under 18 who use the Service on their own behalf.
        </p>

        <h2>10. Changes</h2>
        <p>
          This policy may be updated from time to time. You will be notified
          of important changes by email or through a visible notice in the
          album.
        </p>
      </>
    ),
  },
}

export default function Privacy() {
  return <LegalPage titleKey="legalPrivacyFull" versions={VERSIONS} />
}
