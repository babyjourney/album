import LegalPage from '../components/LegalPage'

const CONTACT = <a href="mailto:hello@babyjourney.life">hello@babyjourney.life</a>

const VERSIONS = {
  ro: {
    subtitle: 'Reguli de utilizare a platformei BabyJourney.',
    lastUpdated: 'Mai 2026',
    body: (
      <>
        <h2>1. Acceptarea termenilor</h2>
        <p>
          Prin crearea unui cont sau accesarea albumului BabyJourney
          (<strong>„Serviciul”</strong>), confirmi că ai citit, ai înțeles
          și ești de acord cu acești Termeni și condiții. Dacă nu ești
          de acord, te rugăm să nu folosești Serviciul.
        </p>
        <p>
          Serviciul este operat de echipa BabyJourney (
          <strong>„noi”</strong>, <strong>„nouă”</strong>) și este destinat
          familiilor care doresc să-și păstreze amintirile copiilor într-un
          spațiu privat și organizat.
        </p>

        <h2>2. Cine poate folosi serviciul</h2>
        <p>
          Trebuie să ai cel puțin 18 ani pentru a crea un cont. Conturile sunt
          create de un administrator pentru fiecare familie; PIN-urile de
          viewer și editor îți sunt comunicate la momentul activării.
        </p>

        <h2>3. Contul tău și securitatea</h2>
        <ul>
          <li>Ești responsabil pentru păstrarea în siguranță a PIN-urilor.</li>
          <li>Nu împărtăși PIN-ul de editor cu persoane în care nu ai încredere — acesta permite încărcarea și ștergerea de conținut.</li>
          <li>Anunță-ne imediat dacă suspectezi un acces neautorizat.</li>
        </ul>

        <h2>4. Conținutul tău</h2>
        <p>
          Tu deții <strong>conținutul</strong> (fotografii, video, texte) pe care îl
          încarci în album. Noi îl stocăm și îl afișăm doar membrilor familiei tale
          care au PIN. Nu vindem, nu folosim pentru reclame și nu antrenăm modele
          AI pe conținutul tău.
        </p>
        <p>
          Te rugăm să nu încarci conținut care:
        </p>
        <ul>
          <li>Încalcă drepturile altor persoane (drepturi de autor, intimitate, demnitate).</li>
          <li>Este ilegal, abuziv, conține pornografie infantilă sau alte materiale interzise prin lege.</li>
          <li>Conține malware sau ar putea compromite Serviciul.</li>
        </ul>
        <p>
          Putem suspenda conturile care încalcă aceste reguli, după caz cu
          notificare prealabilă.
        </p>

        <h2>5. Planuri și plată</h2>
        <p>
          Serviciul are un nivel <strong>Free</strong> și un nivel{' '}
          <strong>Premium</strong>. Pachetul Premium oferă acces la video și
          imagini la calitate HD, video de durată extinsă și alte facilități
          descrise pe pagina de prețuri. Detaliile facturării sunt comunicate
          separat la momentul achiziției.
        </p>

        <h2>6. Disponibilitate</h2>
        <p>
          Facem eforturi rezonabile pentru ca albumul să fie disponibil
          24/7, dar nu garantăm că Serviciul va fi mereu fără întreruperi.
          Putem efectua mentenanță programată cu anunț prealabil.
        </p>

        <h2>7. Suspendarea și ștergerea contului</h2>
        <p>
          Poți cere oricând ștergerea contului scriindu-ne la adresa de
          suport. La ștergere îți oferim un <strong>export complet</strong> al
          conținutului tău (poze, video, texte, date organizatorice). După
          confirmare, ștergem datele tale în maxim 30 de zile, cu excepția
          celor pe care suntem obligați legal să le păstrăm.
        </p>

        <h2>8. Limitarea răspunderii</h2>
        <p>
          Serviciul este oferit <strong>„așa cum este”</strong>. Nu suntem
          răspunzători pentru pierderi indirecte, pierderea de date din cauze
          externe (de exemplu, parole pierdute de familie) sau utilizări
          contrare scopului Serviciului. Recomandăm copii locale ale
          amintirilor importante.
        </p>

        <h2>9. Modificări</h2>
        <p>
          Putem actualiza acești Termeni. Modificările semnificative vor fi
          comunicate prin email sau printr-o notă în album. Continuarea
          utilizării după actualizare înseamnă acceptarea noilor termeni.
        </p>

        <h2>10. Contact</h2>
        <p>
          Întrebări? Scrie-ne la{' '}
          {CONTACT}.
        </p>
      </>
    ),
  },
  ru: {
    subtitle: 'Правила использования платформы BabyJourney.',
    lastUpdated: 'Май 2026',
    body: (
      <>
        <h2>1. Принятие условий</h2>
        <p>
          Создавая учётную запись или открывая альбом BabyJourney
          (<strong>«Сервис»</strong>), вы подтверждаете, что прочитали, поняли
          и принимаете настоящие Условия использования. Если вы не согласны
          с ними, пожалуйста, не пользуйтесь Сервисом.
        </p>
        <p>
          Сервисом управляет команда BabyJourney (
          <strong>«мы»</strong>, <strong>«нас»</strong>). Он предназначен для
          семей, которые хотят хранить воспоминания о своих детях в личном и
          упорядоченном пространстве.
        </p>

        <h2>2. Кто может пользоваться сервисом</h2>
        <p>
          Чтобы создать учётную запись, вам должно быть не менее 18 лет.
          Учётные записи создаются администратором для каждой семьи; PIN-коды
          для просмотра и для редактирования сообщаются вам при активации.
        </p>

        <h2>3. Ваша учётная запись и безопасность</h2>
        <ul>
          <li>Вы несёте ответственность за сохранность своих PIN-кодов.</li>
          <li>Не сообщайте PIN-код для редактирования людям, которым не доверяете, — он позволяет загружать и удалять контент.</li>
          <li>Немедленно сообщите нам, если подозреваете несанкционированный доступ.</li>
        </ul>

        <h2>4. Ваш контент</h2>
        <p>
          Вам принадлежит <strong>контент</strong> (фотографии, видео, тексты),
          который вы загружаете в альбом. Мы храним его и показываем только тем
          членам вашей семьи, у которых есть PIN-код. Мы не продаём ваш контент,
          не используем его для рекламы и не обучаем на нём модели ИИ.
        </p>
        <p>
          Пожалуйста, не загружайте контент, который:
        </p>
        <ul>
          <li>Нарушает права других людей (авторские права, неприкосновенность частной жизни, достоинство).</li>
          <li>Является незаконным, оскорбительным, содержит детскую порнографию или другие материалы, запрещённые законом.</li>
          <li>Содержит вредоносное ПО или может поставить под угрозу работу Сервиса.</li>
        </ul>
        <p>
          Мы можем приостановить учётные записи, нарушающие эти правила, —
          при необходимости с предварительным уведомлением.
        </p>

        <h2>5. Планы и оплата</h2>
        <p>
          У Сервиса есть уровень <strong>Free</strong> и уровень{' '}
          <strong>Premium</strong>. Пакет Premium даёт доступ к видео и
          изображениям в HD-качестве, к видео увеличенной длительности и другим
          возможностям, описанным на странице с ценами. Подробности оплаты
          сообщаются отдельно при покупке.
        </p>

        <h2>6. Доступность</h2>
        <p>
          Мы прилагаем разумные усилия, чтобы альбом был доступен
          круглосуточно (24/7), но не гарантируем, что Сервис всегда будет
          работать без перебоев. Мы можем проводить плановое техническое
          обслуживание с предварительным уведомлением.
        </p>

        <h2>7. Приостановка и удаление учётной записи</h2>
        <p>
          Вы можете в любой момент запросить удаление учётной записи, написав
          нам на адрес поддержки. При удалении мы предоставим вам{' '}
          <strong>полный экспорт</strong> вашего контента (фото, видео, тексты,
          организационные данные). После подтверждения мы удалим ваши данные
          не позднее чем через 30 дней, за исключением тех, которые обязаны
          хранить по закону.
        </p>

        <h2>8. Ограничение ответственности</h2>
        <p>
          Сервис предоставляется <strong>«как есть»</strong>. Мы не несём
          ответственности за косвенные убытки, потерю данных по внешним
          причинам (например, если семья потеряла пароли) или использование
          вопреки назначению Сервиса. Рекомендуем хранить локальные копии
          важных воспоминаний.
        </p>

        <h2>9. Изменения</h2>
        <p>
          Мы можем обновлять настоящие Условия. О существенных изменениях мы
          сообщим по электронной почте или уведомлением в альбоме. Продолжая
          пользоваться Сервисом после обновления, вы принимаете новые условия.
        </p>

        <h2>10. Контакты</h2>
        <p>
          Есть вопросы? Напишите нам по адресу{' '}
          {CONTACT}.
        </p>
      </>
    ),
  },
  en: {
    subtitle: 'Rules for using the BabyJourney platform.',
    lastUpdated: 'May 2026',
    body: (
      <>
        <h2>1. Acceptance of the terms</h2>
        <p>
          By creating an account or accessing the BabyJourney album
          (<strong>“the Service”</strong>), you confirm that you have read,
          understood and agree to these Terms & Conditions. If you do not
          agree, please do not use the Service.
        </p>
        <p>
          The Service is operated by the BabyJourney team (
          <strong>“we”</strong>, <strong>“us”</strong>) and is intended for
          families who want to keep their children’s memories in a private,
          organized space.
        </p>

        <h2>2. Who may use the Service</h2>
        <p>
          You must be at least 18 years old to create an account. Accounts are
          created by an administrator for each family; the viewer and editor
          PINs are given to you at activation.
        </p>

        <h2>3. Your account and security</h2>
        <ul>
          <li>You are responsible for keeping your PINs safe.</li>
          <li>Do not share the editor PIN with people you do not trust — it allows uploading and deleting content.</li>
          <li>Let us know immediately if you suspect unauthorized access.</li>
        </ul>

        <h2>4. Your content</h2>
        <p>
          You own the <strong>content</strong> (photos, videos, texts) you
          upload to the album. We store it and show it only to the members of
          your family who have a PIN. We do not sell it, use it for advertising
          or train AI models on your content.
        </p>
        <p>
          Please do not upload content that:
        </p>
        <ul>
          <li>Infringes the rights of other people (copyright, privacy, dignity).</li>
          <li>Is illegal or abusive, or contains child pornography or other material prohibited by law.</li>
          <li>Contains malware or could compromise the Service.</li>
        </ul>
        <p>
          We may suspend accounts that break these rules, with prior notice
          where appropriate.
        </p>

        <h2>5. Plans and payment</h2>
        <p>
          The Service has a <strong>Free</strong> tier and a{' '}
          <strong>Premium</strong> tier. The Premium package gives access to
          HD-quality videos and images, extended-length videos and other
          features described on the pricing page. Billing details are
          communicated separately at the time of purchase.
        </p>

        <h2>6. Availability</h2>
        <p>
          We make reasonable efforts to keep the album available 24/7, but we
          do not guarantee that the Service will always be free of
          interruptions. We may carry out scheduled maintenance with prior
          notice.
        </p>

        <h2>7. Account suspension and deletion</h2>
        <p>
          You can ask for your account to be deleted at any time by writing to
          the support address. On deletion we give you a{' '}
          <strong>full export</strong> of your content (photos, videos, texts,
          organizational data). After confirmation, we delete your data within
          30 days at most, except for data we are legally required to keep.
        </p>

        <h2>8. Limitation of liability</h2>
        <p>
          The Service is provided <strong>“as is”</strong>. We are not liable
          for indirect losses, loss of data due to external causes (for
          example, passwords lost by the family) or uses contrary to the
          purpose of the Service. We recommend keeping local copies of
          important memories.
        </p>

        <h2>9. Changes</h2>
        <p>
          We may update these Terms. Significant changes will be communicated
          by email or through a notice in the album. Continuing to use the
          Service after an update means you accept the new terms.
        </p>

        <h2>10. Contact</h2>
        <p>
          Questions? Write to us at{' '}
          {CONTACT}.
        </p>
      </>
    ),
  },
}

export default function Terms() {
  return <LegalPage titleKey="legalTermsFull" versions={VERSIONS} />
}
