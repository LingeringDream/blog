const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());
app.use(express.static('public'));

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

// 启动服务器
app.listen(PORT, () => {
  console.log(`博客服务器运行在 http://localhost:${PORT}`);
});