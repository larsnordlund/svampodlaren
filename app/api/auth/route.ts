import { getDatabase } from "@/lib/database";
import {
  createUser,
  updateUser,
  deleteUser,
  currentUser,
  users,
  login,
  newSession,
  logout,
  requireUser,
} from "@/lib/accounts";
import { InputError } from "@/lib/validation";
import { allowedLocalRequest, secureRequest } from "@/lib/local-request";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export function GET(request: Request) {
  if (!allowedLocalRequest(request))
    return Response.json(
      { error: "Adressen är inte tillåten för appen." },
      { status: 403, headers },
    );
  const db = getDatabase(),
    user = currentUser(db, request);
  return Response.json(
    {
      user,
      setupRequired: users(db).length === 0,
      users: user?.role === "admin" ? users(db) : [],
      owners:
        user?.role === "admin"
          ? db.prepare("SELECT recordId,userId FROM record_owners").all()
          : [],
    },
    { headers },
  );
}
export async function POST(request: Request) {
  if (!allowedLocalRequest(request, true))
    return Response.json(
      { error: "Begäran måste komma från en tillåten adress för appen." },
      { status: 403, headers },
    );
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new InputError("JSON krävs.", 415);
    const raw = await request.text();
    if (raw.length > 4000) throw new InputError("För stor begäran.", 413);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new InputError("Ogiltig JSON.");
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new InputError("Ogiltig begäran.");
    const db = getDatabase();
    if (body.action === "logout") {
      logout(db, request);
      return Response.json(
        { ok: true },
        {
          headers: {
            ...headers,
            "Set-Cookie": `svamp_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secureRequest(request) ? "; Secure" : ""}`,
          },
        },
      );
    }
    if (body.action === "update-user" || body.action === "delete-user") {
      const actor = requireUser(db, request);
      if (body.action === "update-user") updateUser(db, actor, body);
      else deleteUser(db, actor, body);
      return Response.json({ users: users(db) }, { headers });
    }
    if (body.action === "create-user") {
      if (requireUser(db, request).role !== "admin")
        throw new InputError("Administratör krävs.", 403);
      createUser(db, body);
      return Response.json({ users: users(db) }, { headers });
    }
    if (!["setup", "login"].includes(body.action))
      throw new InputError("Okänd åtgärd.");
    const user =
      body.action === "setup" ? createUser(db, body, true) : login(db, body);
    const token = newSession(db, user);
    return Response.json(
      { user },
      {
        headers: {
          ...headers,
          "Set-Cookie": `svamp_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${secureRequest(request) ? "; Secure" : ""}`,
        },
      },
    );
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof InputError
            ? e.message
            : "Kontot kunde inte sparas. Försök igen.",
      },
      { status: e instanceof InputError ? e.status : 500, headers },
    );
  }
}
