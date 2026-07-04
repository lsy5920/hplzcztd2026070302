/* POST /api/applications/review — 审核申请(仅 admin，审核后发邮件通知) */
import {
  ok, fail, getDB, DB_MISSING_MSG, sb, getUser, readBody,
  sendEmail, emailApproved, emailRejected,
} from "../_utils.js";

export async function onRequestPost({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);

  const body = await readBody(request);
  const id   = parseInt(body && body.id, 10);
  const action = body && body.action;        // "approve" | "reject"
  const rejectNote = (body && body.reject_note) || "";

  if (!id || (action !== "approve" && action !== "reject")) {
    return fail("参数不完整：需要申请编号和审核动作");
  }

  try {
    const user = await getUser(request, db);
    if (!user) return fail("请先登录", 401);
    if (user.role !== "admin") return fail("只有主理人可以审核申请", 403);

    const app = await sb.first(db, "applications", { id });
    if (!app) return fail("找不到这份申请");

    const newStatus = action === "approve" ? "approved" : "rejected";
    await sb.update(db, "applications", { id }, {
      status:      newStatus,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      reject_note: action === "reject" ? rejectNote : "",
    });

    // 发邮件通知申请人
    if (app.user_id) {
      const applicant = await sb.first(db, "users", { id: app.user_id });
      if (applicant && applicant.email) {
        const subject = action === "approve"
          ? "🎬 申请通过啦！胡拍乱造创作组欢迎你入组"
          : "📋 你的入队申请审核结果 — 胡拍乱造创作组";
        const html = action === "approve"
          ? emailApproved(applicant.display_name)
          : emailRejected(applicant.display_name, rejectNote);
        await sendEmail(env, { to: applicant.email, subject, html });
      }
    }

    return ok({
      message: action === "approve" ? "已通过，邮件通知已发送！" : "已婉拒，邮件通知已发送",
    });
  } catch (err) {
    return fail("审核失败：" + (err.message || "未知错误"), 500);
  }
}
