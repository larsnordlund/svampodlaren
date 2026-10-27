# Svampodlaren 🍄

En svensk, mobilanpassad app för svampodling med **Next.js, TypeScript, Tailwind CSS och SQLite**. Den körs lokalt på datorn och fungerar utan internet när installationen är klar. Ingen molntjänst eller Supabase-anslutning behövs. Användarkonton och inloggning lagras lokalt i SQLite.

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
- Batchregister med projektkoppling, unika batchnamn, substrat, odlingsform (hink, påse, stock, friland eller eget val), fasfilter och ändringsbar odlingsfas.
- Odlingsdagbok med observation, datum, odlingsfas, temperatur och luftfuktighet. Fasen föreslås från vald batch men sparas som en historisk uppgift på anteckningen. Den kan även anges eller rättas på befintliga dagboksposter. Batchens aktuella fas ändras separat i batchregistret. Anteckningar kan raderas med bekräftelse; övriga odlingsposter påverkas inte.
- Skörderegistrering med batch, datum, vikt i gram och skördevåg.
- Svampbibliotek med nio inbyggda introduktionsguider och källhänvisningar. Lägg till egna svampar med namn, vetenskapligt namn, beskrivning, odlingsråd och valfri källänk. Egna svampar sparas i SQLite, kan sökas fram och kan väljas i nya odlingsprojekt.
- Sökning och JSON-export via knappen i sidhuvudet.

Bibliotekets inbyggda texter och artfotografier fungerar offline. De nio inbyggda arterna samt kantarell har lokala WebP-bilder som visas på bibliotekskort och i guider. Egna svampar utan foto visar ”Bild saknas”. Bildkällor, fotografer och licenser finns i `public/images/mushrooms/CREDITS.md` och vid bilderna i appen. Länkar till externa källor kräver internet.

## Radera registrerade poster

Alla register där du kan skapa egna poster har en **Radera**-knapp: projekt, batcher, dagboksanteckningar, skördar och egna svampar. Du får se vilken post som avses och bekräftar innan något tas bort. Inbyggda arter är fasta biblioteksposter och raderas inte.

Projekt med kopplade batcher kan inte raderas. Batcher med anteckningar eller skördar kan inte heller raderas. Ta först bort de kopplade posterna. Databasens främmande nycklar upprätthåller detta även om en annan flik har ändrat uppgifterna.

Radering av en egen svamp tar bort biblioteksposten; befintliga projekt behåller svampnamnet i sin odlingshistorik. Radering är permanent, sparas i SQLite och räknas om i översikten och exporten.

## Lokal databas och exempeldata

Appen skapar automatiskt **`data/svampodlaren.sqlite`** vid första användningen. Då läggs exempelprojekt, batcher, observationer och skördar in en gång. Därefter sparas alla ändringar permanent i SQLite. Exempeldata läggs inte tillbaka vid omstart.

Befintliga databaser uppgraderas automatiskt till schemaversion 4. Version 2 lägger till `custom_species`, version 3 lägger till odlingsform på batcher och version 4 lägger till odlingsfas på dagboksanteckningar. Äldre anteckningar visar ”Ej angiven” tills en fas anges. Tidigare odlingsposter bevaras; gamla batcher har ingen odlingsform tills du själv anger en. Odlingsformen kan registreras vid skapande och ändras med **Spara** på batchkortet. Den visas även vid batchval i dagbok och skördar, går att söka på och ingår i exporten.

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

Vid första starten skapar du själv ett administratörskonto i appen. Alla befintliga poster bevaras och tilldelas det första administratörskontot. Ingen standardinloggning finns. Säkerhetskopiera databasen före uppgradering.

Administratörer öppnar **Administrera register & användare** överst på sidan. Där kan de skapa lokala konton (användare eller administratör), filtrera samtliga fem register efter användare, ändra alla registrerade fält och skapa poster åt en vald användare. Användaren för en befintlig post kan inte bytas; kopplade projekt, batcher, anteckningar och skördar måste tillhöra samma användare. De förinstallerade svamparterna är ett gemensamt referensbibliotek i koden; registrerade egna svampar kan redigeras.

Vanliga användare kan skapa, se och exportera sina egna poster. Endast administratörer får ändra eller radera poster, även via API:t. Administratörer ser och kan exportera alla poster. Den vanliga odlingsvyns nya poster tillhör den inloggade användaren; använd administratörsvyn för att skapa åt andra.

Lösenord lagras med individuella salter och scrypt (N=131072, r=8, p=1). Sessioner har slumpmässiga token, endast SHA-256-hashen lagras i databasen, och webbläsaren får en HttpOnly-cookie med SameSite=Strict. Sessioner löper ut efter sju dagar och återkallas vid utloggning. Fem misslyckade inloggningar per användarnamn ger 15 minuters spärr. Välj minst 12 tecken för lösenord. Automatisk lösenordsåterställning och byte av lösenord ingår ännu inte; spara dina inloggningsuppgifter säkert.

Startkommandona binder servern till `127.0.0.1`. API:t accepterar bara lokala värdnamn, och skrivningar kräver samma origin. Alla dataanrop kräver inloggning, behörigheter kontrolleras på servern och användaruppgifter filtreras där. Servern validerar uppgifter och använder parametriserad SQL, främmande nycklar och databasbegränsningar. Kontona delar samma dator och databasfil; en person med åtkomst till filen kan läsa eller ändra databasen. Säkerhetskopior innehåller därför även lösenordshashar och sessioner och ska skyddas.

Appen är avsedd för lokal användning och ska inte publiceras direkt på internet. Den behöver en lokal Node.js-process och en beständig datamapp och är inte avsedd för Vercels tillfälliga filsystem.

Inga lösenord, API-nycklar eller riktiga användaruppgifter ska läggas i repositoryt. Bildhantering, webbutik, betalningar och molnsynkronisering ingår inte i denna version.

## Kodstruktur

- `app/page.tsx`: de sex vyerna och registreringsformulären.
- `app/api/data/route.ts`: lokalt GET/POST-API utan cachelagring.
- `lib/accounts.ts`: konton, lösenord, sessioner, ägarskap och behörigheter.
- `components/account-gate.tsx`: lokal inloggning och första administratören.
- `components/admin-records.tsx`: redigering och registrering för andra användare.
- `app/api/auth/route.ts`: lokalt konto- och sessions-API.
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
