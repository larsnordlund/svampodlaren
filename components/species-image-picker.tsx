"use client";
import { prepareLocalImage } from "@/lib/local-image";
import { useEffect, useRef, useState } from "react";
export function SpeciesImagePicker({
  initialImage = "",
  onBusyChange,
}: {
  initialImage?: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [image, setImage] = useState(initialImage),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null),
    generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
      onBusyChange?.(false);
    },
    [onBusyChange],
  );
  return (
    <div className="image-picker">
      <input type="hidden" name="image" value={image} />
      <label>
        Bild (valfritt)
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const token = ++generation.current;
            setError("");
            setBusy(true);
            onBusyChange?.(true);
            try {
              const result = await prepareLocalImage(file);
              if (token === generation.current) setImage(result);
            } catch (e) {
              if (token === generation.current)
                setError(
                  e instanceof Error ? e.message : "Bilden kunde inte läsas.",
                );
            } finally {
              if (input.current) input.current.value = "";
              if (token === generation.current) {
                setBusy(false);
                onBusyChange?.(false);
              }
            }
          }}
        />
      </label>
      <p className="tiny">
        JPG, PNG eller WebP, högst 10 MB. Bilden anpassas och sparas lokalt när
        du sparar svampen.
      </p>
      {busy && <p role="status">Förbereder bilden…</p>}
      {error && <p role="alert">{error}</p>}
      {image && (
        <>
          <img
            src={image}
            alt="Förhandsvisning av vald svampbild"
            className="image-picker-preview"
          />
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => {
              setImage("");
              setError("");
            }}
          >
            Ta bort bild
          </button>
        </>
      )}
    </div>
  );
}
