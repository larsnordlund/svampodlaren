"use client";
import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import type { User } from "@/lib/accounts";
import { AdminRecords } from "./admin-records";
export function AccountGate({
  children,
}: {
  children: (user: User) => ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null),
    [setup, setSetup] = useState(false),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [admin, setAdmin] = useState(false);
  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/auth", { cache: "no-store" });
      const b = await r.json();
      if (!r.ok) throw Error(b.error);
      setUser(b.user);
      setSetup(b.setupRequired);
      setError("");
    } catch {
      setError("Appen kunde inte nås. Kontrollera att servern är startad.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: setup ? "setup" : "login",
          ...Object.fromEntries(f),
        }),
      });
      const b = await r.json();
      if (!r.ok) throw Error(b.error);
      setUser(b.user);
      setSetup(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Inloggningen misslyckades.");
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return <main className="account-card">Laddar Svampodlaren…</main>;
  if (!user)
    return (
      <main className="account-card">
        <p className="eyebrow">SVAMPODLAREN · LOKALA KONTON</p>
        <h1>{setup ? "Skapa administratör" : "Välkommen tillbaka"}</h1>
        <p>
          {setup
            ? "Skapa ditt första administratörskonto. Befintliga odlingar bevaras och kopplas till kontot."
            : "Logga in för att öppna dina odlingar. Kontot fungerar utan internet."}
        </p>
        <form onSubmit={submit}>
          {setup && (
            <label>
              Namn
              <input name="name" required maxLength={120} autoComplete="name" />
            </label>
          )}
          <label>
            Användarnamn
            <input
              name="username"
              required
              minLength={3}
              maxLength={64}
              pattern="[a-zA-Z0-9._-]+"
              autoComplete="username"
            />
          </label>
          <label>
            Lösenord
            <input
              name="password"
              type="password"
              required
              minLength={setup ? 12 : 1}
              maxLength={256}
              autoComplete={setup ? "new-password" : "current-password"}
            />
          </label>
          {setup && <p>Minst 12 tecken. Spara lösenordet på en säker plats.</p>}
          <button className="button primary" disabled={busy}>
            {busy ? "Vänta…" : setup ? "Skapa administratör" : "Logga in"}
          </button>
        </form>
        {error && <p role="alert">{error}</p>}
        <button className="button secondary" onClick={() => void load()}>
          Försök ansluta igen
        </button>
      </main>
    );
  return (
    <>
      <div className="account-bar">
        <span>
          {user.name} · {user.role === "admin" ? "Administratör" : "Användare"}
        </span>
        {
          <button className="button secondary" onClick={() => setAdmin(!admin)}>
            {admin
              ? "Till odlingarna"
              : user.role === "admin"
                ? "Administrera register & användare"
                : "Visa register / ändra egna poster"}
          </button>
        }
        <button
          className="button secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "logout" }),
              });
              if (!r.ok) throw Error();
              setUser(null);
              setAdmin(false);
            } catch {
              setError("Utloggningen misslyckades. Försök igen.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Logga ut
        </button>
        {error && <span role="alert">{error}</span>}
      </div>
      {admin ? <AdminRecords currentUser={user} /> : children(user)}
    </>
  );
}
