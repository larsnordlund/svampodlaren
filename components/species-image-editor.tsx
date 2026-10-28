"use client";
import { useState } from "react";
import { SpeciesImagePicker } from "./species-image-picker";
export function SpeciesImageEditor({
  image = "",
  disabled,
  onSave,
}: {
  image?: string;
  disabled: boolean;
  onSave: (image: string) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <details className="species-image-editor">
      <summary>Ändra bild</summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy || disabled) return;
          const form = e.currentTarget;
          const value = String(new FormData(form).get("image") || "");
          setError("");
          if (await onSave(value)) {
            const details = form.closest("details");
            if (details) details.open = false;
          } else
            setError(
              "Bilden kunde inte sparas. Kontrollera meddelandet ovan och försök igen.",
            );
        }}
      >
        <fieldset disabled={disabled}>
          <SpeciesImagePicker initialImage={image} onBusyChange={setBusy} />
          {error && <p role="alert">{error}</p>}
          <button
            type="submit"
            className="button primary"
            disabled={busy || disabled}
          >
            Spara bild
          </button>
        </fieldset>
      </form>
    </details>
  );
}
