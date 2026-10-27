import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { mkdir, chmod, rm, copyFile } from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { resolve, join } from "node:path";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { InputError } from "./validation.ts";
export function backupSchema(db: DatabaseSync) {
  db.exec(`CREATE TABLE IF NOT EXISTS backup_settings(id INTEGER PRIMARY KEY CHECK(id=1), recipient TEXT NOT NULL, enabled INTEGER NOT NULL CHECK(enabled IN (0,1))) STRICT;
 CREATE TABLE IF NOT EXISTS backup_runs(id TEXT PRIMARY KEY, created TEXT NOT NULL, recipient TEXT NOT NULL, filename TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('prepared','sent','failed')), message TEXT NOT NULL DEFAULT '') STRICT;
 INSERT OR IGNORE INTO backup_settings VALUES(1,'larsnordlund@me.com',1);`);
}
export function backupSettings(db: DatabaseSync) {
  const row = db
    .prepare("SELECT recipient,enabled FROM backup_settings WHERE id=1")
    .get()!;
  return {
    recipient: String(row.recipient),
    enabled: row.enabled === 1,
    schedule: "Måndagar kl. 09.00 (Europe/Stockholm)",
    mailProgram: "Apple Mail",
    runs: db
      .prepare(
        "SELECT id,created,recipient,filename,status,message FROM backup_runs ORDER BY created DESC LIMIT 10",
      )
      .all(),
  };
}
export function saveBackupSettings(db: DatabaseSync, input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new InputError("Ogiltiga backupinställningar.");
  const { recipient, enabled } = input as Record<string, unknown>;
  if (
    typeof recipient !== "string" ||
    recipient.length > 254 ||
    !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(
      recipient.trim(),
    )
  )
    throw new InputError("Ange en giltig mottagaradress.");
  if (typeof enabled !== "boolean")
    throw new InputError("Välj om veckobackup ska vara aktiv.");
  db.prepare("UPDATE backup_settings SET recipient=?,enabled=? WHERE id=1").run(
    recipient.trim(),
    enabled ? 1 : 0,
  );
  return backupSettings(db);
}
export async function prepareBackup(db: DatabaseSync, directory: string) {
  const settings = backupSettings(db);
  if (!settings.enabled)
    return { skipped: true, reason: "Veckobackup är avstängd." };
  const week = (date: Date) => {
    const local = new Date(
      date.toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" }) +
        "T12:00:00Z",
    );
    local.setUTCDate(local.getUTCDate() - ((local.getUTCDay() + 6) % 7));
    return local.toISOString().slice(0, 10);
  };
  const existing = settings.runs.find(
    (run) =>
      week(new Date(String(run.created))) === week(new Date()) &&
      run.status !== "failed",
  );
  if (existing)
    return {
      skipped: true,
      reason:
        existing.status === "sent"
          ? "Veckans backup är redan överlämnad till Mail."
          : "En backup för denna vecka väntar på bekräftat utskick. Granska föregående körning innan ett nytt försök.",
      existingId: existing.id,
    };
  const id = randomUUID(),
    created = new Date().toISOString();
  const folder = resolve(directory);
  await mkdir(folder, { recursive: true, mode: 0o700 });
  const filename = `svampodlaren-${created.replace(/[:.]/g, "-")}-${id.slice(0, 8)}.sqlite.gz`;
  const snapshot = join(folder, `${id}.sqlite`),
    path = join(folder, filename);
  const emailSnapshot = join(folder, `${id}-odlingar.sqlite`);
  const attachmentPath = join(
    folder,
    filename.replace(".sqlite.gz", "-odlingar.sqlite.gz"),
  );
  try {
    db.prepare("VACUUM INTO ?").run(snapshot);
    await chmod(snapshot, 0o600);
    const check = new DatabaseSync(snapshot, { readOnly: true });
    try {
      if (
        check.prepare("PRAGMA integrity_check").get()?.integrity_check !== "ok"
      )
        throw Error("Backupens integritetskontroll misslyckades.");
    } finally {
      check.close();
    }
    await pipeline(
      createReadStream(snapshot),
      createGzip(),
      createWriteStream(path, { flags: "wx", mode: 0o600 }),
    );
    // Only the five cultivation registers may leave the computer. Remove every
    // other table and VACUUM so deleted credential pages cannot survive in the file.
    await copyFile(snapshot, emailSnapshot);
    await chmod(emailSnapshot, 0o600);
    const emailDb = new DatabaseSync(emailSnapshot);
    try {
      emailDb.exec("PRAGMA foreign_keys=OFF; PRAGMA secure_delete=ON;");
      const allowed = new Set([
        "projects",
        "batches",
        "entries",
        "harvests",
        "custom_species",
      ]);
      for (const table of emailDb
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        )
        .all()) {
        const name = String(table.name);
        if (!allowed.has(name))
          emailDb.exec(`DROP TABLE "${name.replaceAll('"', '""')}"`);
      }
      emailDb.exec("VACUUM");
      if (
        emailDb.prepare("PRAGMA integrity_check").get()?.integrity_check !==
        "ok"
      )
        throw Error("Mejlbackupens integritetskontroll misslyckades.");
    } finally {
      emailDb.close();
    }
    await pipeline(
      createReadStream(emailSnapshot),
      createGzip(),
      createWriteStream(attachmentPath, { flags: "wx", mode: 0o600 }),
    );
    db.prepare(
      "INSERT INTO backup_runs(id,created,recipient,filename,status) VALUES(?,?,?,?,'prepared')",
    ).run(id, created, settings.recipient, filename);
    return {
      id,
      created,
      recipient: settings.recipient,
      filename,
      path,
      attachmentPath,
      attachmentContents:
        "Endast odlingsregister; inga konton, lösenord, sessioner, ägarskap eller inställningar",
      status: "prepared",
    };
  } catch (e) {
    await rm(path, { force: true });
    await rm(attachmentPath, { force: true });
    throw e;
  } finally {
    await rm(snapshot, { force: true });
    await rm(emailSnapshot, { force: true });
  }
}
export function markBackup(
  db: DatabaseSync,
  id: string,
  status: "sent" | "failed",
  message = "",
) {
  if (!["sent", "failed"].includes(status) || message.length > 1000)
    throw new InputError("Ogiltig backupstatus.");
  const r = db
    .prepare(
      "UPDATE backup_runs SET status=?,message=? WHERE id=? AND status='prepared'",
    )
    .run(status, message, id);
  if (r.changes !== 1)
    throw new InputError("Backupen finns inte eller är redan avslutad.", 409);
}
