/* POST /api/members/role — 调整用户角色(仅 admin) */
import { ok, fail, getDB, DB_MISSING_MSG, sb, getUser, readBody } from "../_utils.js";

export async function onRequestPost({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);

  const body = await readBody(request);
  const id   = parseInt(body && body.id, 10);
  const role = body && body.role;
  if (!id || (role !== "member" && role !== "visitor")) {
    return fail("参数不完整：只能把用户设为 member 或 visitor");
  }

  try {
    const user = await getUser(request, db);
    if (!user) return fail("请先登录", 401);
    if (user.role !== "admin") return fail("只有主理人可以调整角色", 403);
    if (id === user.id) return fail("不能修改自己的主理人身份");

    const target = await sb.first(db, "users", { id });
    if (!target) return fail("找不到这个用户");
    if (target.role === "admin") return fail("不能修改另一位主理人的身份");

    await sb.update(db, "users", { id }, { role });
    return ok({
      message: role === "member"
        ? `已把「${target.display_name}」提升为团队成员`
        : `已把「${target.display_name}」调整为访客`,
    });
  } catch (err) {
    return fail("调整失败：" + (err.message || "未知错误"), 500);
  }
}
