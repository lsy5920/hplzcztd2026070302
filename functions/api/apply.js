/* POST /api/apply — 提交入队申请(需要登录) */
import { ok, fail, getDB, DB_MISSING_MSG, sb, getUser, trimStr, readBody } from "./_utils.js";

export async function onRequestPost({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);

  const body = await readBody(request);
  if (!body) return fail("请求格式有误，请刷新页面后重试");

  const name    = trimStr(body.name, 30);
  const contact = trimStr(body.contact, 60);
  const wish    = trimStr(body.wish, 100);

  if (name.length < 1)    return fail("称呼不能为空");
  if (contact.length < 3) return fail("联系方式太短了，通过审核后我们要找得到你");
  if (!wish)              return fail("至少选一个你想尝试的方向");

  try {
    const user = await getUser(request, db);
    if (!user) return fail("请先登录再提交申请", 401);

    // 同一用户：pending 状态只允许一份
    const pending = await sb.first(db, "applications", { user_id: user.id, status: "pending" });
    if (pending) return fail("你有一份申请正在审核中，请耐心等待");

    // 被驳回后可以重新提交(旧的rejected保留，新建一份)
    await sb.insert(db, "applications", {
      user_id:      user.id,
      name, contact, wish,
      on_camera:    trimStr(body.on_camera, 20),
      strengths:    trimStr(body.strengths, 300),
      weakness:     trimStr(body.weakness, 300),
      sunday_limit: trimStr(body.sunday_limit, 200),
      goal:         trimStr(body.goal, 300),
      message:      trimStr(body.message, 500),
    });
    return ok({ message: "申请已送达片场，请留意邮件通知" });
  } catch (err) {
    return fail("提交失败：" + (err.message || "服务器开小差了"), 500);
  }
}
