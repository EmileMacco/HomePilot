# HomePilot

Gedeelde huishoud-app voor Emile & Emily: boodschappenlijstjes, klantkaarten,
agenda, taken en verjaardagen. Data wordt live gesynchroniseerd via Supabase.

## 1. Database opzetten (eenmalig)

1. Ga naar je Supabase-project → **SQL Editor** → **New query**
2. Plak de inhoud van `supabase-setup.sql` (los bijgeleverd) en klik **Run**
3. Controleer in **Table Editor** dat de tabel `household` bestaat met één rij
   (`id = homepilot`)
4. Controleer onder **Database → Replication** dat de tabel `household` is
   aangevinkt bij de `supabase_realtime`-publicatie (het SQL-script probeert
   dit ook automatisch te doen)

## 2. Lokaal draaien (optioneel, om te testen)

```bash
npm install
cp .env.example .env
# .env is al ingevuld met je Supabase-gegevens, pas aan indien nodig
npm run dev
```

Open de getoonde localhost-URL in je browser.

## 3. Deployen naar Netlify

**Optie A — via Netlify's website (geen terminal nodig):**

1. Zip deze hele projectmap (of push 'm naar een GitHub-repo)
2. Ga naar [app.netlify.com](https://app.netlify.com) → **Add new site**
3. Bij "Deploy manually": sleep de projectmap erin, **of** koppel je
   GitHub-repo voor automatische deploys bij elke wijziging
4. Onder **Site settings → Environment variables**, voeg toe:
   - `VITE_SUPABASE_URL` = `https://bergjizcqbnusyyxyehs.supabase.co`
   - `VITE_SUPABASE_KEY` = je publishable key (zie `.env.example`)
5. Build command: `npm run build`, publish directory: `dist` (staat al in
   `netlify.toml`, Netlify pikt dit automatisch op)
6. Deploy — je krijgt een URL zoals `homepilot-xyz.netlify.app`

**Optie B — via de terminal (Netlify CLI):**

```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod
```

## 4. Op je telefoon zetten

Open de Netlify-URL in Safari (iPhone) → deelknop → **"Zet op beginscherm"**.
Dan gedraagt de app zich als een gewone app-icoon, los van de browserbalk.

## Beveiliging — belangrijk om te weten

Er zit geen echte login op deze app; iedereen die de site-URL en de
`publishable key` kent kan de data lezen/schrijven (net als de eerdere
Claude-artifact-versie). Voor een gedeelde huishoud-app met alleen
boodschappen/agenda/taken is dat een acceptabel risico, maar zet hier nooit
wachtwoorden of andere gevoelige gegevens in.
