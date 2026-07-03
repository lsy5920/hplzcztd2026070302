-- ============================================================
-- 胡拍乱造创作组 · 网站数据库结构(Cloudflare D1 / SQLite)
-- 使用方法:在 Cloudflare 控制台 D1 数据库的「控制台」标签页
-- 粘贴执行本文件全部内容,或使用命令:
--   npx wrangler d1 execute hplz-db --remote --file=./schema.sql
-- ============================================================

-- ---------- 用户表 ----------
-- 角色说明:admin=主理人(第一个注册的用户自动成为主理人)
--          member=团队成员(由主理人提升)
--          visitor=普通注册访客
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,              -- 登录账号(字母数字下划线)
  display_name  TEXT NOT NULL,                     -- 显示昵称
  password_hash TEXT NOT NULL,                     -- PBKDF2 哈希(十六进制)
  salt          TEXT NOT NULL,                     -- 随机盐(十六进制)
  role          TEXT NOT NULL DEFAULT 'visitor',   -- admin / member / visitor
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- 会话表 ----------
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,                     -- 会话令牌(随机 UUID 组合)
  user_id    INTEGER NOT NULL,
  expires_at TEXT NOT NULL,                        -- 过期时间(UTC)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- ---------- 入队申请表(对应手册附录 A 成员角色卡)----------
CREATE TABLE IF NOT EXISTS applications (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,                     -- 称呼 / 代号
  contact       TEXT NOT NULL,                     -- 联系方式(微信/手机/抖音号)
  wish          TEXT NOT NULL DEFAULT '',          -- 希望获得(表演/编剧/拍摄/剪辑/运营等)
  on_camera     TEXT NOT NULL DEFAULT '',          -- 愿意出镜程度
  strengths     TEXT NOT NULL DEFAULT '',          -- 擅长的事
  weakness      TEXT NOT NULL DEFAULT '',          -- 不擅长或不愿做
  sunday_limit  TEXT NOT NULL DEFAULT '',          -- 周日参与限制
  goal          TEXT NOT NULL DEFAULT '',          -- 12 周个人目标
  message       TEXT NOT NULL DEFAULT '',          -- 想对团队说的话
  status        TEXT NOT NULL DEFAULT 'pending',   -- pending待审 / approved通过 / rejected婉拒
  reviewed_by   INTEGER,                           -- 审核人用户 id
  reviewed_at   TEXT,                              -- 审核时间
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- ---------- 灵感卡表(对应手册附录 B 灵感卡 + 11.1 共享看板)----------
-- status 看板列:pool灵感池 / review待评估 / selected已入选 / hold暂存
CREATE TABLE IF NOT EXISTS ideas (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL,                   -- 提交人
  title        TEXT NOT NULL,                      -- 一句话设定
  observation  TEXT NOT NULL DEFAULT '',           -- 来自哪个生活观察
  rule         TEXT NOT NULL DEFAULT '',           -- 荒诞规则(一句话)
  escalation   TEXT NOT NULL DEFAULT '',           -- 升级 1 / 升级 2
  ending       TEXT NOT NULL DEFAULT '',           -- 结尾(反转/回扣/钩子)
  resources    TEXT NOT NULL DEFAULT '',           -- 所需资源
  risk         TEXT NOT NULL DEFAULT '',           -- 可拍性风险
  score_total  INTEGER NOT NULL DEFAULT 0,         -- 20 分制总分(0 表示未评分)
  status       TEXT NOT NULL DEFAULT 'pool',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);
