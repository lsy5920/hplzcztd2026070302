-- ============================================================
-- 胡拍乱造 · 数据库结构升级(Supabase SQL Editor 执行)
-- 已有旧库的用户执行此文件；新建库直接用 schema_supabase.sql
-- ============================================================

-- users 表：新增邮箱 和 职位
ALTER TABLE users ADD COLUMN IF NOT EXISTS email     TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title TEXT NOT NULL DEFAULT '';

-- applications 表：新增关联用户 ID、驳回备注
ALTER TABLE applications ADD COLUMN IF NOT EXISTS user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS reject_note TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);

-- users 表：新增出生年份（整数，如 1998）
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_year INTEGER DEFAULT NULL;
