/* GET  /api/members/:id — 查看任意成员名片(需登录)
   PATCH /api/members/:id — 修改成员资料
     · 本人可改自己的 display_name / job_title / email
     · 主理人可改任何人的 display_name / job_title */
import { ok, fail, getDB, DB_MISSING_MSG, sb, getUser, readBody, trimStr } from "../_utils.js";

export async function onRequestGet({ request, env, params }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);
  const id = parseInt(params.id, 10);
  if (!id) return fail("用户编号无效");
  try {
    const me = await getUser(request, db);
    if (!me) return fail("请先登录", 401);
    const row = await sb.first(db, "users", { id });
    if (!row) return fail("找不到这个用户");
    const isMe = row.id === me.id;
    const isAdmin = me.role === "admin";
    return ok({
      member: {
        id: row.id,
        username: row.username,
        display_name: row.display_name,
        role: row.role,
        job_title: row.job_title || "",
        email: (isMe || isAdmin) ? (row.email || "") : "", // 只有本人或主理人看到邮箱
        created_at: row.created_at,
        can_edit: isMe || isAdmin,
      },
    });
  } catch (err) {
    return fail("查询失败：" + (err.message || "未知错误"), 500);
  }
}

export async function onRequestPatch({ request, env, params }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);
  const id = parseInt(params.id, 10);
  if (!id) return fail("用户编号无效");

  const body = await readBody(request);
  if (!body) return fail("请求格式有误");

  try {
    const me = await getUser(request, db);
    if (!me) return fail("请先登录", 401);

    const target = await sb.first(db, "users", { id });
    if (!target) return fail("找不到这个用户");

    const isMe = target.id === me.id;
    const isAdmin = me.role === "admin";
    if (!isMe && !isAdmin) return fail("只能修改自己的名片，或由主理人代为修改", 403);

    const updates = {};
    if (body.display_name !== undefined) updates.display_name = trimStr(body.display_name, 20);
    /* 职位只有主理人可以修改，本人也无权自行设置 */
    if (body.job_title !== undefined) {
      if (!isAdmin) return fail("职位身份只有主理人可以设置", 403);
      updates.job_title = trimStr(body.job_title, 40);
    }
    if (body.email !== undefined && isMe) updates.email = trimStr(body.email, 120);
    if (!Object.keys(updates).length)   return fail("没有需要更新的内容");

    await sb.update(db, "users", { id }, updates);
    return ok({ message: "名片已保存" });
  } catch (err) {
    return fail("保存失败：" + (err.message || "未知错误"), 500);
  }
}
