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
- **告警频率策略**：支持按监控项独立设置基于“错误率阈值”的告警，以及“可用性/SSL/域名”各自分离的恢复静默期。
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

该项目依赖于 Cloudflare 环境。部署前请确保在本地已运行 `npm install -g wrangler` 并且执行了 `wrangler login`。

### 1. 创建 D1 数据库
```bash
npx wrangler d1 create uptime-db
```
执行后，请记录下终端返回的 `database_id`。

### 2. 配置 Worker 和 秘钥
修改 `worker/wrangler.toml` 文件，填入：
- `database_id`：上面获取的 ID。
- 在 `[vars]` 下配制您的后台登录秘钥：
  ```toml
  [vars]
  ADMIN_API_KEY = "您的专属登录口令"   # 优先级别高，可任意自定义
  ADMIN_PASSWORD = "旧版密码体系保留" # 如果没有设置 API Key 则退回此项
  ```

### 3. 初始化数据库结构
```bash
cd worker
npx wrangler d1 execute uptime-db --remote --file=schema.sql
```

### 4. 部署后端 (Worker)
```bash
npx wrangler deploy
```
部署成功后你将得到一个形如 `https://uptime-worker.xxx.workers.dev` 的地址，请**复制该地址**用于下一步。

### 5. 绑定到前端并部署 (Pages)
1. 打开 `frontend/admin.html` 和 `frontend/index.html`。
2. 将文件末尾的 `const API_BASE = 'https://...';` 替换为您刚刚部署的 Worker 后端完整地址 URL。
3. 执行前端部署命令：
```bash
cd ../frontend
npx wrangler pages deploy . --project-name uptime-monitor
```
> **提示**：为防止跨域或国内网络污染被拦截，建议到 Cloudflare Dashboard 分别给 Worker 和 Pages **绑定自定义域名**。

---

## 🛠️ 技术栈与系统架构

| 模块 | 实现方案 |
|---|---|
| **API 服务层** | Cloudflare Workers + [Hono 路由框架](https://hono.dev/) |
| **持久层 / 数据库** | Cloudflare D1 (Serverless SQLite) |
| **静态前端层** | Cloudflare Pages + Vue 3 (CDN版) + TailwindCSS |
| **第三方探针接口** | `crt.sh` (SSL) · `rdap.org` (域名期限) | 

---

## 📝 维护与答疑

- **如何添加通知渠道？**
  进入后台右上角的“通知渠道”，您可以可视化添加并配置钉钉、企微、飞书、TG、Webhook 等令牌的映射并在线点击“测试”即可验证配置。

- **为什么有些 SSL 证书不返回时间？**
  证书是由内部机制每天定时根据 `crt.sh` 数据拉取的，初次加入监控请等待其通过 Cron 首次刷新。

- **修改了状态页设置前端没生效？**
  请耐心刷新页面确保未受各级 CDN 缓存（如浏览器或 Cloudflare Cache）的影响。

&copy; 2025 [念舒](https://nianshu2022.cn). All Rights Reserved.
