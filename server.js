const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const app = express();
const db = new sqlite3.Database('./blog.db');

// ========== 中间件 ==========
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ========== 数据库初始化 ==========
db.serialize(() => {
  // 文章表
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE,
      content TEXT NOT NULL,
      summary TEXT,
      cover TEXT,
      published INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // 设置表
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);
  
  // 索引
  db.run('CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug)');
  db.run('CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published, createdAt)');
  
  // 初始化默认设置
  db.run(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
    ['siteName', JSON.stringify('我的博客')]
  );
  db.run(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
    ['siteDescription', JSON.stringify('探索技术与生活的精彩内容')]
  );
});

// ========== 工具函数 ==========
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50) + '-' + Date.now().toString(36);
}

function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权' });
  }
  
  const token = auth.slice(7);
  // 简单的 token 验证（生产环境应使用更安全的方式）
  const adminToken = process.env.ADMIN_TOKEN || 'admin123';
  if (token !== adminToken) {
    return res.status(401).json({ error: '令牌无效' });
  }
  
  next();
}

// ========== API 路由 ==========

// 获取文章列表（支持分页）
app.get('/api/posts', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 6;
  const all = req.query.all === 'true';
  const offset = (page - 1) * limit;
  
  // 计算总数
  db.get(
    `SELECT COUNT(*) as total FROM posts ${all ? '' : 'WHERE published = 1'}`,
    [],
    (err, result) => {
      if (err) return res.status(500).json({ error: '服务器错误' });
      
      const total = result.total;
      const totalPages = Math.ceil(total / limit);
      
      // 获取文章
      db.all(
        `SELECT id, title, slug, summary, cover, published, views, createdAt, updatedAt 
         FROM posts 
         ${all ? '' : 'WHERE published = 1'}
         ORDER BY createdAt DESC 
         LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, posts) => {
          if (err) return res.status(500).json({ error: '服务器错误' });
          res.json({ posts, total, totalPages, currentPage: page });
        }
      );
    }
  );
});

// 获取单篇文章
app.get('/api/posts/:slug', (req, res) => {
  const { slug } = req.params;
  
  db.get(
    'SELECT * FROM posts WHERE slug = ?',
    [slug],
    (err, post) => {
      if (err) return res.status(500).json({ error: '服务器错误' });
      if (!post) return res.status(404).json({ error: '文章未找到' });
      
      // 增加阅读量
      db.run(
        'UPDATE posts SET views = views + 1 WHERE slug = ?',
        [slug]
      );
      
      res.json({
        ...post,
        published: !!post.published
      });
    }
  );
});

// 创建文章（需要认证）
app.post('/api/posts', authenticate, (req, res) => {
  const { title, slug, content, summary, cover, published } = req.body;
  
  if (!title || !content) {
    return res.status(400).json({ error: '标题和内容不能为空' });
  }
  
  const postSlug = slug || generateSlug(title);
  
  db.run(
    `INSERT INTO posts (title, slug, content, summary, cover, published)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, postSlug, content, summary, cover, published ? 1 : 0],
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(400).json({ error: '该链接别名已存在' });
        }
        return res.status(500).json({ error: '创建失败' });
      }
      
      res.status(201).json({ 
        id: this.lastID, 
        slug: postSlug,
        message: '文章创建成功' 
      });
    }
  );
});

// 更新文章（需要认证）
app.put('/api/posts/:slug', authenticate, (req, res) => {
  const { slug } = req.params;
  const { title, content, summary, cover, published } = req.body;
  
  if (!title || !content) {
    return res.status(400).json({ error: '标题和内容不能为空' });
  }
  
  db.run(
    `UPDATE posts 
     SET title = ?, content = ?, summary = ?, cover = ?, published = ?, updatedAt = CURRENT_TIMESTAMP
     WHERE slug = ?`,
    [title, content, summary, cover, published ? 1 : 0, slug],
    function(err) {
      if (err) return res.status(500).json({ error: '更新失败' });
      if (this.changes === 0) return res.status(404).json({ error: '文章未找到' });
      
      res.json({ message: '文章更新成功' });
    }
  );
});

// 删除文章（需要认证）
app.delete('/api/posts/:slug', authenticate, (req, res) => {
  const { slug } = req.params;
  
  db.run(
    'DELETE FROM posts WHERE slug = ?',
    [slug],
    function(err) {
      if (err) return res.status(500).json({ error: '删除失败' });
      if (this.changes === 0) return res.status(404).json({ error: '文章未找到' });
      
      res.json({ message: '文章已删除' });
    }
  );
});

// 获取网站设置
app.get('/api/settings', (req, res) => {
  db.all('SELECT key, value FROM settings', [], (err, rows) => {
    if (err) return res.status(500).json({ error: '服务器错误' });
    
    const settings = {};
    rows.forEach(row => {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    });
    
    res.json(settings);
  });
});

// 更新网站设置（需要认证）
app.put('/api/settings', authenticate, (req, res) => {
  const updates = req.body;
  const stmt = db.prepare(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
  );
  
  Object.entries(updates).forEach(([key, value]) => {
    stmt.run(key, JSON.stringify(value));
  });
  
  stmt.finalize(err => {
    if (err) return res.status(500).json({ error: '保存失败' });
    res.json({ message: '设置已保存' });
  });
});

// AI 封面生成（模拟）
app.post('/api/generate-cover', authenticate, (req, res) => {
  const { title } = req.body;
  
  // 使用 Unsplash 的随机图片作为封面
  const keywords = title
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 2)
    .join(',');
  
  const seed = crypto.randomBytes(4).toString('hex');
  const url = `https://source.unsplash.com/800x400/?${keywords || 'nature,tech'}&sig=${seed}`;
  
  res.json({ url });
});

// ========== 前端路由 ==========

// 文章详情页
app.get('/post/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'post.html'));
});

// 所有其他路由返回首页
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========== 错误处理 ==========
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

// ========== 启动服务器 ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  🚀 博客服务器已启动
  📦 本地访问: http://localhost:${PORT}
  🔑 管理令牌: ${process.env.ADMIN_TOKEN || 'admin123'}
  `);
});

// 优雅关闭
process.on('SIGINT', () => {
  db.close(() => {
    console.log('\n数据库连接已关闭');
    process.exit(0);
  });
});
