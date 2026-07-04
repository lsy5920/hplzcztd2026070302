/* GET/PATCH /api/profile — 查询或更新当前用户资料
   注意：job_title 只有主理人(admin)可以修改；出生年份所有人均可填写 */
import { ok, fail, getDB, DB_MISSING_MSG, sb, getUser, readBody, trimStr } from "./_utils.js";

export async function onRequestGet({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);
  try {
    const user = await getUser(request, db);
    if (!user) return fail("请先登录", 401);
    const row = await sb.first(db, "users", { id: user.id });
    return ok({
      user: {
        id: row.id, username: row.username, display_name: row.display_name,
        role: row.role, email: row.email || "",
        job_title: row.job_title || "", birth_year: row.birth_year || null,
      },
    });
  } catch (err) {
    return fail("查询失败：" + (err.message || "未知错误"), 500);
  }
}

export async function onRequestPatch({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);
  const body = await readBody(request);
  if (!body) return fail("请求格式有误");

  try {
    const user = await getUser(request, db);
    if (!user) return fail("请先登录", 401);

    const updates = {};
    if (body.email !== undefined)        updates.email        = trimStr(body.email, 120);
    if (body.display_name !== undefined) updates.display_name = trimStr(body.display_name, 20);

    /* 出生年份：所有人可改，但要校验格式 */
    if (body.birth_year !== undefined) {
      const yr = parseInt(body.birth_year, 10);
      const curYear = new Date().getFullYear();
      if (body.birth_year !== "" && body.birth_year !== null) {
        if (isNaN(yr) || yr < 1940 || yr > curYear - 10) {
          return fail("出生年份请填写有效年份（1940 至 " + (curYear - 10) + "）");
        }
        updates.birth_year = yr;
      } else {
        updates.birth_year = null;
      }
    }

    /* 职位：仅主理人可修改 */
    if (body.job_title !== undefined) {
      if (user.role !== "admin") return fail("职位身份只有主理人可以设置", 403);
      updates.job_title = trimStr(body.job_title, 40);
    }

    if (!Object.keys(updates).length) return fail("没有需要更新的内容");
    await sb.update(db, "users", { id: user.id }, updates);
    return ok({ message: "资料已更新" });
  } catch (err) {
    return fail("更新失败：" + (err.message || "未知错误"), 500);
  }
}
