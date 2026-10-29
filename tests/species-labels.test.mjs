import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { gunzipSync } from "node:zlib";
import { openDatabase, readData, mutate } from "../lib/database.ts";
import { parseMutation } from "../lib/validation.ts";
import { createUser, ownedMutation } from "../lib/accounts.ts";
import { prepareBackup } from "../lib/backup.ts";
const record = {
  id: "labels",
  name: "Min svamp",
  latin: "",
  description: "",
  guide: "",
  url: "",
};
const account = (username) => ({
  username,
  name: username,
  password: "Synthetic-test-only-4932",
});
test("egna etiketter kan ändras eller döljas med samma ägarbehörighet som svampen", () => {
  const db = openDatabase(":memory:");
  try {
    const admin = createUser(db, account("admin"), true),
      owner = createUser(db, account("alice")),
      other = createUser(db, account("bob"));
    const changed = {
      ...record,
      badgeText: "Min odling",
      photoCaption: "Foto: Lars",
    };
    ownedMutation(db, owner, { kind: "svamp", record: changed });
    assert.equal(readData(db).customSpecies[0].badgeText, "Min odling");
    assert.equal(readData(db).customSpecies[0].photoCaption, "Foto: Lars");
    assert.throws(
      () =>
        ownedMutation(db, other, {
          kind: "svamp",
          record: { ...changed, badgeText: "Annan text" },
          edit: true,
        }),
      (e) => e.status === 403,
    );
    ownedMutation(db, admin, {
      kind: "svamp",
      record: { ...record, description: "Bara text" },
      edit: true,
    });
    assert.equal(readData(db).customSpecies[0].photoCaption, "Foto: Lars");
    ownedMutation(db, owner, {
      kind: "svamp",
      record: { ...record, badgeText: "", photoCaption: "" },
      edit: true,
    });
    assert.equal(readData(db).customSpecies[0].badgeText, "");
    assert.equal(readData(db).customSpecies[0].photoCaption, "");
    for (const fields of [
      { badgeText: "x".repeat(61) },
      { photoCaption: "x".repeat(161) },
      { badgeText: 123 },
    ])
      assert.throws(() =>
        parseMutation({ kind: "svamp", record: { ...record, ...fields } }),
      );
  } finally {
    db.close();
  }
});
test("gamla svampar får standardtexter; egna texter följer med i omstart och båda backupfilerna", async () => {
  const folder = mkdtempSync(join(tmpdir(), "svamp-labels-"));
  let db;
  try {
    const path = join(folder, "db.sqlite");
    db = openDatabase(path);
    mutate(db, { kind: "svamp", record });
    db.exec(
      "ALTER TABLE custom_species DROP COLUMN badgeText; ALTER TABLE custom_species DROP COLUMN photoCaption",
    );
    db.close();
    db = openDatabase(path);
    assert.equal(readData(db).customSpecies[0].badgeText, undefined);
    assert.equal(readData(db).customSpecies[0].photoCaption, undefined);
    db.prepare(
      "UPDATE custom_species SET badgeText=?,photoCaption=? WHERE id=?",
    ).run("Min samling", "Foto: Lars", record.id);
    db.close();
    db = openDatabase(path);
    assert.equal(readData(db).customSpecies[0].badgeText, "Min samling");
    const result = await prepareBackup(db, folder, { manual: true });
    for (const [index, file] of [
      result.path,
      result.attachmentPath,
    ].entries()) {
      const copyPath = join(folder, `copy-${index}.sqlite`);
      writeFileSync(copyPath, gunzipSync(readFileSync(file)));
      const copy = openDatabase(copyPath);
      try {
        assert.equal(readData(copy).customSpecies[0].badgeText, "Min samling");
        assert.equal(
          readData(copy).customSpecies[0].photoCaption,
          "Foto: Lars",
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
