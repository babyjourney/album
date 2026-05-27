import LegalPage from '../components/LegalPage'

export default function Privacy() {
  return (
    <LegalPage
      title="Politica de confidențialitate"
      subtitle="Cum colectăm, folosim și protejăm datele tale."
      lastUpdated="Mai 2026"
    >
      <h2>1. Cine este operatorul</h2>
      <p>
        Operatorul datelor cu caracter personal este echipa BabyJourney.
        Ne poți contacta la{' '}
        <a href="mailto:hello@babyjourney.life">hello@babyjourney.life</a>.
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
        <li>să le ștergi („dreptul de a fi uitat"),</li>
        <li>să primești o copie a lor într-un format portabil (export complet din admin),</li>
        <li>să te opui anumitor prelucrări,</li>
        <li>să depui o plângere la autoritatea de protecție a datelor.</li>
      </ul>
      <p>
        Pentru exercitarea drepturilor, scrie-ne la{' '}
        <a href="mailto:hello@babyjourney.life">hello@babyjourney.life</a>.
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
    </LegalPage>
  )
}
