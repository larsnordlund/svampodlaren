import { parseArgs } from "node:util";
import { platform, userInfo, tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createConnection } from "node:net";
import { rpiService } from "../lib/rpi-service.ts";
const { values } = parseArgs({
  options: {
    origin: { type: "string" },
    port: { type: "string", default: "3001" },
    "dry-run": { type: "boolean", default: false },
  },
});
const directory = resolve(fileURLToPath(new URL("../", import.meta.url))),
  port = Number(values.port);
let origin = values.origin;
if (!origin) {
  const status = spawnSync("tailscale", ["status", "--json"], {
    encoding: "utf8",
  });
  if (status.error || status.status !== 0)
    throw Error(
      "Installera Tailscale och kör sudo tailscale up först, eller ange --origin https://din-pi.ditt-nat.ts.net",
    );
  const state = JSON.parse(status.stdout);
  const dns = state.Self?.DNSName?.replace(/\.$/, "");
  if (state.BackendState !== "Running" || !dns)
    throw Error(
      "Tailscale är inte anslutet. Kör sudo tailscale up och försök igen.",
    );
  origin = "https://" + dns;
}
const unit = rpiService({
  directory,
  node: process.execPath,
  user: userInfo().username,
  origin,
  port,
});
if (values["dry-run"]) {
  process.stdout.write(unit);
  process.exit(0);
}
if (platform() !== "linux")
  throw Error("Kör detta skript på din Raspberry Pi med systemd.");
if (process.getuid?.() === 0)
  throw Error(
    "Kör som din vanliga Pi-användare utan sudo. Skriptet ber självt om sudo vid installationen.",
  );
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 13))
  throw Error("Node.js 22.13 eller senare krävs.");
if (!existsSync(join(directory, ".next/BUILD_ID")))
  throw Error("Kör pnpm install --frozen-lockfile och pnpm build först.");
const command = (name, args) => {
  const result = spawnSync(name, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw Error(`${name} misslyckades. Kontrollera meddelandet ovan.`);
};
const active =
  spawnSync("systemctl", ["is-active", "--quiet", "svampodlaren.service"])
    .status === 0;
const occupied = await new Promise((resolve) => {
  const socket = createConnection({ host: "127.0.0.1", port });
  socket.setTimeout(1500);
  socket.once("connect", () => {
    socket.destroy();
    resolve(true);
  });
  socket.once("error", () => {
    socket.destroy();
    resolve(false);
  });
  socket.once("timeout", () => {
    socket.destroy();
    resolve(true);
  });
});
if (occupied && !active)
  throw Error(
    `Port ${port} är redan upptagen. Stoppa tidigare pnpm start med Ctrl+C och kör skriptet igen. Ingen process stoppas automatiskt.`,
  );
const folder = mkdtempSync(join(tmpdir(), "svampodlaren-service-"));
try {
  const path = join(folder, "svampodlaren.service");
  writeFileSync(path, unit, { mode: 0o600 });
  command("sudo", [
    "install",
    "-m",
    "0644",
    path,
    "/etc/systemd/system/svampodlaren.service",
  ]);
  command("sudo", ["systemctl", "daemon-reload"]);
  command("sudo", ["systemctl", "enable", "svampodlaren.service"]);
  command("sudo", ["systemctl", "restart", "svampodlaren.service"]);
  console.log(
    "\nAutomatisk start är installerad. Din privata adress: " + origin,
  );
  console.log("Kontrollera tjänsten:");
  console.log("sudo systemctl status svampodlaren --no-pager");
  console.log(`curl -I http://127.0.0.1:${port}`);
  console.log(
    `Aktivera därefter HTTPS med: sudo tailscale serve --bg http://127.0.0.1:${port}`,
  );
} finally {
  rmSync(folder, { recursive: true, force: true });
}
