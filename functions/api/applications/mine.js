/* GET  /api/applications/mine — 查询当前用户的角色卡记录
   PATCH /api/applications/mine — 更新自己最新一张角色卡的内容
   说明：「角色卡」= 申请表 + 成员资料，统一由此接口管理 */
import { ok, fail, getDB, DB_MISSING_MSG, sb, getUser, readBody, trimStr } from "../_utils.js";

export async function onRequestGet({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);
  try {
    const user = await getUser(request, db);
    if (!user) return fail("请先登录", 401);
    const apps = await sb.all(db, "applications", { user_id: user.id }, "id.desc");
    return ok({ applications: apps });
  } catch (err) {
    return fail("查询失败：" + (err.message || "未知错误"), 500);
  }
}

export async function onRequestPatch({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);

  const body = await readBody(request);
  if (!body) return fail("请求格式有误");

  try {
    const user = await getUser(request, db);
    if (!user) return fail("请先登录", 401);

    // 只允许更新自己最新一张（最近的那张）角色卡
    const apps = await sb.all(db, "applications", { user_id: user.id }, "id.desc");
    if (!apps || !apps.length) return fail("你还没有角色卡，请先填写提交");

    const latest = apps[0];
    // 被驳回后才能修改，或者主理人批准后也允许更新资料
    // pending 状态时暂不允许修改（等待审核中）
    if (latest.status === "pending") {
      return fail("角色卡正在审核中，无法修改；审核结束后可以更新");
    }

    const updates = {};
    const f = function (key, max) {
      if (body[key] !== undefined) updates[key] = trimStr(body[key], max);
    };
    f("name", 30); f("contact", 60); f("wish", 100); f("on_camera", 20);
    f("strengths", 300); f("weakness", 300); f("sunday_limit", 200);
    f("goal", 300); f("message", 500);

    if (!Object.keys(updates).length) return fail("没有需要更新的内容");

    await sb.update(db, "applications", { id: latest.id }, updates);
    return ok({ message: "角色卡已更新" });
  } catch (err) {
    return fail("更新失败：" + (err.message || "未知错误"), 500);
  }
}
