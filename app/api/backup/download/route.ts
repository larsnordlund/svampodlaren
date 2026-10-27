import { readFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { getDatabase } from "@/lib/database";
import { requireUser } from "@/lib/accounts";
import { backupDirectory } from "@/lib/backup";
import { allowedLocalRequest } from "@/lib/local-request";
import { InputError } from "@/lib/validation";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
export async function GET(request: Request) {
  try {
    if (!allowedLocalRequest(request))
      throw new InputError("Endast lokala anrop tillåts.", 403);
    const db = getDatabase();
    if (requireUser(db, request).role !== "admin")
      throw new InputError("Administratör krävs.", 403);
    const url = new URL(request.url),
      id = url.searchParams.get("id"),
      file = url.searchParams.get("file");
    if (!id || !["full", "cultivation"].includes(file || ""))
      throw new InputError("Välj en giltig backupfil.");
    const row = db
      .prepare("SELECT filename FROM backup_runs WHERE id=?")
      .get(id);
    if (!row) throw new InputError("Backupen finns inte.", 404);
    let filename = String(row.filename);
    if (
      !/^svampodlaren-[a-zA-Z0-9-]+\.sqlite\.gz$/.test(filename) ||
      basename(filename) !== filename
    )
      throw new InputError("Ogiltig backupfil.");
    if (file === "cultivation")
      filename = filename.replace(".sqlite.gz", "-odlingar.sqlite.gz");
    let bytes;
    try {
      bytes = await readFile(join(backupDirectory(), filename));
    } catch {
      throw new InputError("Filen finns inte längre på datorn.", 404);
    }
    return new Response(bytes, {
      headers: {
        ...headers,
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof InputError
            ? e.message
            : "Backupfilen kunde inte hämtas.",
      },
      { status: e instanceof InputError ? e.status : 500, headers },
    );
  }
}
