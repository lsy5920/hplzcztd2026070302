/* POST /api/register — 注册新账号 */
import {
  fail, ok, getDB, DB_MISSING_MSG, sb,
  hashPassword, createSession, sessionCookie,
  trimStr, isValidUsername, isValidPassword, readBody,
} from "./_utils.js";

export async function onRequestPost({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);

  const body = await readBody(request);
  if (!body) return fail("请求格式有误，请刷新页面后重试");

  const username = trimStr(body.username, 20);
  const displayName = trimStr(body.display_name, 20) || username;
  const password = body.password;

  if (!isValidUsername(username)) return fail("账号需为 3-20 位字母、数字或下划线");
  if (!isValidPassword(password)) return fail("密码长度需在 6-64 位之间");
  if (!displayName) return fail("昵称不能为空");

  try {
    const exists = await sb.first(db, "users", { username });
    if (exists) return fail("这个账号已经被注册了，换一个试试");

    const isFirst = (await sb.count(db, "users")) === 0;
    const role = isFirst ? "admin" : "visitor";

    const { hash, salt } = await hashPassword(password);
    const user = await sb.insert(db, "users", {
      username, display_name: displayName, password_hash: hash, salt, role,
    });

    const session = await createSession(db, user.id);
    return new Response(
      JSON.stringify({ ok: true, user: { id: user.id, username, display_name: displayName, role }, first_admin: isFirst }),
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
    return fail("注册失败：" + (err.message || "服务器开小差了"), 500);
  }
}
