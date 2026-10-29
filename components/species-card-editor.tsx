"use client";
import { useState } from "react";
import type { CustomSpecies } from "@/lib/data";
import { SpeciesLabelFields } from "./species-label-fields";
import { SpeciesImagePicker } from "./species-image-picker";
export function SpeciesCardEditor({
  species,
  disabled,
  onSave,
}: {
  species: CustomSpecies;
  disabled: boolean;
  onSave: (record: CustomSpecies) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  return (
    <details className="species-card-editor">
      <summary>Redigera kort</summary>
      <form
        key={revision}
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy || disabled) return;
          const form = e.currentTarget;
          const fields = new FormData(form);
          const text = (key: string) => String(fields.get(key) || "").trim();
          setError("");
          const success = await onSave({
            ...species,
            name: text("name"),
            latin: text("latin"),
            description: text("description"),
            guide: text("guide"),
            url: text("url"),
            image: text("image"),
            badgeText: text("badgeText"),
            photoCaption: text("photoCaption"),
          });
          if (success) {
            const details = form.closest("details");
            if (details) details.open = false;
            setRevision((value) => value + 1);
          } else
            setError(
              "Kortet kunde inte sparas. Kontrollera meddelandet ovan och försök igen.",
            );
        }}
      >
        <fieldset disabled={disabled}>
          <label>
            Svampnamn
            <input
              name="name"
              defaultValue={species.name}
              required
              maxLength={120}
            />
          </label>
          <label>
            Vetenskapligt namn (valfritt)
            <input name="latin" defaultValue={species.latin} maxLength={160} />
          </label>
          <label>
            Beskrivning (valfritt)
            <textarea
              name="description"
              defaultValue={species.description}
              rows={3}
              maxLength={1000}
            />
          </label>
          <label>
            Odlingsråd (valfritt)
            <textarea
              name="guide"
              defaultValue={species.guide}
              rows={5}
              maxLength={4000}
            />
          </label>
          <label>
            Länk till odlingsguide (valfritt)
            <input
              name="url"
              type="url"
              defaultValue={species.url}
              maxLength={2048}
              placeholder="https://…"
            />
          </label>
          <p className="tiny">
            Lämna länken tom om du vill lägga till den senare. En sparad länk
            visas som Läs odlingsguiden på kortet.
          </p>
          <SpeciesImagePicker
            initialImage={species.image}
            onBusyChange={setBusy}
          />
          <SpeciesLabelFields
            badgeText={species.badgeText}
            photoCaption={species.photoCaption}
          />
          {error && <p role="alert">{error}</p>}
          <div className="admin-toolbar">
            <button
              type="submit"
              className="button primary"
              disabled={busy || disabled}
            >
              Spara kort
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
