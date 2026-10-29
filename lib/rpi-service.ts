import { isAbsolute, dirname, join } from "node:path";
import { publicOrigin, privateLanOrigin } from "./local-request.ts";
function quoted(value: string, exec = false) {
  if (/[\r\n\0]/.test(value))
    throw Error("Sökvägar får inte innehålla kontrolltecken.");
  let result = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/%/g, "%%");
  if (exec) result = result.replace(/\$/g, () => "$$");
  return '"' + result + '"';
}
export function rpiService({
  directory,
  node,
  user,
  origin,
  port = 3001,
  lan = false,
}: {
  directory: string;
  node: string;
  user: string;
  origin: string;
  port?: number;
  lan?: boolean;
}) {
  if (/[\r\n\0\\]/.test(directory) || directory.trimEnd() !== directory)
    throw Error(
      "Projektets sökväg får inte innehålla kontrolltecken, bakstreck eller avslutande blanksteg.",
    );
  const normalized = lan ? privateLanOrigin(origin) : publicOrigin(origin);
  if (!normalized)
    throw Error(
      lan
        ? "Ange Pi:ns privata HTTP-adress, till exempel http://192.168.3.137:3001"
        : "Ange en HTTPS-adress utan sökväg.",
    );
  if (!isAbsolute(directory) || !isAbsolute(node))
    throw Error("Absoluta sökvägar krävs.");
  if (!/^[a-z_][a-z0-9_-]*[$]?$/.test(user))
    throw Error("Ogiltigt Linux-användarnamn.");
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw Error("Porten måste vara 1024–65535.");
  if (lan && Number(new URL(normalized).port || 80) !== port)
    throw Error("Adressens port måste matcha tjänstens port.");
  return `[Unit]
Description=Svampodlaren
Wants=network-online.target
After=network-online.target
StartLimitIntervalSec=60
StartLimitBurst=5

[Service]
Type=exec
User=${user}
WorkingDirectory=${directory.replace(/%/g, "%%")}
ExecStart=${quoted(node, true)} ${quoted(join(directory, "node_modules/next/dist/bin/next"), true)} start --hostname ${lan ? "0.0.0.0" : "127.0.0.1"} --port ${port}
Environment="NODE_ENV=production"
Environment=${quoted("PATH=" + dirname(node) + ":/usr/local/bin:/usr/bin:/bin")}
Environment=${quoted("APP_PUBLIC_ORIGIN=" + (lan ? "" : normalized))}
Environment=${quoted("APP_LAN_ORIGIN=" + (lan ? normalized : ""))}
Environment="APP_TRUST_PROXY=${lan ? "0" : "1"}"
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
UMask=0077
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
`;
}
