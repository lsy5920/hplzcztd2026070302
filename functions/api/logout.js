/* ============================================================
   接口:POST /api/logout — 退出登录
   ============================================================ */
import { getDB, readSessionToken } from "./_utils.js";

export async function onRequestPost({ request, env }) {
  const db = getDB(env);
  const token = readSessionToken(request);

  // 尽力删除服务端会话;即使失败也照常清除浏览器 Cookie
  if (db && token) {
    try {
      await db.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
    } catch (e) { /* 忽略 */ }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      // Max-Age=0 让浏览器立即删除 Cookie
      "Set-Cookie": "hplz_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    },
  });
}
