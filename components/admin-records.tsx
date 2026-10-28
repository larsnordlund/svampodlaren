"use client";
import { useEffect, useState, type FormEvent } from "react";
import type { User, RecordKind } from "@/lib/accounts";
import { SpeciesLabelFields } from "./species-label-fields";
import { SpeciesImagePicker } from "./species-image-picker";
import { UserManagement } from "./user-management";
import { BackupSettings } from "./backup-settings";
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
  url: "Länk till odlingsguide (valfritt)",
};
type Row = Record<string, string | number> & { id: string };
export function AdminRecords({ currentUser }: { currentUser: User }) {
  const [imageBusy, setImageBusy] = useState(false);
  const isAdmin = currentUser.role === "admin";
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
    const rows = Object.values(d).flat() as Row[];
    setUsers(
      isAdmin
        ? b.users
        : (Array.from(
            new Map(
              rows.map((row) => [
                String(row.ownerId),
                {
                  id: String(row.ownerId),
                  name: String(row.ownerName || "Okänd användare"),
                  username: "",
                  role: "user",
                },
              ]),
            ).values(),
          ) as User[]),
    );
    if (!isAdmin && !rows.some((row) => row.ownerId === currentUser.id))
      setUsers((previous) => [currentUser, ...previous]);
    setOwners(
      Object.fromEntries(rows.map((row) => [row.id, String(row.ownerId)])),
    );
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (imageBusy) return;
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
          : isAdmin
            ? "Posten har skapats för vald användare."
            : "Din post har skapats.",
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
      <p className="eyebrow">
        {isAdmin ? "ADMINISTRATION" : "GEMENSAMMA REGISTER"}
      </p>
      <h1>
        {isAdmin ? "Register & användare" : "Alla poster · ändra dina egna"}
      </h1>
      <p>
        {isAdmin
          ? "Ändra uppgifter i alla register eller skapa poster åt en vald användare."
          : "Här ser du allas poster. Du kan skapa, ändra och radera dina egna. Andras poster är skrivskyddade."}
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
                {u.name}
                {u.username ? ` (${u.username})` : ""}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button primary"
          disabled={busy}
          onClick={() => {
            setRecord(null);
            setOwner(isAdmin ? filter || currentUser.id : currentUser.id);
            setEditor(true);
            setError("");
            setNotice("");
          }}
        >
          {isAdmin ? "Skapa post för användare" : "Skapa egen post"}
        </button>
      </div>
      {editor && (
        <section className="admin-editor">
          <h2>{record ? "Ändra post" : "Ny post"}</h2>
          <label>
            Postens användare
            <select
              value={owner}
              disabled={!isAdmin || !!record || busy}
              onChange={(e) => setOwner(e.target.value)}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                  {u.username ? ` (${u.username})` : ""}
                </option>
              ))}
            </select>
          </label>
          <form
            key={`${kind}-${record?.id || "new"}-${owner}`}
            onSubmit={submit}
          >
            <fieldset disabled={busy}>
              {kind === "svamp" && (
                <SpeciesImagePicker
                  initialImage={String(record?.image || "")}
                  onBusyChange={setImageBusy}
                />
              )}
              {kind === "svamp" && (
                <SpeciesLabelFields
                  badgeText={record?.badgeText as string | undefined}
                  photoCaption={record?.photoCaption as string | undefined}
                />
              )}
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
                <button className="button primary" disabled={imageBusy}>
                  Spara post
                </button>
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
              {isAdmin || owners[r.id] === currentUser.id ? (
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
              ) : (
                <span>Endast visning</span>
              )}
            </article>
          ))}
        {!(data[spec.key] || []).some(
          (r) => !filter || owners[r.id] === filter,
        ) && <p>Inga poster för detta urval.</p>}
      </section>
      {isAdmin && (
        <UserManagement
          users={users}
          currentUser={currentUser}
          counts={Object.values(owners).reduce(
            (result: Record<string, number>, id) => {
              result[id] = (result[id] || 0) + 1;
              return result;
            },
            {},
          )}
          onChanged={async () => {
            await load();
            setEditor(false);
            setFilter("");
          }}
        />
      )}
      {isAdmin && <BackupSettings />}
      <p>
        De förinstallerade svamparterna är ett gemensamt referensbibliotek. Egna
        svampar redigeras i registret ovan.
      </p>
    </main>
  );
}
