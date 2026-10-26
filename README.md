# Svampodlaren 🍄

Svampodlaren är en planerad svensk webb- och mobilanpassad plattform för svampodling.

## Syfte

- Odlingsdagbok med anteckningar, bilder och observationer
- Projekt- och batchregister med spårbarhet
- Skörderegistrering
- Svampbibliotek med odlingsguider och källhänvisningar
- Webbutik för framtida försäljning

## Planerad teknik

- Next.js (App Router), TypeScript och Tailwind CSS
- Supabase: PostgreSQL, Auth och Storage
- Vercel för webbpublicering
- Stripe Checkout i en senare fas

## Arkitektur

Börja med en odlingsverksamhet, men utforma databasen för flera separata verksamheter (`organizations`, `organization_members`). Privata tabeller ska skyddas av Row Level Security (RLS), och bilder av säkra Storage-policyer.

## Första utvecklingssteg

1. Skapa en responsiv Next.js-app med svenskt gränssnitt och tydligt markerade exempeldata.
2. Bygg dashboard, odlingsprojekt, batchregister, dagbok, skördar och svampbibliotek.
3. Inför Supabase-migrationer, säker inloggning och organisationstillhörighet.
4. Lägg till tester och CI innan produktionslansering.
5. Implementera webbutik och betalningar i senare etapp.

## Säkerhet

Lägg aldrig in lösenord, privata API-nycklar eller riktiga användaruppgifter i repositoryt. Använd miljövariabler och en `.env.example` utan hemligheter.

## Status

Första fungerande demoversionen är implementerad med Next.js, TypeScript och Tailwind CSS. Supabase och produktionsinloggning återstår.

## Kör första versionen lokalt

Kräver Node.js 22 eller senare och pnpm 11 (aktivera vid behov med `corepack enable`).

```sh
pnpm install
pnpm dev
```

Öppna http://localhost:3000. För verifiering och produktionskörning:

```sh
pnpm build
pnpm typecheck
pnpm start
```

### Det här ingår

- Svensk, responsiv översikt med statistik som beräknas från odlingsdata.
- Odlingsprojekt och batchregister med koppling mellan projekt och batcher, sökning, fasfilter och ändring av odlingsfas.
- Odlingsdagbok med datum, observation, temperatur och luftfuktighet.
- Skörderegistrering med batch, datum, vikt i gram och skördevåg.
- Svampbibliotek med tre introduktionsguider och länkar för vidare läsning.
- Formulär för att skapa projekt, batcher, dagboksinlägg och skördar samt JSON-export via knappen i sidhuvudet.

### Exempeldata och lagring

All information i den första versionen är exempeldata. Första besöket laddar `lib/data.ts`.
Ändringar sparas i `localStorage` under `svampodlaren-demo-v1` i den aktuella webbläsaren.
Lagringen delas inte mellan enheter eller användare. Radera den nyckeln i webbläsaren för att återställa demot.
Använd exportknappen för att spara en JSON-kopia. Om webbläsarlagringen inte fungerar visas ett meddelande och ändringarna finns kvar i minnet under besöket.

Supabase, inloggning, bildhantering, butik och betalningar är ännu inte inkopplade.
Inga miljövariabler krävs för att köra demot; `.env.example` innehåller endast tomma platshållare.
När Supabase införs ska datamodellen kompletteras med organisationstillhörighet och RLS före riktig användardata.

### Kodstruktur

- `app/page.tsx`: klientgränssnitt och lokala registreringsflöden.
- `app/globals.css`: Tailwind CSS 4 samt naturinspirerad responsiv formgivning.
- `lib/data.ts`: typade exempeldata och biblioteksinnehåll. Ersätt den lokala datalagringen med ett separat Supabase-datalager i nästa etapp.

Svampillustrationerna är egen SVG-grafik och kräver inga externa bildtjänster eller typsnitt.

## Kontroller

GitHub Actions kör installation från låsfil, produktionsbygge och TypeScript-kontroll för pull requests och uppdateringar av main.
`pnpm format:check` kontrollerar kodformatering. Bygg- och utvecklingskommandona använder Next.js Webpack-stöd för kompatibilitet med begränsade lokala körmiljöer.
