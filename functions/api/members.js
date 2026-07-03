/* ============================================================
   接口:GET /api/members — 已注册用户列表(登录后可看)
   访客只能看到成员与主理人;主理人能看到全部注册用户
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

    let sql =
      "SELECT id, username, display_name, role, created_at FROM users ";
    if (user.role !== "admin") {
      // 非主理人只看团队成员,不暴露全部注册访客
      sql += "WHERE role IN ('admin', 'member') ";
    }
    sql += "ORDER BY CASE role WHEN 'admin' THEN 0 WHEN 'member' THEN 1 ELSE 2 END, id ASC LIMIT 200";

    const { results } = await db.prepare(sql).all();
    return ok({ members: results || [], my_role: user.role });
  } catch (err) {
    if (isNoTableError(err)) return fail(TABLE_MISSING_MSG, 503);
    return fail("读取成员失败:" + (err.message || "未知错误"), 500);
  }
}
