# Migrare la un Supabase nou

1. Creează proiect nou pe https://supabase.com

2. Settings → API → copiază:
   - Project URL
   - anon public key
   - service_role secret key

3. Editează `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<Project URL>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   SUPABASE_SERVICE_ROLE_KEY=<service_role key>
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=<parola admin>
   SESSION_SECRET=<rulează: openssl rand -hex 32>
   ```

4. SQL Editor → New Query → paste `migration.sql` → Run

5. Restart dev server:
   ```
   npm run dev
   ```

6. Deschide `/admin-setup` → setează parola admin

7. Deschide `/admin/login` → loghează-te

8. Creează prima familie (nume, viewer PIN 4 cifre, editor PIN 8 cifre, pachet)

9. Deschide `/login` → intră cu PIN-ul de editor

10. Testează upload poză + verifică că apare în feed

Gata.
