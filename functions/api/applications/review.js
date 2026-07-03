/* ============================================================
   接口:POST /api/applications/review — 审核入队申请(仅主理人)
   请求体:{ id: 申请编号, action: "approve" 通过 / "reject" 婉拒 }
   ============================================================ */
import {
  ok, fail, getDB, DB_MISSING_MSG, TABLE_MISSING_MSG, isNoTableError,
  getUser, readBody,
} from "../_utils.js";

export async function onRequestPost({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);

  const body = await readBody(request);
  if (!body) return fail("请求格式有误");

  const id = parseInt(body.id, 10);
  const action = body.action;
  if (!id || (action !== "approve" && action !== "reject")) {
    return fail("参数不完整:需要申请编号和审核动作");
  }

  try {
    const user = await getUser(request, db);
    if (!user) return fail("请先登录", 401);
    if (user.role !== "admin") return fail("只有主理人可以审核申请", 403);

    const app = await db
      .prepare("SELECT id, status FROM applications WHERE id = ?")
      .bind(id)
      .first();
    if (!app) return fail("找不到这份申请,可能已被处理");

    const newStatus = action === "approve" ? "approved" : "rejected";
    await db
      .prepare(
        "UPDATE applications SET status = ?, reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?"
      )
      .bind(newStatus, user.id, id)
      .run();

    return ok({
      message: action === "approve" ? "已标记为通过,记得主动联系对方!" : "已婉拒这份申请",
    });
  } catch (err) {
    if (isNoTableError(err)) return fail(TABLE_MISSING_MSG, 503);
    return fail("审核失败:" + (err.message || "未知错误"), 500);
  }
}
