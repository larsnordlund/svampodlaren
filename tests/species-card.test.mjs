import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase, readData } from "../lib/database.ts";
import { createUser, ownedMutation } from "../lib/accounts.ts";
const account = (username) => ({
  username,
  name: username,
  password: "Synthetic-test-only-4932",
});
test("hela egna svampkortet kan uppdateras och guidelänk läggas till senare eller tas bort", () => {
  const folder = mkdtempSync(join(tmpdir(), "svamp-card-"));
  let db;
  try {
    const filename = join(folder, "db.sqlite");
    db = openDatabase(filename);
    createUser(db, account("admin"), true);
    const owner = createUser(db, account("alice")),
      other = createUser(db, account("bob"));
    const initial = {
      id: "card",
      name: "Första namnet",
      latin: "",
      description: "",
      guide: "",
      url: "",
    };
    ownedMutation(db, owner, { kind: "svamp", record: initial });
    assert.equal(readData(db).customSpecies[0].url, "");
    const updated = {
      ...initial,
      name: "Nytt namn",
      latin: "Pleurotus test",
      description: "Ny beskrivning",
      guide: "Nya odlingsråd",
      url: "https://example.com/odlingsguide",
      badgeText: "Min samling",
      photoCaption: "Foto: Lars",
    };
    assert.throws(
      () =>
        ownedMutation(db, other, {
          kind: "svamp",
          record: updated,
          edit: true,
        }),
      (e) => e.status === 403,
    );
    ownedMutation(db, owner, { kind: "svamp", record: updated, edit: true });
    db.close();
    db = openDatabase(filename);
    assert.deepEqual({ ...readData(db).customSpecies[0] }, updated);
    for (const url of [
      "javascript:alert(1)",
      "https://user:secret@example.com/guide",
      "file:///tmp/guide",
    ])
      assert.throws(() =>
        ownedMutation(db, owner, {
          kind: "svamp",
          record: { ...updated, url },
          edit: true,
        }),
      );
    assert.equal(readData(db).customSpecies[0].url, updated.url);
    ownedMutation(db, owner, {
      kind: "svamp",
      record: { ...updated, url: "" },
      edit: true,
    });
    assert.equal(readData(db).customSpecies[0].url, "");
    assert.equal(readData(db).customSpecies[0].name, "Nytt namn");
  } finally {
    db?.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
