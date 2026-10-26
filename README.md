# Svampodlaren 🍄

En svensk, mobilanpassad app för svampodling med **Next.js, TypeScript, Tailwind CSS och SQLite**. Den körs lokalt på datorn och fungerar utan internet när installationen är klar. Ingen molntjänst, Supabase-anslutning eller inloggning behövs.

## Kom igång

Använd Node.js 24 LTS (minst 22.13) och pnpm 11. Första paketinstallationen kräver internet. Därefter behövs ingen uppkoppling för att bygga, starta eller använda appen.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Öppna **http://127.0.0.1:3000** på samma dator. Låt terminalen med appen vara igång medan du använder den. Stoppa med Ctrl+C. Vid nästa användning räcker `pnpm start`; dina poster finns kvar.

För utveckling: `pnpm dev`.

## Det här ingår

- Dashboard med statistik beräknad från den lokala databasen.
- Odlingsprojekt med art, plats och startdatum.
- Batchregister med projektkoppling, unika batchnamn, substrat, fasfilter och ändringsbar odlingsfas.
- Odlingsdagbok med observation, datum, temperatur och luftfuktighet.
- Skörderegistrering med batch, datum, vikt i gram och skördevåg.
- Svampbibliotek med nio inbyggda introduktionsguider och källhänvisningar. Lägg till egna svampar med namn, vetenskapligt namn, beskrivning, odlingsråd och valfri källänk. Egna svampar sparas i SQLite, kan sökas fram och kan väljas i nya odlingsprojekt.
- Sökning och JSON-export via knappen i sidhuvudet.

Bibliotekets inbyggda texter och artfotografier fungerar offline. De nio inbyggda arterna samt kantarell har lokala WebP-bilder som visas på bibliotekskort och i guider. Egna svampar utan foto visar ”Bild saknas”. Bildkällor, fotografer och licenser finns i `public/images/mushrooms/CREDITS.md` och vid bilderna i appen. Länkar till externa källor kräver internet.

## Lokal databas och exempeldata

Appen skapar automatiskt **`data/svampodlaren.sqlite`** vid första användningen. Då läggs exempelprojekt, batcher, observationer och skördar in en gång. Därefter sparas alla ändringar permanent i SQLite. Exempeldata läggs inte tillbaka vid omstart.

Befintliga databaser uppgraderas automatiskt till schemaversion 2, som lägger till tabellen `custom_species` utan att ändra tidigare odlingsposter.

Webbläsaren hämtar och sparar uppgifter via appens lokala `/api/data`. SQLite körs i Node.js-processen på samma dator; filen skickas inte till någon extern tjänst. Databasen behöver vara skrivbar. Ett misslyckat sparande visas som ett fel och formulärets innehåll finns kvar.

Tidigare demodata i `localStorage` lämnas orörda och importeras inte automatiskt. Den nya versionen använder SQLite som datakälla, även om du byter webbläsare på datorn.

### Databasens plats

Standardinställningen kräver ingen konfiguration. För en annan plats, kopiera `.env.example` till `.env.local` och ange en absolut sökväg:

```dotenv
SQLITE_PATH=/absolut/sokvag/svampodlaren.sqlite
```

Starta om appen efter ändringen. Filerna `*.sqlite-wal` och `*.sqlite-shm` som kan ligga intill databasen hör till SQLite. Databasfiler och `.env.local` är undantagna från Git.

### Säkerhetskopiera och återställ

Exportknappen sparar odlingsdata som läsbar JSON; automatisk JSON-import ingår inte ännu.
För en fullständig återställningsbar kopia:

1. Stoppa appen med Ctrl+C och se till att ingen annan instans använder samma databas.
2. Kopiera hela `data`-mappen (eller mappen med din alternativa databas) till en säker plats.
3. För återställning: stoppa appen, spara undan nuvarande datamapp och ersätt den med säkerhetskopian innan du startar igen.

## Lokal användning och säkerhet

Appen har ingen användarinloggning och är avsedd för en verksamhet på en dator. Startkommandona binder servern till `127.0.0.1`. API:t accepterar bara lokala värdnamn, och skrivningar kräver samma origin. Även servern validerar uppgifter och använder parametriserad SQL, främmande nycklar och databasbegränsningar.

Appen ska inte publiceras direkt på internet eller användas som en fleranvändartjänst. Det skulle kräva autentisering och verksamhetsisolering först. Den här SQLite-versionen behöver en lokal Node.js-process och en beständig datamapp; den är inte avsedd för Vercels tillfälliga filsystem.

Inga lösenord, API-nycklar eller riktiga användaruppgifter ska läggas i repositoryt. Bildhantering, webbutik, betalningar och molnsynkronisering ingår inte i denna version.

## Kodstruktur

- `app/page.tsx`: de sex vyerna och registreringsformulären.
- `app/api/data/route.ts`: lokalt GET/POST-API utan cachelagring.
- `lib/database.ts`: SQLite-schema, versionshantering, engångsdata, läsning och skrivning.
- `lib/validation.ts`: typad servervalidering för registrering och fasändring.
- `lib/local-request.ts`: kontroll av lokala värdar och origin.
- `lib/use-cultivation.ts`: hämtning, sparstatus och felhantering i gränssnittet.
- `lib/data.ts`: domäntyper, exempeldata och bibliotekstexter.
- `tests/database.test.mjs`: tester med verkliga SQLite-databaser, inklusive omstart och validering.

SQLite-stödet kommer från Node.js inbyggda `node:sqlite`. Inga separata databasprogram, SQLite-servrar eller native npm-tillägg behöver installeras. Bibliotekets fotografier levereras med appen. Övriga svampillustrationer är egen SVG-grafik; typsnitt, CSS, ikoner och foton kräver inga externa tjänster under användning.

## Kontroller

```sh
pnpm test
pnpm build
pnpm typecheck
pnpm format:check
```

GitHub Actions kör SQLite-tester, produktionsbygge och TypeScript-kontroll. Bygg- och utvecklingskommandona använder Next.js Webpack-stöd för kompatibilitet med begränsade lokala körmiljöer.
