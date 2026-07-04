/* GET/POST /api/ideas — 灵感池看板 */
import { ok, fail, getDB, DB_MISSING_MSG, sb, getUser, readBody, trimStr } from "./_utils.js";

export async function onRequestGet({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);
  try {
    const user = await getUser(request, db);
    if (!user) return fail("请先登录", 401);

    // 查所有灵感卡，同时拿提交人昵称
    const ideas = await sb.all(db, "ideas", null, "id.desc");
    // 批量拿用户昵称（避免 N+1 查询，先把所有 user_id 去重查一次）
    const uids = [...new Set(ideas.map(i => i.user_id))];
    let userMap = {};
    if (uids.length) {
      const users = await sb.all(db, "users", null, "id.asc");
      users.forEach(u => { userMap[u.id] = u.display_name; });
    }
    const result = ideas.map(i => ({ ...i, author: userMap[i.user_id] || "未知" }));
    return ok({ ideas: result, my_id: user.id, my_role: user.role });
  } catch (err) {
    return fail("读取灵感池失败：" + (err.message || "未知错误"), 500);
  }
}

export async function onRequestPost({ request, env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);

  const body = await readBody(request);
  if (!body) return fail("请求格式有误");

  const title = trimStr(body.title, 80);
  if (title.length < 4) return fail("一句话设定至少写 4 个字，让大家看得懂");

  let score = parseInt(body.score_total, 10);
  if (isNaN(score) || score < 0 || score > 20) score = 0;

  try {
    const user = await getUser(request, db);
    if (!user) return fail("请先登录再投灵感", 401);

    await sb.insert(db, "ideas", {
      user_id:     user.id,
      title,
      observation: trimStr(body.observation, 200),
      rule:        trimStr(body.rule, 200),
      escalation:  trimStr(body.escalation, 300),
      ending:      trimStr(body.ending, 200),
      resources:   trimStr(body.resources, 200),
      risk:        trimStr(body.risk, 200),
      score_total: score,
    });
    return ok({ message: "灵感已投进灵感池！" });
  } catch (err) {
    return fail("提交失败：" + (err.message || "未知错误"), 500);
  }
}
