import test from "node:test";
import assert from "node:assert/strict";
import { openDatabase, readData } from "../lib/database.ts";
import {
  createUser,
  updateUser,
  deleteUser,
  login,
  newSession,
  currentUser,
  logout,
  ownedData,
  ownedMutation,
  requireUser,
} from "../lib/accounts.ts";
const blank = {
  projects: [],
  batches: [],
  entries: [],
  harvests: [],
  customSpecies: [],
};
const account = (username) => ({
  username,
  name: username,
  password: "Synthetic-test-only-4932",
});
const project = (id) => ({
  kind: "projekt",
  record: {
    id,
    name: "Test",
    species: "Ostronskivling",
    location: "Huset",
    date: "2026-10-27",
  },
});
test("första admin tar över gamla poster; setup kan inte upprepas och lösenord skyddas", () => {
  const db = openDatabase(":memory:");
  try {
    const n = readData(db).projects.length;
    const admin = createUser(db, account("admin"), true);
    assert.equal(admin.role, "admin");
    assert.equal(
      db.prepare("SELECT count(*) n FROM record_owners").get().n,
      Object.values(readData(db)).reduce((s, a) => s + a.length, 0),
    );
    assert.equal(ownedData(db, admin).projects.length, n);
    assert.throws(
      () => createUser(db, account("second"), true),
      /redan skapad/,
    );
    assert.equal(db.prepare("SELECT count(*) n FROM users").get().n, 1);
    assert.ok(
      !db
        .prepare("SELECT password FROM users")
        .get()
        .password.includes(account("admin").password),
    );
  } finally {
    db.close();
  }
});
test("inloggning, sessionshash, utloggning, utgång och spärr", () => {
  const db = openDatabase(":memory:", blank);
  try {
    const admin = createUser(db, account("admin"), true);
    assert.equal(login(db, account("admin")).id, admin.id);
    const token = newSession(db, admin);
    const req = new Request("http://localhost", {
      headers: { cookie: `svamp_session=${token}` },
    });
    assert.equal(currentUser(db, req).id, admin.id);
    assert.notEqual(
      db.prepare("SELECT token FROM sessions").get().token,
      token,
    );
    logout(db, req);
    assert.equal(currentUser(db, req), null);
    assert.throws(() => requireUser(db, req), /Logga in/);
    const t = newSession(db, admin);
    db.exec("UPDATE sessions SET expires=0");
    assert.equal(
      currentUser(
        db,
        new Request("http://localhost", {
          headers: { cookie: `svamp_session=${t}` },
        }),
      ),
      null,
    );
    for (let i = 0; i < 5; i++)
      assert.throws(
        () => login(db, { username: "admin", password: "wrong" }),
        /Fel användarnamn/,
      );
    assert.throws(
      () => login(db, account("admin")),
      (e) => e.status === 429,
    );
  } finally {
    db.close();
  }
});
test("alla kan läsa; ägare och admin kan ändra men andra användare nekas", () => {
  const db = openDatabase(":memory:", blank);
  try {
    const admin = createUser(db, account("admin"), true),
      a = createUser(db, account("alice")),
      b = createUser(db, account("bob"));
    ownedMutation(db, admin, { ...project("p"), ownerId: a.id });
    ownedMutation(db, b, project("pb"));
    assert.equal(ownedData(db, a).projects.length, 2);
    assert.deepEqual(
      ownedData(db, b).projects.map((p) => p.id),
      ["p", "pb"],
    );
    assert.throws(
      () => ownedMutation(db, a, { ...project("bad"), ownerId: b.id }),
      (e) => e.status === 403,
    );
    const records = [
      {
        kind: "batch",
        record: {
          id: "batch",
          projectId: "p",
          name: "Hink 1",
          substrate: "Halm",
          growingMethod: "Hink",
          status: "Inkubation",
          date: "2026-10-27",
        },
      },
      {
        kind: "anteckning",
        record: {
          id: "entry",
          batchId: "batch",
          text: "Text",
          date: "2026-10-27",
          phase: "Inkubation",
          temperature: 20,
          humidity: 80,
        },
      },
      {
        kind: "skörd",
        record: {
          id: "harvest",
          batchId: "batch",
          date: "2026-10-27",
          weight: 50,
          flush: 1,
        },
      },
      {
        kind: "svamp",
        record: {
          id: "species",
          name: "Egen testsvamp",
          latin: "",
          description: "Text",
          guide: "",
          url: "",
        },
      },
    ];
    for (const r of records) ownedMutation(db, admin, { ...r, ownerId: a.id });
    assert.throws(
      () =>
        ownedMutation(db, b, {
          ...records[1],
          record: { ...records[1].record, id: "bad" },
        }),
      /samma användare/,
    );
    for (const r of [project("p"), ...records]) {
      assert.throws(
        () => ownedMutation(db, b, { ...r, edit: true }),
        (e) => e.status === 403,
      );
      ownedMutation(db, a, { ...r, edit: true });
      ownedMutation(db, admin, {
        ...r,
        edit: true,
        record: {
          ...r.record,
          ...(r.kind === "anteckning"
            ? { text: "Ändrad text" }
            : r.kind === "svamp"
              ? { guide: "Nya råd" }
              : {}),
        },
      });
    }
    assert.equal(ownedData(db, a).entries[0].text, "Ändrad text");
    assert.equal(ownedData(db, a).customSpecies[0].guide, "Nya råd");
    assert.equal(ownedData(db, b).entries.length, 1);
    assert.equal(ownedData(db, b).entries[0].ownerId, a.id);
    for (const m of [
      { kind: "status", id: "batch", status: "Avslutad" },
      { kind: "odlingsform", id: "batch", growingMethod: "Påse" },
      { kind: "anteckningsfas", id: "entry", phase: "Fruktsättning" },
      { kind: "radera-svamp", id: "species" },
    ])
      assert.throws(
        () => ownedMutation(db, b, m),
        (e) => e.status === 403,
      );
    ownedMutation(db, a, {
      kind: "status",
      id: "batch",
      status: "Fruktsättning",
    });
    ownedMutation(db, a, {
      kind: "odlingsform",
      id: "batch",
      growingMethod: "Påse",
    });
    ownedMutation(db, a, {
      kind: "anteckningsfas",
      id: "entry",
      phase: "Fruktsättning",
    });
    for (const [kind, id] of [
      ["radera-anteckning", "entry"],
      ["radera-skörd", "harvest"],
      ["radera-svamp", "species"],
    ]) {
      assert.throws(
        () => ownedMutation(db, b, { kind, id }),
        (e) => e.status === 403,
      );
      ownedMutation(db, a, { kind, id });
    }
    assert.equal(ownedData(db, b).entries.length, 0);
    assert.throws(
      () =>
        ownedMutation(db, admin, {
          ...records[0],
          edit: true,
          record: { ...records[0].record, projectId: "pb" },
        }),
      /samma användare/,
    );
    for (const [kind, id] of [
      ["radera-batch", "batch"],
      ["radera-projekt", "p"],
    ]) {
      assert.throws(
        () => ownedMutation(db, b, { kind, id }),
        (e) => e.status === 403,
      );
      ownedMutation(db, a, { kind, id });
    }
  } finally {
    db.close();
  }
});

test("konton, ägarskap och sessioner bevaras vid omstart", async () => {
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = mkdtempSync(join(tmpdir(), "svamp-accounts-"));
  let db;
  try {
    const path = join(dir, "test.sqlite");
    db = openDatabase(path, blank);
    const admin = createUser(db, account("admin"), true),
      user = createUser(db, account("alice"));
    ownedMutation(db, admin, { ...project("persist"), ownerId: user.id });
    const token = newSession(db, user);
    db.close();
    db = openDatabase(path, blank);
    const request = new Request("http://localhost", {
      headers: { cookie: `svamp_session=${token}` },
    });
    assert.equal(currentUser(db, request).id, user.id);
    assert.equal(ownedData(db, user).projects[0].id, "persist");
    assert.equal(login(db, account("alice")).id, user.id);
  } finally {
    db?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("admin kan redigera konton; lösenords- och rollbyte återkallar sessioner", () => {
  const db = openDatabase(":memory:", blank);
  try {
    const admin = createUser(db, account("admin"), true),
      user = createUser(db, account("alice"));
    const request = () =>
      new Request("http://localhost", {
        headers: { cookie: `svamp_session=${newSession(db, user)}` },
      });
    const session = request();
    assert.throws(
      () => updateUser(db, user, { ...user, name: "Intrång" }),
      (e) => e.status === 403,
    );
    updateUser(db, admin, { ...user, name: "Alice Svensson", password: "" });
    assert.equal(currentUser(db, session).name, "Alice Svensson");
    assert.throws(
      () => updateUser(db, admin, { ...user, username: "admin" }),
      (e) => e.status === 409,
    );
    assert.equal(login(db, account("alice")).name, "Alice Svensson");
    updateUser(db, admin, {
      ...user,
      username: "alice-new",
      role: "admin",
      password: "Synthetic-replacement-5928",
    });
    assert.equal(currentUser(db, session), null);
    assert.throws(
      () => login(db, account("alice")),
      (e) => e.status === 401,
    );
    assert.throws(
      () =>
        login(db, {
          username: "alice-new",
          password: account("alice").password,
        }),
      (e) => e.status === 401,
    );
    assert.equal(
      login(db, {
        username: "alice-new",
        password: "Synthetic-replacement-5928",
      }).role,
      "admin",
    );
  } finally {
    db.close();
  }
});
test("sista administratören, eget konto och ogiltig överföring skyddas", () => {
  const db = openDatabase(":memory:", blank);
  try {
    const admin = createUser(db, account("admin"), true),
      user = createUser(db, account("alice"));
    assert.throws(
      () => updateUser(db, admin, { ...admin, role: "user" }),
      (e) => e.status === 409,
    );
    assert.throws(
      () => deleteUser(db, admin, { id: admin.id, transferTo: user.id }),
      (e) => e.status === 409,
    );
    assert.throws(
      () => deleteUser(db, user, { id: admin.id, transferTo: user.id }),
      (e) => e.status === 403,
    );
    assert.throws(
      () => deleteUser(db, admin, { id: user.id, transferTo: user.id }),
      /annan befintlig/,
    );
    assert.throws(
      () => deleteUser(db, admin, { id: user.id, transferTo: "missing" }),
      /annan befintlig/,
    );
    createUser(db, { ...account("other-admin"), role: "admin" });
    assert.throws(
      () => updateUser(db, admin, { ...admin, role: "user" }),
      /egen administratör/,
    );
    assert.throws(
      () => deleteUser(db, admin, { id: admin.id, transferTo: user.id }),
      /inloggad/,
    );
    assert.equal(db.prepare("SELECT count(*) n FROM users").get().n, 3);
  } finally {
    db.close();
  }
});
test("radering av konto överför hela odlingskedjan och återkallar inloggning", () => {
  const db = openDatabase(":memory:");
  try {
    const admin = createUser(db, account("admin"), true),
      user = createUser(db, account("alice"));
    // Move seeded ownership to the test user, including linked projects/batches/entries/harvests.
    db.prepare("UPDATE record_owners SET userId=?").run(user.id);
    const data = readData(db);
    const token = newSession(db, user);
    const req = new Request("http://localhost", {
      headers: { cookie: `svamp_session=${token}` },
    });
    deleteUser(db, admin, { id: user.id, transferTo: admin.id });
    assert.deepEqual(readData(db), data);
    assert.equal(
      db
        .prepare("SELECT count(*) n FROM record_owners WHERE userId=?")
        .get(user.id).n,
      0,
    );
    assert.equal(currentUser(db, req), null);
    assert.equal(
      db.prepare("SELECT id FROM users WHERE id=?").get(user.id),
      undefined,
    );
    assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
    assert.throws(
      () => login(db, account("alice")),
      (e) => e.status === 401,
    );
  } finally {
    db.close();
  }
});
