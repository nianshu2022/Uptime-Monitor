# Uptime Monitor

<div align="center">
  <img src="https://img.shields.io/badge/Status-Operational-success?style=for-the-badge" alt="Status Operational">
  <img src="https://img.shields.io/badge/Cloudflare-Workers-orange?style=for-the-badge&logo=cloudflare" alt="Cloudflare Workers">
  <img src="https://img.shields.io/badge/Vue.js-3.0-4FC08D?style=for-the-badge&logo=vue.js" alt="Vue.js">
</div>

<br>

**Uptime Monitor** 是一个基于 Cloudflare 生态（Workers + Pages + D1）构建的轻量级、现代化网站监控系统。它完全免费（利用 Cloudflare 免费额度），支持多站点监控、SSL 证书检测、域名过期提醒以及钉钉机器人告警。

[查看演示 (Demo)](https://uptime.nianshu2022.cn) | [查看部署文档](DEPLOY.md)

## 📸 界面预览

<div align="center">
  <img src="img/Uptime-Monitor-pc.png" alt="PC Status Page" width="100%"/>
  <br>
  <em>公开状态页 (支持深色/浅色模式)</em>
</div>

<br>

<div align="center">
  <img src="img/Uptime-Monitor-admin.png" alt="Admin Dashboard" width="100%"/>
  <br>
  <em>管理后台</em>
</div>

<br>

<div align="center">
  <img src="img/Uptime-Monitor-app.png" alt="Mobile View" width="45%"/>
  <img src="img/Uptime-Monitor-down.png" alt="Down Status / Alert" width="45%"/>
  <br>
  <em>移动端适配 & 故障状态展示</em>
</div>

---

## ✨ 核心特性

- 🌍 **多站点监控**：支持 HTTP/HTTPS 连通性检测，自定义检查间隔。
- 🔒 **SSL 证书监控**：自动检测 SSL 证书有效期，支持泛域名证书。
- 📅 **域名过期提醒**：自动查询域名注册到期时间。
- 🤖 **多渠道告警**：支持钉钉机器人（Markdown 格式，含详细故障原因），具备重试防抖机制。
- 📱 **现代化 UI**：
  - **公开状态页**：霓虹/磨砂玻璃质感，支持深色/浅色模式自动切换，移动端完美适配。
  - **管理后台**：基于 Token 的安全认证，可视化的 Dashboard，支持日志查询与配置管理。
- ☁️ **Serverless 架构**：
  - **后端**：Cloudflare Workers (Hono 框架)。
  - **数据库**：Cloudflare D1 (SQLite)。
  - **前端**：Cloudflare Pages (Vue 3)。

## 🚀 快速开始

### 1. 环境准备
你需要一个 Cloudflare 账号，并安装 `Node.js` 和 `Wrangler CLI`。

### 2. 部署指南
详细的部署步骤请参考 [DEPLOY.md](DEPLOY.md)。

简单步骤概览：
1. 创建 D1 数据库 `uptime-db`。
2. 配置 `wrangler.toml` 中的数据库 ID 和钉钉 Token。
3. 初始化数据库表结构。
4. `npx wrangler deploy` 部署后端。
5. 修改前端 `API_BASE` 地址。
6. `npx wrangler pages deploy` 部署前端。

## 🛠️ 技术栈

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Database**: Cloudflare D1 (SQLite)
- **Frontend**: Vue 3 (CDN), TailwindCSS, FontAwesome
- **Tools**: Wrangler, RDAP, crt.sh

## 📄 需求文档

查看完整的功能规格与数据库设计：[REQUIREMENTS.md](REQUIREMENTS.md)

## 📝 版权信息

&copy; 2025 [念舒](https://nianshu2022.cn). All Rights Reserved.
此项目仅供学习与个人使用。

