# Uptime Monitor

<div align="center">
  <img src="https://img.shields.io/badge/Status-Operational-success?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/Cloudflare-Workers-orange?style=for-the-badge&logo=cloudflare" alt="Cloudflare Workers">
  <img src="https://img.shields.io/badge/Vue.js-3.0-4FC08D?style=for-the-badge&logo=vue.js" alt="Vue.js">
</div>

<br>

**Uptime Monitor** 是基于 Cloudflare 生态（Workers + Pages + D1）构建的轻量级网站监控系统。完全免费（利用 Cloudflare 免费额度），支持多站点监控、证书与域名过期检测、多渠道告警以及丰富的自定义数据配置。

## ✨ 核心特性

- **多站点高级监控**：HTTP/HTTPS 连通性检测，支持 GET/POST、自定义 Headers、请求 Body 以及关键词验证。
- **证书 & 域名监控**：自动检测 SSL 证书与域名有效期（由 RDAP 获取），支持独立开关与阈值控制。
- **丰富的告警渠道**：内置支持钉钉、企业微信、飞书、Telegram 机器人及自定义 Webhook。
- **告警频率策略**：支持按监控项独立设置基于"错误率阈值"的告警，以及"可用性/SSL/域名"各自分离的恢复静默期。
- **事件公告发布**：在公开状态页提供维护或紧急事件发布面板。
- **现代化页面**：Dark OLED 风格管理后台与公开展示页，提供标签分类、批量操作、自定义站点 Logo 及进出口 JSON 配置功能。
- **Serverless 零成本构架**：纯 Serverless 部署（Workers + D1 + Pages），数据私有化，无需服务器月费。

---

## 📸 界面预览

<div align="center">
  <img src="img/Uptime-Monitor-pc.png" alt="PC Status Page" width="100%"/>
  <br><em>公开状态页</em>
</div>

<br>

<div align="center">
  <img src="img/Uptime-Monitor-admin.png" alt="Admin Dashboard" width="100%"/>
  <br><em>管理后台（支持标签、批量操作与多渠道管理）</em>
</div>

---

## 🚀 部署指南

> **前置要求**：本地安装 [Node.js](https://nodejs.org/)，并执行以下命令登录 Cloudflare：
> ```bash
> npm install -g wrangler
> wrangler login
> ```

---

### 第一步：创建 D1 数据库

```bash
npx wrangler d1 create uptime-db
```

执行后终端会输出类似以下内容，**复制 `database_id`**：

```toml
[[d1_databases]]
binding = "DB"
database_name = "uptime-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"   # ← 复制这里
```

---

### 第二步：配置 wrangler.toml

打开 `worker/wrangler.toml`，将第一步的 `database_id` 填入：

```toml
[[d1_databases]]
binding = "DB"
database_name = "uptime-db"
database_id = "你的database_id"   # ← 替换为上一步复制的值
```

再添加管理后台的登录口令（二选一，都填时 API Key 优先）：

```toml
[vars]
ADMIN_API_KEY = "你自定义的登录口令"     # 推荐，任意字符串
# ADMIN_PASSWORD = "旧版密码（可选）"
```

---

### 第三步：初始化数据库表结构

```bash
cd worker
npx wrangler d1 execute uptime-db --remote --file=schema.sql
```

---

### 第四步：部署后端 Worker

```bash
npx wrangler deploy
```

部署成功后会输出 Worker 地址，形如：

```
https://uptime-worker.你的账号ID.workers.dev
```

**复制这个地址**，下一步要用。

---

### 第五步：部署前端 Pages

在项目根目录执行：

```bash
npx wrangler pages deploy frontend --project-name=uptime-monitor
```

> 若提示项目不存在，加上 `--branch=main` 参数，wrangler 会自动创建。

部署完成后会输出一个 `*.pages.dev` 地址，这就是你的前端访问入口。

---

### 第六步：设置 WORKER_URL 环境变量（关键！）

前端通过内置代理转发 API 请求，需要告诉它后端地址。

打开 **Cloudflare Dashboard → Workers & Pages → uptime-monitor → Settings → Environment variables**，点击 **Add variable**：

| 变量名 | 值 |
|---|---|
| `WORKER_URL` | `https://uptime-worker.你的账号ID.workers.dev` |

> ⚠️ Production 和 Preview 环境都要设置。

设置好后**重新部署**使其生效：

```bash
npx wrangler pages deploy frontend --project-name=uptime-monitor
```

---

### 第七步：验证部署

在浏览器访问以下地址，若返回 JSON 数据（`[]` 或监控列表），说明一切正常：

```
https://你的项目名.pages.dev/api/monitors/public
```

访问前端主页：

```
https://你的项目名.pages.dev/
```

---

## 🌏 国内访问说明

> `workers.dev` 域名在中国大陆被封锁，直接将 Worker 地址分享给国内用户会导致连接超时。

本项目已内置解决方案：前端部署在 `*.pages.dev`（国内可正常访问），通过 `_worker.js` 在 Cloudflare 内部将 API 请求代理到后端 Worker，**用户无需翻墙即可使用**。

如需绑定自定义域名（体验更稳定），在 Cloudflare Dashboard 中：
- **后端**：Worker → Settings → Domains & Routes → Add Custom Domain
- **前端**：Pages → uptime-monitor → Custom domains → Set up a custom domain

---

## 🛠️ 技术栈

| 模块 | 实现方案 |
|---|---|
| **API 服务层** | Cloudflare Workers + [Hono](https://hono.dev/) |
| **持久层 / 数据库** | Cloudflare D1 (Serverless SQLite) |
| **静态前端层** | Cloudflare Pages + Vue 3 (CDN) |
| **第三方探针接口** | `crt.sh` (SSL) · `rdap.org` (域名期限) |

---

## 📝 常见问题

**Q：如何添加通知渠道？**  
进入管理后台右上角的「通知渠道」，可视化添加钉钉、企微、飞书、Telegram、Webhook，添加后点击「测试」验证配置。

**Q：为什么 SSL 证书有效期没有显示？**  
证书信息由 Cron 每天定时从 `crt.sh` 拉取，首次添加监控后请等待下一次 Cron 触发（最多 24 小时）。

**Q：修改了站点设置但前端没变化？**  
请强制刷新页面（`Ctrl+Shift+R`），清除 Cloudflare CDN 缓存可在 Dashboard → Caching → Purge Cache 操作。

**Q：访问 `/api/monitors/public` 仍然显示前端页面？**  
说明 `WORKER_URL` 未生效。请确认环境变量已保存后**重新部署**一次前端。

---

&copy; 2025 [念舒](https://nianshu2022.cn). All Rights Reserved.
