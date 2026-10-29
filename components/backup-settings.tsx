"use client";
import { useEffect, useState } from "react";
type Run = {
  id: string;
  created: string;
  recipient: string;
  filename: string;
  status: string;
  message: string;
  mode: "manual" | "weekly";
};
export function BackupSettings() {
  const [recipient, setRecipient] = useState(""),
    [enabled, setEnabled] = useState(true),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [runs, setRuns] = useState<Run[]>([]);
  async function load() {
    setError("");
    try {
      const r = await fetch("/api/backup", { cache: "no-store" });
      const b = await r.json();
      if (!r.ok) throw Error(b.error);
      setRecipient(b.recipient);
      setEnabled(b.enabled);
      setRuns(b.runs);
      setReady(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Kunde inte läsa backupinställningarna.",
      );
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <section className="admin-editor" aria-labelledby="backup-title">
      <h2 id="backup-title">Veckobackup via e-post</h2>
      <p>
        Måndagar kl. 09.00, svensk tid. Körningen sker via den schemalagda
        chatten i Codex och skickar med Apple Mail. Datorn måste vara på och
        Codex igång; Mail behöver ett fungerande e-postkonto och internet vid
        utskick.
      </p>
      <p>
        Mejlbilagan innehåller bara odlingsregistren. En fullständig backup med
        konton och inställningar sparas lokalt i mappen backups. Vid
        återställning från mejlbilagan behöver konton skapas på nytt och
        posterna tilldelas den första administratören.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setNotice("");
          try {
            const r = await fetch("/api/backup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ recipient, enabled }),
            });
            const b = await r.json();
            if (!r.ok) throw Error(b.error);
            setRecipient(b.recipient);
            setNotice(
              "Backupinställningarna har sparats. Nästa körning använder den nya adressen.",
            );
          } catch (e) {
            setError(e instanceof Error ? e.message : "Kunde inte spara.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={!ready || busy}>
          <label>
            Mottagaradress för backup
            <input
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
              maxLength={254}
              autoComplete="off"
            />
          </label>
          <label>
            Veckobackup
            <select
              value={enabled ? "on" : "off"}
              onChange={(e) => setEnabled(e.target.value === "on")}
            >
              <option value="on">Aktiverad</option>
              <option value="off">Avstängd</option>
            </select>
          </label>
          <button className="button primary">
            {busy ? "Sparar…" : "Spara backupinställningar"}
          </button>
        </fieldset>
      </form>
      {!ready && (
        <button className="button secondary" onClick={() => void load()}>
          Försök igen
        </button>
      )}
      <h3>Backup på kommando</h3>
      <p>
        Kör backup när du vill, även om veckobackup är avstängd eller redan har
        körts. Kopiorna sparas lokalt och kan hämtas här. Knappen skickar inget
        mejl; välj odlingsfilen om du vill bifoga den i Mail.
      </p>
      <button
        className="button primary"
        disabled={!ready || busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          setNotice("");
          try {
            const r = await fetch("/api/backup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "run" }),
            });
            const b = await r.json();
            if (!r.ok) throw Error(b.error);
            setRuns(b.runs);
            setNotice(
              "Backupen är klar och sparad lokalt. Använd Hämta fullständig backup eller Hämta odlingsfil nedan.",
            );
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Backupen kunde inte skapas.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Arbetar…" : "Kör backup nu"}
      </button>
      <h3>Senaste körningar</h3>
      {runs.length === 0 ? (
        <p>Ingen backup har körts ännu.</p>
      ) : (
        <ul>
          {runs.map((r) => (
            <li key={r.id}>
              {new Date(r.created).toLocaleString("sv-SE")} ·{" "}
              {r.mode === "manual" ? "Manuell backup" : r.recipient} ·{" "}
              {r.mode === "manual"
                ? "Sparad lokalt"
                : r.status === "sent"
                  ? "Överlämnad till Mail för sändning"
                  : r.status === "failed"
                    ? "Utskicket misslyckades"
                    : "Sparad lokalt; utskick inte bekräftat"}
              {r.message ? ` · ${r.message}` : ""}
              <div className="admin-toolbar">
                <a
                  className="button secondary"
                  href={`/api/backup/download?id=${encodeURIComponent(r.id)}&file=full`}
                >
                  Hämta fullständig backup
                </a>
                <a
                  className="button secondary"
                  href={`/api/backup/download?id=${encodeURIComponent(r.id)}&file=cultivation`}
                >
                  Hämta odlingsfil för mejl
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
