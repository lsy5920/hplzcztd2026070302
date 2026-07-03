/* ============================================================
   接口:/api/ideas — 灵感池看板
   GET  读取全部灵感卡(登录后可看)
   POST 新建灵感卡(登录后可提交)
   对应手册附录 B「灵感卡」与 11.1「共享看板」
   ============================================================ */
import {
  ok, fail, getDB, DB_MISSING_MSG, TABLE_MISSING_MSG, isNoTableError,
  getUser, readBody, trimStr,
} from "./_utils.js";

/* 看板列的合法状态见 ideas/[id].js,此处新建的卡片固定进入「灵感池」 */

export async function onRequestGet({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);

  try {
    const user = await getUser(request, db);
    if (!user) return fail("请先登录", 401);

    const { results } = await db
      .prepare(
        "SELECT i.id, i.title, i.observation, i.rule, i.escalation, i.ending, i.resources, i.risk, " +
          "i.score_total, i.status, i.created_at, i.user_id, u.display_name AS author " +
          "FROM ideas i JOIN users u ON u.id = i.user_id ORDER BY i.id DESC LIMIT 300"
      )
      .all();

    return ok({ ideas: results || [], my_id: user.id, my_role: user.role });
  } catch (err) {
    if (isNoTableError(err)) return fail(TABLE_MISSING_MSG, 503);
    return fail("读取灵感池失败:" + (err.message || "未知错误"), 500);
  }
}

export async function onRequestPost({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);

  const body = await readBody(request);
  if (!body) return fail("请求格式有误");

  const title = trimStr(body.title, 80);
  if (title.length < 4) return fail("一句话设定至少写 4 个字,让大家看得懂");

  const observation = trimStr(body.observation, 200);
  const rule = trimStr(body.rule, 200);
  const escalation = trimStr(body.escalation, 300);
  const ending = trimStr(body.ending, 200);
  const resources = trimStr(body.resources, 200);
  const risk = trimStr(body.risk, 200);
  let scoreTotal = parseInt(body.score_total, 10);
  if (isNaN(scoreTotal) || scoreTotal < 0 || scoreTotal > 20) scoreTotal = 0;

  try {
    const user = await getUser(request, db);
    if (!user) return fail("请先登录再投灵感", 401);

    await db
      .prepare(
        "INSERT INTO ideas (user_id, title, observation, rule, escalation, ending, resources, risk, score_total) " +
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(user.id, title, observation, rule, escalation, ending, resources, risk, scoreTotal)
      .run();

    return ok({ message: "灵感已投进灵感池!" });
  } catch (err) {
    if (isNoTableError(err)) return fail(TABLE_MISSING_MSG, 503);
    return fail("提交失败:" + (err.message || "未知错误"), 500);
  }
}
