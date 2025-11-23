import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
  DINGTALK_ACCESS_TOKEN: string;
  DINGTALK_SECRET: string;
  ADMIN_PASSWORD?: string; // 可选，如果未设置则不鉴权（不推荐）
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('/*', cors());

// === 鉴权中间件 ===
app.use('/monitors/*', async (c, next) => {
  // 允许跨域预检请求直接通过
  if (c.req.method === 'OPTIONS') return await next();
  
  // 如果是公开接口，直接放行
  if (c.req.path.startsWith('/monitors/public')) {
    return await next();
  }

  const adminPassword = c.env.ADMIN_PASSWORD;
  // 如果没有设置环境变量，默认放行
  if (!adminPassword) return await next();

  const authHeader = c.req.header('Authorization');
  // 支持 "Bearer PASSWORD" 格式
  if (!authHeader || !authHeader.includes(adminPassword)) {
    return c.json({ error: 'Unauthorized: Invalid Password' }, 401);
  }

  await next();
});

// === API 路由 ===

// 获取所有监控项
app.get('/monitors', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM monitors').all();
    return c.json(results);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// 公开状态页数据 (只读，不含敏感信息)
app.get('/monitors/public', async (c) => {
  try {
    // 只选择需要的字段，甚至可以隐藏 url
    const { results } = await c.env.DB.prepare(
      'SELECT id, name, url, status, last_check, cert_expiry, domain_expiry FROM monitors'
    ).all();
    return c.json(results);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// 添加监控项
app.post('/monitors', async (c) => {
  try {
    const body = await c.req.json<any>();
    const { name, url, interval, keyword } = body;
    
    if (!name || !url) {
      return c.json({ error: 'Missing name or url' }, 400);
    }

    const result = await c.env.DB.prepare(
      'INSERT INTO monitors (name, url, interval, keyword) VALUES (?, ?, ?, ?)'
    ).bind(name, url, interval || 300, keyword || null).run();

    return c.json({ success: true, id: result.meta.last_row_id }, 201);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// 删除监控项
app.delete('/monitors/:id', async (c) => {
  const id = c.req.param('id');
  try {
    // 注意：由于外键约束，必须先删除子表(logs)的数据，再删除主表(monitors)的数据
    // 或者在定义表结构时使用 ON DELETE CASCADE
    await c.env.DB.prepare('DELETE FROM logs WHERE monitor_id = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM monitors WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// 获取指定监控项的最近日志
app.get('/monitors/:id/logs', async (c) => {
  const id = c.req.param('id');
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM logs WHERE monitor_id = ? ORDER BY created_at DESC LIMIT 20'
    ).bind(id).all();
    return c.json(results);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// 测试钉钉通知
app.post('/test-alert', async (c) => {
  try {
    const result = await sendDingTalkAlert(c.env, { name: 'Test Monitor', url: 'https://example.com' }, '这是一条测试消息，证明钉钉通知配置正确。');
    return c.json({ success: true, dingtalk_response: result });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// === 定时任务入口 ===

export default {
  fetch: app.fetch,
  
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(checkSites(env));
  },
};

// === 核心监测逻辑 ===

async function checkSites(env: Bindings) {
  console.log('Starting scheduled check...');
  const now = Date.now(); // 毫秒

  // 获取所有监控项
  // 优化点：生产环境应该在 SQL 中筛选 (last_check + interval < now)
  const { results } = await env.DB.prepare('SELECT * FROM monitors').all();
  
  // 使用 Promise.all 并发执行，提高效率
  const tasks = results.map(async (monitor: any) => {
    const shouldCheck = isTimeToCheck(monitor, now);
    if (shouldCheck) {
      await performCheck(monitor, env);
    }
  });

  await Promise.all(tasks);
}

function isTimeToCheck(monitor: any, now: number): boolean {
  // 如果状态是 RETRYING，每分钟都检查 (Cron 本身是每分钟触发)
  if (monitor.status === 'RETRYING') return true;

  // 正常状态，检查间隔
  const lastCheck = monitor.last_check ? new Date(monitor.last_check).getTime() : 0;
  const intervalMs = (monitor.interval || 300) * 1000;
  return (now - lastCheck) >= intervalMs;
}

async function performCheck(monitor: any, env: Bindings) {
  const startTime = Date.now();
  let status = 200;
  let isFail = false;
  let reason = '';

  try {
    const response = await fetch(monitor.url, {
      method: monitor.method || 'GET',
      headers: { 'User-Agent': 'Uptime-Monitor/1.0' },
      cf: {
        // 避免 Cloudflare 缓存，确保请求穿透
        cacheTtl: 0,
        cacheEverything: false
      }
    });
    
    status = response.status;
    
    if (!response.ok) {
      isFail = true;
      reason = `HTTP ${status}`;
    } else {
      // 请求成功，顺便检查一下是否需要更新域名/证书信息 (例如每 24 小时更新一次，或者从未更新过时)
      const lastInfoCheck = monitor.check_info_status ? new Date(monitor.check_info_status).getTime() : 0;
      // 24 小时 = 86400000 ms
      // 临时改为 0，强制更新一次，确认泛域名逻辑生效后可改回
      if (true || Date.now() - lastInfoCheck > 86400000) {
        // 异步执行，不阻塞主监测逻辑
        env.DB.prepare('UPDATE monitors SET check_info_status = ? WHERE id = ?').bind(new Date().toISOString(), monitor.id).run().then(() => {
           updateDomainCertInfo(env, monitor);
        }).catch(console.error);
      }
      
      if (monitor.keyword) {
        // 关键词检查
        const text = await response.text();
        if (!text.includes(monitor.keyword)) {
          isFail = true;
          reason = `Keyword "${monitor.keyword}" not found`;
        }
      }
    }

  } catch (e) {
    isFail = true;
    status = 0;
    // 尝试识别 SSL 相关错误
    const errorMsg = e.message || '';
    if (errorMsg.includes('handshake') || errorMsg.includes('certificate') || errorMsg.includes('SSL') || errorMsg.includes('TLS')) {
      reason = `SSL Error: ${errorMsg}`;
    } else if (errorMsg.includes('time') || errorMsg.includes('timeout')) {
      reason = 'Timeout';
    } else {
      reason = errorMsg || 'Network Error';
    }
  }

  const latency = Date.now() - startTime;

  // 状态机逻辑
  let newStatus = monitor.status;
  let newRetryCount = monitor.retry_count;

  if (isFail) {
    if (monitor.status === 'UP') {
      // 第一次失败，进入重试
      newStatus = 'RETRYING';
      newRetryCount = 1;
      console.log(`Monitor ${monitor.name} failed first time. Retrying...`);
    } else if (monitor.status === 'RETRYING') {
      // 重试中再次失败
      if (newRetryCount < 3) {
        newRetryCount++;
        console.log(`Monitor ${monitor.name} retry ${newRetryCount}/3 failed.`);
      } else {
        // 三次重试失败，确认 DOWN
        newStatus = 'DOWN';
        await sendDingTalkAlert(env, monitor, `Monitor is DOWN: ${reason}`);
        console.log(`Monitor ${monitor.name} is DOWN! Alert sent.`);
      }
    } else if (monitor.status === 'DOWN') {
      // 已经是 DOWN，持续 DOWN，不重复报警（或者可以设置间隔报警）
      console.log(`Monitor ${monitor.name} is still DOWN.`);
    }
  } else {
    // 成功
    if (monitor.status === 'DOWN') {
      // 从 DOWN 恢复
      await sendDingTalkAlert(env, monitor, `Monitor Recovered! Latency: ${latency}ms`);
      console.log(`Monitor ${monitor.name} recovered.`);
    }
    newStatus = 'UP';
    newRetryCount = 0;
  }

  // 更新数据库状态
  await env.DB.prepare(
    'UPDATE monitors SET last_check = ?, status = ?, retry_count = ? WHERE id = ?'
  ).bind(new Date().toISOString(), newStatus, newRetryCount, monitor.id).run();

  // 写入日志
  await env.DB.prepare(
    'INSERT INTO logs (monitor_id, status_code, latency, is_fail, reason) VALUES (?, ?, ?, ?, ?)'
  ).bind(monitor.id, status, latency, isFail ? 1 : 0, reason).run();
}

// 发送钉钉机器人通知 (支持加签)
async function sendDingTalkAlert(env: Bindings, monitor: any, message: string) {
  // 优先从环境变量读取，如果没有则使用硬编码 (不推荐生产环境硬编码)
  const accessToken = env.DINGTALK_ACCESS_TOKEN || '59f62a4b15f5fa9b7338ffaeacc5c199b537038ec79e57db681e48293cc6625d';
  const secret = env.DINGTALK_SECRET || 'SEC6243e3cced1f46b53340f22603f10fca92389f5891de46530a61ac30bc2da5c6';
  
  if (!accessToken || !secret) {
    console.warn('No DINGTALK_ACCESS_TOKEN or DINGTALK_SECRET configured.');
    return;
  }

  const timestamp = Date.now();
  const stringToSign = `${timestamp}\n${secret}`;
  
  // 计算 HMAC-SHA256 签名
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

  const payload = {
    msgtype: 'text',
    text: {
      content: `[Uptime Monitor] 警报\n\n监控对象: ${monitor.name}\nURL: ${monitor.url}\n时间: ${new Date().toLocaleString()}\n信息: ${message}`
    }
  };

  try {
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await resp.json<any>();
    if (result.errcode !== 0) {
      console.error('DingTalk API Error:', result);
    }
    return result;
  } catch (e) {
    console.error('Failed to send DingTalk alert:', e);
    return { errcode: -1, errmsg: e.message };
  }
}

// === 域名/证书信息更新逻辑 ===

async function updateDomainCertInfo(env: Bindings, monitor: any) {
  console.log(`Updating info for ${monitor.url}`);
  try {
    const urlObj = new URL(monitor.url);
    const domain = urlObj.hostname;
    
    // 1. 尝试获取证书信息 (通过 crt.sh 公开 API)
    let certExpiry = null;
    try {
      const headers = { 
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
      };

      const fetchCerts = async (searchDomain: string) => {
          try {
              const res = await fetch(`https://crt.sh/?q=${searchDomain}&output=json`, { headers });
              if (!res.ok) {
                  console.warn(`crt.sh fetch failed for ${searchDomain}: ${res.status}`);
                  return [];
              }
              const text = await res.text();
              try {
                  return JSON.parse(text);
              } catch {
                  console.warn(`crt.sh response for ${searchDomain} is not JSON`);
                  return [];
              }
          } catch (e) {
              console.warn('fetchCerts error:', e);
              return [];
          }
      };

      // 先查原始域名
      let certs = await fetchCerts(domain);
      
      // 如果没查到，且域名看起来像子域名，尝试查主域名
      if ((!certs || certs.length === 0) && domain.split('.').length > 2) {
         const parts = domain.split('.');
         const rootDomain = parts.slice(parts.length - 2).join('.');
         
         console.log(`Checking root domain for wildcard: ${rootDomain}`);
         // 查主域名
         const rootCerts = await fetchCerts(rootDomain);
         if (rootCerts.length > 0) certs = certs.concat(rootCerts);
         
         // 查显式泛域名
         const wildCerts = await fetchCerts(`%.${rootDomain}`);
         if (wildCerts.length > 0) certs = certs.concat(wildCerts);
      }

      if (certs && certs.length > 0) {
        const latestCert = certs.sort((a: any, b: any) => new Date(b.not_after).getTime() - new Date(a.not_after).getTime())[0];
        certExpiry = latestCert.not_after;
        console.log(`Found cert expiry for ${domain}: ${certExpiry}`);
      }
    } catch (e) {
      console.warn('Failed to fetch cert info:', e);
    }

    // 2. 尝试获取域名到期时间 (通过 RDAP)
    let domainExpiry = null;
    try {
      const rdapRes = await fetch(`https://rdap.org/domain/${domain}`);
      if (rdapRes.ok) {
        const rdapData = await rdapRes.json<any>();
        const events = rdapData.events || [];
        const expEvent = events.find((e: any) => e.eventAction.includes('expiration'));
        if (expEvent) {
          domainExpiry = expEvent.eventDate;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch RDAP info:', e);
    }

    // 更新数据库
    if (certExpiry || domainExpiry) {
      await env.DB.prepare(
        'UPDATE monitors SET cert_expiry = ?, domain_expiry = ? WHERE id = ?'
      ).bind(certExpiry, domainExpiry, monitor.id).run();
      console.log(`Updated info for ${domain}: Cert=${certExpiry}, Domain=${domainExpiry}`);
    }

  } catch (e) {
    console.error('Error in updateDomainCertInfo:', e);
  }
}
