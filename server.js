const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const BLOG_API_KEY = process.env.BLOG_API_KEY;

// ==================== 中间件 ====================
// 确保所有文本响应使用 UTF-8 编码
app.use((req, res, next) => {
  res.charset = 'utf-8';
  next();
});
app.use(express.json());
app.use(express.static('public', {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
  }
}));

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

// ==================== 文件上传配置 ====================
const UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads';
const UPLOAD_MAX_SIZE = (parseInt(process.env.UPLOAD_MAX_SIZE) || 5) * 1024 * 1024;

// 确保上传目录存在
try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('⚠️ 无法创建上传目录:', err.message, '（文件上传功能将不可用）');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: UPLOAD_MAX_SIZE },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件格式，仅允许图片文件'));
    }
  },
});

// ==================== AI 图片生成配置 ====================
const AI_CONFIG = {
  apiUrl: process.env.AI_IMAGE_API_URL || '',
  apiKey: process.env.AI_IMAGE_API_KEY || '',
  model: process.env.AI_IMAGE_MODEL || 'dall-e-3',
  size: process.env.AI_IMAGE_SIZE || '1024x1024',
};

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
  if (!columns.includes('pinned')) {
    db.exec('ALTER TABLE articles ADD COLUMN pinned INTEGER DEFAULT 0');
  }
  if (!columns.includes('visibility')) {
    db.exec("ALTER TABLE articles ADD COLUMN visibility TEXT DEFAULT 'public'");
  }
  if (!columns.includes('password_hash')) {
    db.exec('ALTER TABLE articles ADD COLUMN password_hash TEXT DEFAULT NULL');
  }

  // 创建版本历史表
  db.exec(`
    CREATE TABLE IF NOT EXISTS article_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      title TEXT,
      content TEXT,
      summary TEXT,
      tags TEXT,
      cover TEXT,
      saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
    );
  `);

  // 创建评论表（未来使用）
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      author TEXT DEFAULT 'Anonymous',
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
    );
  `);
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
    pinned: !!row.pinned,
    visibility: row.visibility || 'public',
    views: row.views,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ==================== 公开 API ====================

// 获取文章列表（分页，仅已发布，仅公开文章）
app.get('/api/articles', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const offset = (page - 1) * limit;

  const total = db.prepare("SELECT COUNT(*) AS cnt FROM articles WHERE published = 1 AND visibility = 'public'").get().cnt;
  const rows = db.prepare(
    "SELECT * FROM articles WHERE published = 1 AND visibility = 'public' ORDER BY pinned DESC, created_at DESC LIMIT ? OFFSET ?"
  ).all(limit, offset);

  res.json({
    articles: rows.map(rowToArticle),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// 获取单篇文章（通过 slug，支持 token 认证访问私有文章）
app.get('/api/articles/slug/:slug', (req, res) => {
  const row = db.prepare('SELECT * FROM articles WHERE slug = ?').get(req.params.slug);
  if (!row) return res.status(404).json({ error: '文章未找到' });

  // 检查可见性
  if (row.visibility === 'private') {
    // 私有文章需要认证
    const token = req.headers['authorization']?.startsWith('Bearer ')
      ? req.headers['authorization'].slice(7)
      : req.query.token || req.query.apiKey;
    if (!token || token !== BLOG_API_KEY) {
      return res.status(403).json({ error: '这是一篇私有文章，需要认证访问' });
    }
  }

  db.prepare('UPDATE articles SET views = views + 1 WHERE slug = ?').run(req.params.slug);
  res.json(rowToArticle({ ...row, views: row.views + 1 }));
});

// 搜索文章（仅公开文章）
app.get('/api/articles/search', (req, res) => {
  const q = req.query.q;
  if (!q) return res.json([]);

  const term = `%${q}%`;
  const rows = db.prepare(`
    SELECT * FROM articles
    WHERE published = 1 AND visibility = 'public' AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)
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
  const { title, slug, content, summary, tags, cover, published, pinned, visibility, password } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: '标题和内容不能为空' });
  }

  const articleSlug = slug || title.toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-|-$/g, '');

  const tagsStr = Array.isArray(tags) ? tags.join(',') : (tags || '');
  const passwordHash = password ? crypto.createHash('sha256').update(password).digest('hex') : null;

  try {
    const result = db.prepare(`
      INSERT INTO articles (title, slug, content, summary, tags, cover, published, pinned, visibility, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, articleSlug, content, summary || '', tagsStr, cover || '', published ? 1 : 0, pinned ? 1 : 0, visibility || 'public', passwordHash);

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

  const { title, slug, content, summary, tags, cover, published, pinned, visibility, password } = req.body;
  const tagsStr = tags !== undefined
    ? (Array.isArray(tags) ? tags.join(',') : tags)
    : existing.tags;

  const passwordHash = password !== undefined
    ? (password ? crypto.createHash('sha256').update(password).digest('hex') : null)
    : existing.password_hash;

  try {
    db.prepare(`
      UPDATE articles
      SET title = ?, slug = ?, content = ?, summary = ?, tags = ?, cover = ?, published = ?, pinned = ?, visibility = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title || existing.title,
      slug || existing.slug,
      content || existing.content,
      summary !== undefined ? summary : existing.summary,
      tagsStr,
      cover !== undefined ? cover : existing.cover,
      published !== undefined ? (published ? 1 : 0) : existing.published,
      pinned !== undefined ? (pinned ? 1 : 0) : existing.pinned,
      visibility || existing.visibility || 'public',
      passwordHash,
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

// ==================== 文件上传 API ====================
app.post('/api/upload', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '未选择文件' });
  }
  const relativePath = `/uploads/${req.file.filename}`;
  res.json({
    success: true,
    message: '文件上传成功',
    url: relativePath,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
  });
});

// ==================== AI 图片生成 API ====================
app.post('/api/ai/generate-cover', authenticate, async (req, res) => {
  if (!AI_CONFIG.apiUrl || !AI_CONFIG.apiKey) {
    return res.status(503).json({
      error: 'AI 图片生成功能未配置，请在 .env 文件中设置 AI_IMAGE_API_URL 和 AI_IMAGE_API_KEY',
    });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: '请输入图片描述 (prompt)' });
  }

  try {
    const requestBody = {
      model: AI_CONFIG.model,
      prompt,
      n: 1,
      size: AI_CONFIG.size,
      response_format: 'url',
    };

    const response = await fetch(AI_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('AI API 错误:', response.status, errBody);
      return res.status(response.status).json({
        error: `AI API 请求失败 (${response.status})`,
        details: errBody,
      });
    }

    const data = await response.json();

    // 兼容 OpenAI DALL·E 响应格式
    const imageUrl = data.data?.[0]?.url || data.data?.[0]?.b64_json;
    if (!imageUrl) {
      return res.status(500).json({ error: 'AI API 返回了无效的响应格式' });
    }

    // 如果返回的是 base64，保存为本地文件
    if (data.data[0].b64_json) {
      const buffer = Buffer.from(data.data[0].b64_json, 'base64');
      const filename = `ai-${Date.now()}.png`;
      const filePath = path.join(UPLOAD_DIR, filename);
      fs.writeFileSync(filePath, buffer);
      return res.json({ success: true, url: `/uploads/${filename}`, source: 'ai-generated' });
    }

    // 返回远程 URL
    res.json({ success: true, url: imageUrl, source: 'ai-generated' });
  } catch (err) {
    console.error('AI 图片生成失败:', err);
    res.status(500).json({ error: 'AI 图片生成失败', details: err.message });
  }
});

// ==================== 新增功能 API ====================

// 自动保存
app.post('/api/articles/:id/autosave', authenticate, (req, res) => {
  const { id } = req.params;
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  if (!article) return res.status(404).json({ error: '文章未找到' });

  const { title, content, summary, tags, cover } = req.body;
  if (!content) return res.status(400).json({ error: '内容不能为空' });

  const tagsStr = Array.isArray(tags) ? tags.join(',') : (tags || '');

  // 检查是否与最后一个版本相同
  const lastVersion = db.prepare(
    'SELECT * FROM article_versions WHERE article_id = ? ORDER BY saved_at DESC LIMIT 1'
  ).get(id);

  if (lastVersion && lastVersion.content === content && lastVersion.title === title) {
    return res.json({ success: true, skipped: true, message: '内容未变化，跳过保存' });
  }

  // 保存新版本
  const result = db.prepare(`
    INSERT INTO article_versions (article_id, title, content, summary, tags, cover)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, title || article.title, content, summary || '', tagsStr, cover || '');

  // 清理超过50个的旧版本
  const count = db.prepare('SELECT COUNT(*) AS cnt FROM article_versions WHERE article_id = ?').get(id).cnt;
  if (count > 50) {
    const toDelete = count - 50;
    db.prepare(`
      DELETE FROM article_versions WHERE id IN (
        SELECT id FROM article_versions WHERE article_id = ? ORDER BY saved_at ASC LIMIT ?
      )
    `).run(id, toDelete);
  }

  const savedAt = db.prepare('SELECT saved_at FROM article_versions WHERE id = ?').get(result.lastInsertRowid);
  res.json({ success: true, versionId: result.lastInsertRowid, savedAt: savedAt.saved_at });
});

// 获取版本历史
app.get('/api/articles/:id/versions', authenticate, (req, res) => {
  const { id } = req.params;
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  if (!article) return res.status(404).json({ error: '文章未找到' });

  const versions = db.prepare(
    'SELECT id, title, saved_at FROM article_versions WHERE article_id = ? ORDER BY saved_at DESC'
  ).all(id);

  res.json(versions);
});

// 获取单个版本详情
app.get('/api/articles/:id/versions/:versionId', authenticate, (req, res) => {
  const { id, versionId } = req.params;
  const version = db.prepare(
    'SELECT * FROM article_versions WHERE id = ? AND article_id = ?'
  ).get(versionId, id);

  if (!version) return res.status(404).json({ error: '版本未找到' });
  res.json(version);
});

// 恢复到指定版本
app.post('/api/articles/:id/restore/:versionId', authenticate, (req, res) => {
  const { id, versionId } = req.params;
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  if (!article) return res.status(404).json({ error: '文章未找到' });

  const version = db.prepare(
    'SELECT * FROM article_versions WHERE id = ? AND article_id = ?'
  ).get(versionId, id);
  if (!version) return res.status(404).json({ error: '版本未找到' });

  // 先保存当前状态为新版本
  db.prepare(`
    INSERT INTO article_versions (article_id, title, content, summary, tags, cover)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, article.title, article.content, article.summary || '', article.tags || '', article.cover || '');

  // 恢复文章
  db.prepare(`
    UPDATE articles SET title = ?, content = ?, summary = ?, tags = ?, cover = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(version.title, version.content, version.summary, version.tags, version.cover, id);

  const updated = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  res.json({ success: true, message: '已恢复到指定版本', article: rowToArticle(updated) });
});

// 导出功能
app.get('/api/export', authenticate, (req, res) => {
  const format = req.query.format || 'json';
  const articles = db.prepare(
    'SELECT * FROM articles ORDER BY created_at DESC'
  ).all();

  if (format === 'json') {
    res.setHeader('Content-Disposition', 'attachment; filename="blog-export.json"');
    res.json(articles.map(rowToArticle));
  } else if (format === 'markdown') {
    const md = articles.map(a => {
      const date = new Date(a.created_at).toLocaleDateString('zh-CN');
      return `# ${a.title}\n\n` +
        `**日期:** ${date}\n` +
        `**标签:** ${a.tags || '无'}\n` +
        `**状态:** ${a.published ? '已发布' : '草稿'}\n\n` +
        `${a.content}\n\n---\n`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="blog-export.md"');
    res.send(md);
  } else {
    res.status(400).json({ error: '不支持的格式，请使用 json 或 markdown' });
  }
});

// 日历数据
app.get('/api/calendar', (req, res) => {
  // 检查是否已认证
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.query.apiKey;
  const isAuthenticated = token && token === BLOG_API_KEY;

  let rows;
  if (isAuthenticated) {
    rows = db.prepare(`
      SELECT id, title, slug, created_at, visibility
      FROM articles WHERE published = 1
      ORDER BY created_at DESC
    `).all();
  } else {
    rows = db.prepare(`
      SELECT id, title, slug, created_at, visibility
      FROM articles WHERE published = 1 AND visibility IN ('public', 'unlisted')
      ORDER BY created_at DESC
    `).all();
  }

  const calendar = {};
  for (const row of rows) {
    const d = new Date(row.created_at);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = d.getDate();
    const key = `${year}-${month}`;

    if (!calendar[key]) calendar[key] = [];
    calendar[key].push({
      id: row.id,
      title: row.title,
      slug: row.slug,
      day,
      visibility: row.visibility,
    });
  }

  res.json(calendar);
});

// 历史上的今天
app.get('/api/on-this-day', (req, res) => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const year = today.getFullYear();
  const pattern = `%-${month}-${day}%`;

  const rows = db.prepare(`
    SELECT id, title, slug, summary, created_at, views
    FROM articles
    WHERE published = 1 AND visibility IN ('public', 'unlisted')
    AND created_at LIKE ? AND strftime('%Y', created_at) != ?
    ORDER BY created_at DESC
  `).all(pattern, String(year));

  res.json(rows.map(r => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    summary: r.summary,
    createdAt: r.created_at,
    views: r.views,
    year: new Date(r.created_at).getFullYear(),
  })));
});

// 密码验证
app.post('/api/articles/:id/verify-password', (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  const article = db.prepare('SELECT password_hash FROM articles WHERE id = ?').get(id);
  if (!article) return res.status(404).json({ error: '文章未找到' });
  if (!article.password_hash) return res.json({ valid: true, message: '文章未设置密码' });

  const hash = crypto.createHash('sha256').update(password || '').digest('hex');
  res.json({ valid: hash === article.password_hash });
});

// ==================== 归档 API ====================

// 获取归档数据（按年月分组，仅公开文章）
app.get('/api/archive', (req, res) => {
  const rows = db.prepare(`
    SELECT id, title, slug, created_at, views
    FROM articles WHERE published = 1 AND visibility = 'public'
    ORDER BY created_at DESC
  `).all();

  const archive = {};
  for (const row of rows) {
    const d = new Date(row.created_at);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    if (!archive[key]) archive[key] = { year, month, articles: [] };
    archive[key].articles.push({
      id: row.id,
      title: row.title,
      slug: row.slug,
      createdAt: row.created_at,
      views: row.views,
    });
  }

  res.json(Object.values(archive));
});

// 获取所有标签及文章数（仅公开文章）
app.get('/api/tags', (req, res) => {
  const rows = db.prepare("SELECT tags FROM articles WHERE published = 1 AND visibility = 'public' AND tags IS NOT NULL AND tags != ''").all();
  const tagMap = {};
  for (const row of rows) {
    for (const tag of row.tags.split(',')) {
      const t = tag.trim();
      if (t) tagMap[t] = (tagMap[t] || 0) + 1;
    }
  }
  const tags = Object.entries(tagMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  res.json(tags);
});

// 按标签获取文章（仅公开文章）
app.get('/api/tags/:tag', (req, res) => {
  const tag = req.params.tag;
  const term = `%${tag}%`;
  const rows = db.prepare(`
    SELECT * FROM articles
    WHERE published = 1 AND visibility = 'public' AND tags LIKE ?
    ORDER BY created_at DESC
  `).all(term);
  res.json(rows.map(rowToArticle));
});

// RSS Feed（仅公开文章）
app.get('/rss.xml', (req, res) => {
  const rows = db.prepare(`
    SELECT title, slug, summary, content, created_at
    FROM articles WHERE published = 1 AND visibility = 'public'
    ORDER BY created_at DESC LIMIT 20
  `).all();

  const siteUrl = `${req.protocol}://${req.get('host')}`;
  const items = rows.map(a => `
    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${siteUrl}/post/${encodeURIComponent(a.slug)}</link>
      <description><![CDATA[${a.summary || a.content.substring(0, 200)}]]></description>
      <pubDate>${new Date(a.created_at).toUTCString()}</pubDate>
      <guid>${siteUrl}/post/${encodeURIComponent(a.slug)}</guid>
    </item>`).join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>我的博客</title>
    <link>${siteUrl}</link>
    <description>我的博客 - 分享技术与生活</description>
    <language>zh-cn</language>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.send(rss);
});

// Sitemap（仅公开文章）
app.get('/sitemap.xml', (req, res) => {
  const rows = db.prepare("SELECT slug, updated_at FROM articles WHERE published = 1 AND visibility = 'public'").all();
  const siteUrl = `${req.protocol}://${req.get('host')}`;

  const urls = rows.map(a => `  <url>
    <loc>${siteUrl}/post/${encodeURIComponent(a.slug)}</loc>
    <lastmod>${new Date(a.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
  </url>`).join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${urls}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.send(sitemap);
});

// SPA 路由：/admin → admin.html
app.get('/admin', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// SPA 路由：/archive → archive.html
app.get('/archive', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, 'public', 'archive.html'));
});

// SPA 路由：/calendar → calendar.html
app.get('/calendar', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, 'public', 'calendar.html'));
});

// SPA 路由：/tags → tags.html
app.get('/tags', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, 'public', 'tags.html'));
});

// SPA 路由：/tag/:tag → tags.html (按标签筛选)
app.get('/tag/:tag', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, 'public', 'tags.html'));
});

// SPA 路由：/post/:slug → post.html
app.get('/post/:slug', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, 'public', 'post.html'));
});

// SPA 路由：/about → about.html
app.get('/about', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

// ==================== 个人信息 API ====================

// 获取个人信息（公开）
app.get('/api/profile', (req, res) => {
  const rows = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'profile_%'").all();
  const profile = {};
  for (const row of rows) {
    const key = row.key.replace('profile_', '');
    try { profile[key] = JSON.parse(row.value); }
    catch { profile[key] = row.value; }
  }

  // 默认值
  res.json({
    name: profile.name || '博主',
    title: profile.title || '',
    bio: profile.bio || '',
    avatar: profile.avatar || '',
    cover: profile.cover || '',
    skills: Array.isArray(profile.skills) ? profile.skills : [],
    about: profile.about || '',
    socialLinks: profile.socialLinks || {},
    projects: Array.isArray(profile.projects) ? profile.projects : [],
    experience: Array.isArray(profile.experience) ? profile.experience : [],
  });
});

// 更新个人信息（需认证）
app.put('/api/profile', authenticate, (req, res) => {
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const updateMany = db.transaction((entries) => {
    for (const [key, value] of entries) {
      upsert.run(`profile_${key}`, typeof value === 'string' ? value : JSON.stringify(value));
    }
  });
  updateMany(Object.entries(req.body));
  res.json({ success: true, message: '个人信息已保存' });
});

// 获取博客统计（公开）
app.get('/api/profile/stats', (req, res) => {
  const articles = db.prepare("SELECT COUNT(*) AS cnt FROM articles WHERE published = 1 AND visibility = 'public'").get().cnt;
  const views = db.prepare("SELECT COALESCE(SUM(views), 0) AS total FROM articles").get().total;
  const tagRows = db.prepare("SELECT tags FROM articles WHERE published = 1 AND visibility = 'public' AND tags IS NOT NULL AND tags != ''").all();
  const tagSet = new Set();
  for (const row of tagRows) {
    for (const tag of row.tags.split(',')) {
      const t = tag.trim();
      if (t) tagSet.add(t);
    }
  }
  const first = db.prepare("SELECT created_at FROM articles ORDER BY created_at ASC LIMIT 1").get();
  const daysSinceFirst = first
    ? Math.floor((Date.now() - new Date(first.created_at).getTime()) / 86400000)
    : 0;

  res.json({
    articles,
    totalViews: views,
    tags: tagSet.size,
    daysSinceFirst,
  });
});

// 404 兜底路由
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// ==================== 启动服务器 ====================
app.listen(PORT, () => {
  console.log(`博客服务器运行在 http://localhost:${PORT}`);
});
