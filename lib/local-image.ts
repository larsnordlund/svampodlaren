// Decode, resize and redraw locally; no photo is sent to an external service.
export async function prepareLocalImage(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error("Välj en JPG-, PNG- eller WebP-bild.");
  if (file.size > 10 * 1024 * 1024) throw Error("Bilden får vara högst 10 MB.");
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    if (!bitmap.width || !bitmap.height)
      throw Error("Bilden kunde inte läsas.");
    const scale = Math.min(1, 1440 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Webbläsaren kunde inte behandla bilden.");
    ctx.fillStyle = "#eeeadf";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let result = canvas.toDataURL("image/jpeg", 0.82);
    if (result.length > 1398100) result = canvas.toDataURL("image/jpeg", 0.65);
    if (result.length > 1398100)
      throw Error(
        "Bilden är för stor efter komprimering. Välj en mindre bild.",
      );
    return result;
  } finally {
    bitmap.close();
  }
}
