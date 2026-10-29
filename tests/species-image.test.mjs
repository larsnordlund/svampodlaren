import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { gunzipSync } from "node:zlib";
import { openDatabase, readData, mutate } from "../lib/database.ts";
import { createUser, ownedMutation, ownedData } from "../lib/accounts.ts";
import { validateSpeciesImage } from "../lib/species-image.ts";
import { prepareBackup } from "../lib/backup.ts";
const image =
  "data:image/jpeg;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAYACADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFgEBAQEAAAAAAAAAAAAAAAAAAAQF/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AlgGAhAAAAAAf/9k=";
const species = {
  id: "own-mushroom",
  name: "Min testsvamp",
  latin: "",
  description: "Test",
  guide: "",
  url: "",
};
const account = (username) => ({
  username,
  name: username,
  password: "Synthetic-test-only-4932",
});
test("svampbild sparas, ersätts och tas bort; andra användare kan inte ändra bilden", () => {
  const db = openDatabase(":memory:");
  try {
    const admin = createUser(db, account("admin"), true),
      user = createUser(db, account("alice")),
      other = createUser(db, account("bob"));
    ownedMutation(db, user, { kind: "svamp", record: { ...species, image } });
    assert.equal(ownedData(db, other).customSpecies[0].image, image);
    assert.throws(
      () =>
        ownedMutation(db, other, {
          kind: "svamp",
          record: { ...species, image: "" },
          edit: true,
        }),
      (e) => e.status === 403,
    );
    ownedMutation(db, user, {
      kind: "svamp",
      record: { ...species, description: "Ny text" },
      edit: true,
    });
    assert.equal(readData(db).customSpecies[0].image, image);
    ownedMutation(db, admin, {
      kind: "svamp",
      record: { ...species, image: "" },
      edit: true,
    });
    assert.equal(readData(db).customSpecies[0].image, undefined);
    ownedMutation(db, user, {
      kind: "svamp",
      record: { ...species, image },
      edit: true,
    });
    assert.equal(readData(db).customSpecies[0].image, image);
    ownedMutation(db, user, { kind: "radera-svamp", id: species.id });
    assert.equal(readData(db).customSpecies.length, 0);
  } finally {
    db.close();
  }
});
test("bildvalidering avvisar SVG, externa länkar, skadad JPEG och för stora bilder", () => {
  assert.equal(validateSpeciesImage(image), image);
  assert.equal(validateSpeciesImage(""), "");
  for (const invalid of [
    "https://example.com/picture.jpg",
    "javascript:alert(1)",
    "data:image/svg+xml;base64,PHN2Zz4=",
    "data:image/jpeg;base64,YWJj",
    "data:image/jpeg;base64," + "A".repeat(1400000),
  ])
    assert.throws(() => validateSpeciesImage(invalid));
  const bytes = Buffer.from(image.slice(23), "base64");
  const marker = bytes.indexOf(Buffer.from([255, 192]));
  assert.ok(marker >= 0);
  bytes.writeUInt16BE(5000, marker + 7);
  assert.throws(() =>
    validateSpeciesImage("data:image/jpeg;base64," + bytes.toString("base64")),
  );
});
test("befintlig databas får bildfält utan att gamla svampar ändras", () => {
  const folder = mkdtempSync(join(tmpdir(), "svamp-image-migration-"));
  let db;
  try {
    const path = join(folder, "db.sqlite");
    db = openDatabase(path);
    mutate(db, { kind: "svamp", record: species });
    db.exec("ALTER TABLE custom_species DROP COLUMN image");
    db.close();
    db = openDatabase(path);
    assert.equal(readData(db).customSpecies[0].name, species.name);
    assert.equal(readData(db).customSpecies[0].image, undefined);
    mutate(db, {
      kind: "svamp",
      record: { ...species, id: "second", name: "Andra testsvampen", image },
    });
    db.close();
    db = openDatabase(path);
    assert.equal(readData(db).customSpecies[1].image, image);
  } finally {
    db?.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
test("svampbilder följer med i fullständig backup och odlingsfil för mejl", async () => {
  const folder = mkdtempSync(join(tmpdir(), "svamp-image-backup-")),
    db = openDatabase(":memory:");
  try {
    mutate(db, { kind: "svamp", record: { ...species, image } });
    const result = await prepareBackup(db, folder, { manual: true });
    for (const file of [result.path, result.attachmentPath]) {
      const path = join(folder, "restored-" + Math.random() + ".sqlite");
      writeFileSync(path, gunzipSync(readFileSync(file)));
      const copy = openDatabase(path);
      try {
        assert.equal(readData(copy).customSpecies[0].image, image);
      } finally {
        copy.close();
      }
    }
  } finally {
    db.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
