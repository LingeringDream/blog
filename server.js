const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const BLOG_API_KEY = process.env.BLOG_API_KEY;

// ==================== 中间件 ====================
app.use(express.json());
app.use(express.static('public'));

// Bearer Token 认证中间件
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.query.apiKey;

  if (!token || token !== BLOG_API_KEY) {
    return res.status(401).json({ error: '未授权：无效或缺失 API Key' });
  }
  next();
}

// ==================== 数据库初始化 ====================
const dbPath = process.env.DB_PATH || './blog.db';
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE,
    content TEXT NOT NULL,
    summary TEXT,
    tags TEXT,
    cover TEXT,
    published INTEGER DEFAULT 1,
    views INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// 数据库迁移：为旧表添加缺失字段
function migrate() {
  const columns = db.prepare("PRAGMA table_info(articles)").all().map(c => c.name);
  if (!columns.includes('published')) {
    db.exec('ALTER TABLE articles ADD COLUMN published INTEGER DEFAULT 1');
  }
  if (!columns.includes('cover')) {
    db.exec('ALTER TABLE articles ADD COLUMN cover TEXT');
  }
}
migrate();

// 插入示例数据（仅当表为空时）
const count = db.prepare('SELECT COUNT(*) AS cnt FROM articles').get().cnt;
if (count === 0) {
  const ins = db.prepare(`
    INSERT INTO articles (slug, title, content, summary, tags, published) VALUES (?, ?, ?, ?, ?, 1)
  `);
  ins.run('welcome', '欢迎来到我的博客',
    '这是我的第一篇博客文章。\n\n## 关于这个博客\n\n这里是我分享技术和生活的地方。\n\n```javascript\nconsole.log("Hello World");\n```',
    '欢迎来到我的博客，这里是我分享技术和生活的地方。', '技术,生活');
  ins.run('javascript-tips', '学习 JavaScript 的小技巧',
    '## 1. 使用可选链操作符\n\n```javascript\nconst name = user?.profile?.name;\n```\n\n## 2. 解构赋值\n\n```javascript\nconst { name, age } = person;\n```',
    '分享一些实用的 JavaScript 编程技巧。', 'JavaScript,编程');
  ins.run('css-animation', 'CSS 动画指南',
    '## 过渡动画\n\n```css\n.box {\n  transition: transform 0.3s ease;\n}\n\n.box:hover {\n  transform: scale(1.1);\n}\n```\n\n## 关键帧动画\n\n```css\n@keyframes fadeIn {\n  from { opacity: 0; }\n  to { opacity: 1; }\n}\n```',
    '如何使用 CSS 创建流畅的动画效果。', 'CSS,动画,前端');
  console.log('✅ 已插入示例文章');
}

// ==================== 工具函数 ====================
function rowToArticle(row) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    content: row.content,
    summary: row.summary,
    tags: row.tags ? row.tags.split(',') : [],
    cover: row.cover || '',
    published: !!row.published,
    views: row.views,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ==================== 公开 API ====================

// 获取文章列表（分页，仅已发布）
app.get('/api/articles', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const offset = (page - 1) * limit;

  const total = db.prepare('SELECT COUNT(*) AS cnt FROM articles WHERE published = 1').get().cnt;
  const rows = db.prepare(
    'SELECT * FROM articles WHERE published = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(limit, offset);

  res.json({
    articles: rows.map(rowToArticle),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// 获取单篇文章（通过 slug）
app.get('/api/articles/slug/:slug', (req, res) => {
  const row = db.prepare('SELECT * FROM articles WHERE slug = ?').get(req.params.slug);
  if (!row) return res.status(404).json({ error: '文章未找到' });

  db.prepare('UPDATE articles SET views = views + 1 WHERE slug = ?').run(req.params.slug);
  res.json(rowToArticle({ ...row, views: row.views + 1 }));
});

// 搜索文章
app.get('/api/articles/search', (req, res) => {
  const q = req.query.q;
  if (!q) return res.json([]);

  const term = `%${q}%`;
  const rows = db.prepare(`
    SELECT * FROM articles
    WHERE published = 1 AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)
    ORDER BY created_at DESC
  `).all(term, term, term);

  res.json(rows.map(rowToArticle));
});

// ==================== 管理 API（需要认证） ====================

// 获取所有文章（含草稿，分页）
app.get('/api/admin/articles', authenticate, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const offset = (page - 1) * limit;

  const total = db.prepare('SELECT COUNT(*) AS cnt FROM articles').get().cnt;
  const rows = db.prepare(
    'SELECT * FROM articles ORDER BY updated_at DESC LIMIT ? OFFSET ?'
  ).all(limit, offset);

  res.json({
    articles: rows.map(rowToArticle),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// 创建文章
app.post('/api/articles', authenticate, (req, res) => {
  const { title, slug, content, summary, tags, cover, published } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: '标题和内容不能为空' });
  }

  const articleSlug = slug || title.toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-|-$/g, '');

  const tagsStr = Array.isArray(tags) ? tags.join(',') : (tags || '');

  try {
    const result = db.prepare(`
      INSERT INTO articles (title, slug, content, summary, tags, cover, published)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title, articleSlug, content, summary || '', tagsStr, cover || '', published ? 1 : 0);

    const row = db.prepare('SELECT * FROM articles WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, message: '文章创建成功', article: rowToArticle(row) });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Slug 已存在，请使用不同的 slug' });
    }
    res.status(500).json({ error: '创建文章失败', details: err.message });
  }
});

// 更新文章
app.put('/api/articles/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: '文章未找到' });

  const { title, slug, content, summary, tags, cover, published } = req.body;
  const tagsStr = tags !== undefined
    ? (Array.isArray(tags) ? tags.join(',') : tags)
    : existing.tags;

  try {
    db.prepare(`
      UPDATE articles
      SET title = ?, slug = ?, content = ?, summary = ?, tags = ?, cover = ?, published = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title || existing.title,
      slug || existing.slug,
      content || existing.content,
      summary !== undefined ? summary : existing.summary,
      tagsStr,
      cover !== undefined ? cover : existing.cover,
      published !== undefined ? (published ? 1 : 0) : existing.published,
      id
    );

    const row = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
    res.json({ success: true, message: '文章更新成功', article: rowToArticle(row) });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Slug 已存在' });
    }
    res.status(500).json({ error: '更新文章失败', details: err.message });
  }
});

// 删除文章
app.delete('/api/articles/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: '文章未找到' });

  db.prepare('DELETE FROM articles WHERE id = ?').run(id);
  res.json({ success: true, message: '文章删除成功', deletedId: parseInt(id) });
});

// 获取设置
app.get('/api/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const row of rows) {
    try { settings[row.key] = JSON.parse(row.value); }
    catch { settings[row.key] = row.value; }
  }
  res.json(settings);
});

// 更新设置
app.put('/api/settings', authenticate, (req, res) => {
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const updateMany = db.transaction((entries) => {
    for (const [key, value] of entries) {
      upsert.run(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
  });
  updateMany(Object.entries(req.body));
  res.json({ success: true, message: '设置已保存' });
});

// API Key 验证
app.get('/api/verify', authenticate, (req, res) => {
  res.json({ success: true, message: 'API Key 验证成功' });
});

// SPA 路由：/post/:slug → post.html
app.get('/post/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'post.html'));
});

// ==================== 启动服务器 ====================
app.listen(PORT, () => {
  console.log(`博客服务器运行在 http://localhost:${PORT}`);
});
