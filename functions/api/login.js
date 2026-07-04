/* POST /api/login — 支持账号名 或 邮箱 登录 */
import {
  fail, getDB, DB_MISSING_MSG, sb,
  hashPassword, safeEqual, createSession, sessionCookie,
  trimStr, readBody,
} from "./_utils.js";

export async function onRequestPost({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);

  const body = await readBody(request);
  if (!body) return fail("请求格式有误，请刷新页面后重试");

  const identifier = trimStr(body.username || body.identifier || "", 120); // 账号名或邮箱
  const password   = body.password;
  if (!identifier || !password) return fail("请填写账号/邮箱和密码");

  try {
    // 先按账号名查，再按邮箱查
    let user = await sb.first(db, "users", { username: identifier });
    if (!user && identifier.includes("@")) {
      // 包含 @ 时也尝试按邮箱查
      const allUsers = await sb.all(db, "users");
      user = allUsers.find(function (u) {
        return u.email && u.email.toLowerCase() === identifier.toLowerCase();
      }) || null;
    }

    // 账号不存在与密码错误统一提示，避免信息泄露
    if (!user) return fail("账号/邮箱或密码不对，再想想？", 401);

    const { hash } = await hashPassword(password, user.salt);
    if (!safeEqual(hash, user.password_hash)) {
      return fail("账号/邮箱或密码不对，再想想？", 401);
    }

    const session = await createSession(db, user.id);
    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          id: user.id, username: user.username,
          display_name: user.display_name, role: user.role,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "Set-Cookie": sessionCookie(session.token, session.maxAge),
        },
      }
    );
  } catch (err) {
    return fail("登录失败：" + (err.message || "服务器开小差了"), 500);
  }
}
