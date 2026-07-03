/* ============================================================
   接口:POST /api/members/role — 调整用户角色(仅主理人)
   请求体:{ id: 用户编号, role: "member" / "visitor" }
   说明:主理人(admin)身份不可转让、不可撤销自己,避免团队失去管理员
   ============================================================ */
import {
  ok, fail, getDB, DB_MISSING_MSG, TABLE_MISSING_MSG, isNoTableError,
  getUser, readBody,
} from "../_utils.js";

export async function onRequestPost({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);

  const body = await readBody(request);
  if (!body) return fail("请求格式有误");

  const id = parseInt(body.id, 10);
  const role = body.role;
  if (!id || (role !== "member" && role !== "visitor")) {
    return fail("参数不完整:只能把用户设为 member(成员)或 visitor(访客)");
  }

  try {
    const user = await getUser(request, db);
    if (!user) return fail("请先登录", 401);
    if (user.role !== "admin") return fail("只有主理人可以调整角色", 403);
    if (id === user.id) return fail("不能修改自己的主理人身份");

    const target = await db
      .prepare("SELECT id, role, display_name FROM users WHERE id = ?")
      .bind(id)
      .first();
    if (!target) return fail("找不到这个用户");
    if (target.role === "admin") return fail("不能修改另一位主理人的身份");

    await db.prepare("UPDATE users SET role = ? WHERE id = ?").bind(role, id).run();

    return ok({
      message:
        role === "member"
          ? "已把「" + target.display_name + "」提升为团队成员"
          : "已把「" + target.display_name + "」调整为访客",
    });
  } catch (err) {
    if (isNoTableError(err)) return fail(TABLE_MISSING_MSG, 503);
    return fail("调整失败:" + (err.message || "未知错误"), 500);
  }
}
