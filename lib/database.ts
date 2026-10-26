import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { seed, type Data } from "./data.ts";
import { InputError, parseMutation } from "./validation.ts";

export function openDatabase(filename: string, initialData: Data = seed) {
  if (filename !== ":memory:")
    mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  db.exec(
    "PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;",
  );
  const version = Number(db.prepare("PRAGMA user_version").get()?.user_version);
  if (version > 1) {
    db.close();
    throw new Error(
      "Databasen är skapad med en nyare version av Svampodlaren.",
    );
  }
  if (version === 0) {
    db.exec("BEGIN IMMEDIATE");
    try {
      // A second process may have completed initialization while we waited for the lock.
      if (Number(db.prepare("PRAGMA user_version").get()?.user_version) === 0) {
        db.exec(`
          CREATE TABLE projects (
            id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
            species TEXT NOT NULL, location TEXT NOT NULL, date TEXT NOT NULL
          ) STRICT;
          CREATE TABLE batches (
            id TEXT PRIMARY KEY NOT NULL, projectId TEXT NOT NULL REFERENCES projects(id),
            name TEXT NOT NULL UNIQUE CHECK(length(trim(name)) BETWEEN 1 AND 120), substrate TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('Inokulering','Inkubation','Fruktsättning','Avslutad')), date TEXT NOT NULL
          ) STRICT;
          CREATE TABLE entries (
            id TEXT PRIMARY KEY NOT NULL, batchId TEXT NOT NULL REFERENCES batches(id), date TEXT NOT NULL,
            text TEXT NOT NULL CHECK(length(trim(text)) BETWEEN 1 AND 2000),
            temperature REAL NOT NULL CHECK(temperature BETWEEN -20 AND 60), humidity REAL NOT NULL CHECK(humidity BETWEEN 0 AND 100)
          ) STRICT;
          CREATE TABLE harvests (
            id TEXT PRIMARY KEY NOT NULL, batchId TEXT NOT NULL REFERENCES batches(id), date TEXT NOT NULL,
            weight INTEGER NOT NULL CHECK(weight BETWEEN 1 AND 1000000), flush INTEGER NOT NULL CHECK(flush BETWEEN 1 AND 100)
          ) STRICT;
          CREATE INDEX batches_project_idx ON batches(projectId);
          CREATE INDEX entries_batch_idx ON entries(batchId);
          CREATE INDEX harvests_batch_idx ON harvests(batchId);
        `);
        for (const record of initialData.projects)
          mutate(db, { kind: "projekt", record });
        for (const record of initialData.batches)
          mutate(db, { kind: "batch", record });
        for (const record of initialData.entries)
          mutate(db, { kind: "anteckning", record });
        for (const record of initialData.harvests)
          mutate(db, { kind: "skörd", record });
        db.exec("PRAGMA user_version = 1;");
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      db.close();
      throw error;
    }
  }
  return db;
}
export function readData(db: DatabaseSync): Data {
  // One read transaction gives consistent totals across all four registers.
  db.exec("BEGIN");
  try {
    const data = {
      projects: db.prepare("SELECT * FROM projects ORDER BY rowid").all(),
      batches: db.prepare("SELECT * FROM batches ORDER BY rowid").all(),
      entries: db
        .prepare("SELECT * FROM entries ORDER BY date DESC, rowid DESC")
        .all(),
      harvests: db.prepare("SELECT * FROM harvests ORDER BY rowid").all(),
    } as unknown as Data;
    db.exec("COMMIT");
    return data;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
export function mutate(db: DatabaseSync, input: unknown) {
  const mutation = parseMutation(input);
  try {
    switch (mutation.kind) {
      case "projekt": {
        const r = mutation.record;
        db.prepare(
          "INSERT INTO projects(id,name,species,location,date) VALUES(?,?,?,?,?)",
        ).run(r.id, r.name, r.species, r.location, r.date);
        break;
      }
      case "batch": {
        const r = mutation.record;
        db.prepare(
          "INSERT INTO batches(id,projectId,name,substrate,status,date) VALUES(?,?,?,?,?,?)",
        ).run(r.id, r.projectId, r.name, r.substrate, r.status, r.date);
        break;
      }
      case "anteckning": {
        const r = mutation.record;
        db.prepare(
          "INSERT INTO entries(id,batchId,date,text,temperature,humidity) VALUES(?,?,?,?,?,?)",
        ).run(r.id, r.batchId, r.date, r.text, r.temperature, r.humidity);
        break;
      }
      case "skörd": {
        const r = mutation.record;
        db.prepare(
          "INSERT INTO harvests(id,batchId,date,weight,flush) VALUES(?,?,?,?,?)",
        ).run(r.id, r.batchId, r.date, r.weight, r.flush);
        break;
      }
      case "status": {
        const result = db
          .prepare("UPDATE batches SET status=? WHERE id=?")
          .run(mutation.status, mutation.id);
        if (Number(result.changes) !== 1)
          throw new InputError(
            "Batchen finns inte längre. Ladda om sidan.",
            404,
          );
        break;
      }
    }
  } catch (error) {
    if (error instanceof Error && /UNIQUE constraint/.test(error.message))
      throw new InputError(
        "Postens ID eller batchnamn finns redan. Välj ett unikt batchnamn eller ladda om sidan.",
        409,
      );
    if (error instanceof Error && /FOREIGN KEY constraint/.test(error.message))
      throw new InputError(
        "Projektet eller batchen finns inte. Ladda om sidan och försök igen.",
      );
    throw error;
  }
}
// Kept server-side. No SQLite code or filesystem paths are sent to the browser.
let database: DatabaseSync | undefined;
export function getDatabase() {
  if (!database)
    database = openDatabase(
      resolve(process.env.SQLITE_PATH || "data/svampodlaren.sqlite"),
    );
  return database;
}
