/* GET /api/members — 成员列表(需登录) */
import { ok, fail, getDB, DB_MISSING_MSG, sb, getUser } from "./_utils.js";

export async function onRequestGet({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);
  try {
    const user = await getUser(request, db);
    if (!user) return fail("请先登录", 401);

    let members;
    if (user.role === "admin") {
      members = await sb.all(db, "users", null, "role.asc,id.asc");
    } else {
      // 非主理人只看 admin 和 member
      const all = await sb.all(db, "users", null, "role.asc,id.asc");
      members = all.filter(m => m.role === "admin" || m.role === "member");
    }
    return ok({
      members: members.map(m => ({
        id: m.id, username: m.username, display_name: m.display_name,
        role: m.role, created_at: m.created_at,
      })),
      my_role: user.role,
    });
  } catch (err) {
    return fail("读取成员失败：" + (err.message || "未知错误"), 500);
  }
}
