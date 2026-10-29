# Svampodlaren på Raspberry Pi med automatisk start och privat HTTPS

Det här gör appen tillgänglig hemifrån och utifrån på datorer och mobiler som du ansluter till ditt eget Tailscale-nätverk. Alla behöver också logga in i Svampodlaren med sina vanliga appkonton. Adressen är privat; ingen port behöver öppnas i routern. Du använder Tailscale Serve, inte den publika tjänsten Funnel.

## 1. Överför den uppdaterade appen

Överför de uppdaterade programfilerna med Transmit till `~/svampodlaren` på Pi:n. Ta med `lib`, `app`, `components`, `scripts`, `public`, `package.json`, `pnpm-lock.yaml`, TypeScript-/PostCSS-konfiguration och denna guide. Behåll Pi:ns befintliga `data/`, `backups/` och `.env*`-filer. Överför inte Macens `node_modules`, `.next` eller `.git` och skriv inte över Pi:ns databas med Macens kopia.

Ta en fullständig säkerhetskopia innan uppdatering. Kör därefter installationen nedan på Pi:n, inte på Macen. Du behöver Node.js 24 LTS (minst 22.13), pnpm 11 och ett vanligt Linux-konto med sudo-rättighet.

## 2. Installera och anslut Tailscale på Pi:n

Om Tailscale inte redan är installerat:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
```

Anslut och följ inloggningslänken som kommandot visar:

```bash
sudo systemctl enable --now tailscaled
sudo tailscale up
```

[Officiell Linux-installation](https://tailscale.com/docs/install/linux).

## 3. Bygg appen och installera automatisk start

Stoppa tidigare `pnpm start` med Ctrl+C i dess terminal. Om appen redan körs som tjänst: `sudo systemctl stop svampodlaren` före uppdatering/bygge. Ingen annan process stoppas automatiskt.

```bash
cd ~/svampodlaren
pnpm install --frozen-lockfile
pnpm build
node --experimental-strip-types scripts/install-rpi-service.mjs
```

Kör det sista kommandot utan `sudo` framför `node`. Skriptet hittar Pi:ns Tailscale-adress, kontonamn och aktuella Node-sökväg. Det frågar självt efter sudo vid installation av `/etc/systemd/system/svampodlaren.service` och kör `daemon-reload`, `enable` och `restart`. Din befintliga databas används genom samma projektmapp och vanliga konfiguration. Porten är 3001; om den är upptagen av en manuellt startad app får du ett fel som ber dig stoppa den. Skriptet dödar ingen okänd process.

Förhandsgranska tjänsten utan att installera (byt ut exempeladressen):

```bash
node --experimental-strip-types scripts/install-rpi-service.mjs --origin https://rasp.ditt-nat.ts.net --dry-run
```

En annan port kan väljas med `--port 3005`. Använd då samma port även i Serve-kommandot nedan. Efter en större Node-/nvm-uppdatering kör du installationsskriptet igen så att tjänsten använder den nya absoluta Node-sökvägen.

## 4. Aktivera privat HTTPS

```bash
sudo tailscale serve --bg http://127.0.0.1:3001
```

Om Tailscale ber dig aktivera HTTPS, följ länken som visas och kör sedan kommandot igen. Serve skriver ut appens privata adress, exempelvis `https://rasp.ditt-nat.ts.net`. Öppna den från en dator eller mobil där Tailscale är installerat och anslutet till samma nätverk. Använd fortfarande ditt vanliga användarnamn och lösenord i Svampodlaren.

`--bg` gör att Serve fortsätter i bakgrunden och återupptas efter omstart. [Dokumentation för Serve](https://tailscale.com/docs/reference/tailscale-cli/serve), [klienter för andra enheter](https://tailscale.com/docs/install).

## 5. Kontrollera och administrera

```bash
sudo systemctl status svampodlaren --no-pager
curl -I http://127.0.0.1:3001
sudo tailscale serve status
```

Starta om appen:

```bash
sudo systemctl restart svampodlaren
```

Visa senaste felloggen:

```bash
sudo journalctl -u svampodlaren -n 60 --no-pager
```

Starta om Pi:n för att kontrollera att appen och Serve kommer tillbaka, när du har sett att adressen fungerar:

```bash
sudo reboot
```

## Filer och inställningar

- `lib/local-request.ts`: kontrollerar appens tillåtna origin och proxyhuvuden. Standard är bara localhost.
- `app/api/auth/route.ts`: sätter Secure på sessionskakan för den verifierade HTTPS-adressen.
- `lib/rpi-service.ts`: genererar systemd-tjänsten med användarkonto, projektmapp, nvm-/Node-sökväg och port.
- `scripts/install-rpi-service.mjs`: installerar och aktiverar tjänsten på Pi:n.
- `/etc/systemd/system/svampodlaren.service`: den installerade tjänsten på Pi:n. Ändringar här kräver `sudo systemctl daemon-reload` och `sudo systemctl restart svampodlaren`.

Appens port är fortsatt bunden till loopback och ska inte ändras till `0.0.0.0` med denna proxykonfiguration. `APP_PUBLIC_ORIGIN` är exakt appens privata HTTPS-adress och `APP_TRUST_PROXY=1` aktiveras endast bakom den lokala betrodda proxyn. Appen litar inte på Tailscale-identitetshuvuden för inloggning; vanliga appkonton och behörigheter gäller. Mottagaradress och lokal backupfunktion finns kvar, men Macens schemalagda Codex-/Apple Mail-körning flyttas inte automatiskt med appen.
