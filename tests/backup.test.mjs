import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  writeFileSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { gunzipSync } from "node:zlib";
import { DatabaseSync } from "node:sqlite";
import { openDatabase, mutate, readData } from "../lib/database.ts";
import {
  backupSettings,
  saveBackupSettings,
  prepareBackup,
  markBackup,
} from "../lib/backup.ts";
test("backupadress kan ändras, valideras och sparas över omstart", () => {
  const folder = mkdtempSync(join(tmpdir(), "svamp-backup-settings-"));
  let db;
  try {
    const path = join(folder, "db.sqlite");
    db = openDatabase(path);
    assert.equal(backupSettings(db).recipient, "larsnordlund@me.com");
    for (const recipient of [
      "bad",
      "a@example.com\nBcc: bad@example.com",
      "a@example.com,b@example.com",
    ])
      assert.throws(
        () => saveBackupSettings(db, { recipient, enabled: true }),
        /giltig/,
      );
    assert.throws(
      () =>
        saveBackupSettings(db, { recipient: "test@example.com", enabled: 1 }),
      /aktiv/,
    );
    saveBackupSettings(db, { recipient: "test@example.com", enabled: false });
    db.close();
    db = openDatabase(path);
    assert.equal(backupSettings(db).recipient, "test@example.com");
    assert.equal(backupSettings(db).enabled, false);
  } finally {
    db?.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
test("onlinebackup innehåller senaste WAL-data och kan återställas; dubbletter och status skyddas", async () => {
  const folder = mkdtempSync(join(tmpdir(), "svamp-backup-"));
  const db = openDatabase(join(folder, "live.sqlite"));
  try {
    mutate(db, {
      kind: "projekt",
      record: {
        id: "wal-project",
        name: "Senaste ändring",
        species: "Ostronskivling",
        location: "Huset",
        date: "2026-10-27",
      },
    });
    saveBackupSettings(db, { recipient: "test@example.com", enabled: true });
    db.prepare("INSERT INTO users VALUES(?,?,?,?,?)").run(
      "secret-id",
      "secret-user",
      "Secret User",
      "admin",
      "SYNTHETIC_PASSWORD_HASH_ONLY",
    );
    db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
      "SYNTHETIC_SESSION_TOKEN_ONLY",
      "secret-id",
      Date.now() + 99999,
    );
    const before = readData(db);
    const backup = await prepareBackup(db, join(folder, "copies"));
    assert.equal(backup.recipient, "test@example.com");
    assert.equal(backup.status, "prepared");
    assert.equal(statSync(backup.path).mode & 0o777, 0o600);
    const restored = join(folder, "restored.sqlite");
    writeFileSync(restored, gunzipSync(readFileSync(backup.path)));
    const copy = new DatabaseSync(restored);
    try {
      assert.equal(
        copy.prepare("PRAGMA integrity_check").get().integrity_check,
        "ok",
      );
      assert.deepEqual(readData(copy), before);
      assert.equal(
        copy.prepare("SELECT recipient FROM backup_settings").get().recipient,
        "test@example.com",
      );
    } finally {
      copy.close();
    }
    assert.equal(statSync(backup.attachmentPath).mode & 0o777, 0o600);
    const emailBytes = gunzipSync(readFileSync(backup.attachmentPath));
    assert.equal(
      emailBytes.includes(Buffer.from("SYNTHETIC_PASSWORD_HASH_ONLY")),
      false,
    );
    assert.equal(
      emailBytes.includes(Buffer.from("SYNTHETIC_SESSION_TOKEN_ONLY")),
      false,
    );
    const emailPath = join(folder, "email.sqlite");
    writeFileSync(emailPath, emailBytes);
    const emailCopy = new DatabaseSync(emailPath);
    try {
      assert.deepEqual(
        emailCopy
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
          )
          .all()
          .map((r) => r.name),
        ["batches", "custom_species", "entries", "harvests", "projects"],
      );
      assert.deepEqual(readData(emailCopy), before);
    } finally {
      emailCopy.close();
    }
    const reopened = openDatabase(emailPath);
    try {
      assert.equal(reopened.prepare("SELECT count(*) n FROM users").get().n, 0);
      assert.deepEqual(readData(reopened), before);
    } finally {
      reopened.close();
    }
    assert.equal(
      (await prepareBackup(db, join(folder, "copies"))).skipped,
      true,
    );
    markBackup(db, backup.id, "sent");
    assert.equal(backupSettings(db).runs[0].status, "sent");
    assert.throws(() => markBackup(db, backup.id, "sent"), /avslutad/);
    assert.equal(
      (await prepareBackup(db, join(folder, "copies"))).skipped,
      true,
    );
  } finally {
    db.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
test("avstängd körning skapar ingen fil; misslyckade utskick förblir tydliga", async () => {
  const folder = mkdtempSync(join(tmpdir(), "svamp-backup-disabled-"));
  const db = openDatabase(":memory:");
  try {
    saveBackupSettings(db, { recipient: "test@example.com", enabled: false });
    assert.equal(
      (await prepareBackup(db, join(folder, "copies"))).skipped,
      true,
    );
    assert.equal(backupSettings(db).runs.length, 0);
    saveBackupSettings(db, { recipient: "test@example.com", enabled: true });
    const backup = await prepareBackup(db, join(folder, "copies"));
    markBackup(db, backup.id, "failed", "Mail saknar anslutning");
    assert.equal(backupSettings(db).runs[0].status, "failed");
    assert.equal(backupSettings(db).runs[0].message, "Mail saknar anslutning");
    assert.ok(statSync(backup.path).size > 0);
  } finally {
    db.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
