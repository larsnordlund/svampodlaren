"use client";
import { useEffect, useState, type FormEvent } from "react";
import type { User, RecordKind } from "@/lib/accounts";
import { cultivationPhases } from "@/lib/data";
const registers = {
  projekt: {
    key: "projects",
    name: "Odlingsprojekt",
    fields: ["name", "species", "location", "date"],
  },
  batch: {
    key: "batches",
    name: "Batchregister",
    fields: [
      "projectId",
      "name",
      "substrate",
      "growingMethod",
      "status",
      "date",
    ],
  },
  anteckning: {
    key: "entries",
    name: "Odlingsdagbok",
    fields: ["batchId", "date", "text", "phase", "temperature", "humidity"],
  },
  skörd: {
    key: "harvests",
    name: "Skördar",
    fields: ["batchId", "date", "weight", "flush"],
  },
  svamp: {
    key: "customSpecies",
    name: "Egna svampar",
    fields: ["name", "latin", "description", "guide", "url"],
  },
};
const labels: Record<string, string> = {
  name: "Namn",
  species: "Svampart",
  location: "Odlingsplats",
  date: "Datum",
  projectId: "Projekt",
  batchId: "Batch",
  substrate: "Substrat",
  growingMethod: "Odlingsform / behållare",
  status: "Odlingsfas",
  phase: "Odlingsfas vid anteckningen",
  text: "Observation / anteckning",
  temperature: "Temperatur (°C)",
  humidity: "Luftfuktighet (%)",
  weight: "Vikt (gram)",
  flush: "Skördevåg",
  latin: "Vetenskapligt namn",
  description: "Beskrivning",
  guide: "Odlingsråd",
  url: "Källänk",
};
type Row = Record<string, string | number> & { id: string };
export function AdminRecords({ currentUser }: { currentUser: User }) {
  const [data, setData] = useState<Record<string, Row[]>>({}),
    [users, setUsers] = useState<User[]>([]),
    [owners, setOwners] = useState<Record<string, string>>({}),
    [kind, setKind] = useState<RecordKind>("projekt"),
    [filter, setFilter] = useState(""),
    [owner, setOwner] = useState(currentUser.id),
    [record, setRecord] = useState<Row | null>(null),
    [editor, setEditor] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const [r, a] = await Promise.all([
      fetch("/api/data", { cache: "no-store" }),
      fetch("/api/auth", { cache: "no-store" }),
    ]);
    const [d, b] = await Promise.all([r.json(), a.json()]);
    if (!r.ok || !a.ok) throw Error(d.error || b.error);
    setData(d);
    setUsers(b.users);
    setOwners(
      Object.fromEntries(
        b.owners.map((o: { recordId: string; userId: string }) => [
          o.recordId,
          o.userId,
        ]),
      ),
    );
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    try {
      const values = Object.fromEntries(new FormData(form));
      const row: Row = { id: record?.id || crypto.randomUUID(), ...values };
      for (const key of ["temperature", "humidity", "weight", "flush"])
        if (key in row) row[key] = Number(row[key]);
      const r = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          record: row,
          edit: !!record,
          ownerId: owner,
        }),
      });
      const b = await r.json();
      if (!r.ok) throw Error(b.error);
      await load();
      setEditor(false);
      setNotice(
        record
          ? "Ändringarna har sparats."
          : "Posten har skapats för vald användare.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte spara.");
    } finally {
      setBusy(false);
    }
  }
  const spec = registers[kind];
  return (
    <main className="admin-page">
      <p className="eyebrow">ADMINISTRATION</p>
      <h1>Register & användare</h1>
      <p>
        Ändra alla uppgifter i registren eller skapa poster åt en annan
        användare. Välj samma användare för projekt, batch och tillhörande
        anteckningar eller skördar.
      </p>
      {error && (
        <p role="alert" className="admin-message">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="admin-message">
          {notice}
        </p>
      )}
      <div className="admin-toolbar">
        <label>
          Register
          <select
            value={kind}
            disabled={busy}
            onChange={(e) => {
              setKind(e.target.value as RecordKind);
              setEditor(false);
              setError("");
            }}
          >
            {Object.entries(registers).map(([k, v]) => (
              <option key={k} value={k}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Visa användare
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Alla användare</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.username})
              </option>
            ))}
          </select>
        </label>
        <button
          className="button primary"
          disabled={busy}
          onClick={() => {
            setRecord(null);
            setOwner(filter || currentUser.id);
            setEditor(true);
            setError("");
            setNotice("");
          }}
        >
          Skapa post för användare
        </button>
      </div>
      {editor && (
        <section className="admin-editor">
          <h2>{record ? "Ändra post" : "Ny post"}</h2>
          <label>
            Postens användare
            <select
              value={owner}
              disabled={!!record || busy}
              onChange={(e) => setOwner(e.target.value)}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.username})
                </option>
              ))}
            </select>
          </label>
          <form
            key={`${kind}-${record?.id || "new"}-${owner}`}
            onSubmit={submit}
          >
            <fieldset disabled={busy}>
              {spec.fields.map((field) => {
                const value =
                  record?.[field] ??
                  (field === "date"
                    ? new Date().toLocaleDateString("sv-SE")
                    : field === "status"
                      ? "Inokulering"
                      : field === "flush"
                        ? 1
                        : field === "temperature"
                          ? 20
                          : field === "humidity"
                            ? 85
                            : "");
                const parent =
                  field === "projectId"
                    ? "projects"
                    : field === "batchId"
                      ? "batches"
                      : null;
                const optional = [
                  "latin",
                  "description",
                  "guide",
                  "url",
                  "phase",
                  "growingMethod",
                ].includes(field);
                return (
                  <label key={field}>
                    {labels[field]}
                    {parent ? (
                      <select
                        name={field}
                        defaultValue={String(value)}
                        required
                      >
                        <option value="">
                          Välj {labels[field].toLowerCase()}
                        </option>
                        {(data[parent] || [])
                          .filter((r) => owners[r.id] === owner)
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                      </select>
                    ) : ["phase", "status"].includes(field) ? (
                      <select name={field} defaultValue={String(value)}>
                        {field === "phase" && (
                          <option value="">Ej angiven</option>
                        )}
                        {cultivationPhases.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    ) : ["text", "description", "guide"].includes(field) ? (
                      <textarea
                        name={field}
                        defaultValue={value}
                        required={!optional}
                        maxLength={
                          field === "text"
                            ? 2000
                            : field === "description"
                              ? 1000
                              : 4000
                        }
                        rows={5}
                      />
                    ) : (
                      <input
                        name={field}
                        defaultValue={value}
                        required={!optional}
                        type={
                          field === "date"
                            ? "date"
                            : field === "url"
                              ? "url"
                              : [
                                    "temperature",
                                    "humidity",
                                    "weight",
                                    "flush",
                                  ].includes(field)
                                ? "number"
                                : "text"
                        }
                        step={
                          ["temperature", "humidity"].includes(field)
                            ? "any"
                            : undefined
                        }
                        maxLength={
                          field === "latin" ? 160 : field === "url" ? 2048 : 120
                        }
                      />
                    )}
                  </label>
                );
              })}
              <div className="admin-toolbar">
                <button className="button primary">Spara post</button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setEditor(false)}
                >
                  Avbryt
                </button>
              </div>
            </fieldset>
          </form>
        </section>
      )}
      <section className="admin-list" aria-label={spec.name}>
        {(data[spec.key] || [])
          .filter((r) => !filter || owners[r.id] === filter)
          .map((r) => (
            <article key={r.id}>
              <div>
                <strong>
                  {String(r.name || r.text || `${r.date} · ${r.weight} g`)}
                </strong>
                <p>
                  {users.find((u) => u.id === owners[r.id])?.name ||
                    "Okänd användare"}
                </p>
              </div>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  setRecord(r);
                  setOwner(owners[r.id]);
                  setEditor(true);
                  setError("");
                  setNotice("");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Ändra
              </button>
            </article>
          ))}
        {!(data[spec.key] || []).some(
          (r) => !filter || owners[r.id] === filter,
        ) && <p>Inga poster för detta urval.</p>}
      </section>
      <section className="admin-editor">
        <h2>Användarkonton</h2>
        <p>
          Kontona lagras lokalt. Endast administratörer kan skapa nya användare.
        </p>
        <ul>
          {users.map((u) => (
            <li key={u.id}>
              {u.name} · {u.username} ·{" "}
              {u.role === "admin" ? "Administratör" : "Användare"}
            </li>
          ))}
        </ul>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = e.currentTarget;
            setBusy(true);
            setError("");
            try {
              const r = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "create-user",
                  ...Object.fromEntries(new FormData(f)),
                }),
              });
              const b = await r.json();
              if (!r.ok) throw Error(b.error);
              await load();
              f.reset();
              setNotice("Användarkontot har skapats.");
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Kunde inte skapa konto.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy}>
            <label>
              Namn
              <input name="name" required maxLength={120} />
            </label>
            <label>
              Användarnamn
              <input
                name="username"
                required
                minLength={3}
                maxLength={64}
                autoComplete="off"
              />
            </label>
            <label>
              Lösenord (minst 12 tecken)
              <input
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={256}
                autoComplete="new-password"
              />
            </label>
            <label>
              Behörighet
              <select name="role">
                <option value="user">Användare</option>
                <option value="admin">Administratör</option>
              </select>
            </label>
            <button className="button primary">Skapa användare</button>
          </fieldset>
        </form>
      </section>
      <p>
        De förinstallerade svamparterna är ett gemensamt referensbibliotek. Egna
        svampar redigeras i registret ovan.
      </p>
    </main>
  );
}
