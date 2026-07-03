/* ============================================================
   临时诊断接口:GET /api/debug
   列出当前绑定数据库里所有表名，确认 D1 绑定是否正确。
   确认问题解决后可以删除此文件。
   ============================================================ */
import { ok, fail, getDB, DB_MISSING_MSG } from "./_utils.js";

export async function onRequestGet({ env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);

  try {
    // 列出所有表
    const { results } = await db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all();

    return ok({
      tables: (results || []).map(function (r) { return r.name; }),
      tip: "如果 tables 为空或缺少 users/sessions 等表，说明绑定的不是初始化过的那个数据库",
    });
  } catch (err) {
    return fail("查询失败:" + (err && err.message ? err.message : String(err)), 500);
  }
}
