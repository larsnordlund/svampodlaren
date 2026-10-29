# Svampodlaren på Raspberry Pi med UniFi Teleport och automatisk start

Använd ert befintliga UniFi Teleport via WiFiman. Tailscale behövs inte. Hemma öppnar du Pi:ns adress direkt; utifrån ansluter du först Teleport och öppnar samma adress. Logga därefter in med ditt vanliga konto i Svampodlaren.

## 1. Behåll data och uppdatera programmet

Ta en fullständig backup i appen. Överför uppdaterade programfiler med Transmit till `~/svampodlaren`. Behåll Pi:ns `data/`, `backups/` och `.env*`. Överför inte Macens `node_modules`, `.next` eller `.git`. Skriv inte över databasen med Macens kopia.

I UniFi, reservera Pi:ns nuvarande IP-adress i DHCP-inställningarna så att adressen förblir densamma. Exemplen använder `192.168.3.137`; byt den om Pi:n fått en annan adress.

## 2. Bygg och aktivera automatisk start

Kör på Pi:n som din vanliga användare. Node.js minst 22.13 och projektets pnpm-version behövs. Stoppa tidigare manuella `pnpm start` med Ctrl+C, eller befintlig tjänst med `sudo systemctl stop svampodlaren` före bygget.

```bash
cd ~/svampodlaren
pnpm install --frozen-lockfile
pnpm build
node --experimental-strip-types scripts/install-rpi-service.mjs --lan-origin http://192.168.3.137:3001
```

Skriptet hittar aktuellt konto och Node-sökväg, även med nvm. Det ber självt om sudo, installerar `/etc/systemd/system/svampodlaren.service` och aktiverar samt startar tjänsten. Din befintliga databas används i samma projektmapp. Efter en Node-/nvm-uppdatering kör du installationsskriptet igen.

Du kan först förhandsgranska utan installation genom att lägga till `--dry-run`. För annan port måste både adress och `--port` matcha, exempelvis `--lan-origin http://192.168.3.137:3005 --port 3005`.

## 3. Anslut hemifrån och utifrån

Öppna `http://192.168.3.137:3001` hemma. Utifrån aktiverar du först er Teleport-anslutning i WiFiman och öppnar samma adress. UniFi-regler mellan Teleport-nätet och Pi:ns nät måste tillåta TCP-port 3001. Ingen portvidarebefordran från internet ska skapas.

[UniFis dokumentation om Teleport](https://help.ui.com/hc/en-us/articles/5246403561495-UniFi-Gateway-Teleport-VPN).

Den här varianten använder HTTP inom ert privata nät. Teleport krypterar VPN-förbindelsen utifrån; det innebär inte att webbadressen har HTTPS. Använd endast betrodda lokala nät och VPN. Appens login och ägarbehörigheter gäller fortfarande.

## 4. Kontrollera och administrera

```bash
sudo systemctl status svampodlaren --no-pager
curl -I http://192.168.3.137:3001
sudo systemctl restart svampodlaren
sudo journalctl -u svampodlaren -n 60 --no-pager
```

När adressen fungerar kan du kontrollera start vid uppstart med `sudo reboot`.

Om du redan installerat Tailscale Serve för appen kan du stänga av just dess HTTPS-lyssnare med `sudo tailscale serve --https=443 off`, förutsatt att den inte används för något annat. Installationsskriptet ovan ersätter appens systemd-konfiguration.

## Filer och inställningar

- `lib/local-request.ts`: tillåter exakt `APP_LAN_ORIGIN` med privat IPv4-adress. Skrivningar kräver samma origin. Proxyhuvuden används inte för LAN-läget.
- `lib/rpi-service.ts`: genererar tjänsten; LAN-läget lyssnar på `0.0.0.0` med `APP_TRUST_PROXY=0` och tom `APP_PUBLIC_ORIGIN`.
- `scripts/install-rpi-service.mjs`: installerar och aktiverar tjänsten.
- `/etc/systemd/system/svampodlaren.service`: den installerade tjänsten på Pi:n. Efter manuella ändringar: `sudo systemctl daemon-reload` och `sudo systemctl restart svampodlaren`.

Standardstart på Mac/localhost påverkas inte. Tidigare privat HTTPS via Tailscale är fortfarande ett alternativ med `--origin https://din-pi.ditt-nat.ts.net`; kombinera inte det proxyläget med en öppet tillgänglig backend. Macens schemalagda Codex-/Apple Mail-backup flyttas inte automatiskt till Pi:n; manuell backup i appen finns kvar.
