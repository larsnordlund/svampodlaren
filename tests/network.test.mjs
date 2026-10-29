import test from "node:test";
import assert from "node:assert/strict";
import {
  allowedLocalRequest,
  requestOrigin,
  publicOrigin,
} from "../lib/local-request.ts";
import { rpiService } from "../lib/rpi-service.ts";
const origin = "https://rasp.example.ts.net";
const proxy = { publicOrigin: origin, trustProxy: true };
const req = (headers = {}) =>
  new Request("http://localhost:3001/api/data", {
    headers: {
      host: "rasp.example.ts.net",
      origin,
      "x-forwarded-host": "rasp.example.ts.net",
      "x-forwarded-proto": "https",
      "sec-fetch-site": "same-origin",
      ...headers,
    },
  });
test("proxyåtkomst kräver exakt konfigurerad HTTPS-origin och matchande proxyhuvuden", () => {
  assert.equal(allowedLocalRequest(req(), true, proxy), true);
  assert.equal(requestOrigin(req(), proxy), origin);
  assert.equal(
    allowedLocalRequest(req({ host: "127.0.0.1:3001" }), true, proxy),
    true,
  );
  assert.equal(
    allowedLocalRequest(req(), true, {
      publicOrigin: origin,
      trustProxy: false,
    }),
    false,
  );
  assert.equal(allowedLocalRequest(req(), true, {}), false);
  for (const headers of [
    { host: "evil.example" },
    { origin: "https://evil.example" },
    { origin: "http://rasp.example.ts.net" },
    { origin: origin + "/bad" },
    { origin: "https://user:secret@rasp.example.ts.net" },
    { "x-forwarded-proto": "http" },
    { "x-forwarded-proto": "https,http" },
    { "x-forwarded-host": "evil.example" },
    { "x-forwarded-host": "rasp.example.ts.net,evil.example" },
    { "sec-fetch-site": "cross-site" },
  ])
    assert.equal(
      allowedLocalRequest(req(headers), true, proxy),
      false,
      JSON.stringify(headers),
    );
  const noOrigin = req();
  noOrigin.headers.delete("origin");
  assert.equal(allowedLocalRequest(noOrigin, true, proxy), false);
  assert.equal(allowedLocalRequest(noOrigin, false, proxy), true);
});
test("lokal åtkomst fungerar fortsatt och ogiltig proxykonfiguration öppnar inget", () => {
  const local = req({
    host: "127.0.0.1:3001",
    origin: "http://127.0.0.1:3001",
    "x-forwarded-host": "127.0.0.1:3001",
    "x-forwarded-proto": "http",
  });
  assert.equal(allowedLocalRequest(local, true, proxy), true);
  assert.equal(allowedLocalRequest(local, true, {}), true);
  assert.equal(requestOrigin(local, proxy), "http://127.0.0.1:3001");
  for (const value of [
    "http://rasp.example.ts.net",
    "https://user:secret@rasp.example.ts.net",
    "https://rasp.example.ts.net/path",
    "https://*.ts.net",
    "not a url",
  ]) {
    assert.equal(publicOrigin(value), null);
    assert.equal(
      allowedLocalRequest(req(), true, {
        publicOrigin: value,
        trustProxy: true,
      }),
      false,
    );
  }
  for (const host of [
    "user@localhost:3001",
    "127.0.0.1:3001/bad",
    "127.0.0.1:3001,evil.example",
    "evil.example",
  ])
    assert.equal(allowedLocalRequest(req({ host }), true, proxy), false);
});
test("systemd-tjänsten låser backend till loopback och använder rätt Node, konto och projekt", () => {
  const unit = rpiService({
    directory: "/home/pi/svampodlaren",
    node: "/home/pi/.nvm/versions/node/v24.22.1/bin/node",
    user: "pi",
    origin,
  });
  assert.match(unit, /Type=exec/);
  assert.match(unit, /User=pi/);
  assert.match(unit, /WorkingDirectory=\/home\/pi\/svampodlaren/);
  assert.match(
    unit,
    /ExecStart="\/home\/pi\/\.nvm\/versions\/node\/v24\.22\.1\/bin\/node"/,
  );
  assert.match(unit, /--hostname 127\.0\.0\.1 --port 3001/);
  assert.match(unit, /APP_TRUST_PROXY=1/);
  assert.match(unit, /APP_PUBLIC_ORIGIN=https:\/\/rasp.example.ts.net/);
  assert.match(unit, /Restart=on-failure/);
  assert.match(unit, /WantedBy=multi-user.target/);
  assert.doesNotMatch(unit, /User=root|0\.0\.0\.0|pnpm start|SQLITE_PATH=/);
  const quoted = rpiService({
    directory: "/home/pi/with space % $",
    node: "/home/pi/node/bin/node",
    user: "pi",
    origin,
    port: 3005,
  });
  assert.match(quoted, /with space %% \$\$/);
  assert.match(quoted, /WorkingDirectory=\/home\/pi\/with space %% \$\n/);
  assert.match(quoted, /--port 3005/);
  for (const overrides of [
    { origin: "http://evil.example" },
    { port: NaN },
    { port: 1 },
    { user: "pi\nUser=root" },
    { directory: "relative" },
    { node: "node" },
    { directory: "/home/pi\nExecStart=evil" },
  ])
    assert.throws(() =>
      rpiService({
        directory: "/home/pi/app",
        node: "/usr/bin/node",
        user: "pi",
        origin,
        ...overrides,
      }),
    );
});
