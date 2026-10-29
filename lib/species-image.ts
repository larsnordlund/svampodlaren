import { InputError } from "./input-error.ts";
export const MAX_SPECIES_IMAGE_BYTES = 1024 * 1024;
// The file picker decodes and redraws photos as JPEG, removing original metadata.
// Validate the stored format and dimensions independently of the browser.
export function validateSpeciesImage(value: unknown): string {
  if (value === undefined || value === "") return "";
  if (
    typeof value !== "string" ||
    value.length > 1400000 ||
    !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
  )
    throw new InputError("Välj en giltig bild med Välj bild.");
  const encoded = value.slice(23),
    bytes = Buffer.from(encoded, "base64");
  if (
    bytes.length > MAX_SPECIES_IMAGE_BYTES ||
    bytes.toString("base64") !== encoded ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8 ||
    bytes[bytes.length - 2] !== 0xff ||
    bytes[bytes.length - 1] !== 0xd9
  )
    throw new InputError("Bilden är ogiltig eller större än 1 MB.");
  let offset = 2,
    valid = false;
  while (offset + 3 < bytes.length) {
    if (bytes[offset++] !== 0xff) break;
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xda || marker === 0xd9) break;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) break;
    if ([0xc0, 0xc1, 0xc2].includes(marker) && length >= 8) {
      const height = bytes.readUInt16BE(offset + 3),
        width = bytes.readUInt16BE(offset + 5);
      valid = width > 0 && height > 0 && width <= 1600 && height <= 1600;
      break;
    }
    offset += length;
  }
  if (!valid)
    throw new InputError(
      "Bilden kunde inte läsas. Välj en annan JPG-, PNG- eller WebP-bild.",
    );
  return value;
}

export function validateJournalImages(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 6)
    throw new InputError("Välj högst 6 bilder per dagboksanteckning.");
  return value.map((image) => {
    if (typeof image !== "string" || !image)
      throw new InputError("En dagboksbild är ogiltig.");
    return validateSpeciesImage(image);
  });
}
