// ==================== 全局配置 ====================
const CONFIG = {
  postsPerPage: 6,
  apiBase: '/api',
  storageKeys: {
    theme: 'blog-theme',
    token: 'blog-admin-token',
  },
};

// ==================== 工具函数 ====================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function debounce(fn, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function calculateReadTime(text) {
  if (!text) return '1 分钟阅读';
  const mins = Math.ceil(text.length / 500);
  return `${mins} 分钟阅读`;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function authHeaders() {
  const token = localStorage.getItem(CONFIG.storageKeys.token);
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${CONFIG.apiBase}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || '请求失败');
  }
  return res.json();
}

// ==================== 主题管理 ====================
const ThemeManager = {
  init() {
    const saved = localStorage.getItem(CONFIG.storageKeys.theme);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(CONFIG.storageKeys.theme, next);
  },

  bindButton(id) {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => this.toggle());
  },
};

// ==================== 阅读进度条 ====================
const ReadingProgress = {
  init() {
    const bar = document.getElementById('progressBar');
    if (!bar) return;
    window.addEventListener('scroll', () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = `${Math.min((window.scrollY / docH) * 100, 100)}%`;
    });
  },
};

// ==================== 返回顶部 ====================
const BackToTop = {
  init(btnId) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    window.addEventListener('scroll', debounce(() => {
      btn.classList.toggle('visible', window.scrollY > 300);
    }, 100));
  },
};

// ==================== 面包屑导航栏滚动效果 ====================
const Navbar = {
  init(navId) {
    const nav = document.getElementById(navId);
    if (!nav) return;
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 50);
    });
  },
};

// ==================== 分享功能 ====================
const ShareManager = {
  show(event, slug, title) {
    event.preventDefault();
    event.stopPropagation();
    this.hide();

    const url = `${window.location.origin}/post/${encodeURIComponent(slug)}`;
    const safeTitle = encodeURIComponent(title);

    const panel = document.createElement('div');
    panel.className = 'share-panel';
    panel.id = 'share-panel';
    panel.innerHTML = `
      <div class="share-content">
        <div class="share-header">
          <span>分享文章</span>
          <button class="share-close" id="shareClose">✕</button>
        </div>
        <div class="share-options">
          <button class="share-option" data-action="copy">
            <span class="share-icon">🔗</span><span>复制链接</span>
          </button>
          <button class="share-option" data-action="weibo">
            <span class="share-icon">📢</span><span>分享到微博</span>
          </button>
          <button class="share-option" data-action="twitter">
            <span class="share-icon">🐦</span><span>分享到 Twitter</span>
          </button>
        </div>
        <div class="share-link-preview">
          <input type="text" value="${url}" readonly>
        </div>
      </div>
    `;

    const overlay = document.createElement('div');
    overlay.className = 'share-overlay active';
    overlay.id = 'share-overlay';

    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    overlay.addEventListener('click', () => this.hide());
    panel.querySelector('#shareClose').addEventListener('click', () => this.hide());

    panel.querySelector('[data-action="copy"]').addEventListener('click', () => {
      navigator.clipboard.writeText(url).then(() => this.showToast('链接已复制！')).catch(() => {
        const input = panel.querySelector('.share-link-preview input');
        input.select();
        document.execCommand('copy');
        this.showToast('链接已复制！');
      });
      this.hide();
    });

    panel.querySelector('[data-action="weibo"]').addEventListener('click', () => {
      window.open(`https://service.weibo.com/share/share.php?url=${url}&title=${safeTitle}`, '_blank', 'width=600,height=400');
      this.hide();
    });

    panel.querySelector('[data-action="twitter"]').addEventListener('click', () => {
      window.open(`https://twitter.com/intent/tweet?url=${url}&text=${safeTitle}`, '_blank', 'width=600,height=400');
      this.hide();
    });
  },

  hide() {
    const panel = document.getElementById('share-panel');
    const overlay = document.getElementById('share-overlay');
    if (panel) panel.remove();
    if (overlay) overlay.remove();
  },

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'share-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2000);
  },
};

// ==================== 骨架屏 ====================
const SkeletonLoader = {
  show(container) {
    container.innerHTML = Array(3).fill(`
      <article class="skeleton-article">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text" style="width:60%"></div>
      </article>
    `).join('');
  },
  hide(container) {
    container.querySelectorAll('.skeleton-article').forEach(el => el.remove());
  },
};

// ==================== 博客首页 ====================
const Blog = {
  currentPage: 1,
  totalPages: 1,

  async init() {
    await this.loadArticles();
    this.bindSearch();
    this.bindKeyboard();
    Navbar.init('navbar');
    ThemeManager.init();
    ThemeManager.bindButton('themeToggle');
    ReadingProgress.init();
    BackToTop.init('backToTop');
  },

  async loadArticles(page = 1) {
    const grid = document.getElementById('articlesGrid');
    const skeleton = document.getElementById('skeletonLoader');
    if (!grid) return;

    if (skeleton) skeleton.style.display = '';
    try {
      const data = await apiFetch(`/articles?page=${page}&limit=${CONFIG.postsPerPage}`);
      if (skeleton) skeleton.style.display = 'none';
      this.currentPage = data.page;
      this.totalPages = data.totalPages;
      this.renderArticles(data.articles, grid);
      this.renderPagination();
    } catch (err) {
      if (skeleton) skeleton.style.display = 'none';
      grid.innerHTML = '<div class="empty-state"><div class="icon">📝</div><p>加载失败，请刷新重试</p></div>';
      console.error('Load articles error:', err);
    }
  },

  renderArticles(articles, container) {
    container.innerHTML = articles.map((a, i) => `
      <article style="animation-delay:${i * 0.1}s" data-slug="${escapeHtml(a.slug)}">
        <button class="share-btn" data-slug="${escapeHtml(a.slug)}" data-title="${escapeHtml(a.title)}" title="分享">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
        <h2>${escapeHtml(a.title)}</h2>
        <p class="summary">${escapeHtml(a.summary || a.content.substring(0, 150) + '...')}</p>
        <div class="meta">
          <span>📅 ${formatDate(a.createdAt)}</span>
          <span>👁️ ${a.views || 0} 阅读</span>
        </div>
        ${a.tags.length ? `<div class="tags">${a.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
      </article>
    `).join('');

    // 绑定事件（事件委托）
    container.addEventListener('click', (e) => {
      const shareBtn = e.target.closest('.share-btn');
      if (shareBtn) {
        ShareManager.show(e, shareBtn.dataset.slug, shareBtn.dataset.title);
        return;
      }
      const article = e.target.closest('article');
      if (article) {
        window.location.href = `/post/${encodeURIComponent(article.dataset.slug)}`;
      }
    });
  },

  renderPagination() {
    const container = document.getElementById('pagination');
    if (!container || this.totalPages <= 1) { if (container) container.innerHTML = ''; return; }

    container.innerHTML = `
      <button ${this.currentPage === 1 ? 'disabled' : ''} id="prevPage">← 上一页</button>
      <span class="page-num">${this.currentPage} / ${this.totalPages}</span>
      <button ${this.currentPage === this.totalPages ? 'disabled' : ''} id="nextPage">下一页 →</button>
    `;
    const prev = document.getElementById('prevPage');
    const next = document.getElementById('nextPage');
    if (prev) prev.addEventListener('click', () => this.loadArticles(this.currentPage - 1));
    if (next) next.addEventListener('click', () => this.loadArticles(this.currentPage + 1));
  },

  bindSearch() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    input.addEventListener('input', debounce(async (e) => {
      const q = e.target.value.trim();
      const grid = document.getElementById('articlesGrid');
      const pagination = document.getElementById('pagination');
      if (!grid) return;

      if (!q) {
        await this.loadArticles();
        return;
      }

      try {
        const articles = await apiFetch(`/articles/search?q=${encodeURIComponent(q)}`);
        this.renderArticles(articles, grid);
        if (pagination) pagination.innerHTML = '';
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 300));
  },

  bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('articleModal');
        if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; }
      }
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        const input = document.getElementById('searchInput');
        if (input) input.focus();
      }
    });
  },
};

// ==================== 文章详情页 ====================
const PostPage = {
  async init() {
    const slug = this.getSlug();
    if (!slug) return;

    Navbar.init('navbar');
    ThemeManager.init();
    ThemeManager.bindButton('themeToggle');
    BackToTop.init('backToTop');
    ReadingProgress.init();

    await this.loadPost(slug);
  },

  getSlug() {
    const match = window.location.pathname.match(/\/post\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  },

  async loadPost(slug) {
    const container = document.getElementById('post-content');
    if (!container) return;

    try {
      const post = await apiFetch(`/articles/slug/${encodeURIComponent(slug)}`);

      document.title = `${post.title} - 我的博客`;

      // OG tags
      const setMeta = (prop, val) => {
        let el = document.querySelector(`meta[property="${prop}"]`);
        if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el); }
        el.setAttribute('content', val);
      };
      setMeta('og:title', post.title);
      setMeta('og:description', post.summary || '');
      if (post.cover) setMeta('og:image', post.cover);

      // 元信息
      const meta = document.getElementById('post-meta');
      if (meta) {
        meta.innerHTML = `
          <span>📅 ${formatDate(post.createdAt)}</span>
          <span>⏱️ ${calculateReadTime(post.content)}</span>
          <span>👁️ ${post.views} 阅读</span>
          ${post.updatedAt !== post.createdAt ? `<span>✏️ 更新于 ${formatDate(post.updatedAt)}</span>` : ''}
        `;
      }

      // 封面
      const cover = document.getElementById('cover-container');
      if (cover && post.cover) {
        cover.innerHTML = `<img src="${escapeHtml(post.cover)}" alt="${escapeHtml(post.title)}" class="cover-image">`;
      }

      // 标题
      const title = document.getElementById('post-title');
      if (title) title.textContent = post.title;

      // 标签
      const tagsEl = document.getElementById('post-tags');
      if (tagsEl && post.tags.length) {
        tagsEl.innerHTML = post.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
      }

      // 渲染 Markdown
      container.innerHTML = marked.parse(post.content);

      // 代码高亮
      container.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block);
      });

      // 目录
      this.generateTOC(container);

    } catch (err) {
      container.innerHTML = `
        <div class="error" style="text-align:center;padding:4rem 2rem;">
          <h1>文章未找到</h1>
          <p style="margin-top:1rem;"><a href="/">← 返回首页</a></p>
        </div>
      `;
    }
  },

  generateTOC(contentEl) {
    const headings = contentEl.querySelectorAll('h2, h3');
    if (headings.length < 3) return;

    const toc = document.createElement('div');
    toc.className = 'toc';
    toc.innerHTML = '<div class="toc-title">📑 目录</div><ul></li>';
    const list = toc.querySelector('ul');

    headings.forEach((h, i) => {
      const id = `heading-${i}`;
      h.id = id;
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${id}`;
      a.textContent = h.textContent;
      a.className = h.tagName === 'H3' ? 'toc-h3' : '';
      a.addEventListener('click', (e) => { e.preventDefault(); h.scrollIntoView({ behavior: 'smooth' }); });
      li.appendChild(a);
      list.appendChild(li);
    });

    document.body.appendChild(toc);

    // 高亮当前标题
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          toc.querySelectorAll('a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`));
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    headings.forEach(h => observer.observe(h));
  },
};

// ==================== 管理后台 ====================
const Admin = {
  token: null,
  editingPost: null,

  init() {
    this.token = localStorage.getItem(CONFIG.storageKeys.token);
    ThemeManager.init();
    this.checkAuth();
  },

  checkAuth() {
    if (this.token) this.showPanel();
  },

  async login() {
    const input = document.getElementById('admin-token');
    if (!input) return;
    const token = input.value.trim();
    if (!token) { alert('请输入令牌'); return; }

    try {
      await apiFetch('/verify', { headers: { 'Authorization': `Bearer ${token}` } });
      this.token = token;
      localStorage.setItem(CONFIG.storageKeys.token, token);
      this.showPanel();
    } catch {
      alert('令牌无效');
    }
  },

  logout() {
    this.token = null;
    localStorage.removeItem(CONFIG.storageKeys.token);
    location.reload();
  },

  async showPanel() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
    await this.loadPosts();
    await this.loadSettings();
    this.bindEditor();
  },

  async loadPosts() {
    const container = document.getElementById('admin-posts');
    if (!container) return;
    container.innerHTML = '<p>加载中...</p>';

    try {
      const data = await apiFetch('/admin/articles', { headers: { 'Authorization': `Bearer ${this.token}` } });
      container.innerHTML = data.articles.map(p => `
        <div class="admin-post-item">
          <div class="post-info">
            <h3>${escapeHtml(p.title)}</h3>
            <span>${formatDate(p.createdAt)} · ${p.published ? '✅ 已发布' : '📝 草稿'}</span>
          </div>
          <div>
            <button class="btn-secondary" onclick="Admin.editPost(${p.id})">编辑</button>
            <button class="btn-danger" onclick="Admin.deletePost(${p.id})">删除</button>
          </div>
        </div>
      `).join('') || '<p class="empty-state">暂无文章</p>';
    } catch (err) {
      container.innerHTML = '<p>加载失败</p>';
      console.error(err);
    }
  },

  async loadSettings() {
    try {
      const settings = await apiFetch('/settings');
      const nameEl = document.getElementById('setting-site-name');
      const descEl = document.getElementById('setting-site-desc');
      if (nameEl) nameEl.value = settings.siteName || '';
      if (descEl) descEl.value = settings.siteDescription || '';
    } catch (err) {
      console.error('Load settings error:', err);
    }
  },

  bindEditor() {
    const titleInput = document.getElementById('post-title');
    const coverInput = document.getElementById('post-cover');
    if (titleInput) titleInput.addEventListener('input', debounce(() => this.updateSlugPreview(), 300));
    if (coverInput) coverInput.addEventListener('input', debounce(() => this.updateCoverPreview(), 300));
  },

  showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    const tab = document.getElementById(`tab-${tabId}`);
    if (tab) tab.classList.remove('hidden');
    if (event && event.target) event.target.classList.add('active');
  },

  showEditor(post = null) {
    this.editingPost = post;
    document.getElementById('post-title').value = post?.title || '';
    document.getElementById('post-slug').value = post?.slug || '';
    document.getElementById('post-content').value = post?.content || '';
    document.getElementById('post-summary').value = post?.summary || '';
    document.getElementById('post-cover').value = post?.cover || '';
    document.getElementById('post-published').checked = post?.published ?? true;
    this.updateCoverPreview();
    document.getElementById('editor-panel').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  },

  hideEditor() {
    document.getElementById('editor-panel').classList.add('hidden');
    document.body.style.overflow = '';
    this.editingPost = null;
  },

  updateSlugPreview() {
    const title = document.getElementById('post-title').value;
    const slugInput = document.getElementById('post-slug');
    if (slugInput && !slugInput.dataset.manual) {
      slugInput.placeholder = title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '') || '留空则自动生成';
    }
  },

  updateCoverPreview() {
    const url = document.getElementById('post-cover').value.trim();
    const preview = document.getElementById('cover-preview');
    if (preview) preview.innerHTML = url ? `<img src="${escapeHtml(url)}" alt="封面预览">` : '';
  },

  async editPost(id) {
    try {
      const data = await apiFetch('/admin/articles', { headers: { 'Authorization': `Bearer ${this.token}` } });
      const post = data.articles.find(a => a.id === id);
      if (post) this.showEditor(post);
    } catch {
      alert('加载文章失败');
    }
  },

  async savePost() {
    const title = document.getElementById('post-title').value.trim();
    const content = document.getElementById('post-content').value;
    if (!title || !content) { alert('标题和内容不能为空'); return; }

    const body = {
      title,
      slug: document.getElementById('post-slug').value.trim() || undefined,
      content,
      summary: document.getElementById('post-summary').value.trim(),
      cover: document.getElementById('post-cover').value.trim(),
      published: document.getElementById('post-published').checked,
    };

    const isEdit = !!this.editingPost;
    const url = isEdit ? `/articles/${this.editingPost.id}` : '/articles';

    try {
      await apiFetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      this.hideEditor();
      await this.loadPosts();
    } catch (err) {
      alert(`保存失败: ${err.message}`);
    }
  },

  async deletePost(id) {
    if (!confirm('确定删除这篇文章？')) return;
    try {
      await apiFetch(`/articles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.token}` },
      });
      await this.loadPosts();
    } catch (err) {
      alert(`删除失败: ${err.message}`);
    }
  },

  async saveSettings() {
    const settings = {
      siteName: document.getElementById('setting-site-name').value.trim(),
      siteDescription: document.getElementById('setting-site-desc').value.trim(),
    };
    try {
      await apiFetch('/settings', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      alert('设置已保存');
    } catch (err) {
      alert(`保存失败: ${err.message}`);
    }
  },

  async generateCover() {
    const title = document.getElementById('post-title').value.trim();
    if (!title) { alert('请先输入文章标题'); return; }
    const preview = document.getElementById('cover-preview');
    if (preview) preview.innerHTML = '<p>生成中...</p>';
    // TODO: 接入 BizyAir API
    alert('AI 封面生成功能尚未实现，请手动输入封面图片 URL');
    if (preview) preview.innerHTML = '';
  },
};

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
  // 博客首页
  if (document.getElementById('articlesGrid')) {
    Blog.init();
  }
  // 文章详情页
  if (document.getElementById('post-content') && !document.getElementById('articlesGrid')) {
    PostPage.init();
  }
  // 管理后台
  if (document.getElementById('login-screen')) {
    Admin.init();
  }
});
