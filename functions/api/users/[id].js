/* DELETE /api/users/:id — 主理人彻底删除账号
   同时级联删除该用户的 sessions、ideas、角色卡申请（ON DELETE CASCADE 已在 schema 里配置）
   注意：主理人不能删除自己，也不能删除其他主理人 */
import { ok, fail, getDB, DB_MISSING_MSG, sb, getUser } from "../_utils.js";

export async function onRequestDelete({ request, env, params }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);

  const id = parseInt(params.id, 10);
  if (!id) return fail("用户编号无效");

  try {
    const me = await getUser(request, db);
    if (!me)             return fail("请先登录", 401);
    if (me.role !== "admin") return fail("只有主理人可以删除账号", 403);
    if (id === me.id)    return fail("不能删除自己的账号");

    const target = await sb.first(db, "users", { id });
    if (!target) return fail("找不到这个用户");
    if (target.role === "admin") return fail("不能删除另一位主理人的账号");

    // 按顺序删除关联数据（避免外键约束报错）
    await sb.delete(db, "sessions",     { user_id: id });
    await sb.delete(db, "ideas",        { user_id: id });
    await sb.delete(db, "applications", { user_id: id });
    await sb.delete(db, "users",        { id });

    return ok({ message: `「${target.display_name}」的账号已彻底删除` });
  } catch (err) {
    return fail("删除失败：" + (err.message || "未知错误"), 500);
  }
}
