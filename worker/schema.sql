DROP TABLE IF EXISTS logs;
DROP TABLE IF EXISTS monitors;

CREATE TABLE monitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  method TEXT DEFAULT 'GET',
  interval INTEGER DEFAULT 300,
  status TEXT DEFAULT 'UP',
  retry_count INTEGER DEFAULT 0,
  last_check DATETIME,
  keyword TEXT,
  user_agent TEXT,
  domain_expiry TEXT,
  cert_expiry TEXT,
  check_info_status TEXT,
  paused INTEGER DEFAULT 0,
  check_ssl INTEGER DEFAULT 1,             -- 是否检测 SSL 证书到期 (1=开, 0=关)
  check_domain INTEGER DEFAULT 1,          -- 是否检测域名到期 (1=开, 0=关)
  alert_silence_hours INTEGER DEFAULT 24,  -- 告警静默窗口（小时），同一问题在此时间内只报一次
  last_alert_at TEXT,                      -- 最近一次告警发送时间（ISO 字符串）
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
