/* ============================================================
   接口:POST /api/login — 登录
   ============================================================ */
import {
  fail, getDB, DB_MISSING_MSG, TABLE_MISSING_MSG, isNoTableError,
  hashPassword, safeEqual, createSession, sessionCookie,
  trimStr, readBody,
} from "./_utils.js";

export async function onRequestPost({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);

  const body = await readBody(request);
  if (!body) return fail("请求格式有误,请刷新页面后重试");

  const username = trimStr(body.username, 20);
  const password = body.password;
  if (!username || !password) return fail("请填写账号和密码");

  try {
    const user = await db
      .prepare(
        "SELECT id, username, display_name, password_hash, salt, role FROM users WHERE username = ?"
      )
      .bind(username)
      .first();

    // 账号不存在与密码错误统一提示,避免撞库探测
    if (!user) return fail("账号或密码不对,再想想?", 401);

    const { hash } = await hashPassword(password, user.salt);
    if (!safeEqual(hash, user.password_hash)) {
      return fail("账号或密码不对,再想想?", 401);
    }

    const session = await createSession(db, user.id);
    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          role: user.role,
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
    if (isNoTableError(err)) return fail(TABLE_MISSING_MSG, 503);
    return fail("登录失败:" + (err.message || "服务器开小差了"), 500);
  }
}
