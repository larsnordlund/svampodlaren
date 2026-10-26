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

Projektet är initierat. Applikationskod återstår att skapa med Codex.
