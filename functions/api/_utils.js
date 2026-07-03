/* ============================================================
   胡拍乱造 · 后端共享工具模块
   文件名以下划线开头,不会生成路由,仅供其他接口文件导入
   职责:统一响应格式、D1 检查、密码哈希、会话读写、输入校验
   ============================================================ */

/* ---------- 统一 JSON 响应 ---------- */
export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

export function ok(data = {}) {
  return json({ ok: true, ...data });
}

export function fail(message, status = 400) {
  return json({ ok: false, error: message }, status);
}

/* ---------- D1 绑定检查 ----------
   未在 Cloudflare 控制台绑定 D1 时,给出清晰的中文指引,
   避免出现看不懂的英文报错 */
export function getDB(env) {
  if (!env || !env.DB) return null;
  return env.DB;
}

export const DB_MISSING_MSG =
  "数据库尚未配置:请在 Cloudflare Pages 项目的「设置 → 绑定」中添加 D1 数据库绑定,变量名称填 DB(详见 README 部署教程第 4 步)";

/* 数据库表未初始化时的提示 */
export const TABLE_MISSING_MSG =
  "数据库表尚未初始化:请在 D1 控制台执行仓库中的 schema.sql 建表语句(详见 README 部署教程第 3 步)";

/* 判断是否为「表不存在」错误 */
export function isNoTableError(err) {
  return /no such table/i.test(String(err && err.message ? err.message : err));
}

/* ---------- 十六进制编解码 ---------- */
export function bufToHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hexToBuf(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return arr.buffer;
}

/* ---------- 密码哈希(PBKDF2-SHA256,10 万次迭代) ---------- */
export async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const salt = saltHex ? hexToBuf(saltHex) : crypto.getRandomValues(new Uint8Array(16)).buffer;
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return { hash: bufToHex(bits), salt: bufToHex(salt) };
}

/* 恒定时间比较,避免时序攻击 */
export function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ---------- 会话管理 ---------- */
const SESSION_DAYS = 30; // 会话有效期(天)

export function newToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export function sessionCookie(token, maxAgeSeconds) {
  const base = [
    "hplz_session=" + token,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=" + maxAgeSeconds,
  ];
  return base.join("; ");
}

export async function createSession(db, userId) {
  const token = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 19);
  await db
    .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(token, userId, expires)
    .run();
  return { token, maxAge: SESSION_DAYS * 86400 };
}

export function readSessionToken(request) {
  const cookie = request.headers.get("Cookie") || "";
  const m = cookie.match(/(?:^|;\s*)hplz_session=([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

/* 根据请求取当前登录用户;未登录返回 null */
export async function getUser(request, db) {
  const token = readSessionToken(request);
  if (!token) return null;
  const row = await db
    .prepare(
      "SELECT u.id, u.username, u.display_name, u.role, s.token, s.expires_at " +
        "FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?"
    )
    .bind(token)
    .first();
  if (!row) return null;
  // 过期会话:顺手清除
  if (new Date(row.expires_at.replace(" ", "T") + "Z").getTime() < Date.now()) {
    await db.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
    return null;
  }
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    role: row.role,
    token: row.token,
  };
}

/* ---------- 输入校验 ---------- */
export function trimStr(v, maxLen) {
  const s = String(v == null ? "" : v).trim();
  return maxLen ? s.slice(0, maxLen) : s;
}

export function isValidUsername(name) {
  return /^[A-Za-z0-9_]{3,20}$/.test(name);
}

export function isValidPassword(pwd) {
  return typeof pwd === "string" && pwd.length >= 6 && pwd.length <= 64;
}

/* 读取 JSON 请求体(格式错误时返回 null) */
export async function readBody(request) {
  try {
    return await request.json();
  } catch (e) {
    return null;
  }
}
