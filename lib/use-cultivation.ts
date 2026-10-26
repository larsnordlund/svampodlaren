"use client";
import { useEffect, useRef, useState } from "react";
import type { Data } from "./data";
import type { Mutation } from "./validation";

const emptyData: Data = {
  customSpecies: [],
  projects: [],
  batches: [],
  entries: [],
  harvests: [],
};
async function responseData(response: Response): Promise<Data> {
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error || "Den lokala databasen kunde inte nås.");
  return body as Data;
}
export function useCultivation() {
  const [data, setData] = useState<Data>(emptyData);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const busy = useRef(false);
  useEffect(() => {
    const abort = new AbortController();
    setError("");
    setReady(false);
    fetch("/api/data", { cache: "no-store", signal: abort.signal })
      .then(responseData)
      .then((result) => {
        if (!abort.signal.aborted) {
          setData(result);
          setReady(true);
        }
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setError(
            "Den lokala databasen kunde inte laddas. Kontrollera att appen är startad och försök igen.",
          );
      });
    return () => abort.abort();
  }, [reload]);
  async function save(mutation: Mutation) {
    if (busy.current || !ready) return false;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      const result = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mutation),
      }).then(responseData);
      setData(result);
      return true;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Kunde inte spara. Försök igen.",
      );
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return {
    data,
    ready,
    saving,
    error,
    save,
    retry: () => setReload((value) => value + 1),
  };
}
