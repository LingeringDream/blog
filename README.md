# Lightweight Blog

一个轻量化的个人博客系统，支持 Markdown 和 AI 封面图片生成。

## 功能特点

- 📝 Markdown 文章编辑
- 🎨 AI 自动生成封面图片（需配置 BizyAir）
- 🔐 令牌认证的管理后台
- 📱 响应式设计
- ⚡ SQLite 轻量数据库
- 🚀 前后端一体化

## 快速开始

```bash
# 安装依赖
npm install

# 启动服务
node server.js

# 访问
open http://localhost:3000
```

## 环境变量

创建 `.env` 文件：

```
PORT=3000
ADMIN_TOKEN=your-secure-token
BIZYAIR_API_KEY=your-bizyair-key  # 可选，用于AI图片生成
```

## 目录结构

```
blog/
├── server.js        # 后端服务
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

## 技术栈

- **后端**: Express + better-sqlite3 + marked
- **前端**: 原生 JavaScript + Fetch API
- **样式**: 自定义 CSS（无框架）

## License

MIT
