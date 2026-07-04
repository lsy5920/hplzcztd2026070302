/* POST /api/apply — 提交入队申请(无需登录) */
import { ok, fail, getDB, DB_MISSING_MSG, sb, trimStr, readBody } from "./_utils.js";

export async function onRequestPost({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);

  const body = await readBody(request);
  if (!body) return fail("请求格式有误，请刷新页面后重试");

  const name    = trimStr(body.name, 30);
  const contact = trimStr(body.contact, 60);
  const wish    = trimStr(body.wish, 100);

  if (name.length < 1)    return fail("称呼不能为空，让我们知道怎么叫你");
  if (contact.length < 3) return fail("联系方式太短了，通过审核后我们要找得到你");
  if (!wish)              return fail("至少选一个你想尝试的方向");

  try {
    // 防重复提交：同联系方式+pending 只允许一份
    const dup = await sb.first(db, "applications", { contact, status: "pending" });
    if (dup) return fail("这个联系方式已有一份待审核的申请，请耐心等待主理人查看");

    await sb.insert(db, "applications", {
      name, contact, wish,
      on_camera:    trimStr(body.on_camera, 20),
      strengths:    trimStr(body.strengths, 300),
      weakness:     trimStr(body.weakness, 300),
      sunday_limit: trimStr(body.sunday_limit, 200),
      goal:         trimStr(body.goal, 300),
      message:      trimStr(body.message, 500),
    });
    return ok({ message: "申请已送达片场" });
  } catch (err) {
    return fail("提交失败：" + (err.message || "服务器开小差了"), 500);
  }
}
