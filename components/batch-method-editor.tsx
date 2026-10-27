"use client";
import { useEffect, useState } from "react";

export function BatchMethodEditor({
  name,
  value,
  disabled,
  onSave,
}: {
  name: string;
  value: string;
  disabled: boolean;
  onSave: (value: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <form
      className="batch-method-editor"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSave(draft.trim());
      }}
    >
      <label>
        Odlingsform / behållare
        <input
          aria-label={"Odlingsform för " + name}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          list="growing-methods"
          maxLength={80}
          placeholder="Ej angiven – välj eller skriv"
          disabled={disabled}
        />
      </label>
      <button
        className="button secondary"
        type="submit"
        disabled={disabled || draft.trim() === value}
        aria-label={"Spara odlingsform för " + name}
      >
        Spara
      </button>
    </form>
  );
}
