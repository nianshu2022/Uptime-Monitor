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
  alert_silence_hours: number; // 告警静默窗口（小时）
  last_alert_at: string | null; // 最近一次告警发送时间
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
      check_ssl?: number;
      check_domain?: number;
      alert_silence_hours?: number;
    }>();

    const fields: string[] = [];
    const values: unknown[] = [];

    if (body.check_ssl !== undefined) { fields.push('check_ssl = ?'); values.push(body.check_ssl ? 1 : 0); }
    if (body.check_domain !== undefined) { fields.push('check_domain = ?'); values.push(body.check_domain ? 1 : 0); }
    if (body.alert_silence_hours !== undefined) {
      const h = Number(body.alert_silence_hours);
      if (!isNaN(h) && h >= 0) { fields.push('alert_silence_hours = ?'); values.push(h); }
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

// 测试钉钉通知
app.post('/test-alert', async (c) => {
  try {
    const mockMonitor = { name: 'Test Monitor', url: 'https://example.com' } as Monitor;
    const result = await sendDingTalkAlert(c.env, mockMonitor, 'DOWN', '这是一条测试消息，用于验证 Markdown 格式是否生效。');
    return c.json({ success: true, dingtalk_response: result });
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

  // 判断是否在静默窗口内（避免同一问题频繁告警）
  const silenceHours = monitor.alert_silence_hours ?? 24;
  const lastAlertMs = monitor.last_alert_at ? new Date(monitor.last_alert_at).getTime() : 0;
  const silenced = silenceHours > 0 && (Date.now() - lastAlertMs) < silenceHours * 3600_000;

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
          const sent = await sendDingTalkAlert(env, monitor, 'DOWN', `错误原因: ${reason}`);
          if (sent) {
            await env.DB.prepare('UPDATE monitors SET last_alert_at = ? WHERE id = ?')
              .bind(new Date().toISOString(), monitor.id).run();
          }
          console.log(`Monitor ${monitor.name} is DOWN! Alert sent.`);
        } else {
          console.log(`Monitor ${monitor.name} is DOWN but silenced (${silenceHours}h window).`);
        }
      }
    } else if (monitor.status === 'DOWN') {
      // 持续 DOWN，静默窗口内不重复报警
      console.log(`Monitor ${monitor.name} is still DOWN.`);
    }
  } else {
    if (monitor.status === 'DOWN') {
      const sent = await sendDingTalkAlert(env, monitor, 'UP', `响应耗时: ${latency}ms`);
      if (sent) {
        await env.DB.prepare('UPDATE monitors SET last_alert_at = ? WHERE id = ?')
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
              check_ssl, check_domain, alert_silence_hours, last_alert_at
       FROM monitors
       WHERE paused = 0`
    ).all<Pick<Monitor, 'id' | 'name' | 'url' | 'cert_expiry' | 'domain_expiry' | 'check_ssl' | 'check_domain' | 'alert_silence_hours' | 'last_alert_at'>>();

    const now = Date.now();

    const tasks = results.map(async (monitor) => {
      // 静默窗口检查
      const silenceHours = monitor.alert_silence_hours ?? 24;
      const lastAlertMs = monitor.last_alert_at ? new Date(monitor.last_alert_at).getTime() : 0;
      const silenced = silenceHours > 0 && (now - lastAlertMs) < silenceHours * 3600_000;
      if (silenced) {
        console.log(`Expiry alert for ${monitor.url} silenced (${silenceHours}h window).`);
        return;
      }

      const checks: { label: string; dateStr: string | null; enabled: boolean }[] = [
        { label: 'SSL 证书', dateStr: monitor.cert_expiry, enabled: (monitor.check_ssl ?? 1) === 1 },
        { label: '域名', dateStr: monitor.domain_expiry, enabled: (monitor.check_domain ?? 1) === 1 },
      ];

      let alertSent = false;
      for (const check of checks) {
        if (!check.enabled || !check.dateStr) continue;
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
          const sent = await sendDingTalkAlert(env, monitor as Monitor, 'DOWN', detail);
          if (sent) alertSent = true;
        }
      }

      // 至少发送了一条告警，更新 last_alert_at
      if (alertSent) {
        await env.DB.prepare('UPDATE monitors SET last_alert_at = ? WHERE id = ?')
          .bind(new Date().toISOString(), monitor.id).run();
      }
    });

    await Promise.all(tasks);
    console.log('Expiry alert check completed.');
  } catch (e: unknown) {
    console.error('Expiry alert check error:', e);
  }
}

// ============================================================
// 钉钉机器人通知（Item 1: 移除硬编码密钥）
// ============================================================

async function sendDingTalkAlert(
  env: Bindings,
  monitor: Pick<Monitor, 'name' | 'url'>,
  type: 'DOWN' | 'UP',
  detail: string
): Promise<boolean> {
  // Item 1: 仅从环境变量读取，无硬编码密钥
  const accessToken = env.DINGTALK_ACCESS_TOKEN;
  const secret = env.DINGTALK_SECRET;

  if (!accessToken || !secret) {
    console.warn('DingTalk not configured: DINGTALK_ACCESS_TOKEN or DINGTALK_SECRET missing.');
    return false;
  }

  const timestamp = Date.now();
  const stringToSign = `${timestamp}\n${secret}`;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(stringToSign));
  const signBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  const signEncoded = encodeURIComponent(signBase64);

  const webhookUrl = `https://oapi.dingtalk.com/robot/send?access_token=${accessToken}&timestamp=${timestamp}&sign=${signEncoded}`;

  const isDown = type === 'DOWN';
  const title = isDown ? '🔴 服务故障报警' : '🟢 服务恢复通知';
  const color = isDown ? '#ff0000' : '#008000';
  const statusText = isDown ? '故障' : '正常';
  const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

  const markdownText = `
## ${title}

**监控对象**: ${monitor.name}

**监控地址**: [点击访问](${monitor.url})

**当前状态**: <font color="${color}">${statusText}</font>

**详细信息**: ${detail}

---
📅 告警时间: ${time}
  `.trim();

  const payload = {
    msgtype: 'markdown',
    markdown: { title, text: markdownText },
  };

  try {
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await resp.json<DingTalkResult>();
    if (result.errcode !== 0) {
      console.error('DingTalk API Error:', result);
      return false;
    }
    return true;
  } catch (e: unknown) {
    console.error('Failed to send DingTalk alert:', e);
    return false;
  }
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
