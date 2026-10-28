"use client";
import { useState } from "react";
import { SpeciesLabelFields } from "./species-label-fields";
import { SpeciesImagePicker } from "./species-image-picker";
export function SpeciesImageEditor({
  image = "",
  badgeText,
  photoCaption,
  disabled,
  onSave,
}: {
  image?: string;
  badgeText?: string;
  photoCaption?: string;
  disabled: boolean;
  onSave: (
    image: string,
    labels: { badgeText: string; photoCaption: string },
  ) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <details className="species-image-editor">
      <summary>Ändra bild och texter</summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy || disabled) return;
          const form = e.currentTarget;
          const value = String(new FormData(form).get("image") || "");
          setError("");
          if (
            await onSave(value, {
              badgeText: String(new FormData(form).get("badgeText") || ""),
              photoCaption: String(
                new FormData(form).get("photoCaption") || "",
              ),
            })
          ) {
            const details = form.closest("details");
            if (details) details.open = false;
          } else
            setError(
              "Bilden och texterna kunde inte sparas. Kontrollera meddelandet ovan och försök igen.",
            );
        }}
      >
        <fieldset disabled={disabled}>
          <SpeciesImagePicker initialImage={image} onBusyChange={setBusy} />
          <SpeciesLabelFields
            badgeText={badgeText}
            photoCaption={photoCaption}
          />
          {error && <p role="alert">{error}</p>}
          <button
            type="submit"
            className="button primary"
            disabled={busy || disabled}
          >
            Spara bild och texter
          </button>
        </fieldset>
      </form>
    </details>
  );
}
