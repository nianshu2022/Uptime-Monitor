import { Hono } from 'hono';
import { cors } from 'hono/cors';

// ============================================================
// 类型定义 (Item 15: 消除 any，完善 TypeScript 类型)
// ============================================================

interface Monitor {
  id: number;
  name: string;
  url: string;
  method: string;
  interval: number;
  status: 'UP' | 'DOWN' | 'RETRYING' | 'PAUSED';
  retry_count: number;
  last_check: string | null;
  keyword: string | null;
  user_agent: string | null;
  domain_expiry: string | null;
  cert_expiry: string | null;
  check_info_status: string | null; // 记录上次更新证书信息的时间戳
  paused: number; // 0 = 正常, 1 = 已暂停
  check_ssl: number; // 1 = 检测 SSL 到期, 0 = 关闭
  check_domain: number; // 1 = 检测域名到期, 0 = 关闭
  alert_silence_uptime: number; // 可用性告警静默窗口（小时）
  alert_silence_ssl: number; // SSL 证书告警静默窗口（小时）
  alert_silence_domain: number; // 域名到期告警静默窗口（小时）
  last_alert_uptime: string | null;
  last_alert_ssl: string | null;
  last_alert_domain: string | null;
  created_at: string;
}

interface Log {
  id: number;
  monitor_id: number;
  status_code: number;
  latency: number;
  is_fail: number; // 0 = 成功, 1 = 失败
  reason: string | null;
  created_at: string;
}

interface DingTalkResult {
  errcode: number;
  errmsg: string;
}

interface NotificationChannel {
  id: number;
  type: 'dingtalk' | 'wecom' | 'feishu' | 'telegram' | 'webhook';
  name: string;
  enabled: number;
  config: string; // JSON string
  created_at: string;
}

type Bindings = {
  DB: D1Database;
  DINGTALK_ACCESS_TOKEN: string;
  DINGTALK_SECRET: string;
  ADMIN_PASSWORD?: string;
};

// ============================================================
// Hono 应用初始化
// ============================================================

const app = new Hono<{ Bindings: Bindings }>();

app.use('/*', cors());

// ============================================================
// 鉴权中间件 (Item 2: 精确匹配，修复 includes 漏洞)
// ============================================================

app.use('/monitors/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') return await next();
  if (c.req.path.startsWith('/monitors/public')) return await next();

  const adminPassword = c.env.ADMIN_PASSWORD;
  // 未配置密码时直接记录警告（生产环境不推荐）
  if (!adminPassword) {
    console.warn('ADMIN_PASSWORD is not set. All admin routes are unprotected!');
    return await next();
  }

  const authHeader = c.req.header('Authorization');
  // Item 2: 精确匹配，防止子字符串绕过
  if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
    return c.json({ error: 'Unauthorized: Invalid Password' }, 401);
  }

  await next();
});

// ============================================================
// API 路由
// ============================================================

// 获取所有监控项（管理后台用，含敏感字段）
app.get('/monitors', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM monitors ORDER BY created_at ASC').all<Monitor>();
    return c.json(results);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

// 公开状态页数据（不含敏感字段）
app.get('/monitors/public', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, name, url, status, last_check, cert_expiry, domain_expiry, paused FROM monitors ORDER BY created_at ASC'
    ).all<Pick<Monitor, 'id' | 'name' | 'url' | 'status' | 'last_check' | 'cert_expiry' | 'domain_expiry' | 'paused'>>();
    return c.json(results);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

// 添加监控项 (Item 14: 添加后立即触发证书/域名信息获取)
app.post('/monitors', async (c) => {
  try {
    const body = await c.req.json<Partial<Monitor>>();
    const { name, url, interval, keyword, user_agent } = body;

    if (!name || !url) {
      return c.json({ error: 'Missing name or url' }, 400);
    }

    const result = await c.env.DB.prepare(
      'INSERT INTO monitors (name, url, interval, keyword, user_agent) VALUES (?, ?, ?, ?, ?)'
    ).bind(name, url, interval || 300, keyword || null, user_agent || null).run();

    const newId = result.meta.last_row_id as number;

    // Item 14: 立即异步触发一次证书/域名信息获取
    c.executionCtx.waitUntil(
      (async () => {
        try {
          // 标记 check_info_status 防止 checkSites cron 重复触发
          await c.env.DB.prepare('UPDATE monitors SET check_info_status = ? WHERE id = ?')
            .bind(new Date().toISOString(), newId)
            .run();
          const { results } = await c.env.DB.prepare('SELECT * FROM monitors WHERE id = ?')
            .bind(newId)
            .all<Monitor>();
          if (results[0]) {
            await updateDomainCertInfo(c.env, results[0]);
          }
        } catch (err) {
          console.error('Initial cert check failed:', err);
        }
      })()
    );

    return c.json({ success: true, id: newId }, 201);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

// 删除监控项（同时清理日志）
app.delete('/monitors/:id', async (c) => {
  const id = c.req.param('id');
  try {
    await c.env.DB.prepare('DELETE FROM logs WHERE monitor_id = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM monitors WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

// 更新监控配置（功能开关 + 告警静默窗口）
app.patch('/monitors/:id/config', async (c) => {
  const id = c.req.param('id');
  try {
    const body = await c.req.json<{
      name?: string;
      url?: string;
      keyword?: string;
      user_agent?: string;
      check_ssl?: number;
      check_domain?: number;
      alert_silence_hours?: number;
    }>();

    const fields: string[] = [];
    const values: unknown[] = [];

    // 基础信息字段
    if (body.name !== undefined && body.name.trim()) { fields.push('name = ?'); values.push(body.name.trim()); }
    if (body.url !== undefined && body.url.trim()) { fields.push('url = ?'); values.push(body.url.trim()); }
    if (body.keyword !== undefined) { fields.push('keyword = ?'); values.push(body.keyword || null); }
    if (body.user_agent !== undefined) { fields.push('user_agent = ?'); values.push(body.user_agent || null); }
    if ((body as any).interval !== undefined) {
      const iv = Number((body as any).interval);
      if (!isNaN(iv) && iv >= 60) { fields.push('interval = ?'); values.push(iv); }
    }

    // 功能开关与静默窗口
    const silenceMap: Record<string, string> = {
      check_ssl: 'check_ssl',
      check_domain: 'check_domain',
      alert_silence_uptime: 'alert_silence_uptime',
      alert_silence_ssl: 'alert_silence_ssl',
      alert_silence_domain: 'alert_silence_domain',
    };
    for (const [key, col] of Object.entries(silenceMap)) {
      const val = (body as Record<string, unknown>)[key];
      if (val === undefined) continue;
      if (col.startsWith('check_')) {
        fields.push(`${col} = ?`); values.push(val ? 1 : 0);
      } else {
        const h = Number(val);
        if (!isNaN(h) && h >= 0) { fields.push(`${col} = ?`); values.push(h); }
      }
    }

    if (fields.length === 0) return c.json({ error: 'No valid fields to update' }, 400);
    values.push(id);

    await c.env.DB.prepare(
      `UPDATE monitors SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return c.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

// 切换监控暂停状态 (Item 6: 新增接口)
app.patch('/monitors/:id/pause', async (c) => {
  const id = c.req.param('id');
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT paused, status FROM monitors WHERE id = ?'
    ).bind(id).all<Pick<Monitor, 'paused' | 'status'>>();

    if (!results[0]) {
      return c.json({ error: 'Monitor not found' }, 404);
    }

    const currentlyPaused = results[0].paused === 1;
    const newPaused = currentlyPaused ? 0 : 1;
    // 从暂停恢复时重置为 UP，暂停时设为 PAUSED
    const newStatus: Monitor['status'] = newPaused ? 'PAUSED' : 'UP';

    await c.env.DB.prepare(
      'UPDATE monitors SET paused = ?, status = ?, retry_count = 0 WHERE id = ?'
    ).bind(newPaused, newStatus, id).run();

    return c.json({ success: true, paused: newPaused === 1, status: newStatus });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

// 获取指定监控项的最近日志（增至50条以支持趋势图）
app.get('/monitors/:id/logs', async (c) => {
  const id = c.req.param('id');
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM logs WHERE monitor_id = ? ORDER BY created_at DESC LIMIT 50'
    ).bind(id).all<Log>();
    return c.json(results);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

// ============================================================
// 通知渠道管理 (CRUD + Test)
// ============================================================

// 脱敏：隐藏密钥中间部分
function maskSecret(val: string): string {
  if (!val || val.length <= 8) return '****';
  return val.slice(0, 4) + '****' + val.slice(-4);
}

function maskChannelConfig(channel: NotificationChannel): NotificationChannel {
  try {
    const cfg = JSON.parse(channel.config) as Record<string, unknown>;
    const masked: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(cfg)) {
      if (typeof v === 'string' && ['secret', 'token', 'access_token', 'bot_token', 'key'].some(s => k.toLowerCase().includes(s))) {
        masked[k] = maskSecret(v);
      } else {
        masked[k] = v;
      }
    }
    return { ...channel, config: JSON.stringify(masked) };
  } catch { return channel; }
}

// 获取所有通知渠道（脱敏返回）
app.get('/notification-channels', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM notification_channels ORDER BY created_at DESC'
    ).all<NotificationChannel>();
    return c.json((results || []).map(maskChannelConfig));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

// 添加通知渠道
app.post('/notification-channels', async (c) => {
  try {
    const body = await c.req.json<{ type: string; name: string; config: Record<string, unknown>; enabled?: number }>();
    if (!body.type || !body.name || !body.config) {
      return c.json({ error: 'Missing required fields: type, name, config' }, 400);
    }
    const validTypes = ['dingtalk', 'wecom', 'feishu', 'telegram', 'webhook'];
    if (!validTypes.includes(body.type)) {
      return c.json({ error: `Invalid type. Valid: ${validTypes.join(', ')}` }, 400);
    }
    await c.env.DB.prepare(
      'INSERT INTO notification_channels (type, name, enabled, config) VALUES (?, ?, ?, ?)'
    ).bind(body.type, body.name, body.enabled ?? 1, JSON.stringify(body.config)).run();
    return c.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

// 更新通知渠道
app.patch('/notification-channels/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const body = await c.req.json<{ name?: string; enabled?: number; config?: Record<string, unknown> }>();
    const fields: string[] = [];
    const values: unknown[] = [];
    if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name); }
    if (body.enabled !== undefined) { fields.push('enabled = ?'); values.push(body.enabled); }

    // config 合并逻辑：只有 config 对象包含实际键值时才更新，防止空对象覆盖原有配置
    if (body.config !== undefined && Object.keys(body.config).length > 0) {
      // 读取当前 config，与新 config 做字段级合并（空字符串""的字段保留原值）
      const existing = await c.env.DB.prepare(
        'SELECT config FROM notification_channels WHERE id = ?'
      ).bind(id).first<{ config: string }>();

      let mergedConfig: Record<string, unknown> = {};
      if (existing?.config) {
        try { mergedConfig = JSON.parse(existing.config) as Record<string, unknown>; } catch { /**/ }
      }
      // 合并：只有新值非空字符串时才覆盖旧值
      for (const [k, v] of Object.entries(body.config)) {
        if (v !== '' && v !== null && v !== undefined) {
          mergedConfig[k] = v;
        }
      }
      fields.push('config = ?');
      values.push(JSON.stringify(mergedConfig));
    }

    if (fields.length === 0) return c.json({ error: 'No valid fields' }, 400);
    values.push(id);
    await c.env.DB.prepare(
      `UPDATE notification_channels SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run();
    return c.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

// 删除通知渠道
app.delete('/notification-channels/:id', async (c) => {
  const id = c.req.param('id');
  try {
    await c.env.DB.prepare('DELETE FROM notification_channels WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

// 测试指定通知渠道
app.post('/notification-channels/:id/test', async (c) => {
  const id = c.req.param('id');
  try {
    const channel = await c.env.DB.prepare(
      'SELECT * FROM notification_channels WHERE id = ?'
    ).bind(id).first<NotificationChannel>();
    if (!channel) return c.json({ error: 'Channel not found' }, 404);
    const mockMonitor = { name: 'Test Monitor', url: 'https://example.com' } as Monitor;
    const sent = await sendToChannel(channel, mockMonitor, 'DOWN', '这是一条测试消息，用于验证通知渠道是否配置正确。');
    return c.json({ success: sent });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

// 保留旧的 test-alert 接口向后兼容
app.post('/test-alert', async (c) => {
  try {
    const mockMonitor = { name: 'Test Monitor', url: 'https://example.com' } as Monitor;
    const sent = await sendAlertToAllChannels(c.env, mockMonitor, 'DOWN', '这是一条测试消息，用于验证通知渠道配置。');
    return c.json({ success: sent });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return c.json({ error: msg }, 500);
  }
});

// ============================================================
// 定时任务入口
// ============================================================

export default {
  fetch: app.fetch,

  async scheduled(_event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(runScheduledTasks(env));
  },
};

async function runScheduledTasks(env: Bindings) {
  const hour = new Date().getUTCHours();

  const tasks: Promise<void>[] = [checkSites(env)];

  // 每天 UTC 02:00（北京时间 10:00）执行一次耗时任务
  if (hour === 2) {
    tasks.push(cleanupLogs(env));
    tasks.push(checkExpiryAlerts(env));
  }

  await Promise.all(tasks);
}

// ============================================================
// 核心监测逻辑
// ============================================================

async function checkSites(env: Bindings) {
  console.log('Starting scheduled check...');
  const now = Date.now();

  const { results } = await env.DB.prepare('SELECT * FROM monitors').all<Monitor>();

  const tasks = results.map(async (monitor) => {
    // Item 6: 跳过已暂停的监控项
    if (monitor.paused === 1) return;

    if (isTimeToCheck(monitor, now)) {
      await performCheck(monitor, env);
    }
  });

  await Promise.all(tasks);
}

function isTimeToCheck(monitor: Monitor, now: number): boolean {
  if (monitor.status === 'RETRYING') return true;
  const lastCheck = monitor.last_check ? new Date(monitor.last_check).getTime() : 0;
  const intervalMs = (monitor.interval || 300) * 1000;
  return now - lastCheck >= intervalMs;
}

async function performCheck(monitor: Monitor, env: Bindings) {
  const startTime = Date.now();
  let status = 200;
  let isFail = false;
  let reason = '';

  try {
    const response = await fetch(monitor.url, {
      method: monitor.method || 'GET',
      headers: {
        'User-Agent': monitor.user_agent || 'Uptime-Monitor/1.0',
      },
      cf: {
        cacheTtl: 0,
        cacheEverything: false,
      } as RequestInitCfProperties,
    });

    status = response.status;

    if (!response.ok) {
      isFail = true;
      reason = `HTTP ${status}`;
    } else {
      // 每 24 小时刷新一次证书/域名信息
      const lastInfoCheck = monitor.check_info_status
        ? new Date(monitor.check_info_status).getTime()
        : 0;
      if (Date.now() - lastInfoCheck > 86400000) {
        env.DB.prepare('UPDATE monitors SET check_info_status = ? WHERE id = ?')
          .bind(new Date().toISOString(), monitor.id)
          .run()
          .then(() => updateDomainCertInfo(env, monitor))
          .catch(console.error);
      }

      if (monitor.keyword) {
        const text = await response.text();
        if (!text.includes(monitor.keyword)) {
          isFail = true;
          reason = `Keyword "${monitor.keyword}" not found`;
        }
      }
    }
  } catch (e: unknown) {
    isFail = true;
    status = 0;
    const errorMsg = e instanceof Error ? e.message : 'Unknown error';
    if (
      errorMsg.includes('handshake') ||
      errorMsg.includes('certificate') ||
      errorMsg.includes('SSL') ||
      errorMsg.includes('TLS')
    ) {
      reason = `SSL Error: ${errorMsg}`;
    } else if (errorMsg.includes('time') || errorMsg.includes('timeout')) {
      reason = 'Timeout';
    } else {
      reason = errorMsg || 'Network Error';
    }
  }

  const latency = Date.now() - startTime;

  // 状态机逻辑
  let newStatus: Monitor['status'] = monitor.status;
  let newRetryCount = monitor.retry_count;

  // 判断可用性告警是否在静默窗口内
  const silenceHoursUptime = monitor.alert_silence_uptime ?? 24;
  const lastAlertUptimeMs = monitor.last_alert_uptime ? new Date(monitor.last_alert_uptime).getTime() : 0;
  const silenced = silenceHoursUptime > 0 && (Date.now() - lastAlertUptimeMs) < silenceHoursUptime * 3600_000;

  if (isFail) {
    if (monitor.status === 'UP') {
      newStatus = 'RETRYING';
      newRetryCount = 1;
      console.log(`Monitor ${monitor.name} failed first time. Retrying...`);
    } else if (monitor.status === 'RETRYING') {
      if (newRetryCount < 3) {
        newRetryCount++;
        console.log(`Monitor ${monitor.name} retry ${newRetryCount}/3 failed.`);
      } else {
        newStatus = 'DOWN';
        if (!silenced) {
          const sent = await sendAlertToAllChannels(env, monitor, 'DOWN', `错误原因: ${reason}`);
          if (sent) {
            await env.DB.prepare('UPDATE monitors SET last_alert_uptime = ? WHERE id = ?')
              .bind(new Date().toISOString(), monitor.id).run();
          }
          console.log(`Monitor ${monitor.name} is DOWN! Alert sent.`);
        } else {
          console.log(`Monitor ${monitor.name} is DOWN but silenced (${silenceHoursUptime}h window).`);
        }
      }
    } else if (monitor.status === 'DOWN') {
      // 持续 DOWN，静默窗口内不重复报警
      console.log(`Monitor ${monitor.name} is still DOWN.`);
    }
  } else {
    if (monitor.status === 'DOWN') {
      const sent = await sendAlertToAllChannels(env, monitor, 'UP', `响应耗时: ${latency}ms`);
      if (sent) {
        await env.DB.prepare('UPDATE monitors SET last_alert_uptime = ? WHERE id = ?')
          .bind(new Date().toISOString(), monitor.id).run();
      }
      console.log(`Monitor ${monitor.name} recovered.`);
    }
    newStatus = 'UP';
    newRetryCount = 0;
  }

  await env.DB.prepare(
    'UPDATE monitors SET last_check = ?, status = ?, retry_count = ? WHERE id = ?'
  )
    .bind(new Date().toISOString(), newStatus, newRetryCount, monitor.id)
    .run();

  await env.DB.prepare(
    'INSERT INTO logs (monitor_id, status_code, latency, is_fail, reason) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(monitor.id, status, latency, isFail ? 1 : 0, reason || null)
    .run();
}

// ============================================================
// 日志自动清理 (Item 13)
// ============================================================

async function cleanupLogs(env: Bindings) {
  console.log('Starting log cleanup...');
  try {
    // 删除 30 天前的日志
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { meta: deletedOld } = await env.DB.prepare(
      'DELETE FROM logs WHERE created_at < ?'
    )
      .bind(thirtyDaysAgo)
      .run();
    console.log(`Deleted ${deletedOld.changes} old logs (>30d).`);

    // 每个监控项保留最近 1000 条
    const { results } = await env.DB.prepare(
      'SELECT id FROM monitors'
    ).all<{ id: number }>();

    for (const monitor of results) {
      await env.DB.prepare(`
        DELETE FROM logs
        WHERE monitor_id = ?
          AND id NOT IN (
            SELECT id FROM logs
            WHERE monitor_id = ?
            ORDER BY created_at DESC
            LIMIT 1000
          )
      `)
        .bind(monitor.id, monitor.id)
        .run();
    }
    console.log('Log cleanup completed.');
  } catch (e: unknown) {
    console.error('Log cleanup error:', e);
  }
}

// ============================================================
// SSL / 域名到期主动告警 (Item 10)
// ============================================================

async function checkExpiryAlerts(env: Bindings) {
  console.log('Checking expiry alerts...');
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, name, url, cert_expiry, domain_expiry,
              check_ssl, check_domain,
              alert_silence_ssl, alert_silence_domain,
              last_alert_ssl, last_alert_domain
       FROM monitors
       WHERE paused = 0`
    ).all<Pick<Monitor, 'id' | 'name' | 'url' | 'cert_expiry' | 'domain_expiry' | 'check_ssl' | 'check_domain' | 'alert_silence_ssl' | 'alert_silence_domain' | 'last_alert_ssl' | 'last_alert_domain'>>();

    const now = Date.now();

    const tasks = results.map(async (monitor) => {
      const checks: {
        label: string;
        dateStr: string | null;
        enabled: boolean;
        silenceHours: number;
        lastAlertAt: string | null;
        lastAlertField: string;
      }[] = [
        {
          label: 'SSL 证书',
          dateStr: monitor.cert_expiry,
          enabled: (monitor.check_ssl ?? 1) === 1,
          silenceHours: monitor.alert_silence_ssl ?? 24,
          lastAlertAt: monitor.last_alert_ssl ?? null,
          lastAlertField: 'last_alert_ssl',
        },
        {
          label: '域名',
          dateStr: monitor.domain_expiry,
          enabled: (monitor.check_domain ?? 1) === 1,
          silenceHours: monitor.alert_silence_domain ?? 24,
          lastAlertAt: monitor.last_alert_domain ?? null,
          lastAlertField: 'last_alert_domain',
        },
      ];
      for (const check of checks) {
        if (!check.enabled || !check.dateStr) continue;

        // 各检测项独立静默窗口
        const lastMs = check.lastAlertAt ? new Date(check.lastAlertAt).getTime() : 0;
        if (check.silenceHours > 0 && (now - lastMs) < check.silenceHours * 3600_000) {
          console.log(`${check.label} alert for ${monitor.url} silenced (${check.silenceHours}h).`);
          continue;
        }

        const daysLeft = Math.ceil(
          (new Date(check.dateStr).getTime() - now) / (1000 * 60 * 60 * 24)
        );

        let detail = '';
        if (daysLeft <= 0) {
          detail = `❌ ${check.label}已过期，请立即续期处理！`;
        } else if (daysLeft <= 7) {
          detail = `🚨 ${check.label}紧急预警，仅剩 ${daysLeft} 天到期，请尽快续期！`;
        } else if (daysLeft <= 30) {
          detail = `⏰ ${check.label}到期提醒，还有 ${daysLeft} 天到期，请注意续期。`;
        }

        if (detail) {
          const sent = await sendAlertToAllChannels(env, monitor as Monitor, 'DOWN', detail);
          if (sent) {
            await env.DB.prepare(`UPDATE monitors SET ${check.lastAlertField} = ? WHERE id = ?`)
              .bind(new Date().toISOString(), monitor.id).run();
          }
        }
      }
    });

    await Promise.all(tasks);
    console.log('Expiry alert check completed.');
  } catch (e: unknown) {
    console.error('Expiry alert check error:', e);
  }
}

// ============================================================
// 多渠道通知分发
// ============================================================

// 构建通用通知消息文本
function buildAlertMessage(monitor: Pick<Monitor, 'name' | 'url'>, type: 'DOWN' | 'UP', detail: string) {
  const isDown = type === 'DOWN';
  const title = isDown ? '🔴 服务故障报警' : '🟢 服务恢复通知';
  const statusText = isDown ? '故障' : '正常';
  const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  return { title, statusText, time, isDown, detail, monitorName: monitor.name, monitorUrl: monitor.url };
}

// 统一分发：优先从 DB 读取渠道，回退到环境变量钉钉
async function sendAlertToAllChannels(
  env: Bindings,
  monitor: Pick<Monitor, 'name' | 'url'>,
  type: 'DOWN' | 'UP',
  detail: string
): Promise<boolean> {
  let anySent = false;

  // 1. 从 DB 读取所有启用的渠道
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM notification_channels WHERE enabled = 1'
    ).all<NotificationChannel>();
    if (results && results.length > 0) {
      const tasks = results.map(ch => sendToChannel(ch, monitor, type, detail));
      const outcomes = await Promise.allSettled(tasks);
      anySent = outcomes.some(o => o.status === 'fulfilled' && o.value === true);
      return anySent;
    }
  } catch (e) {
    console.error('Failed to read notification channels from DB:', e);
  }

  // 2. 回退：环境变量钉钉配置
  if (env.DINGTALK_ACCESS_TOKEN && env.DINGTALK_SECRET) {
    const fallbackChannel: NotificationChannel = {
      id: 0, type: 'dingtalk', name: 'ENV DingTalk', enabled: 1,
      config: JSON.stringify({ access_token: env.DINGTALK_ACCESS_TOKEN, secret: env.DINGTALK_SECRET }),
      created_at: '',
    };
    return sendToChannel(fallbackChannel, monitor, type, detail);
  }

  console.warn('No notification channels configured.');
  return false;
}

// 按类型路由到对应发送函数
async function sendToChannel(
  channel: NotificationChannel,
  monitor: Pick<Monitor, 'name' | 'url'>,
  type: 'DOWN' | 'UP',
  detail: string
): Promise<boolean> {
  const cfg = JSON.parse(channel.config) as Record<string, string>;
  try {
    switch (channel.type) {
      case 'dingtalk': return await sendDingTalk(cfg, monitor, type, detail);
      case 'wecom':    return await sendWeCom(cfg, monitor, type, detail);
      case 'feishu':   return await sendFeishu(cfg, monitor, type, detail);
      case 'telegram': return await sendTelegram(cfg, monitor, type, detail);
      case 'webhook':  return await sendWebhook(cfg, monitor, type, detail);
      default:
        console.warn(`Unknown channel type: ${channel.type}`);
        return false;
    }
  } catch (e) {
    console.error(`Failed to send via ${channel.type} (${channel.name}):`, e);
    return false;
  }
}

// ── 钉钉 ──────────────────────────────────────────────────────
async function sendDingTalk(
  cfg: Record<string, string>,
  monitor: Pick<Monitor, 'name' | 'url'>,
  type: 'DOWN' | 'UP',
  detail: string
): Promise<boolean> {
  const { access_token, secret } = cfg;
  if (!access_token || !secret) { console.warn('DingTalk config missing.'); return false; }

  const timestamp = Date.now();
  const stringToSign = `${timestamp}\n${secret}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(stringToSign));
  const signBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  const signEncoded = encodeURIComponent(signBase64);

  const webhookUrl = `https://oapi.dingtalk.com/robot/send?access_token=${access_token}&timestamp=${timestamp}&sign=${signEncoded}`;
  const msg = buildAlertMessage(monitor, type, detail);
  const color = msg.isDown ? '#ff0000' : '#008000';

  const markdownText = `## ${msg.title}\n\n**监控对象**: ${msg.monitorName}\n\n**监控地址**: [点击访问](${msg.monitorUrl})\n\n**当前状态**: <font color="${color}">${msg.statusText}</font>\n\n**详细信息**: ${msg.detail}\n\n---\n📅 告警时间: ${msg.time}`;

  const resp = await fetch(webhookUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msgtype: 'markdown', markdown: { title: msg.title, text: markdownText } }),
  });
  const result = await resp.json<DingTalkResult>();
  if (result.errcode !== 0) { console.error('DingTalk API Error:', result); return false; }
  return true;
}

// ── 企业微信 ──────────────────────────────────────────────────
async function sendWeCom(
  cfg: Record<string, string>,
  monitor: Pick<Monitor, 'name' | 'url'>,
  type: 'DOWN' | 'UP',
  detail: string
): Promise<boolean> {
  const { key } = cfg;
  if (!key) { console.warn('WeCom config missing.'); return false; }

  const webhookUrl = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${key}`;
  const msg = buildAlertMessage(monitor, type, detail);
  const content = `${msg.title}\n> **监控对象**: ${msg.monitorName}\n> **监控地址**: [点击访问](${msg.monitorUrl})\n> **当前状态**: <font color="${msg.isDown ? 'warning' : 'info'}">${msg.statusText}</font>\n> **详细信息**: ${msg.detail}\n> 📅 告警时间: ${msg.time}`;

  const resp = await fetch(webhookUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msgtype: 'markdown', markdown: { content } }),
  });
  const result = await resp.json<{ errcode: number }>();
  if (result.errcode !== 0) { console.error('WeCom API Error:', result); return false; }
  return true;
}

// ── 飞书 ──────────────────────────────────────────────────────
async function sendFeishu(
  cfg: Record<string, string>,
  monitor: Pick<Monitor, 'name' | 'url'>,
  type: 'DOWN' | 'UP',
  detail: string
): Promise<boolean> {
  const { webhook_url, secret } = cfg;
  if (!webhook_url) { console.warn('Feishu config missing.'); return false; }

  let url = webhook_url;
  // 飞书签名
  if (secret) {
    const timestamp = Math.floor(Date.now() / 1000);
    const stringToSign = `${timestamp}\n${secret}`;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(stringToSign), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', key, enc.encode(''));
    const sign = btoa(String.fromCharCode(...new Uint8Array(signature)));
    const msg = buildAlertMessage(monitor, type, detail);
    const content = `${msg.title}\n\n监控对象: ${msg.monitorName}\n监控地址: ${msg.monitorUrl}\n当前状态: ${msg.statusText}\n详细信息: ${msg.detail}\n告警时间: ${msg.time}`;

    const resp = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timestamp: String(timestamp), sign, msg_type: 'text', content: { text: content } }),
    });
    const result = await resp.json<{ code: number }>();
    if (result.code !== 0) { console.error('Feishu API Error:', result); return false; }
    return true;
  }

  const msg = buildAlertMessage(monitor, type, detail);
  const content = `${msg.title}\n\n监控对象: ${msg.monitorName}\n监控地址: ${msg.monitorUrl}\n当前状态: ${msg.statusText}\n详细信息: ${msg.detail}\n告警时间: ${msg.time}`;

  const resp = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msg_type: 'text', content: { text: content } }),
  });
  const result = await resp.json<{ code: number }>();
  if (result.code !== 0) { console.error('Feishu API Error:', result); return false; }
  return true;
}

// ── Telegram ──────────────────────────────────────────────────
async function sendTelegram(
  cfg: Record<string, string>,
  monitor: Pick<Monitor, 'name' | 'url'>,
  type: 'DOWN' | 'UP',
  detail: string
): Promise<boolean> {
  const { bot_token, chat_id } = cfg;
  if (!bot_token || !chat_id) { console.warn('Telegram config missing.'); return false; }

  const msg = buildAlertMessage(monitor, type, detail);
  const emoji = msg.isDown ? '🔴' : '🟢';
  const text = `${emoji} <b>${msg.title}</b>\n\n<b>监控对象:</b> ${msg.monitorName}\n<b>监控地址:</b> <a href="${msg.monitorUrl}">${msg.monitorUrl}</a>\n<b>当前状态:</b> ${msg.statusText}\n<b>详细信息:</b> ${msg.detail}\n\n📅 <i>${msg.time}</i>`;

  const apiUrl = `https://api.telegram.org/bot${bot_token}/sendMessage`;
  const resp = await fetch(apiUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  const result = await resp.json<{ ok: boolean }>();
  if (!result.ok) { console.error('Telegram API Error:', result); return false; }
  return true;
}

// ── 自定义 Webhook ────────────────────────────────────────────
async function sendWebhook(
  cfg: Record<string, string>,
  monitor: Pick<Monitor, 'name' | 'url'>,
  type: 'DOWN' | 'UP',
  detail: string
): Promise<boolean> {
  const { url, method, headers: headersStr } = cfg;
  if (!url) { console.warn('Webhook config missing.'); return false; }

  const msg = buildAlertMessage(monitor, type, detail);
  const payload = {
    event: type === 'DOWN' ? 'monitor.down' : 'monitor.up',
    monitor: { name: msg.monitorName, url: msg.monitorUrl },
    status: msg.statusText,
    detail: msg.detail,
    timestamp: msg.time,
  };

  let parsedHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  if (headersStr) {
    try { parsedHeaders = { ...parsedHeaders, ...JSON.parse(headersStr) }; } catch { /* ignore */ }
  }

  const resp = await fetch(url, {
    method: (method || 'POST').toUpperCase(),
    headers: parsedHeaders,
    body: JSON.stringify(payload),
  });
  return resp.ok;
}


// ============================================================
// 域名 / 证书信息更新逻辑
// ============================================================

async function updateDomainCertInfo(env: Bindings, monitor: Monitor) {
  console.log(`Updating info for ${monitor.url}`);
  try {
    const urlObj = new URL(monitor.url);
    const domain = urlObj.hostname;

    // 如果是 IP 地址则跳过
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) {
      console.log(`Skipping cert/domain check for IP address: ${domain}`);
      return;
    }

    let certExpiry: string | null = null;
    try {
      const browserUA =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      const headers = { 'User-Agent': browserUA };

      const fetchCerts = async (searchDomain: string): Promise<Record<string, unknown>[]> => {
        try {
          const res = await fetch(`https://crt.sh/?q=${searchDomain}&output=json`, { headers });
          if (!res.ok) return [];
          const text = await res.text();
          try {
            return JSON.parse(text) as Record<string, unknown>[];
          } catch {
            return [];
          }
        } catch {
          return [];
        }
      };

      let certs = await fetchCerts(domain);

      if (certs.length === 0 && domain.split('.').length > 2) {
        const parts = domain.split('.');
        const rootDomain = parts.slice(parts.length - 2).join('.');
        const rootCerts = await fetchCerts(rootDomain);
        const wildCerts = await fetchCerts(`%.${rootDomain}`);
        certs = [...rootCerts, ...wildCerts];
      }

      if (certs.length > 0) {
        const nowMs = Date.now();
        // crt.sh 的 not_after 有时为 "2025-03-25 11:59:59"（空格而非 T），
        // 需要归一化后才能被 new Date() 正确解析。
        const parseExpiry = (s: string) =>
          new Date(s.replace(' ', 'T')).getTime();

        // 优先只在尚未过期的证书中取最晚到期时间，
        // 避免 crt.sh 历史旧证书污染结果。
        const validCerts = certs.filter((c) => {
          const exp = parseExpiry(c.not_after as string);
          return !isNaN(exp) && exp > nowMs;
        });
        const source = validCerts.length > 0 ? validCerts : certs;
        const sorted = source.sort(
          (a, b) =>
            parseExpiry(b.not_after as string) -
            parseExpiry(a.not_after as string)
        );
        // 统一存储为带 T 的 ISO 格式
        certExpiry = (sorted[0].not_after as string).replace(' ', 'T');
        console.log(`Found cert expiry for ${domain}: ${certExpiry}`);
      }
    } catch (e) {
      console.warn('Failed to fetch cert info:', e);
    }

    let domainExpiry: string | null = null;
    try {
      const rdapRes = await fetch(`https://rdap.org/domain/${domain}`);
      if (rdapRes.ok) {
        const rdapData = await rdapRes.json<{
          events?: { eventAction: string; eventDate: string }[];
        }>();
        const events = rdapData.events || [];
        const expEvent = events.find((e) => e.eventAction.includes('expiration'));
        if (expEvent) {
          domainExpiry = expEvent.eventDate;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch RDAP info:', e);
    }

    if (certExpiry || domainExpiry) {
      await env.DB.prepare(
        'UPDATE monitors SET cert_expiry = ?, domain_expiry = ? WHERE id = ?'
      )
        .bind(certExpiry, domainExpiry, monitor.id)
        .run();
      console.log(`Updated info for ${domain}: Cert=${certExpiry}, Domain=${domainExpiry}`);
    }
  } catch (e: unknown) {
    console.error('Error in updateDomainCertInfo:', e);
  }
}
