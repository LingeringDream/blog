<p align="center">
  <br>
  <img src="https://img.shields.io/badge/Node.js-18-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-3-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-blueviolet?style=for-the-badge" />
  <br><br>
  <img src="https://img.shields.io/badge/Markdown-000000?style=flat-square&logo=markdown&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat-square&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/CSS3-Custom-1572B6?style=flat-square&logo=css3&logoColor=white" />
  <img src="https://img.shields.io/badge/highlight.js-11.x-紫色?style=flat-square" />
  <img src="https://img.shields.io/badge/marked.js-12.x-green?style=flat-square" />
  <img src="https://img.shields.io/badge/multer-1.x-orange?style=flat-square" />
  <br><br>
</p>

<h1 align="center">✨ Lightweight Blog</h1>

<p align="center">
  <b>A lightweight personal blog system — ready out of the box, Docker one-click deploy</b><br>
  <b>轻量级个人博客系统 — 开箱即用，Docker 一键部署</b>
</p>

<p align="center">
  <a href="#-中文">🇨🇳 中文</a> · <a href="#-english">🇺🇸 English</a>
</p>

---

# 🇨🇳 中文

## ✨ 功能特点

<details open>
<summary><b>📝 写作</b></summary>

- Markdown 编辑器，实时预览
- 代码高亮（highlight.js） + 一键复制代码块
- 自动保存 + 版本历史，支持回滚
- AI 生成封面图
- 本地图片上传
- 文章置顶 · 密码保护 · 可见性控制（公开/不公开/私密）

</details>

<details open>
<summary><b>🎨 展示</b></summary>

- 亮色 / 暗色主题切换
- 个人信息主页（头像、简介、技能标签、项目展示、经历时间线）
- 归档页（按年月分组）· 标签云 · 发布日历热力图
- 历史上的今天 · 首页文章搜索（`Ctrl+K`）

</details>

<details open>
<summary><b>📱 适配 & 性能</b></summary>

- 三档响应式（1024px / 768px / 480px）· 移动端汉堡菜单
- SQLite WAL 模式 · 图片懒加载
- JSON-LD + Open Graph + RSS + Sitemap
- Docker 健康检查 · 非 root 运行

</details>

## 🚀 快速开始

### Docker（推荐）

```bash
git clone <your-repo-url> blog && cd blog
cp .env.example .env   # 编辑 .env，设置 BLOG_API_KEY
docker compose up -d
# → http://localhost:3000
```

### Node.js

```bash
npm install
cp .env.example .env
node server.js
```

## ⚙️ 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | 服务端口 |
| `BLOG_API_KEY` | `changeme` | 管理后台登录令牌 |
| `DB_PATH` | `./blog.db` | 数据库文件路径 |
| `UPLOAD_DIR` | `./public/uploads` | 上传文件目录 |
| `UPLOAD_MAX_SIZE` | `5` | 上传大小限制（MB） |

## 📡 API 接口

<details>
<summary>公开接口（14 个）</summary>

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/articles` | 文章列表 |
| GET | `/api/articles/slug/:slug` | 文章详情 |
| GET | `/api/articles/search?q=` | 搜索 |
| GET | `/api/settings` | 网站设置 |
| GET | `/api/profile` | 个人信息 |
| GET | `/api/profile/stats` | 博客统计 |
| GET | `/api/archive` | 归档 |
| GET | `/api/tags` | 标签列表 |
| GET | `/api/tags/:tag` | 按标签获取 |
| GET | `/api/calendar` | 日历 |
| GET | `/api/on-this-day` | 历史上的今天 |
| POST | `/api/articles/:id/verify-password` | 验证密码 |
| GET | `/rss.xml` | RSS |
| GET | `/sitemap.xml` | Sitemap |

</details>

<details>
<summary>管理接口（Bearer Token 认证，13 个）</summary>

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/verify` | 验证令牌 |
| GET | `/api/admin/articles` | 所有文章 |
| POST | `/api/articles` | 创建 |
| PUT | `/api/articles/:id` | 更新 |
| DELETE | `/api/articles/:id` | 删除 |
| PUT | `/api/settings` | 更新设置 |
| PUT | `/api/profile` | 更新个人信息 |
| POST | `/api/upload` | 上传文件 |
| POST | `/api/ai/generate-cover` | AI 封面 |
| POST | `/api/articles/:id/autosave` | 自动保存 |
| GET | `/api/articles/:id/versions` | 版本历史 |
| POST | `/api/articles/:id/restore/:vid` | 恢复版本 |
| GET | `/api/export` | 导出文章 |

</details>

## 📁 目录结构

```
blog/
├── server.js                  # Express 后端
├── package.json
├── Dockerfile
├── docker-compose.yml
├── docker-compose.prod.yml    # 生产部署（Nginx + SSL）
├── DEPLOY.md                  # 部署指南
├── .env                       # 环境变量
├── public/
│   ├── index.html             # 首页
│   ├── post.html              # 文章详情
│   ├── archive.html           # 归档
│   ├── tags.html              # 标签
│   ├── calendar.html          # 日历
│   ├── about.html             # 个人信息
│   ├── 404.html               # 404 页面
│   ├── admin.html             # 管理后台
│   ├── app.js                 # 前端逻辑
│   ├── style.css              # 全局样式
│   └── uploads/               # 上传文件
└── data/                      # SQLite 数据库
```

## 📄 License

MIT

---

# 🇺🇸 English

## ✨ Features

<details open>
<summary><b>📝 Writing</b></summary>

- Markdown editor with live preview
- Syntax highlighting (highlight.js) + one-click code copy
- Auto-save + version history with rollback
- AI-generated cover images
- Local image upload
- Pin posts · Password protection · Visibility control (public / unlisted / private)

</details>

<details open>
<summary><b>🎨 Presentation</b></summary>

- Light / Dark theme toggle
- Personal profile page (avatar, bio, skill tags, project showcase, experience timeline)
- Archive page (grouped by year/month) · Tag cloud · Publish calendar heatmap
- On this day · Homepage article search (`Ctrl+K`)

</details>

<details open>
<summary><b>📱 Responsive & Performance</b></summary>

- Three-tier responsive design (1024px / 768px / 480px) · Mobile hamburger menu
- SQLite WAL mode · Lazy image loading
- JSON-LD + Open Graph + RSS + Sitemap
- Docker health checks · Non-root runtime

</details>

## 🚀 Quick Start

### Docker (Recommended)

```bash
git clone <your-repo-url> blog && cd blog
cp .env.example .env   # Edit .env — set your BLOG_API_KEY
docker compose up -d
# → http://localhost:3000
```

### Node.js

```bash
npm install
cp .env.example .env
node server.js
```

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `BLOG_API_KEY` | `changeme` | Admin login token |
| `DB_PATH` | `./blog.db` | Database file path |
| `UPLOAD_DIR` | `./public/uploads` | Upload directory |
| `UPLOAD_MAX_SIZE` | `5` | Max upload size (MB) |

## 📡 API Endpoints

<details>
<summary>Public APIs (14 endpoints)</summary>

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/articles` | Article list |
| GET | `/api/articles/slug/:slug` | Article detail |
| GET | `/api/articles/search?q=` | Search |
| GET | `/api/settings` | Site settings |
| GET | `/api/profile` | Profile |
| GET | `/api/profile/stats` | Blog stats |
| GET | `/api/archive` | Archive |
| GET | `/api/tags` | Tag list |
| GET | `/api/tags/:tag` | Articles by tag |
| GET | `/api/calendar` | Calendar |
| GET | `/api/on-this-day` | On this day |
| POST | `/api/articles/:id/verify-password` | Verify password |
| GET | `/rss.xml` | RSS feed |
| GET | `/sitemap.xml` | Sitemap |

</details>

<details>
<summary>Admin APIs (Bearer Token auth, 13 endpoints)</summary>

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/verify` | Verify token |
| GET | `/api/admin/articles` | All articles |
| POST | `/api/articles` | Create |
| PUT | `/api/articles/:id` | Update |
| DELETE | `/api/articles/:id` | Delete |
| PUT | `/api/settings` | Update settings |
| PUT | `/api/profile` | Update profile |
| POST | `/api/upload` | Upload file |
| POST | `/api/ai/generate-cover` | AI cover |
| POST | `/api/articles/:id/autosave` | Auto-save |
| GET | `/api/articles/:id/versions` | Version history |
| POST | `/api/articles/:id/restore/:vid` | Restore version |
| GET | `/api/export` | Export articles |

</details>

## 📁 Project Structure

```
blog/
├── server.js                  # Express backend
├── package.json
├── Dockerfile
├── docker-compose.yml
├── docker-compose.prod.yml    # Production (Nginx + SSL)
├── DEPLOY.md                  # Deployment guide
├── .env                       # Environment variables
├── public/
│   ├── index.html             # Homepage
│   ├── post.html              # Article detail
│   ├── archive.html           # Archive
│   ├── tags.html              # Tags
│   ├── calendar.html          # Calendar
│   ├── about.html             # Profile
│   ├── 404.html               # 404 page
│   ├── admin.html             # Admin panel
│   ├── app.js                 # Frontend logic
│   ├── style.css              # Global styles
│   └── uploads/               # Uploaded files
└── data/                      # SQLite database
```

## 📄 License

MIT
