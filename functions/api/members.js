/* GET /api/members — 成员列表
   admin  → 返回全部注册用户（含访客），支持删除/角色管理
   member → 返回 admin + member（不暴露访客列表）
   visitor → 仅返回 admin + member（只读） */
import { ok, fail, getDB, DB_MISSING_MSG, sb, getUser } from "./_utils.js";

export async function onRequestGet({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);
  try {
    const user = await getUser(request, db);
    if (!user) return fail("请先登录", 401);

    let members;
    if (user.role === "admin") {
      // 主理人看全部用户，按角色权重排序
      members = await sb.all(db, "users", null, "role.asc,id.asc");
    } else {
      // 成员/访客只看公开的 admin + member
      const all = await sb.all(db, "users", null, "role.asc,id.asc");
      members = all.filter(function (m) { return m.role === "admin" || m.role === "member"; });
    }

    return ok({
      members: members.map(function (m) {
        return {
          id: m.id, username: m.username, display_name: m.display_name,
          role: m.role, job_title: m.job_title || "",
          birth_year: m.birth_year || null, created_at: m.created_at,
        };
      }),
      my_role: user.role,
    });
  } catch (err) {
    return fail("读取成员失败：" + (err.message || "未知错误"), 500);
  }
}
