/**
 * Cloudflare Pages Advanced Mode — _worker.js
 *
 * 处理所有请求：
 *  - /api/* → 代理到后端 Worker（WORKER_URL 环境变量）
 *  - 其他   → 服务静态资源（index.html / admin.html）
 *
 * 在 Cloudflare Pages → Settings → Environment variables 中设置：
 *   WORKER_URL = https://uptime-worker.<your-account-id>.workers.dev
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // OPTIONS 预检请求直接放行
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // 代理 /api/* → Worker
    if (url.pathname.startsWith('/api/')) {
      const workerUrl = env.WORKER_URL;
      if (!workerUrl) {
        return new Response(
          JSON.stringify({ error: 'WORKER_URL environment variable is not set' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // /api/monitors/public → /monitors/public
      const targetPath = url.pathname.slice(4);
      const targetUrl = `${workerUrl.replace(/\/$/, '')}${targetPath}${url.search}`;

      const proxyRequest = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      });

      const response = await fetch(proxyRequest);

      const newHeaders = new Headers(response.headers);
      newHeaders.set('Access-Control-Allow-Origin', '*');
      newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    // 其他路径 → 服务静态资源（SPA fallback）
    const assetResponse = await env.ASSETS.fetch(request);

    // 如果静态资源不存在（404），返回 index.html 让 Vue Router 处理
    if (assetResponse.status === 404) {
      const indexUrl = new URL('/', url.origin);
      return env.ASSETS.fetch(new Request(indexUrl, request));
    }

    return assetResponse;
  },
};
