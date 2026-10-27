import { getDatabase } from "@/lib/database";
import { requireUser } from "@/lib/accounts";
import {
  backupSettings,
  saveBackupSettings,
  prepareBackup,
  backupDirectory,
} from "@/lib/backup";
import { allowedLocalRequest } from "@/lib/local-request";
import { InputError } from "@/lib/validation";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
function authorize(request: Request, mutation = false) {
  if (!allowedLocalRequest(request, mutation))
    throw new InputError("Begäran måste komma från den lokala appen.", 403);
  const db = getDatabase();
  if (requireUser(db, request).role !== "admin")
    throw new InputError("Administratör krävs.", 403);
  return db;
}
function failure(e: unknown) {
  return Response.json(
    {
      error:
        e instanceof InputError
          ? e.message
          : "Backupinställningarna kunde inte läsas eller sparas.",
    },
    { status: e instanceof InputError ? e.status : 500, headers },
  );
}
export function GET(request: Request) {
  try {
    return Response.json(backupSettings(authorize(request)), { headers });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const db = authorize(request, true);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new InputError("JSON krävs.", 415);
    const raw = await request.text();
    if (raw.length > 2000) throw new InputError("För stor begäran.", 413);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new InputError("Ogiltig JSON.");
    }
    if (body && body.action === "run") {
      const result = await prepareBackup(db, backupDirectory(), {
        manual: true,
      });
      if ("id" in result)
        return Response.json(
          { ...backupSettings(db), created: result.id },
          { headers },
        );
      throw new InputError("Backupen kunde inte startas.", 409);
    }
    return Response.json(saveBackupSettings(db, body), { headers });
  } catch (e) {
    return failure(e);
  }
}
