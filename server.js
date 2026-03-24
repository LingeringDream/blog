const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const BLOG_API_KEY = process.env.BLOG_API_KEY;

// 中间件
app.use(express.json());
app.use(express.static('public'));

// API Key 认证中间件
function authenticateAPI(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!apiKey || apiKey !== BLOG_API_KEY) {
    return res.status(401).json({ error: '未授权：无效或缺失 API Key' });
  }
  
  next();
}

// 数据库初始化
const db = new Database('./blog.db');

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE,
    content TEXT NOT NULL,
    summary TEXT,
    tags TEXT,
    views INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 插入示例文章
const insertArticle = db.prepare(`
  INSERT OR IGNORE INTO articles (id, slug, title, content, summary, tags) VALUES 
    (?, ?, ?, ?, ?, ?)
`);

insertArticle.run(
  1, 
  'welcome', 
  '欢迎来到我的博客', 
  '这是我的第一篇博客文章。\n\n## 关于这个博客\n\n这里是我分享技术和生活的地方。\n\n```javascript\nconsole.log("Hello World");\n```', 
  '欢迎来到我的博客，这里是我分享技术和生活的地方。', 
  '技术,生活'
);

insertArticle.run(
  2, 
  'javascript-tips', 
  '学习 JavaScript 的小技巧', 
  '## 1. 使用可选链操作符\n\n```javascript\nconst name = user?.profile?.name;\n```\n\n## 2. 解构赋值\n\n```javascript\nconst { name, age } = person;\n```', 
  '分享一些实用的 JavaScript 编程技巧。', 
  'JavaScript,编程'
);

insertArticle.run(
  3, 
  'css-animation', 
  'CSS 动画指南', 
  '## 过渡动画\n\n```css\n.box {\n  transition: transform 0.3s ease;\n}\n\n.box:hover {\n  transform: scale(1.1);\n}\n```\n\n## 关键帧动画\n\n```css\n@keyframes fadeIn {\n  from { opacity: 0; }\n  to { opacity: 1; }\n}\n```', 
  '如何使用 CSS 创建流畅的动画效果。', 
  'CSS,动画,前端'
);

// ==================== API 路由 ====================

// 获取所有文章
app.get('/api/articles', (req, res) => {
  const rows = db.prepare('SELECT * FROM articles ORDER BY created_at DESC').all();
  const articles = rows.map(row => ({
    ...row,
    tags: row.tags ? row.tags.split(',') : []
  }));
  res.json(articles);
});

// 获取单篇文章（通过slug）
app.get('/api/articles/slug/:slug', (req, res) => {
  const { slug } = req.params;
  
  // 更新阅读量
  db.prepare('UPDATE articles SET views = views + 1 WHERE slug = ?').run(slug);
  
  const row = db.prepare('SELECT * FROM articles WHERE slug = ?').get(slug);
  
  if (!row) {
    return res.status(404).json({ error: '文章未找到' });
  }
  
  res.json({
    ...row,
    tags: row.tags ? row.tags.split(',') : []
  });
});

// 获取单篇文章（通过ID）
// 搜索文章
app.get('/api/search', (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.json([]);
  }
  
  const searchTerm = `%${q}%`;
  const rows = db.prepare(`
    SELECT * FROM articles 
    WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?
    ORDER BY created_at DESC
  `).all(searchTerm, searchTerm, searchTerm);
  
  const articles = rows.map(row => ({
    ...row,
    tags: row.tags ? row.tags.split(',') : []
  }));
  
  res.json(articles);
});
app.get('/api/articles/:id', (req, res) => {
  const { id } = req.params;
  
  // 更新阅读量
  db.prepare('UPDATE articles SET views = views + 1 WHERE id = ?').run(id);
  
  const row = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  
  if (!row) {
    return res.status(404).json({ error: '文章未找到' });
  }
  
  res.json({
    ...row,
    tags: row.tags ? row.tags.split(',') : []
  });
});

// 搜索文章
app.get('/api/search', (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.json([]);
  }
  
  const rows = db.prepare(`
    SELECT * FROM articles 
    WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?
    ORDER BY created_at DESC
  `).all(`%${q}%`, `%${q}%`, `%${q}%`);
  
  const articles = rows.map(row => ({
    ...row,
    tags: row.tags ? row.tags.split(',') : []
  }));
  
  res.json(articles);
});

// ==================== 文章管理 API (需要认证) ====================

// 创建文章
app.post('/api/articles', authenticateAPI, (req, res) => {
  const { title, slug, content, summary, tags } = req.body;
  
  if (!title || !content) {
    return res.status(400).json({ error: '标题和内容不能为空' });
  }
  
  // 生成 slug（如果未提供）
  const articleSlug = slug || title.toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-|-$/g, '');
  
  // 处理标签
  const tagsStr = Array.isArray(tags) ? tags.join(',') : tags;
  
  try {
    const result = db.prepare(`
      INSERT INTO articles (title, slug, content, summary, tags)
      VALUES (?, ?, ?, ?, ?)
    `).run(title, articleSlug, content, summary || '', tagsStr);
    
    const newArticle = db.prepare('SELECT * FROM articles WHERE id = ?').get(result.lastInsertRowid);
    
    res.status(201).json({
      success: true,
      message: '文章创建成功',
      article: {
        ...newArticle,
        tags: newArticle.tags ? newArticle.tags.split(',') : []
      }
    });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Slug 已存在，请使用不同的 slug' });
    }
    res.status(500).json({ error: '创建文章失败', details: err.message });
  }
});

// 更新文章
app.put('/api/articles/:id', authenticateAPI, (req, res) => {
  const { id } = req.params;
  const { title, slug, content, summary, tags } = req.body;
  
  const existing = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '文章未找到' });
  }
  
  // 处理标签
  const tagsStr = tags !== undefined 
    ? (Array.isArray(tags) ? tags.join(',') : tags) 
    : existing.tags;
  
  try {
    db.prepare(`
      UPDATE articles 
      SET title = ?, slug = ?, content = ?, summary = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title || existing.title,
      slug || existing.slug,
      content || existing.content,
      summary !== undefined ? summary : existing.summary,
      tagsStr,
      id
    );
    
    const updated = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
    
    res.json({
      success: true,
      message: '文章更新成功',
      article: {
        ...updated,
        tags: updated.tags ? updated.tags.split(',') : []
      }
    });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Slug 已存在' });
    }
    res.status(500).json({ error: '更新文章失败', details: err.message });
  }
});

// 删除文章
app.delete('/api/articles/:id', authenticateAPI, (req, res) => {
  const { id } = req.params;
  
  const existing = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '文章未找到' });
  }
  
  db.prepare('DELETE FROM articles WHERE id = ?').run(id);
  
  res.json({
    success: true,
    message: '文章删除成功',
    deletedId: parseInt(id)
  });
});

// API Key 验证接口（可选，用于测试）
app.get('/api/verify', authenticateAPI, (req, res) => {
  res.json({ success: true, message: 'API Key 验证成功' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`博客服务器运行在 http://localhost:${PORT}`);
});