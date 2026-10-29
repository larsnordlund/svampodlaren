import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { gunzipSync } from "node:zlib";
import { openDatabase, readData } from "../lib/database.ts";
import { createUser, ownedMutation } from "../lib/accounts.ts";
import { parseMutation } from "../lib/validation.ts";
import { prepareBackup } from "../lib/backup.ts";
const image =
  "data:image/jpeg;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAYACADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFgEBAQEAAAAAAAAAAAAAAAAAAAQF/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AlgGAhAAAAAAf/9k=";
const account = (username) => ({
  username,
  name: username,
  password: "Synthetic-test-only-4932",
});
test("dagboksbilder kan sparas och ändras av ägaren eller admin utan att anteckningens text ändras", () => {
  const db = openDatabase(":memory:");
  try {
    const admin = createUser(db, account("admin"), true),
      owner = createUser(db, account("alice")),
      other = createUser(db, account("bob"));
    ownedMutation(db, owner, {
      kind: "projekt",
      record: {
        id: "pp",
        name: "Test",
        species: "Ostronskivling",
        location: "Test",
        date: "2026-10-28",
      },
    });
    ownedMutation(db, owner, {
      kind: "batch",
      record: {
        id: "bb",
        projectId: "pp",
        name: "Foto-test",
        substrate: "Halm",
        growingMethod: "Hink",
        status: "Inkubation",
        date: "2026-10-28",
      },
    });
    const record = {
      id: "ee",
      batchId: "bb",
      date: "2026-10-28",
      text: "Min observation",
      phase: "Inkubation",
      temperature: 20,
      humidity: 80,
      images: [image, image],
    };
    ownedMutation(db, owner, { kind: "anteckning", record });
    assert.deepEqual(readData(db).entries.find((e) => e.id === "ee").images, [
      image,
      image,
    ]);
    assert.throws(
      () =>
        ownedMutation(db, other, {
          kind: "anteckningsbilder",
          id: "ee",
          images: [],
        }),
      (e) => e.status === 403,
    );
    ownedMutation(db, owner, {
      kind: "anteckningsbilder",
      id: "ee",
      images: [image],
    });
    assert.equal(
      readData(db).entries.find((e) => e.id === "ee").text,
      record.text,
    );
    ownedMutation(db, admin, {
      kind: "anteckning",
      record: { ...record, text: "Rättad text", images: Array(6).fill(image) },
      edit: true,
    });
    assert.equal(
      readData(db).entries.find((e) => e.id === "ee").images.length,
      6,
    );
    ownedMutation(db, owner, {
      kind: "anteckningsbilder",
      id: "ee",
      images: [],
    });
    assert.equal(
      readData(db).entries.find((e) => e.id === "ee").images,
      undefined,
    );
    assert.throws(
      () =>
        ownedMutation(db, admin, {
          kind: "anteckningsbilder",
          id: "missing",
          images: [],
        }),
      (e) => e.status === 404,
    );
  } finally {
    db.close();
  }
});
test("dagboksbilder valideras även vid API-liknande uppdateringar", () => {
  for (const images of [
    Array(7).fill(image),
    [""],
    ["https://example.com/photo.jpg"],
    ["data:image/svg+xml;base64,PHN2Zz4="],
    null,
    "bad",
  ])
    assert.throws(() =>
      parseMutation({ kind: "anteckningsbilder", id: "entry", images }),
    );
  assert.deepEqual(
    parseMutation({ kind: "anteckningsbilder", id: "entry", images: [] })
      .images,
    [],
  );
});
test("äldre anteckningar bevaras, bilder består över omstart och finns i båda backupvarianterna", async () => {
  const folder = mkdtempSync(join(tmpdir(), "svamp-journal-images-"));
  let db;
  try {
    const path = join(folder, "live.sqlite");
    db = openDatabase(path);
    const before = readData(db).entries;
    db.exec("ALTER TABLE entries DROP COLUMN images");
    db.close();
    db = openDatabase(path);
    assert.deepEqual(readData(db).entries, before);
    const id = before[0].id;
    db.prepare("UPDATE entries SET images=? WHERE id=?").run(
      JSON.stringify([image, image]),
      id,
    );
    db.close();
    db = openDatabase(path);
    assert.deepEqual(readData(db).entries.find((e) => e.id === id).images, [
      image,
      image,
    ]);
    const backup = await prepareBackup(db, folder, { manual: true });
    for (const [index, file] of [
      backup.path,
      backup.attachmentPath,
    ].entries()) {
      const copyPath = join(folder, `copy-${index}.sqlite`);
      writeFileSync(copyPath, gunzipSync(readFileSync(file)));
      const copy = openDatabase(copyPath);
      try {
        assert.deepEqual(
          readData(copy).entries.find((e) => e.id === id).images,
          [image, image],
        );
      } finally {
        copy.close();
      }
    }
  } finally {
    db?.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
