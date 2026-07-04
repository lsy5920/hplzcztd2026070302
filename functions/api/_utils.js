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

/* ---------- 邮件发送(Resend API，零依赖 fetch) ----------
   env.RESEND_KEY  = Resend API 密钥(在 CF Pages 环境变量里配置)
   env.EMAIL_FROM  = 发件人地址，例如 noreply@hplz.lsy20.top(需在 Resend 验证域名)
   失败时只打印日志，不影响主流程 */
export async function sendEmail(env, { to, subject, html }) {
  const key  = env && env.RESEND_KEY;
  const from = (env && env.EMAIL_FROM) || "胡拍乱造创作组 <noreply@hplz.lsy20.top>";
  if (!key || !to) return; // 未配置或无收件人则跳过
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
  } catch (_) { /* 邮件失败不中断主流程 */ }
}

/* ---------- 美观 HTML 邮件模板 ---------- */
export function emailApproved(displayName) {
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>申请通过通知</title></head>
<body style="margin:0;padding:0;background:#F0EBE0;font-family:'PingFang SC','Microsoft YaHei',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F0EBE0;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <!-- 场记板顶部 -->
  <tr><td style="background:#191F24;border-radius:10px 10px 0 0;padding:0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:14px 24px 0;">
          <div style="background:repeating-linear-gradient(-45deg,#191F24 0 14px,#FFC529 14px 28px);height:14px;border-radius:4px 4px 0 0;"></div>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 28px 20px;">
          <span style="font-family:monospace;font-size:11px;letter-spacing:3px;color:#9AA3AA;">SCENE 00 · NOTIFICATION</span><br>
          <span style="font-size:22px;font-weight:900;color:#F7F3EA;letter-spacing:2px;">胡拍乱造创作组</span>
        </td>
        <td align="right" style="padding-right:28px;">
          <span style="display:inline-block;background:#2FA24F;color:#fff;border:2px solid #2FA24F;border-radius:6px;padding:6px 18px;font-weight:900;font-size:15px;letter-spacing:2px;transform:rotate(-4deg);">通过</span>
        </td>
      </tr>
    </table>
  </td></tr>
  <!-- 正文 -->
  <tr><td style="background:#FFFDF7;padding:36px 36px 28px;border:2px solid #191F24;border-top:none;">
    <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#191F24;">嘿，${escHtml(displayName)}！</p>
    <p style="margin:0 0 22px;font-size:16px;color:#57616A;line-height:1.8;">
      你的入队申请已经通过审核了。<br>
      主理人会通过你留下的联系方式主动找你，开机见！
    </p>
    <div style="background:#FFF9E8;border:2px dashed #FFC529;border-radius:8px;padding:18px 22px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#191F24;line-height:1.8;">
        🎬 <strong>接下来做什么</strong><br>
        登录网站 → 进入成员空间 → 看看本周的任务卡<br>
        完善你的职位身份，把自己的想法投进灵感池。
      </p>
    </div>
    <p style="margin:0;font-size:13px;color:#9AA3AA;">
      把脑洞拍出来，把日子造有趣。<br>
      —— 胡拍乱造创作组
    </p>
  </td></tr>
  <!-- 底部 -->
  <tr><td style="background:#191F24;border-radius:0 0 10px 10px;padding:16px 28px;text-align:center;">
    <span style="font-family:monospace;font-size:11px;letter-spacing:2px;color:#57616A;">
      胡拍乱造创作组 · 兴趣优先 · 学习驱动 · 稳定共创
    </span>
  </td></tr>
</table></td></tr></table>
</body></html>`;
}

export function emailRejected(displayName, rejectNote) {
  const note = rejectNote
    ? `<div style="background:#FFF0EE;border:2px dashed #FF4021;border-radius:8px;padding:16px 20px;margin:18px 0;">
        <p style="margin:0;font-size:14px;color:#191F24;line-height:1.8;"><strong>主理人的反馈：</strong><br>${escHtml(rejectNote)}</p>
       </div>`
    : "";
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>申请审核通知</title></head>
<body style="margin:0;padding:0;background:#F0EBE0;font-family:'PingFang SC','Microsoft YaHei',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F0EBE0;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#191F24;border-radius:10px 10px 0 0;padding:0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:14px 24px 0;">
        <div style="background:repeating-linear-gradient(-45deg,#191F24 0 14px,#FFC529 14px 28px);height:14px;border-radius:4px 4px 0 0;"></div>
      </td></tr>
      <tr>
        <td style="padding:16px 28px 20px;">
          <span style="font-family:monospace;font-size:11px;letter-spacing:3px;color:#9AA3AA;">SCENE 00 · NOTIFICATION</span><br>
          <span style="font-size:22px;font-weight:900;color:#F7F3EA;letter-spacing:2px;">胡拍乱造创作组</span>
        </td>
        <td align="right" style="padding-right:28px;">
          <span style="display:inline-block;background:#FF4021;color:#fff;border:2px solid #FF4021;border-radius:6px;padding:6px 14px;font-weight:900;font-size:15px;letter-spacing:2px;transform:rotate(-4deg);">暂未通过</span>
        </td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="background:#FFFDF7;padding:36px 36px 28px;border:2px solid #191F24;border-top:none;">
    <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#191F24;">嘿，${escHtml(displayName)}！</p>
    <p style="margin:0 0 4px;font-size:16px;color:#57616A;line-height:1.8;">
      你的入队申请这次暂未通过，感谢你愿意加入。
    </p>
    ${note}
    <div style="background:#F0EBE0;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#191F24;line-height:1.8;">
        💡 <strong>你可以修改申请再次提交</strong><br>
        登录网站 → 成员空间 → 查看申请状态 → 修改后重新提交。
      </p>
    </div>
    <p style="margin:0;font-size:13px;color:#9AA3AA;">
      把脑洞拍出来，把日子造有趣。<br>
      —— 胡拍乱造创作组
    </p>
  </td></tr>
  <tr><td style="background:#191F24;border-radius:0 0 10px 10px;padding:16px 28px;text-align:center;">
    <span style="font-family:monospace;font-size:11px;letter-spacing:2px;color:#57616A;">
      胡拍乱造创作组 · 兴趣优先 · 学习驱动 · 稳定共创
    </span>
  </td></tr>
</table></td></tr></table>
</body></html>`;
}

/* HTML 转义(防止邮件注入) */
function escHtml(s) {
  return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
