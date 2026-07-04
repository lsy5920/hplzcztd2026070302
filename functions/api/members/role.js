/* POST /api/members/role — 调整角色或设置职位(仅 admin)
   action = "role"      → 调整 member / visitor
   action = "job_title" → 设置成员职位(也可给自己设) */
import { ok, fail, getDB, DB_MISSING_MSG, sb, getUser, readBody, trimStr } from "../_utils.js";

export async function onRequestPost({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);

  const body   = await readBody(request);
  const id     = parseInt(body && body.id, 10);
  const action = (body && body.action) || "role";

  if (!id) return fail("参数不完整：需要用户编号");

  try {
    const me = await getUser(request, db);
    if (!me) return fail("请先登录", 401);
    if (me.role !== "admin") return fail("只有主理人可以执行此操作", 403);

    const target = await sb.first(db, "users", { id });
    if (!target) return fail("找不到这个用户");

    /* 设置职位(主理人可为任何成员和自己设) */
    if (action === "job_title") {
      const jobTitle = trimStr(body.job_title || "", 40);
      await sb.update(db, "users", { id }, { job_title: jobTitle });
      return ok({ message: `「${target.display_name}」的职位已更新` });
    }

    /* 调整角色(不能动其他 admin 或自己的 admin 身份) */
    const role = body.role;
    if (role !== "member" && role !== "visitor") return fail("只能把用户设为 member 或 visitor");
    if (id === me.id) return fail("不能修改自己的主理人身份");
    if (target.role === "admin") return fail("不能修改另一位主理人的身份");

    await sb.update(db, "users", { id }, { role });
    return ok({
      message: role === "member"
        ? `已把「${target.display_name}」提升为团队成员`
        : `已把「${target.display_name}」调整为访客`,
    });
  } catch (err) {
    return fail("操作失败：" + (err.message || "未知错误"), 500);
  }
}
