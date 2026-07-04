/* ============================================================
   胡拍乱造 · 后端共享工具模块(Supabase 版)
   用 fetch 直接调用 Supabase REST API，零依赖、零构建步骤
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
export function ok(data = {}) { return json({ ok: true, ...data }); }
export function fail(message, status = 400) {
  return json({ ok: false, error: message }, status);
}

/* ---------- Supabase 客户端 ---------- */
export const DB_MISSING_MSG =
  "数据库尚未配置：请在 Cloudflare Pages「设置→环境变量」中添加" +
  " SUPABASE_URL 和 SUPABASE_KEY（service_role key），详见 README";

export function getDB(env) {
  const url = env && env.SUPABASE_URL;
  const key = env && env.SUPABASE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

/* 内部 HTTP 请求封装 */
async function sbReq(db, method, table, body, params, extraHeaders) {
  const url = new URL(db.url + "/rest/v1/" + table);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }
  const headers = {
    apikey: db.key,
    Authorization: "Bearer " + db.key,
    "Content-Type": "application/json",
    ...extraHeaders,
  };
  if (method === "POST" || method === "PATCH") {
    headers["Prefer"] = "return=representation";
  }
  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = "HTTP " + res.status;
    try {
      const e = await res.json();
      msg = e.message || e.hint || e.details || msg;
    } catch (_) {}
    throw new Error(msg);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/* 高级查询封装(返回第一行 / 多行 / 执行写操作) */
export const sb = {
  /* 查单行 */
  async first(db, table, filters) {
    const params = buildFilters(filters);
    params.limit = "1";
    const rows = await sbReq(db, "GET", table, null, params);
    return (rows && rows[0]) || null;
  },
  /* 查多行 */
  async all(db, table, filters, order) {
    const params = buildFilters(filters);
    if (order) params.order = order;
    return await sbReq(db, "GET", table, null, params) || [];
  },
  /* 计数 */
  async count(db, table, filters) {
    const params = buildFilters(filters);
    params.select = "id";
    params.limit = "1000";
    const rows = await sbReq(db, "GET", table, null, params,
      { Prefer: "count=exact" }) || [];
    return rows.length;
  },
  /* 插入一行，返回插入后的行 */
  async insert(db, table, data) {
    const rows = await sbReq(db, "POST", table, data);
    return (rows && rows[0]) || null;
  },
  /* 更新匹配行 */
  async update(db, table, filters, data) {
    const params = buildFilters(filters);
    await sbReq(db, "PATCH", table, data, params);
  },
  /* 删除匹配行 */
  async delete(db, table, filters) {
    const params = buildFilters(filters);
    await sbReq(db, "DELETE", table, null, params);
  },
};

/* 把 { username: 'abc' } 转成 Supabase 过滤参数 { username: 'eq.abc' } */
function buildFilters(filters) {
  if (!filters) return {};
  const p = {};
  Object.entries(filters).forEach(([k, v]) => {
    if (v === null) { p[k] = "is.null"; }
    else if (typeof v === "object" && v.op) {
      p[k] = v.op + "." + v.val;
    } else {
      p[k] = "eq." + v;
    }
  });
  return p;
}

/* ---------- 十六进制编解码 ---------- */
function bufToHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function hexToBuf(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.substr(i * 2, 2), 16);
  return arr.buffer;
}

/* ---------- 密码哈希 PBKDF2-SHA256，10 万次迭代 ---------- */
export async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const salt = saltHex ? hexToBuf(saltHex) : crypto.getRandomValues(new Uint8Array(16)).buffer;
  const km = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, km, 256
  );
  return { hash: bufToHex(bits), salt: bufToHex(salt) };
}

/* 恒定时间比较 */
export function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/* ---------- 会话管理 ---------- */
const SESSION_DAYS = 30;

export function newToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export function sessionCookie(token, maxAge) {
  return ["hplz_session=" + token, "Path=/", "HttpOnly", "Secure",
    "SameSite=Lax", "Max-Age=" + maxAge].join("; ");
}

export async function createSession(db, userId) {
  const token = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await sb.insert(db, "sessions", { token, user_id: userId, expires_at: expires });
  return { token, maxAge: SESSION_DAYS * 86400 };
}

export function readSessionToken(request) {
  const m = (request.headers.get("Cookie") || "").match(/(?:^|;\s*)hplz_session=([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

export async function getUser(request, db) {
  const token = readSessionToken(request);
  if (!token) return null;
  const session = await sb.first(db, "sessions", { token });
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await sb.delete(db, "sessions", { token });
    return null;
  }
  const user = await sb.first(db, "users", { id: session.user_id });
  if (!user) return null;
  return { id: user.id, username: user.username, display_name: user.display_name, role: user.role };
}

/* ---------- 输入校验 ---------- */
export function trimStr(v, maxLen) {
  const s = String(v == null ? "" : v).trim();
  return maxLen ? s.slice(0, maxLen) : s;
}
export function isValidUsername(n) { return /^[A-Za-z0-9_]{3,20}$/.test(n); }
export function isValidPassword(p) { return typeof p === "string" && p.length >= 6 && p.length <= 64; }

export async function readBody(req) {
  try { return await req.json(); } catch (_) { return null; }
}
