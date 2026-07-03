/* ============================================================
   接口:/api/ideas/[id] — 单张灵感卡操作
   PATCH  移动看板状态或更新评分(团队成员与主理人)
   DELETE 删除灵感卡(本人或主理人)
   ============================================================ */
import {
  ok, fail, getDB, DB_MISSING_MSG, TABLE_MISSING_MSG, isNoTableError,
  getUser, readBody,
} from "../_utils.js";

/* 看板列的合法状态:灵感池 / 待评估 / 已入选 / 暂存 */
const IDEA_STATUS = ["pool", "review", "selected", "hold"];

export async function onRequestPatch({ request, env, params }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);

  const id = parseInt(params.id, 10);
  if (!id) return fail("灵感卡编号无效");

  const body = await readBody(request);
  if (!body) return fail("请求格式有误");

  try {
    const user = await getUser(request, db);
    if (!user) return fail("请先登录", 401);
    if (user.role !== "admin" && user.role !== "member") {
      return fail("只有团队成员可以移动看板卡片", 403);
    }

    const idea = await db.prepare("SELECT id FROM ideas WHERE id = ?").bind(id).first();
    if (!idea) return fail("找不到这张灵感卡,可能已被删除");

    const updates = [];
    const binds = [];

    if (body.status !== undefined) {
      if (!IDEA_STATUS.includes(body.status)) return fail("看板状态无效");
      updates.push("status = ?");
      binds.push(body.status);
    }
    if (body.score_total !== undefined) {
      const score = parseInt(body.score_total, 10);
      if (isNaN(score) || score < 0 || score > 20) return fail("评分需在 0-20 分之间");
      updates.push("score_total = ?");
      binds.push(score);
    }
    if (!updates.length) return fail("没有需要更新的内容");

    binds.push(id);
    await db.prepare("UPDATE ideas SET " + updates.join(", ") + " WHERE id = ?").bind(...binds).run();

    return ok({ message: "灵感卡已更新" });
  } catch (err) {
    if (isNoTableError(err)) return fail(TABLE_MISSING_MSG, 503);
    return fail("更新失败:" + (err.message || "未知错误"), 500);
  }
}

export async function onRequestDelete({ request, env, params }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);

  const id = parseInt(params.id, 10);
  if (!id) return fail("灵感卡编号无效");

  try {
    const user = await getUser(request, db);
    if (!user) return fail("请先登录", 401);

    const idea = await db
      .prepare("SELECT id, user_id FROM ideas WHERE id = ?")
      .bind(id)
      .first();
    if (!idea) return fail("找不到这张灵感卡,可能已被删除");

    // 只有本人或主理人可以删除
    if (idea.user_id !== user.id && user.role !== "admin") {
      return fail("只能删除自己提交的灵感卡", 403);
    }

    await db.prepare("DELETE FROM ideas WHERE id = ?").bind(id).run();
    return ok({ message: "灵感卡已删除" });
  } catch (err) {
    if (isNoTableError(err)) return fail(TABLE_MISSING_MSG, 503);
    return fail("删除失败:" + (err.message || "未知错误"), 500);
  }
}
