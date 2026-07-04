/* GET /api/applications — 申请列表(仅 admin) */
import { ok, fail, getDB, DB_MISSING_MSG, sb, getUser } from "./_utils.js";

export async function onRequestGet({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);
  try {
    const user = await getUser(request, db);
    if (!user) return fail("请先登录", 401);
    if (user.role !== "admin") return fail("只有主理人可以查看入队申请", 403);

    const apps = await sb.all(db, "applications", null, "status.asc,id.desc");
    return ok({ applications: apps });
  } catch (err) {
    return fail("读取申请失败：" + (err.message || "未知错误"), 500);
  }
}
