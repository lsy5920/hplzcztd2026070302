/* ============================================================
   接口:POST /api/apply — 提交入队申请(无需登录,公开表单)
   对应手册附录 A「成员角色卡」
   ============================================================ */
import {
  ok, fail, getDB, DB_MISSING_MSG, TABLE_MISSING_MSG, isNoTableError,
  trimStr, readBody,
} from "./_utils.js";

export async function onRequestPost({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);

  const body = await readBody(request);
  if (!body) return fail("请求格式有误,请刷新页面后重试");

  const name = trimStr(body.name, 30);
  const contact = trimStr(body.contact, 60);
  const wish = trimStr(body.wish, 100);
  const onCamera = trimStr(body.on_camera, 20);
  const strengths = trimStr(body.strengths, 300);
  const weakness = trimStr(body.weakness, 300);
  const sundayLimit = trimStr(body.sunday_limit, 200);
  const goal = trimStr(body.goal, 300);
  const message = trimStr(body.message, 500);

  if (name.length < 1) return fail("称呼不能为空,让我们知道怎么叫你");
  if (contact.length < 3) return fail("联系方式太短了,通过审核后我们要找得到你");
  if (!wish) return fail("至少选一个你想尝试的方向");

  try {
    // 简单防刷:同一联系方式存在待审申请时不允许重复提交
    const dup = await db
      .prepare("SELECT id FROM applications WHERE contact = ? AND status = 'pending'")
      .bind(contact)
      .first();
    if (dup) return fail("这个联系方式已有一份待审核的申请,请耐心等待主理人查看");

    await db
      .prepare(
        "INSERT INTO applications (name, contact, wish, on_camera, strengths, weakness, sunday_limit, goal, message) " +
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(name, contact, wish, onCamera, strengths, weakness, sundayLimit, goal, message)
      .run();

    return ok({ message: "申请已送达片场" });
  } catch (err) {
    if (isNoTableError(err)) return fail(TABLE_MISSING_MSG, 503);
    return fail("提交失败:" + (err.message || "服务器开小差了"), 500);
  }
}
