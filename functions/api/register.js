/* ============================================================
   接口:POST /api/register — 注册新账号
   规则:第一个注册的用户自动成为主理人(admin),
         之后注册的用户默认为访客(visitor)
   ============================================================ */
import {
  fail, getDB, DB_MISSING_MSG, TABLE_MISSING_MSG, isNoTableError,
  hashPassword, createSession, sessionCookie,
  trimStr, isValidUsername, isValidPassword, readBody,
} from "./_utils.js";

export async function onRequestPost({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);

  const body = await readBody(request);
  if (!body) return fail("请求格式有误,请刷新页面后重试");

  const username = trimStr(body.username, 20);
  const displayName = trimStr(body.display_name, 20) || username;
  const password = body.password;

  if (!isValidUsername(username)) {
    return fail("账号需为 3-20 位字母、数字或下划线");
  }
  if (!isValidPassword(password)) {
    return fail("密码长度需在 6-64 位之间");
  }
  if (displayName.length < 1) {
    return fail("昵称不能为空");
  }

  try {
    // 账号查重
    const exists = await db
      .prepare("SELECT id FROM users WHERE username = ?")
      .bind(username)
      .first();
    if (exists) return fail("这个账号已经被注册了,换一个试试");

    // 第一个注册用户自动成为主理人
    const countRow = await db.prepare("SELECT COUNT(*) AS n FROM users").first();
    const role = countRow && countRow.n === 0 ? "admin" : "visitor";

    const { hash, salt } = await hashPassword(password);
    const result = await db
      .prepare(
        "INSERT INTO users (username, display_name, password_hash, salt, role) VALUES (?, ?, ?, ?, ?)"
      )
      .bind(username, displayName, hash, salt, role)
      .run();

    const userId = result.meta.last_row_id;
    const session = await createSession(db, userId);

    // 注册成功后直接种下会话 Cookie(免二次登录)
    return new Response(
      JSON.stringify({
        ok: true,
        user: { id: userId, username, display_name: displayName, role },
        first_admin: role === "admin",
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
    return fail("注册失败:" + (err.message || "服务器开小差了"), 500);
  }
}
