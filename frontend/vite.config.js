import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

/**
 * 条件注入插件 —— 根据环境变量有条件地注入第三方脚本
 */
function conditionalScripts(env) {
  return {
    name: 'conditional-scripts',
    transformIndexHtml(html) {
      const adsenseClient = env.VITE_ADSENSE_CLIENT || '';
      const cfToken = env.VITE_CF_ANALYTICS_TOKEN || '';

      html = html.replace(
        '<!-- __ADSENSE_SCRIPT__ -->',
        adsenseClient
          ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}" crossorigin="anonymous"><\/script>`
          : ''
      );

      html = html.replace(
        '<!-- __CF_ANALYTICS_SCRIPT__ -->',
        cfToken
          ? `<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "${cfToken}"}'><\/script>`
          : ''
      );

      // 替换页脚环境变量占位符
      html = html.replace(/%VITE_FOOTER_AUTHOR%/g, env.VITE_FOOTER_AUTHOR || 'Uptime Monitor');
      html = html.replace(/%VITE_FOOTER_URL%/g, env.VITE_FOOTER_URL || '#');

      return html;
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      vue(),
      conditionalScripts(env),
    ],

    // SPA 单入口
    build: {
      rollupOptions: {
        input: './index.html',
      },
    },

    // 开发代理 — 默认代理到本地 Worker，也可通过 VITE_WORKER_URL 指向线上
    server: {
      proxy: {
        '/api': {
          target: env.VITE_WORKER_URL || 'http://127.0.0.1:8787',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});
