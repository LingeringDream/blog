# Lightweight Blog

一个轻量化的个人博客系统，支持 Markdown 编辑和暗色模式。

## 功能特点

- 📝 Markdown 文章编辑（基于 marked.js + highlight.js 代码高亮）
- 🎨 暗色/亮色主题切换
- 🔐 Bearer Token 认证的管理后台
- 📱 响应式设计
- ⚡ SQLite 轻量数据库（WAL 模式）
- 🚀 前后端一体化
- 📑 自动生成文章目录
- 🔍 文章搜索
- 📊 阅读量统计

## 快速开始

```bash
# 安装依赖
npm install

# 创建环境变量文件
cp .env.example .env
# 编辑 .env 设置你的 BLOG_API_KEY

# 启动服务
node server.js

# 访问
open http://localhost:3000
```

## 环境变量

创建 `.env` 文件：

```
PORT=3000
BLOG_API_KEY=your-secure-token
# DB_PATH=./blog.db
```

## 目录结构

```
blog/
├── server.js        # 后端服务 (Express + SQLite)
├── package.json     # 依赖配置
├── .env             # 环境变量（需自行创建）
├── public/          # 前端文件
│   ├── index.html   # 博客首页
│   ├── post.html    # 文章详情
│   ├── admin.html   # 管理后台
│   ├── style.css    # 样式
│   └── app.js       # 前端逻辑
└── data/            # SQLite 数据库（自动创建）
```

## API 接口

### 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/articles` | 文章列表（分页） |
| GET | `/api/articles/slug/:slug` | 获取文章详情 |
| GET | `/api/articles/search?q=` | 搜索文章 |
| GET | `/api/settings` | 获取网站设置 |

### 管理接口（需 Bearer Token）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/verify` | 验证 Token |
| GET | `/api/admin/articles` | 所有文章（含草稿） |
| POST | `/api/articles` | 创建文章 |
| PUT | `/api/articles/:id` | 更新文章 |
| DELETE | `/api/articles/:id` | 删除文章 |
| PUT | `/api/settings` | 更新设置 |

认证方式：`Authorization: Bearer <BLOG_API_KEY>`

## Docker 部署

### 快速启动（开发/测试）

```bash
cp .env.example .env
# 编辑 .env 设置 BLOG_API_KEY
docker compose up -d
# 访问 http://localhost:3000
```

### 生产部署（含 Nginx + SSL）

详见 [DEPLOY.md](./DEPLOY.md)，包含完整的分步指引：

- 服务器准备与 Docker 安装
- Nginx 反向代理配置
- Let's Encrypt 免费 SSL 证书申请与自动续期
- 数据备份与恢复
- 日常运维与故障排查

```bash
docker compose -f docker-compose.prod.yml up -d
```

## 技术栈

- **后端**: Express + better-sqlite3
- **前端**: 原生 JavaScript + marked.js + highlight.js
- **样式**: 自定义 CSS（支持暗色模式）

## License

MIT
