/* POST /api/applications/review — 审核申请(仅 admin) */
import { ok, fail, getDB, DB_MISSING_MSG, sb, getUser, readBody } from "../_utils.js";

export async function onRequestPost({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);

  const body = await readBody(request);
  const id = parseInt(body && body.id, 10);
  const action = body && body.action;
  if (!id || (action !== "approve" && action !== "reject")) {
    return fail("参数不完整：需要申请编号和审核动作");
  }

  try {
    const user = await getUser(request, db);
    if (!user) return fail("请先登录", 401);
    if (user.role !== "admin") return fail("只有主理人可以审核申请", 403);

    const app = await sb.first(db, "applications", { id });
    if (!app) return fail("找不到这份申请");

    await sb.update(db, "applications", { id }, {
      status: action === "approve" ? "approved" : "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    });
    return ok({ message: action === "approve" ? "已标记为通过！" : "已婉拒这份申请" });
  } catch (err) {
    return fail("审核失败：" + (err.message || "未知错误"), 500);
  }
}
