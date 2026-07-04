/* GET /api/applications/mine — 当前用户的申请记录 */
import { ok, fail, getDB, DB_MISSING_MSG, sb, getUser } from "../_utils.js";

export async function onRequestGet({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);
  try {
    const user = await getUser(request, db);
    if (!user) return fail("请先登录", 401);
    const apps = await sb.all(db, "applications", { user_id: user.id }, "id.desc");
    return ok({ applications: apps });
  } catch (err) {
    return fail("查询失败：" + (err.message || "未知错误"), 500);
  }
}
