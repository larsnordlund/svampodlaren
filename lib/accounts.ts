import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { mutate, readData } from "./database.ts";
import { InputError, parseMutation, speciesNameKey } from "./validation.ts";
export type User = {
  id: string;
  username: string;
  name: string;
  role: "admin" | "user";
};
export const tables = {
  projekt: "projects",
  batch: "batches",
  anteckning: "entries",
  skörd: "harvests",
  svamp: "custom_species",
} as const;
export type RecordKind = keyof typeof tables;
export function accountSchema(db: DatabaseSync) {
  db.exec(`CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','user')), password TEXT NOT NULL) STRICT;
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL) STRICT;
 CREATE TABLE IF NOT EXISTS record_owners(recordId TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id)) STRICT;
 CREATE TABLE IF NOT EXISTS login_attempts(username TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset INTEGER NOT NULL) STRICT;`);
}
export function users(db: DatabaseSync) {
  return db
    .prepare("SELECT id,username,name,role FROM users ORDER BY name")
    .all() as User[];
}
function digest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
function passwordHash(
  password: string,
  salt = randomBytes(16).toString("hex"),
) {
  return (
    salt +
    ":" +
    scryptSync(password, salt, 64, {
      N: 131072,
      r: 8,
      p: 1,
      maxmem: 256 * 1024 * 1024,
    }).toString("hex")
  );
}
export function createUser(
  db: DatabaseSync,
  input: Record<string, unknown>,
  bootstrap = false,
) {
  const username =
    typeof input.username === "string"
      ? input.username.trim().toLowerCase()
      : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!/^[a-z0-9._-]{3,64}$/.test(username))
    throw new InputError(
      "Användarnamn: 3–64 tecken (a–z, siffror, punkt, bindestreck).",
    );
  if (!name || name.length > 120)
    throw new InputError("Ange ett namn med högst 120 tecken.");
  if (
    typeof input.password !== "string" ||
    input.password.length < 12 ||
    input.password.length > 256
  )
    throw new InputError("Lösenordet måste innehålla 12–256 tecken.");
  if (
    input.role !== undefined &&
    !["admin", "user"].includes(String(input.role))
  )
    throw new InputError("Ogiltig roll.");
  const hash = passwordHash(input.password),
    id = randomUUID();
  db.exec("BEGIN IMMEDIATE");
  try {
    if (bootstrap && users(db).length)
      throw new InputError("Administratören är redan skapad. Logga in.", 409);
    db.prepare("INSERT INTO users VALUES(?,?,?,?,?)").run(
      id,
      username,
      name,
      bootstrap ? "admin" : String(input.role || "user"),
      hash,
    );
    if (bootstrap)
      for (const table of Object.values(tables))
        db.prepare(`INSERT INTO record_owners SELECT id,? FROM ${table}`).run(
          id,
        );
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    if (e instanceof Error && e.message.includes("UNIQUE"))
      throw new InputError("Användarnamnet är upptaget.", 409);
    throw e;
  }
  return {
    id,
    username,
    name,
    role: bootstrap ? "admin" : String(input.role || "user"),
  } as User;
}
export function login(db: DatabaseSync, input: Record<string, unknown>) {
  const username =
    typeof input.username === "string"
      ? input.username.trim().toLowerCase().slice(0, 64)
      : "";
  const attempt = db
    .prepare("SELECT * FROM login_attempts WHERE username=?")
    .get(username);
  if (
    attempt &&
    Number(attempt.reset) > Date.now() &&
    Number(attempt.attempts) >= 5
  )
    throw new InputError("För många försök. Vänta 15 minuter.", 429);
  const row = db.prepare("SELECT * FROM users WHERE username=?").get(username);
  const stored = String(
    row?.password || "00000000000000000000000000000000:" + "00".repeat(64),
  );
  const password =
    typeof input.password === "string" && input.password.length <= 256
      ? input.password
      : "";
  const actual = passwordHash(password, stored.split(":")[0]);
  if (!row || !timingSafeEqual(Buffer.from(actual), Buffer.from(stored))) {
    db.prepare(
      "INSERT INTO login_attempts VALUES(?,1,?) ON CONFLICT(username) DO UPDATE SET attempts=CASE WHEN reset<? THEN 1 ELSE attempts+1 END, reset=CASE WHEN reset<? THEN excluded.reset ELSE reset END",
    ).run(username, Date.now() + 900000, Date.now(), Date.now());
    throw new InputError("Fel användarnamn eller lösenord.", 401);
  }
  db.prepare("DELETE FROM login_attempts WHERE username=?").run(username);
  return {
    id: String(row.id),
    username: String(row.username),
    name: String(row.name),
    role: row.role,
  } as User;
}
export function newSession(db: DatabaseSync, user: User) {
  const token = randomBytes(32).toString("hex");
  db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
  db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
    digest(token),
    user.id,
    Date.now() + 7 * 86400000,
  );
  return token;
}
function tokenFrom(request: Request) {
  return (
    request.headers
      .get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("svamp_session="))
      ?.slice(14) || ""
  );
}
export function currentUser(db: DatabaseSync, request: Request): User | null {
  return (
    (db
      .prepare(
        "SELECT u.id,u.username,u.name,u.role FROM users u JOIN sessions s ON s.userId=u.id WHERE s.token=? AND s.expires>?",
      )
      .get(digest(tokenFrom(request)), Date.now()) as User | undefined) || null
  );
}
export function logout(db: DatabaseSync, request: Request) {
  db.prepare("DELETE FROM sessions WHERE token=?").run(
    digest(tokenFrom(request)),
  );
}
export function requireUser(db: DatabaseSync, request: Request) {
  const user = currentUser(db, request);
  if (!user) throw new InputError("Logga in för att fortsätta.", 401);
  return user;
}
export function ownedData(db: DatabaseSync, _user: User) {
  const data = readData(db);
  const ownership = new Map(
    db
      .prepare(
        "SELECT o.recordId,o.userId,u.name FROM record_owners o JOIN users u ON u.id=o.userId",
      )
      .all()
      .map((row) => [row.recordId, row]),
  );
  return Object.fromEntries(
    Object.entries(data).map(([key, rows]) => [
      key,
      rows.map((row) => ({
        ...row,
        ownerId: ownership.get(row.id)?.userId,
        ownerName: ownership.get(row.id)?.name,
      })),
    ]),
  );
}
export function ownedMutation(db: DatabaseSync, user: User, input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new InputError("Ogiltig post.");
  const body = input as Record<string, unknown>;
  const m = parseMutation(body);
  const creation = "record" in m;
  const edit = body.edit === true;
  if ((!creation || edit) && user.role !== "admin") {
    const id = "record" in m ? m.record.id : m.id;
    if (
      db.prepare("SELECT userId FROM record_owners WHERE recordId=?").get(id)
        ?.userId !== user.id
    )
      throw new InputError(
        "Du får bara ändra eller radera dina egna poster.",
        403,
      );
  }
  let owner = user.id;
  if (creation) {
    const kind = m.kind as RecordKind,
      table = tables[kind],
      r = m.record;
    if (edit) {
      const row = db
        .prepare("SELECT userId FROM record_owners WHERE recordId=?")
        .get(r.id);
      if (!row || !db.prepare(`SELECT id FROM ${table} WHERE id=?`).get(r.id))
        throw new InputError("Posten finns inte.", 404);
      owner = String(row.userId);
    } else if (body.ownerId !== undefined) {
      if (user.role !== "admin" && body.ownerId !== user.id)
        throw new InputError("Du får bara skapa egna poster.", 403);
      if (
        typeof body.ownerId !== "string" ||
        !db.prepare("SELECT id FROM users WHERE id=?").get(body.ownerId)
      )
        throw new InputError("Välj en användare.");
      owner = body.ownerId;
    }
    const parent =
      "projectId" in r ? r.projectId : "batchId" in r ? r.batchId : null;
    if (
      parent &&
      db
        .prepare("SELECT userId FROM record_owners WHERE recordId=?")
        .get(parent)?.userId !== owner
    )
      throw new InputError(
        "Välj ett projekt eller en batch som tillhör samma användare.",
      );
    db.exec("BEGIN IMMEDIATE");
    try {
      if (edit) {
        const fields = Object.entries(r).filter(([key]) => key !== "id");
        if (kind === "svamp")
          fields.push([
            "name_key",
            speciesNameKey((r as { name: string }).name),
          ]);
        db.prepare(
          `UPDATE ${table} SET ${fields.map(([k]) => `${k}=?`).join(",")} WHERE id=?`,
        ).run(...fields.map(([, v]) => v), r.id);
      } else {
        mutate(db, m);
        db.prepare("INSERT INTO record_owners VALUES(?,?)").run(r.id, owner);
      }
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      if (e instanceof Error && /UNIQUE/.test(e.message))
        throw new InputError("Namnet eller ID finns redan.", 409);
      throw e;
    }
  } else {
    mutate(db, m);
    if (m.kind.startsWith("radera-"))
      db.prepare("DELETE FROM record_owners WHERE recordId=?").run(m.id);
  }
}
