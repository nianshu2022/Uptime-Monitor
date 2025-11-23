ALTER TABLE monitors ADD COLUMN domain_expiry DATETIME;
ALTER TABLE monitors ADD COLUMN cert_expiry DATETIME;
ALTER TABLE monitors ADD COLUMN check_info_status TEXT; -- 用于记录上次查询信息的状态

