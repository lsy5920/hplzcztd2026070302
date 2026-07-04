/* POST /api/logout */
import { getDB, readSessionToken, sb } from "./_utils.js";

export async function onRequestPost({ request, env }) {
  const db = getDB(env);
  const token = readSessionToken(request);
  if (db && token) {
    try { await sb.delete(db, "sessions", { token }); } catch (_) {}
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Set-Cookie": "hplz_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    },
  });
}
