import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase, readData, mutate } from "../lib/database.ts";
import { seed } from "../lib/data.ts";
import { parseMutation } from "../lib/validation.ts";
import { allowedLocalRequest } from "../lib/local-request.ts";

const blank = {
  customSpecies: [],
  projects: [],
  batches: [],
  entries: [],
  harvests: [],
};
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

test("egen svamp sparas över omstart och exporteras tillsammans med odlingen", () => {
  const directory = mkdtempSync(join(tmpdir(), "svampodlaren-species-"));
  const filename = join(directory, "cultivation.sqlite");
  let db = openDatabase(filename, blank);
  const record = {
    id: "custom1",
    name: "Min provsvamp",
    latin: "Exemplum testii",
    description: "Mina anteckningar",
    guide: "Rad ett\nRad två",
    url: "https://example.com/guide",
  };
  try {
    mutate(db, { kind: "svamp", record });
    assert.throws(
      () =>
        mutate(db, {
          kind: "svamp",
          record: { ...record, id: "custom2", name: "  MIN PROVSVAMP  " },
        }),
      /redan en egen svamp/,
    );
    db.close();
    db = openDatabase(filename);
    assert.deepEqual(
      readData(db).customSpecies.map((row) => ({ ...row })),
      [record],
    );
    mutate(db, {
      ...project,
      record: { ...project.record, species: record.name },
    });
    assert.equal(readData(db).projects[0].species, record.name);
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("migration från schema 1 bevarar befintliga odlingsdata", () => {
  const directory = mkdtempSync(join(tmpdir(), "svampodlaren-migrate-"));
  const filename = join(directory, "cultivation.sqlite");
  let db = openDatabase(filename);
  try {
    const previous = readData(db);
    db.exec("DROP TABLE custom_species; PRAGMA user_version = 1;");
    db.close();
    db = openDatabase(filename);
    assert.deepEqual(readData(db), previous);
    assert.equal(db.prepare("PRAGMA user_version").get().user_version, 2);
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("egna svampar kräver namn, nekar inbyggda dubbletter och farliga länkar", () => {
  const record = { id: "custom1", name: "Egen svamp" };
  assert.equal(parseMutation({ kind: "svamp", record }).record.url, "");
  for (const name of ["", "  ", "  SHIITAKE "])
    assert.throws(() =>
      parseMutation({ kind: "svamp", record: { ...record, name } }),
    );
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,hej",
    "file:///etc/passwd",
    "https://user:password@example.com",
  ])
    assert.throws(() =>
      parseMutation({ kind: "svamp", record: { ...record, url } }),
    );
  assert.throws(() =>
    parseMutation({
      kind: "svamp",
      record: { ...record, guide: "a".repeat(4001) },
    }),
  );
});

test("radering tar bara bort vald anteckning och består efter omstart", () => {
  const directory = mkdtempSync(join(tmpdir(), "svampodlaren-delete-"));
  const filename = join(directory, "cultivation.sqlite");
  let db = openDatabase(filename);
  try {
    const before = readData(db);
    mutate(db, { kind: "radera-anteckning", id: before.entries[0].id });
    db.close();
    db = openDatabase(filename);
    const after = readData(db);
    assert.deepEqual(after.entries, before.entries.slice(1));
    for (const key of ["projects", "batches", "harvests", "customSpecies"])
      assert.deepEqual(after[key], before[key]);
    assert.throws(
      () => mutate(db, { kind: "radera-anteckning", id: before.entries[0].id }),
      (error) => error.status === 404,
    );
    assert.throws(() =>
      parseMutation({ kind: "radera-anteckning", id: "' OR 1=1 --" }),
    );
    assert.equal(readData(db).entries.length, after.entries.length);
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("hela odlingskedjan kan raderas i rätt ordning och förblir borta efter omstart", () => {
  const directory = mkdtempSync(join(tmpdir(), "svampodlaren-delete-all-"));
  const filename = join(directory, "cultivation.sqlite");
  let db = openDatabase(filename, blank);
  try {
    mutate(db, project);
    mutate(db, batch);
    mutate(db, {
      kind: "anteckning",
      record: {
        id: "delete-note",
        batchId: batch.record.id,
        date: "2026-10-27",
        text: "Testpost",
        temperature: 20,
        humidity: 80,
      },
    });
    mutate(db, {
      kind: "skörd",
      record: {
        id: "delete-harvest",
        batchId: batch.record.id,
        date: "2026-10-27",
        weight: 500,
        flush: 1,
      },
    });
    const before = readData(db);
    assert.throws(
      () => mutate(db, { kind: "radera-projekt", id: project.record.id }),
      (error) => error.status === 409 && /batcher/.test(error.message),
    );
    assert.throws(
      () => mutate(db, { kind: "radera-batch", id: batch.record.id }),
      (error) =>
        error.status === 409 &&
        /anteckningar eller skördar/.test(error.message),
    );
    assert.deepEqual(readData(db), before);
    mutate(db, { kind: "radera-anteckning", id: "delete-note" });
    assert.throws(
      () => mutate(db, { kind: "radera-batch", id: batch.record.id }),
      (error) => error.status === 409,
    );
    mutate(db, { kind: "radera-skörd", id: "delete-harvest" });
    mutate(db, { kind: "radera-batch", id: batch.record.id });
    mutate(db, { kind: "radera-projekt", id: project.record.id });
    db.close();
    db = openDatabase(filename);
    assert.deepEqual(readData(db), blank);
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("radering av egen svamp bevarar befintliga projekts artnamn", () => {
  const db = openDatabase(":memory:", blank);
  try {
    mutate(db, {
      kind: "svamp",
      record: { id: "my-species", name: "Min egna art" },
    });
    mutate(db, {
      ...project,
      record: { ...project.record, species: "Min egna art" },
    });
    const before = readData(db);
    mutate(db, { kind: "radera-svamp", id: "my-species" });
    const after = readData(db);
    assert.deepEqual(after.customSpecies, []);
    assert.deepEqual(after.projects, before.projects);
    assert.equal(after.projects[0].species, "Min egna art");
  } finally {
    db.close();
  }
});

test("samtliga raderingsåtgärder validerar ID och nekar saknade poster utan sidverkningar", () => {
  const db = openDatabase(":memory:");
  try {
    const before = readData(db);
    for (const kind of [
      "radera-projekt",
      "radera-batch",
      "radera-anteckning",
      "radera-skörd",
      "radera-svamp",
    ]) {
      assert.throws(() => parseMutation({ kind, id: "x' OR 1=1 --" }));
      assert.throws(
        () => mutate(db, { kind, id: "missing" }),
        (error) => error.status === 404,
      );
    }
    assert.throws(
      () => mutate(db, { kind: "radera-skörd", id: "p1" }),
      (error) => error.status === 404,
    );
    assert.deepEqual(readData(db), before);
  } finally {
    db.close();
  }
});
