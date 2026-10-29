import { isAbsolute, dirname, join } from "node:path";
import { publicOrigin } from "./local-request.ts";
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
}: {
  directory: string;
  node: string;
  user: string;
  origin: string;
  port?: number;
}) {
  if (/[\r\n\0\\]/.test(directory) || directory.trimEnd() !== directory)
    throw Error(
      "Projektets sökväg får inte innehålla kontrolltecken, bakstreck eller avslutande blanksteg.",
    );
  const normalized = publicOrigin(origin);
  if (!normalized)
    throw Error(
      "Ange en HTTPS-adress utan sökväg, till exempel https://rasp.example.ts.net",
    );
  if (!isAbsolute(directory) || !isAbsolute(node))
    throw Error("Absoluta sökvägar krävs.");
  if (!/^[a-z_][a-z0-9_-]*[$]?$/.test(user))
    throw Error("Ogiltigt Linux-användarnamn.");
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw Error("Porten måste vara 1024–65535.");
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
ExecStart=${quoted(node, true)} ${quoted(join(directory, "node_modules/next/dist/bin/next"), true)} start --hostname 127.0.0.1 --port ${port}
Environment="NODE_ENV=production"
Environment=${quoted("PATH=" + dirname(node) + ":/usr/local/bin:/usr/bin:/bin")}
Environment=${quoted("APP_PUBLIC_ORIGIN=" + normalized)}
Environment="APP_TRUST_PROXY=1"
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
