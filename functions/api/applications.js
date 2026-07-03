/* ============================================================
   接口:GET /api/applications — 入队申请列表(仅主理人可看)
   ============================================================ */
import {
  ok, fail, getDB, DB_MISSING_MSG, TABLE_MISSING_MSG, isNoTableError, getUser,
} from "./_utils.js";

export async function onRequestGet({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);

  try {
    const user = await getUser(request, db);
    if (!user) return fail("请先登录", 401);
    if (user.role !== "admin") return fail("只有主理人可以查看入队申请", 403);

    const { results } = await db
      .prepare(
        "SELECT id, name, contact, wish, on_camera, strengths, weakness, sunday_limit, goal, message, status, created_at " +
          "FROM applications ORDER BY (status = 'pending') DESC, id DESC LIMIT 200"
      )
      .all();

    return ok({ applications: results || [] });
  } catch (err) {
    if (isNoTableError(err)) return fail(TABLE_MISSING_MSG, 503);
    return fail("读取申请失败:" + (err.message || "未知错误"), 500);
  }
}
