-- ============================================================
-- 胡拍乱造创作组 · Supabase 数据库建表语句(PostgreSQL)
-- 使用方法:打开 Supabase 控制台 → SQL Editor → 新建查询
--   把本文件全部内容粘贴进去 → 点 Run 执行
-- ============================================================

-- ---------- 用户表 ----------
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'visitor',
  email         TEXT NOT NULL DEFAULT '',
  job_title     TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- 会话表 ----------
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- ---------- 入队申请表 ----------
CREATE TABLE IF NOT EXISTS applications (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  contact      TEXT NOT NULL,
  wish         TEXT NOT NULL DEFAULT '',
  on_camera    TEXT NOT NULL DEFAULT '',
  strengths    TEXT NOT NULL DEFAULT '',
  weakness     TEXT NOT NULL DEFAULT '',
  sunday_limit TEXT NOT NULL DEFAULT '',
  goal         TEXT NOT NULL DEFAULT '',
  message      TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'pending',
  reviewed_by  BIGINT,
  reviewed_at  TIMESTAMPTZ,
  reject_note  TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_apps_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);

-- ---------- 灵感卡表 ----------
CREATE TABLE IF NOT EXISTS ideas (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  observation TEXT NOT NULL DEFAULT '',
  rule        TEXT NOT NULL DEFAULT '',
  escalation  TEXT NOT NULL DEFAULT '',
  ending      TEXT NOT NULL DEFAULT '',
  resources   TEXT NOT NULL DEFAULT '',
  risk        TEXT NOT NULL DEFAULT '',
  score_total INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'pool',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);

-- ---------- 关闭 RLS (服务端用 service_role key 访问,无需 RLS) ----------
ALTER TABLE users        DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions     DISABLE ROW LEVEL SECURITY;
ALTER TABLE applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE ideas        DISABLE ROW LEVEL SECURITY;
