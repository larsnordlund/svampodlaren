import { getDatabase } from "@/lib/database";
import { ownedData, ownedMutation, requireUser } from "@/lib/accounts";
import { InputError } from "@/lib/validation";
import { allowedLocalRequest } from "@/lib/local-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
function failure(error: unknown) {
  if (error instanceof InputError)
    return Response.json(
      { error: error.message },
      { status: error.status, headers },
    );
  console.error("SQLite-operation misslyckades:", error);
  return Response.json(
    {
      error:
        "Databasen kunde inte läsas eller sparas. Kontrollera att datamappen är skrivbar och försök igen.",
    },
    { status: 500, headers },
  );
}
export function GET(request: Request) {
  if (!allowedLocalRequest(request))
    return Response.json(
      { error: "Adressen är inte tillåten för appen." },
      { status: 403, headers },
    );
  try {
    return Response.json(
      ownedData(getDatabase(), requireUser(getDatabase(), request)),
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  if (!allowedLocalRequest(request, true))
    return Response.json(
      { error: "Begäran måste komma från en tillåten adress för appen." },
      { status: 403, headers },
    );
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({ error: "JSON krävs." }, { status: 415, headers });
  const body = await request.text();
  if (body.length > 8500000)
    return Response.json(
      { error: "Posten är för stor." },
      { status: 413, headers },
    );
  let input: unknown;
  try {
    input = JSON.parse(body);
  } catch {
    return Response.json({ error: "Ogiltig JSON." }, { status: 400, headers });
  }
  try {
    const db = getDatabase();
    const user = requireUser(db, request);
    ownedMutation(db, user, input);
    return Response.json(ownedData(db, user), { headers });
  } catch (error) {
    return failure(error);
  }
}
