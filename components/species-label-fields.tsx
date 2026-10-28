export function SpeciesLabelFields({
  badgeText = "Egen svamp",
  photoCaption = "Egen bild",
}: {
  badgeText?: string;
  photoCaption?: string;
}) {
  return (
    <div className="image-picker">
      <label>
        Etikett på svampkortet
        <input
          name="badgeText"
          defaultValue={badgeText}
          maxLength={60}
          placeholder="Till exempel: Min odling"
        />
      </label>
      <label>
        Bildtext / fotograf
        <input
          name="photoCaption"
          defaultValue={photoCaption}
          maxLength={160}
          placeholder="Till exempel: Foto: Lars"
        />
      </label>
      <p className="tiny">
        Lämna ett fält tomt för att dölja den texten. Bildtexten visas för
        uppladdade bilder.
      </p>
    </div>
  );
}
