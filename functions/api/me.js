/* GET /api/me */
import { ok, fail, getDB, DB_MISSING_MSG, getUser } from "./_utils.js";

export async function onRequestGet({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);
  try {
    const user = await getUser(request, db);
    if (!user) return ok({ user: null });
    return ok({ user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role } });
  } catch (err) {
    return ok({ user: null }); // 未登录或出错时静默降级
  }
}
