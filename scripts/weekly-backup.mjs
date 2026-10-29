// This command creates a consistent local snapshot; the scheduled chat sends it via Apple Mail.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase } from "../lib/database.ts";
import { backupSettings, prepareBackup, markBackup } from "../lib/backup.ts";
const root = fileURLToPath(new URL("../", import.meta.url));
const filename = resolve(
  process.env.SQLITE_PATH || resolve(root, "data/svampodlaren.sqlite"),
);
if (!existsSync(filename))
  throw Error("Databasen saknas. Ingen tom ersättningsdatabas skapas.");
const db = openDatabase(filename);
try {
  const [action, id, ...parts] = process.argv.slice(2);
  if (action === "--status") console.log(JSON.stringify(backupSettings(db)));
  else if (action === "--prepare" || action === "--manual")
    console.log(
      JSON.stringify(
        await prepareBackup(
          db,
          resolve(process.env.BACKUP_DIR || resolve(root, "backups")),
          { manual: action === "--manual" },
        ),
      ),
    );
  else if (action === "--mark-sent" || action === "--mark-failed") {
    if (!id) throw Error("Backup-ID krävs.");
    markBackup(
      db,
      id,
      action === "--mark-sent" ? "sent" : "failed",
      parts.join(" "),
    );
    console.log(JSON.stringify({ ok: true }));
  } else
    throw Error(
      "Använd --status, --prepare, --manual, --mark-sent ID eller --mark-failed ID orsak.",
    );
} finally {
  db.close();
}
