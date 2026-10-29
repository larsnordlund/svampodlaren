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

Alla inloggade användare kan se och exportera samtliga odlingsposter. Vanliga användare kan skapa, ändra och radera egna poster, men får inte ändra eller radera andras poster. Knappen **Visa register / ändra egna poster** öppnar redigeringen. Administratörer kan ändra och radera allas poster och skapa åt andra. Behörigheterna kontrolleras även via API:t. Den vanliga odlingsvyns nya poster tillhör den inloggade användaren; använd administratörsvyn för att skapa åt andra.

Lösenord lagras med individuella salter och scrypt (N=131072, r=8, p=1). Sessioner har slumpmässiga token, endast SHA-256-hashen lagras i databasen, och webbläsaren får en HttpOnly-cookie med SameSite=Strict. Sessioner löper ut efter sju dagar och återkallas vid utloggning. Fem misslyckade inloggningar per användarnamn ger 15 minuters spärr. Välj minst 12 tecken för lösenord. Administratörer kan ange ett nytt lösenord i användarhanteringen; automatisk återställning via e-post ingår inte. Byte av användarnamn, lösenord eller roll återkallar kontots sessioner.

Startkommandona binder servern till `127.0.0.1`. API:t accepterar lokala värdnamn samt en uttryckligen konfigurerad HTTPS-adress via en betrodd proxy; skrivningar kräver samma origin. Alla dataanrop kräver inloggning, behörigheter kontrolleras på servern och ägarskap kontrolleras vid alla ändringar där. Servern validerar uppgifter och använder parametriserad SQL, främmande nycklar och databasbegränsningar. Kontona delar samma dator och databasfil; en person med åtkomst till filen kan läsa eller ändra databasen. Säkerhetskopior innehåller därför även lösenordshashar och sessioner och ska skyddas.

Appen kan användas lokalt eller via privat HTTPS genom Tailscale Serve. Den ska inte exponeras direkt som en publik HTTP-tjänst. Den behöver en lokal Node.js-process och en beständig datamapp och är inte avsedd för Vercels tillfälliga filsystem.

Inga lösenord, API-nycklar eller riktiga användaruppgifter ska läggas i repositoryt. Webbutik, betalningar och molnsynkronisering ingår inte i denna version.

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

## Veckobackup via Apple Mail

Under **Administrera register & användare → Veckobackup via e-post** kan administratörer ändra mottagaren (standard `larsnordlund@me.com`) och slå av/på utskicken. Vanliga användare har inte åtkomst till backupinställningarna eller hela databasfilen via API:t.

Den här datorns schemalagda Codex-chatt **Svampodlaren – veckobackup** kör måndagar kl. 09.00 svensk tid. Körningen läser den aktuella mottagaradressen från SQLite vid varje tillfälle, tar en konsekvent ögonblicksbild även när appen används, kontrollerar `PRAGMA integrity_check`, komprimerar den till `.sqlite.gz` och använder Apple Mail för att skicka en separat fil med endast odlingsregistren. Datorn behöver vara på, Codex igång och Mail konfigurerat med ett fungerande konto och internet. Automatiken är registrerad på den här datorn; en klon av repositoryt får ingen automatisk körning utan att motsvarande schemalagda chatt skapas där.

Backupen sparas även i den Git-ignorerade mappen `backups/` med filbehörighet 0600. Den lokala huvudkopian innehåller hela databasen, även konton, lösenordshashar och inställningar. Mejlet får endast filen som slutar med `-odlingar.sqlite.gz`. Den innehåller de fem odlingsregistren, utan konton, lösenordshashar, sessioner, ägarskap eller inställningar. Filen byggs om med VACUUM efter att övriga tabeller tagits bort, så att borttagna databasidor inte ligger kvar. Vid återställning från mejlbilagan skapas konton på nytt och alla poster tilldelas den första administratören. Lokala kopior tas inte bort automatiskt. Packa upp `.sqlite.gz` och använd den återställda `.sqlite`-filen som databas när appen är stoppad. En snapshot som väntar på sändning samt en redan överlämnad backup blockerar automatiska dubbletter samma vecka. Om Mail inte kan skicka ligger den lokala kopian kvar och körningen rapporterar problemet. Statusen ”Överlämnad till Mail för sändning” är inte ett kvitto på leverans till mottagarens inkorg.

`scripts/weekly-backup.mjs` skapar bara den lokala filen och hanterar körningsstatus; den skickar inte e-post på egen hand. Den schemalagda chatten sköter Mail. Kommandot ska alltid köras i den ordinarie projektmappen så att den riktiga databasen säkerhetskopieras:

```bash
node --experimental-strip-types scripts/weekly-backup.mjs --status
node --experimental-strip-types scripts/weekly-backup.mjs --prepare
# Först efter verifierad överlämning till Mail:
node --experimental-strip-types scripts/weekly-backup.mjs --mark-sent BACKUP_ID
# Vid ett säkert konstaterat sändningsfel:
node --experimental-strip-types scripts/weekly-backup.mjs --mark-failed BACKUP_ID "Orsak"
```

`SQLITE_PATH` kan ange en alternativ databas. Kommandot vägrar skapa en tom ersättningsdatabas om källfilen saknas. Vid oklar sändningsstatus ska Mail kontrolleras innan ett nytt försök görs, så att samma backup inte skickas flera gånger.

## Ändra och radera användare

Under **Administrera register & användare → Användarkonton** finns knappar för att ändra och radera konton. Namn, användarnamn och roll kan ändras; lämna lösenordsfältet tomt för att behålla befintligt lösenord. Den sista administratören kan inte nedgraderas eller raderas. Du kan inte radera ditt inloggade konto eller ta bort din egen administratörsroll.

Vid radering visas en bekräftelse där du väljer en annan användare som tar över samtliga odlingsposter. Kontot och dess sessioner raderas i samma transaktion som ägarskapet överförs. Inga odlingsposter tas bort.

## Backup på kommando

Administratören kan trycka **Kör backup nu** i backupinställningarna. Det fungerar även om veckokörningen är avstängd eller en backup redan har skapats samma vecka. Manuell körning påverkar inte veckokörningens dubblettskydd. Knappen sparar en fullständig lokal backup och en separat odlingsfil utan konton/inloggningsuppgifter. Båda kan laddas ned via administratörsskyddade länkar i körningshistoriken. Inget mejl skickas automatiskt av knappen; bifoga vid behov odlingsfilen i Mail.

Samma manuella körning finns i terminalen:

```bash
node --experimental-strip-types scripts/weekly-backup.mjs --manual
```

## Bilder på egna svampar

I **Svampbibliotek → Lägg till svamp** kan du välja ett foto under **Bild (valfritt)**. JPG, PNG och WebP upp till 10 MB stöds. Webbläsaren anpassar fotot till högst 1440 pixlar och komprimerar det som JPEG (högst 1 MB), med förhandsvisning före sparande. Den omritade bilden sparas utan originalfilens metadata.

För en befintlig egen svamp: öppna **Redigera kort** på bibliotekskortet, välj ett annat foto eller tryck **Ta bort bild**, och sedan **Spara kort**. Bildfältet finns även vid registrering och redigering av **Egna svampar** i registervyn. Användare får ändra egna bilder och administratörer får ändra allas. De inbyggda arternas referensbilder behålls.

Bilderna lagras i kolumnen `custom_species.image` i SQLite och fungerar utan internet. De följer med i JSON-export, fullständig databasbackup och odlingsfilen för mejl. Inga separata uppladdningsmappar behöver flyttas vid installation på Raspberry Pi. Servern validerar bildformat, storlek och dimensioner; SVG och externa bildadresser godtas inte som uppladdning. Befintliga databaser får ett tomt bildfält utan att gamla uppgifter ändras.

### Ändra ”Egen svamp” och ”Egen bild”

För egna svampar kan du redigera **Etikett på svampkortet** (högst 60 tecken) och **Bildtext / fotograf** (högst 160 tecken). Fälten finns vid registrering, i registerredigeringen och under **Redigera kort** direkt på svampkortet. Tomma fält döljer respektive text. Standardtexterna är ”Egen svamp” och ”Egen bild” för äldre poster och nya formulär. Bildtexten visas för uppladdade bilder både på kortet och i odlingsguiden. De inbyggda referensbildernas fotograf- och licensangivelser behålls. Texterna lagras i SQLite, följer med i backup och får ändras av ägaren eller administratör.

### Redigera hela svampkortet och lägga till guidelänk senare

Öppna **Redigera kort** direkt på en egen svamp i biblioteket. Där kan ägaren eller administratören ändra namn, vetenskapligt namn, beskrivning, odlingsråd, valfri guidelänk, bild, etikett och bildtext. Ändringarna sparas tillsammans med **Spara kort**; **Avbryt** återställer osparade uppgifter. Om svampen byter namn rensas aktuell sökning så att det uppdaterade kortet förblir synligt.

**Länk till odlingsguide** kan lämnas tom vid registreringen och läggas till eller ändras senare. När en http-/https-länk har sparats visas **Läs odlingsguiden** på det egna kortet och öppnar länken i en ny flik. **Visa uppgifter och odlingsråd** öppnar fortfarande de sparade texterna i appen. Tom länk tar bort den externa guideknappen. Inbyggda referenskort och deras käll-/licensangivelser behålls.

## Bilder i odlingsdagboken

Under **Odlingsdagbok → Ny anteckning** kan du välja flera bilder i fältet **Bilder till anteckningen**. Högst sex bilder per anteckning stöds, JPG/PNG/WebP upp till 10 MB per original. Bilderna anpassas lokalt till JPEG, högst 1440 pixlar och 1 MB per bild, utan originalfilernas metadata.

På en sparad anteckning öppnar **Lägg till / ändra bilder** bildredigeringen. Lägg till eller ta bort bilder och tryck **Spara dagboksbilder**. **Avbryt** återställer osparade ändringar. Klicka på en bild i anteckningen för större visning; stäng med **Stäng bild** eller Escape. Bildfältet finns även vid registrering och redigering av dagboksanteckningar i registervyn.

Alla inloggade användare kan se bilderna. Bara ägaren eller administratören får ändra dem. Bilder lagras som en validerad JSON-lista i `entries.images` i SQLite och följer med vid JSON-export, fullständig backup och odlingsbackup för mejl. Gamla anteckningar får en tom bildlista utan att övriga uppgifter ändras. Att uppdatera bilder direkt på anteckningen ändrar inte dess text, datum eller odlingsfas.

## Alla dagboksanteckningar för en batch

I **Odlingsdagbok** väljer du **Visa anteckningar för batch** för att visa hela historiken för en viss batch, även avslutade batcher. Alternativen visar batchnamn, behållare, projekt och antal anteckningar. Listan visas med senaste datum först, inklusive bilder och odlingsfas. Väljer du en annan batch rensas sökningen så att alla dess anteckningar kommer fram. Sökfältet kan sedan användas inom batchen; räknaren visar antal träffar av totalt antal anteckningar för vald batch. **Visa alla batcher** återställer både batchfilter och sökning.

På varje batchkort finns också **Visa dagbok (antal)** som öppnar dagboken direkt med rätt batch vald. Om du skapar en ny anteckning med en egen batch vald föreslås den batchen automatiskt. Behörigheterna för att skapa och ändra anteckningar är oförändrade.

## Raspberry Pi: start vid uppstart och privat åtkomst utanför hemmet

Se [installationsguiden](docs/RASPBERRY_PI.md). `scripts/install-rpi-service.mjs` hittar aktuell Node-sökväg (även nvm), skapar en systemd-tjänst för den befintliga projektmappen/databasen och aktiverar automatisk start på port 3001. Appen lyssnar fortfarande bara på `127.0.0.1`; Tailscale Serve står för privat HTTPS och åtkomst från anslutna datorer/mobiler. SSH-tunneln behövs då inte.

API:t kräver `APP_PUBLIC_ORIGIN=https://din-pi.ditt-nat.ts.net` och `APP_TRUST_PROXY=1` för proxyåtkomst. Installationsskriptet anger dessa i systemd-tjänsten från Pi:ns Tailscale-adress. Endast exakt denna HTTPS-origin med matchande proxyhuvuden godtas; andra värdar, ändrade origin och anrop från andra webbplatser nekas. Sessionskakan får `Secure` även när TLS avslutas i proxyn. Standardstart på Mac/localhost påverkas inte. Kombinera inte betrodda proxyhuvuden med en öppet tillgänglig backend på `0.0.0.0`.

Ingen tjänst eller Tailscale-anslutning installeras automatiskt på en annan dator genom att filerna ändras här. Kör installationen på själva Pi:n enligt guiden. Veckobackupen via Codex/Apple Mail på Macen följer inte automatiskt med till Pi:n; manuell backup i appen fungerar även där.
