"use client";
import { useEffect, useRef, useState } from "react";
import { prepareLocalImage } from "@/lib/local-image";
export function JournalImagesPicker({
  initialImages = [],
  onBusyChange,
}: {
  initialImages?: string[];
  onBusyChange?: (busy: boolean) => void;
}) {
  const [images, setImages] = useState(initialImages),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
      onBusyChange?.(false);
    },
    [onBusyChange],
  );
  return (
    <div className="image-picker">
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <label>
        Bilder till anteckningen (valfritt)
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy || images.length >= 6}
          onChange={async (event) => {
            const input = event.currentTarget,
              files = Array.from(input.files || []);
            input.value = "";
            if (!files.length) return;
            setError("");
            if (images.length + files.length > 6) {
              setError("Du kan spara högst 6 bilder per anteckning.");
              return;
            }
            const token = ++generation.current;
            setBusy(true);
            onBusyChange?.(true);
            try {
              const prepared: string[] = [];
              for (const file of files)
                prepared.push(await prepareLocalImage(file));
              if (token === generation.current)
                setImages((previous) => [...previous, ...prepared]);
            } catch (e) {
              if (token === generation.current)
                setError(
                  e instanceof Error ? e.message : "Bilderna kunde inte läsas.",
                );
            } finally {
              if (token === generation.current) {
                setBusy(false);
                onBusyChange?.(false);
              }
            }
          }}
        />
      </label>
      <p className="tiny">
        Högst 6 bilder. JPG, PNG eller WebP, högst 10 MB per bild. Bilderna
        anpassas och sparas lokalt tillsammans med anteckningen.
      </p>
      {busy && <p role="status">Förbereder bilderna…</p>}
      {error && <p role="alert">{error}</p>}
      <div className="journal-image-grid">
        {images.map((image, index) => (
          <figure key={index}>
            <img
              src={image}
              alt={`Förhandsvisning av dagboksbild ${index + 1}`}
            />
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              aria-label={`Ta bort dagboksbild ${index + 1}`}
              onClick={() => {
                setImages((previous) => previous.filter((_, i) => i !== index));
                setError("");
              }}
            >
              Ta bort bild {index + 1}
            </button>
          </figure>
        ))}
      </div>
    </div>
  );
}
export function JournalGallery({
  images,
  label,
}: {
  images: string[];
  label: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    [selected, setSelected] = useState(0);
  return (
    <>
      <div className="journal-image-grid">
        {images.map((image, index) => (
          <button
            key={index}
            type="button"
            className="journal-thumbnail"
            aria-label={`Visa dagboksbild ${index + 1} för ${label}`}
            onClick={() => {
              setSelected(index);
              dialog.current?.showModal();
            }}
          >
            <img src={image} alt={`Dagboksbild ${index + 1}`} loading="lazy" />
          </button>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="journal-photo-dialog"
        aria-label={`Bild från ${label}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <button
          autoFocus
          className="button secondary"
          onClick={() => dialog.current?.close()}
        >
          Stäng bild
        </button>
        <img
          src={images[selected]}
          alt={`Dagboksbild ${selected + 1} från ${label}`}
        />
        <p>
          Bild {selected + 1} av {images.length}
        </p>
      </dialog>
    </>
  );
}
export function JournalImagesEditor({
  images = [],
  disabled,
  onSave,
}: {
  images?: string[];
  disabled: boolean;
  onSave: (images: string[]) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  return (
    <details className="species-card-editor">
      <summary>Lägg till / ändra bilder</summary>
      <form
        key={revision}
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy || disabled) return;
          const form = event.currentTarget;
          setError("");
          const values = JSON.parse(
            String(new FormData(form).get("images") || "[]"),
          );
          if (await onSave(values)) {
            const details = form.closest("details");
            if (details) details.open = false;
            setRevision((value) => value + 1);
          } else setError("Bilderna kunde inte sparas. Försök igen.");
        }}
      >
        <fieldset disabled={disabled}>
          <JournalImagesPicker initialImages={images} onBusyChange={setBusy} />
          {error && <p role="alert">{error}</p>}
          <div className="admin-toolbar">
            <button
              type="submit"
              className="button primary"
              disabled={busy || disabled}
            >
              Spara dagboksbilder
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={disabled}
              onClick={(event) => {
                const details = event.currentTarget.closest("details");
                if (details) details.open = false;
                setError("");
                setRevision((value) => value + 1);
              }}
            >
              Avbryt
            </button>
          </div>
        </fieldset>
      </form>
    </details>
  );
}
