import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase, readData, mutate } from "../lib/database.ts";
import { seed } from "../lib/data.ts";
import { parseMutation } from "../lib/validation.ts";
import { allowedLocalRequest } from "../lib/local-request.ts";

const blank = { projects: [], batches: [], entries: [], harvests: [] };
const project = {
  kind: "projekt",
  record: {
    id: "new-project",
    date: "2026-10-26",
    name: "Höstodling",
    species: "Shiitake",
    location: "Källaren",
  },
};
const batch = {
  kind: "batch",
  record: {
    id: "new-batch",
    date: "2026-10-26",
    name: "SHI-100",
    projectId: "new-project",
    substrate: "Lövträ",
    status: "Inokulering",
  },
};

test("SQLite sparar hela odlingskedjan och fasändring över en omstart", () => {
  const directory = mkdtempSync(join(tmpdir(), "svampodlaren-"));
  const filename = join(directory, "cultivation.sqlite");
  let db = openDatabase(filename, blank);
  try {
    mutate(db, project);
    mutate(db, batch);
    mutate(db, {
      kind: "anteckning",
      record: {
        id: "note",
        batchId: "new-batch",
        date: "2026-10-26",
        text: "Friskt mycel",
        temperature: 18.5,
        humidity: 85,
      },
    });
    mutate(db, {
      kind: "skörd",
      record: {
        id: "harvest",
        batchId: "new-batch",
        date: "2026-10-26",
        weight: 500,
        flush: 1,
      },
    });
    mutate(db, { kind: "status", id: "new-batch", status: "Fruktsättning" });
    db.close();
    db = openDatabase(filename, seed);
    const result = readData(db);
    assert.equal(result.projects.length, 1);
    assert.equal(result.batches.length, 1);
    assert.equal(result.batches[0].status, "Fruktsättning");
    assert.equal(result.entries[0].temperature, 18.5);
    assert.equal(result.harvests[0].weight, 500);
    assert.equal(result.harvests[0].batchId, result.batches[0].id);
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("exempeldata skapas bara första gången och förstör inte en tom befintlig databas", () => {
  const directory = mkdtempSync(join(tmpdir(), "svampodlaren-"));
  const filename = join(directory, "cultivation.sqlite");
  let db = openDatabase(filename);
  try {
    assert.equal(readData(db).projects.length, seed.projects.length);
    db.exec(
      "DELETE FROM harvests; DELETE FROM entries; DELETE FROM batches; DELETE FROM projects;",
    );
    db.close();
    db = openDatabase(filename);
    assert.deepEqual(readData(db), blank);
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("främmande nycklar, unika batchnamn och saknade batcher ger begripliga fel", () => {
  const db = openDatabase(":memory:", blank);
  try {
    assert.throws(
      () => mutate(db, batch),
      /Projektet eller batchen finns inte/,
    );
    mutate(db, project);
    mutate(db, batch);
    assert.throws(
      () =>
        mutate(db, { ...batch, record: { ...batch.record, id: "another" } }),
      /finns redan/,
    );
    assert.throws(
      () => mutate(db, { kind: "status", id: "missing", status: "Avslutad" }),
      /Batchen finns inte/,
    );
    assert.equal(readData(db).batches.length, 1);
  } finally {
    db.close();
  }
});

test("parametriserad SQL behandlar specialtecken som text", () => {
  const db = openDatabase(":memory:", blank);
  try {
    const name = "'); DROP TABLE projects; --";
    mutate(db, { ...project, record: { ...project.record, name } });
    assert.equal(readData(db).projects[0].name, name);
  } finally {
    db.close();
  }
});

test("servervalidering nekar tom text, oriktiga datum, olovliga faser och ogiltiga mängder", () => {
  for (const record of [
    { ...project.record, name: "   " },
    { ...project.record, date: "2026-02-30" },
  ])
    assert.throws(() => parseMutation({ ...project, record }));
  assert.throws(() =>
    parseMutation({ kind: "status", id: "b1", status: "Framgång" }),
  );
  for (const weight of [-1, 0, 1.5, Infinity, "500"])
    assert.throws(() =>
      parseMutation({
        kind: "skörd",
        record: {
          id: "h",
          batchId: "b1",
          date: "2026-10-26",
          weight,
          flush: 1,
        },
      }),
    );
  assert.throws(() =>
    parseMutation({
      kind: "anteckning",
      record: {
        id: "e",
        batchId: "b1",
        date: "2026-10-26",
        text: "Notering",
        temperature: 20,
        humidity: 101,
      },
    }),
  );
});

test("lokala API:t nekar främmande värdar och skrivningar från andra webbplatser", () => {
  const request = (host, origin, site) =>
    new Request("http://127.0.0.1:3000/api/data", {
      headers: {
        host,
        ...(origin ? { origin } : {}),
        ...(site ? { "sec-fetch-site": site } : {}),
      },
    });
  assert.equal(
    allowedLocalRequest(
      request("127.0.0.1:3000", "http://127.0.0.1:3000"),
      true,
    ),
    true,
  );
  assert.equal(
    allowedLocalRequest(
      request("localhost:3000", "http://localhost:3000"),
      true,
    ),
    true,
  );
  assert.equal(
    allowedLocalRequest(request("[::1]:3000", "http://[::1]:3000"), true),
    true,
  );
  assert.equal(
    allowedLocalRequest(request("evil.example", "http://evil.example"), true),
    false,
  );
  assert.equal(
    allowedLocalRequest(
      request("127.0.0.1:3000", "https://evil.example"),
      true,
    ),
    false,
  );
  assert.equal(
    allowedLocalRequest(request("127.0.0.1:3000", null), true),
    false,
  );
  assert.equal(
    allowedLocalRequest(request("127.0.0.1:3000", null, "cross-site")),
    false,
  );
});
