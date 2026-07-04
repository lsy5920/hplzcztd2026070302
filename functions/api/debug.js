/* ============================================================
   临时诊断接口:GET /api/debug
   确认 Supabase 连接与表是否正常；排查完成后可删除此文件。
   ============================================================ */
import { ok, fail, getDB, DB_MISSING_MSG, sb } from "./_utils.js";

export async function onRequestGet({ env }) {
  const db = getDB(env);
  if (!db) return fail(DB_MISSING_MSG, 503);

  try {
    // 试着查 users 表，验证连接与表是否存在
    const users = await sb.all(db, "users");
    return ok({
      status: "Supabase 连接正常",
      users_count: users.length,
      tip: "如果看到此消息，说明 SUPABASE_URL 和 SUPABASE_KEY 均已正确配置，数据库表也存在。",
    });
  } catch (err) {
    return fail("Supabase 连接失败：" + (err.message || String(err)), 500);
  }
}
