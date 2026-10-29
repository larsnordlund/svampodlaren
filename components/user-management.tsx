"use client";
import { useState, type FormEvent } from "react";
import type { User } from "@/lib/accounts";
export function UserManagement({
  users,
  currentUser,
  counts,
  onChanged,
}: {
  users: User[];
  currentUser: User;
  counts: Record<string, number>;
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<User | null>(null),
    [deleting, setDeleting] = useState<User | null>(null),
    [transfer, setTransfer] = useState(currentUser.id),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function action(body: Record<string, unknown>) {
    const r = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const b = await r.json();
    if (!r.ok) throw Error(b.error);
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action({
        action: editing ? "update-user" : "create-user",
        ...(editing ? { id: editing.id } : {}),
        ...Object.fromEntries(new FormData(form)),
      });
      if (editing?.id === currentUser.id) {
        window.location.reload();
        return;
      }
      await onChanged();
      form.reset();
      setNotice(
        editing ? "Användaren har uppdaterats." : "Användaren har skapats.",
      );
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte spara användaren.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-editor" aria-labelledby="users-title">
      <h2 id="users-title">Användarkonton</h2>
      <p>
        Administratörer kan ändra namn, användarnamn, behörighet och lösenord.
        Byte av användarnamn, lösenord eller behörighet loggar ut användarens
        befintliga sessioner.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <div className="admin-list">
        {users.map((u) => (
          <article key={u.id}>
            <div>
              <strong>{u.name}</strong>
              <p>
                {u.username} ·{" "}
                {u.role === "admin" ? "Administratör" : "Användare"} ·{" "}
                {counts[u.id] || 0} poster
                {u.id === currentUser.id ? " · Ditt konto" : ""}
              </p>
            </div>
            <div className="admin-toolbar">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  setEditing(u);
                  setDeleting(null);
                  setError("");
                  setNotice("");
                }}
              >
                Ändra {u.name}
              </button>
              <button
                className="button secondary"
                disabled={busy || u.id === currentUser.id}
                onClick={() => {
                  setDeleting(u);
                  setEditing(null);
                  setTransfer(currentUser.id);
                  setError("");
                  setNotice("");
                }}
              >
                Radera {u.name}
              </button>
            </div>
          </article>
        ))}
      </div>
      {deleting && (
        <section className="admin-message" aria-labelledby="delete-user-title">
          <h3 id="delete-user-title">Radera kontot för {deleting.name}?</h3>
          <p>
            Kontot och dess inloggningar raderas. Alla{" "}
            {counts[deleting.id] || 0} odlingsposter bevaras och överförs till
            vald användare. Detta kan inte ångras.
          </p>
          <label>
            Överför odlingsposterna till
            <select
              value={transfer}
              disabled={busy}
              onChange={(e) => setTransfer(e.target.value)}
            >
              {users
                .filter((u) => u.id !== deleting.id)
                .map((u) => (
                  <option value={u.id} key={u.id}>
                    {u.name} ({u.username})
                  </option>
                ))}
            </select>
          </label>
          <div className="admin-toolbar">
            <button
              className="button primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await action({
                    action: "delete-user",
                    id: deleting.id,
                    transferTo: transfer,
                  });
                  await onChanged();
                  setDeleting(null);
                  setNotice(
                    "Kontot har raderats. Odlingsposterna har bevarats och överförts.",
                  );
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Kunde inte radera kontot.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Raderar…" : "Bekräfta radering av konto"}
            </button>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Avbryt
            </button>
          </div>
        </section>
      )}
      <h3>{editing ? `Ändra ${editing.name}` : "Skapa användare"}</h3>
      <form key={editing?.id || "create-user"} onSubmit={submit}>
        <fieldset disabled={busy}>
          <label>
            Namn
            <input
              name="name"
              defaultValue={editing?.name || ""}
              required
              maxLength={120}
              autoComplete="off"
            />
          </label>
          <label>
            Användarnamn
            <input
              name="username"
              defaultValue={editing?.username || ""}
              required
              minLength={3}
              maxLength={64}
              pattern="[a-zA-Z0-9._-]+"
              autoComplete="off"
            />
          </label>
          <label>
            {editing
              ? "Nytt lösenord (valfritt – lämna tomt för att behålla)"
              : "Lösenord (minst 12 tecken)"}
            <input
              name="password"
              type="password"
              required={!editing}
              minLength={12}
              maxLength={256}
              autoComplete="new-password"
            />
          </label>
          <label>
            Behörighet
            <select name="role" defaultValue={editing?.role || "user"}>
              <option value="user" disabled={editing?.id === currentUser.id}>
                Användare
              </option>
              <option value="admin">Administratör</option>
            </select>
          </label>
          <div className="admin-toolbar">
            <button className="button primary">
              {busy
                ? "Sparar…"
                : editing
                  ? "Spara användare"
                  : "Skapa användare"}
            </button>
            {editing && (
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditing(null)}
              >
                Avbryt ändring
              </button>
            )}
          </div>
        </fieldset>
      </form>
    </section>
  );
}
