/* ============================================================
   接口:GET /api/me — 查询当前登录用户
   未登录时返回 user: null(不视为错误)
   ============================================================ */
import { ok, fail, getDB, DB_MISSING_MSG, isNoTableError, getUser } from "./_utils.js";

export async function onRequestGet({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);

  try {
    const user = await getUser(request, db);
    if (!user) return ok({ user: null });
    return ok({
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
      },
    });
  } catch (err) {
    if (isNoTableError(err)) return ok({ user: null }); // 未建表时静默视为未登录
    return fail("查询登录状态失败:" + (err.message || "未知错误"), 500);
  }
}
