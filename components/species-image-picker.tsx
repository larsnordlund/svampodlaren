"use client";
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
            let bitmap: ImageBitmap | undefined;
            try {
              if (
                !["image/jpeg", "image/png", "image/webp"].includes(file.type)
              )
                throw Error("Välj en JPG-, PNG- eller WebP-bild.");
              if (file.size > 10 * 1024 * 1024)
                throw Error("Bilden får vara högst 10 MB.");
              bitmap = await createImageBitmap(file, {
                imageOrientation: "from-image",
              });
              if (!bitmap.width || !bitmap.height)
                throw Error("Bilden kunde inte läsas.");
              const scale = Math.min(
                1,
                1440 / Math.max(bitmap.width, bitmap.height),
              );
              const canvas = document.createElement("canvas");
              canvas.width = Math.max(1, Math.round(bitmap.width * scale));
              canvas.height = Math.max(1, Math.round(bitmap.height * scale));
              const ctx = canvas.getContext("2d");
              if (!ctx) throw Error("Webbläsaren kunde inte behandla bilden.");
              ctx.fillStyle = "#eeeadf";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
              let result = canvas.toDataURL("image/jpeg", 0.82);
              if (result.length > 1398100)
                result = canvas.toDataURL("image/jpeg", 0.65);
              if (result.length > 1398100)
                throw Error(
                  "Bilden är för stor efter komprimering. Välj en mindre bild.",
                );
              if (token === generation.current) setImage(result);
            } catch (e) {
              if (token === generation.current)
                setError(
                  e instanceof Error ? e.message : "Bilden kunde inte läsas.",
                );
            } finally {
              bitmap?.close();
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
