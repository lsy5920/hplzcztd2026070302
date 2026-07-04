/* PATCH/DELETE /api/ideas/:id */
import { ok, fail, getDB, DB_MISSING_MSG, sb, getUser, readBody } from "../_utils.js";

const VALID_STATUS = ["pool", "review", "selected", "hold"];

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
    if (user.role !== "admin" && user.role !== "member") return fail("只有团队成员可以移动看板", 403);

    const idea = await sb.first(db, "ideas", { id });
    if (!idea) return fail("找不到这张灵感卡");

    const updates = {};
    if (body.status !== undefined) {
      if (!VALID_STATUS.includes(body.status)) return fail("看板状态无效");
      updates.status = body.status;
    }
    if (body.score_total !== undefined) {
      const s = parseInt(body.score_total, 10);
      if (isNaN(s) || s < 0 || s > 20) return fail("评分需在 0-20 分之间");
      updates.score_total = s;
    }
    if (!Object.keys(updates).length) return fail("没有需要更新的内容");

    await sb.update(db, "ideas", { id }, updates);
    return ok({ message: "灵感卡已更新" });
  } catch (err) {
    return fail("更新失败：" + (err.message || "未知错误"), 500);
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

    const idea = await sb.first(db, "ideas", { id });
    if (!idea) return fail("找不到这张灵感卡");
    if (idea.user_id !== user.id && user.role !== "admin") return fail("只能删除自己提交的灵感卡", 403);

    await sb.delete(db, "ideas", { id });
    return ok({ message: "灵感卡已删除" });
  } catch (err) {
    return fail("删除失败：" + (err.message || "未知错误"), 500);
  }
}
