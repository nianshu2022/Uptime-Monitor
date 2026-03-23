-- ============================================================
-- Uptime Monitor Schema
-- 初始化（全新数据库使用此完整 SQL）
-- 增量迁移请使用文件末尾的 ALTER TABLE 语句
-- ============================================================

DROP TABLE IF EXISTS logs;
DROP TABLE IF EXISTS monitors;
DROP TABLE IF EXISTS incidents;
DROP TABLE IF EXISTS settings;

CREATE TABLE monitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  method TEXT DEFAULT 'GET',
  request_headers TEXT,                    -- JSON 格式自定义请求头
  request_body TEXT,                       -- POST 请求体
  interval INTEGER DEFAULT 300,
  status TEXT DEFAULT 'UP',
  retry_count INTEGER DEFAULT 0,
  last_check DATETIME,
  keyword TEXT,
  user_agent TEXT,
  tags TEXT,                               -- 逗号分隔标签，如 "prod,web"
  domain_expiry TEXT,
  cert_expiry TEXT,
  check_info_status TEXT,
  paused INTEGER DEFAULT 0,
  check_ssl INTEGER DEFAULT 1,             -- 是否检测 SSL 证书到期 (1=开, 0=关)
  check_domain INTEGER DEFAULT 1,          -- 是否检测域名到期 (1=开, 0=关)
  alert_silence_uptime INTEGER DEFAULT 24,  -- 可用性告警静默窗口（小时）
  alert_silence_ssl INTEGER DEFAULT 24,     -- SSL 证书告警静默窗口（小时）
  alert_silence_domain INTEGER DEFAULT 24,  -- 域名到期告警静默窗口（小时）
  alert_error_rate INTEGER DEFAULT 0,       -- 错误率阈值告警（百分比，0=关闭）
  last_alert_uptime TEXT,                   -- 可用性最近告警时间
  last_alert_ssl TEXT,                      -- SSL 证书最近告警时间
  last_alert_domain TEXT,                   -- 域名到期最近告警时间
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  monitor_id INTEGER,
  status_code INTEGER,
  latency INTEGER,
  is_fail INTEGER DEFAULT 0,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS notification_channels;

CREATE TABLE notification_channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,              -- dingtalk / wecom / feishu / telegram / webhook
  name TEXT NOT NULL,              -- 用户自定义名称
  enabled INTEGER DEFAULT 1,      -- 启用/禁用
  config TEXT NOT NULL DEFAULT '{}', -- JSON 格式的渠道配置
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 事件公告表
CREATE TABLE incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,             -- 事件标题
  description TEXT,                -- 详细描述
  severity TEXT DEFAULT 'info',    -- info / warning / critical
  status TEXT DEFAULT 'active',    -- active / resolved
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME             -- 解决时间（null=未解决）
);

-- 系统配置表（键值对）
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 预置默认配置
INSERT INTO settings (key, value) VALUES ('site_title', 'Uptime Monitor');
INSERT INTO settings (key, value) VALUES ('site_description', '实时监控服务运行状态');
INSERT INTO settings (key, value) VALUES ('site_logo_url', '');

-- ============================================================
-- 增量迁移脚本（已有数据库执行以下语句）
-- ============================================================

-- ALTER TABLE monitors ADD COLUMN request_headers TEXT;
-- ALTER TABLE monitors ADD COLUMN request_body TEXT;
-- ALTER TABLE monitors ADD COLUMN tags TEXT;
-- ALTER TABLE monitors ADD COLUMN alert_error_rate INTEGER DEFAULT 0;
--
-- CREATE TABLE IF NOT EXISTS incidents (
--   id INTEGER PRIMARY KEY AUTOINCREMENT,
--   title TEXT NOT NULL,
--   description TEXT,
--   severity TEXT DEFAULT 'info',
--   status TEXT DEFAULT 'active',
--   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--   updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--   resolved_at DATETIME
-- );
--
-- CREATE TABLE IF NOT EXISTS settings (
--   key TEXT PRIMARY KEY,
--   value TEXT NOT NULL,
--   updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
-- );
--
-- INSERT OR IGNORE INTO settings (key, value) VALUES ('site_title', 'Uptime Monitor');
-- INSERT OR IGNORE INTO settings (key, value) VALUES ('site_description', '实时监控服务运行状态');
-- INSERT OR IGNORE INTO settings (key, value) VALUES ('site_logo_url', '');
