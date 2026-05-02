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

// ==================== 移动端菜单 ====================
function toggleMenu() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.querySelector('.nav-links');
  if (hamburger) hamburger.classList.toggle('active');
  if (navLinks) navLinks.classList.toggle('open');
}

// 点击导航链接后自动关闭菜单
document.addEventListener('click', (e) => {
  if (e.target.closest('.nav-links a')) {
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger) hamburger.classList.remove('active');
    if (navLinks) navLinks.classList.remove('open');
  }
});

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

// ==================== Marked 配置 - 图片懒加载 ====================
if (typeof marked !== 'undefined') {
  const renderer = new marked.Renderer();
  const originalImage = renderer.image;
  renderer.image = function(href, title, text) {
    // Handle different marked versions
    if (typeof href === 'object') {
      const token = href;
      return `<img src="${token.href}" alt="${token.text || ''}" title="${token.title || ''}" loading="lazy">`;
    }
    return `<img src="${href}" alt="${text || ''}" title="${title || ''}" loading="lazy">`;
  };
  marked.setOptions({ renderer });
}

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
    this.loadOnThisDay();
  },

  async loadSidebarProfile() {
    const card = document.getElementById('profileCard');
    if (!card) return;

    const SOCIAL_ICONS = {
      github: '🐙', twitter: '🐦', email: '📧', wechat: '💬',
      bilibili: '📺', zhihu: '📘', juejin: '💎', website: '🌐',
      telegram: '✈️', rss: '📡',
    };

    try {
      const [profile, stats] = await Promise.all([
        apiFetch('/profile'),
        apiFetch('/profile/stats'),
      ]);

      // 个人简介卡片
      let socialHtml = '';
      if (profile.socialLinks && Object.keys(profile.socialLinks).length > 0) {
        socialHtml = '<div class="profile-card-social">' +
          Object.entries(profile.socialLinks).filter(([_, u]) => u).map(([p, u]) => {
            const icon = SOCIAL_ICONS[p] || '🔗';
            const href = p === 'email' ? `mailto:${u}` : (u.startsWith('http') ? u : `https://${u}`);
            return `<a href="${href}" target="_blank" rel="noopener" class="profile-card-social-link" title="${p}">${icon}</a>`;
          }).join('') + '</div>';
      }

      card.innerHTML = `
        <div class="profile-card-inner">
          ${profile.avatar ? `<a href="/about"><img class="profile-card-avatar" src="${escapeHtml(profile.avatar)}" alt="头像"></a>` : ''}
          <h3 class="profile-card-name"><a href="/about" style="color:inherit;text-decoration:none;">${escapeHtml(profile.name || '博主')}</a></h3>
          ${profile.title ? `<p class="profile-card-title">${escapeHtml(profile.title)}</p>` : ''}
          ${profile.bio ? `<p class="profile-card-bio">${escapeHtml(profile.bio)}</p>` : ''}
          ${socialHtml}
          <div class="profile-card-stats">
            <a href="/"><div class="pc-stat-num">${stats.articles || 0}</div><div class="pc-stat-lbl">文章</div></a>
            <a href="/tags"><div class="pc-stat-num">${stats.tags || 0}</div><div class="pc-stat-lbl">标签</div></a>
            <div class="pc-stat-num">${stats.daysSinceFirst || 0}</div><div class="pc-stat-lbl">天</div>
          </div>
        </div>
      `;

      // 加载项目
      if (profile.projects && profile.projects.length > 0) {
        const projCard = document.getElementById('projectsCard');
        projCard.classList.remove('hidden');
        projCard.innerHTML = `
          <h3 class="sidebar-card-title">🚀 项目</h3>
          <div class="project-list">
            ${profile.projects.map(p => `
              <a href="${escapeHtml(p.url || '#')}" target="_blank" rel="noopener" class="project-item">
                <div class="project-name">${escapeHtml(p.name)}</div>
                ${p.description ? `<div class="project-desc">${escapeHtml(p.description)}</div>` : ''}
                ${p.tech ? `<div class="project-tech">${escapeHtml(p.tech)}</div>` : ''}
              </a>
            `).join('')}
          </div>
        `;
      }

      // 加载经历
      if (profile.experience && profile.experience.length > 0) {
        const expCard = document.getElementById('experienceCard');
        expCard.classList.remove('hidden');
        expCard.innerHTML = `
          <h3 class="sidebar-card-title">💼 经历</h3>
          <div class="experience-list">
            ${profile.experience.map(e => `
              <div class="experience-item">
                <div class="exp-dot"></div>
                <div class="exp-content">
                  <div class="exp-title">${escapeHtml(e.title)}</div>
                  ${e.company ? `<div class="exp-company">${escapeHtml(e.company)}</div>` : ''}
                  ${e.period ? `<div class="exp-period">${escapeHtml(e.period)}</div>` : ''}
                  ${e.description ? `<div class="exp-desc">${escapeHtml(e.description)}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }

    } catch (err) {
      console.error('Load sidebar profile error:', err);
    }
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
        ${a.pinned ? '<div class="pin-badge">📌 置顶</div>' : ''}
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

  async loadOnThisDay() {
    const container = document.getElementById('onThisDay');
    if (!container) return;

    try {
      const articles = await apiFetch('/on-this-day');
      if (articles.length === 0) return;

      container.classList.remove('hidden');
      container.innerHTML = `
        <h3>📅 历史上的今天</h3>
        <div class="on-this-day-list">
          ${articles.map(a => `
            <a href="/post/${encodeURIComponent(a.slug)}" class="on-this-day-item">
              <span class="otd-year">${a.year}年</span>
              <span class="otd-title">${escapeHtml(a.title)}</span>
            </a>
          `).join('')}
        </div>
      `;
    } catch (err) {
      console.error('Load on-this-day error:', err);
    }
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

      // JSON-LD 结构化数据
      const jsonLd = document.getElementById('article-jsonld');
      if (jsonLd) {
        jsonLd.textContent = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.summary || '',
          datePublished: post.createdAt,
          dateModified: post.updatedAt,
          author: { '@type': 'Person', name: '博主' },
          image: post.cover || undefined,
          mainEntityOfPage: { '@type': 'WebPage', '@id': window.location.href },
        });
      }

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

      // 添加代码复制按钮
      container.querySelectorAll('pre').forEach(pre => {
        if (pre.querySelector('.copy-btn')) return;
        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.textContent = '复制';
        btn.addEventListener('click', () => {
          const code = pre.querySelector('code');
          navigator.clipboard.writeText(code?.textContent || pre.textContent).then(() => {
            btn.textContent = '已复制 ✓';
            btn.classList.add('copied');
            setTimeout(() => { btn.textContent = '复制'; btn.classList.remove('copied'); }, 2000);
          });
        });
        pre.style.position = 'relative';
        pre.appendChild(btn);
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
  autosaveTimer: null,
  contentChanged: false,
  selectedVersionId: null,

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
    await this.loadProfile();
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
            <h3>${p.pinned ? '📌 ' : ''}${escapeHtml(p.title)}</h3>
            <span>${formatDate(p.createdAt)} · ${p.published ? '✅ 已发布' : '📝 草稿'}${p.pinned ? ' · 🔝 置顶' : ''}${p.visibility !== 'public' ? ` · ${p.visibility === 'private' ? '🔒 私密' : '🔗 不公开'}` : ''}</span>
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

  async loadProfile() {
    try {
      const profile = await apiFetch('/profile');
      const el = (id) => document.getElementById(id);
      if (el('profile-name')) el('profile-name').value = profile.name || '';
      if (el('profile-title')) el('profile-title').value = profile.title || '';
      if (el('profile-bio')) el('profile-bio').value = profile.bio || '';
      if (el('profile-avatar')) el('profile-avatar').value = profile.avatar || '';
      if (el('profile-cover')) el('profile-cover').value = profile.cover || '';
      if (el('profile-skills')) el('profile-skills').value = (profile.skills || []).join(', ');
      if (el('profile-about')) el('profile-about').value = profile.about || '';

      // 社交链接
      const sl = profile.socialLinks || {};
      ['github', 'twitter', 'email', 'wechat', 'bilibili', 'zhihu', 'juejin', 'website', 'telegram', 'rss'].forEach(p => {
        const input = el(`profile-social-${p}`);
        if (input) input.value = sl[p] || '';
      });

      // 头像预览
      const preview = el('profile-avatar-preview');
      if (preview && profile.avatar) {
        preview.innerHTML = `<img src="${escapeHtml(profile.avatar)}" alt="头像预览" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid var(--border);">`;
      }

      // 项目列表
      const projContainer = document.getElementById('projects-list');
      if (projContainer) {
        projContainer.innerHTML = '';
        (profile.projects || []).forEach(p => this.addProjectEntry(p));
      }

      // 经历列表
      const expContainer = document.getElementById('experience-list');
      if (expContainer) {
        expContainer.innerHTML = '';
        (profile.experience || []).forEach(e => this.addExperienceEntry(e));
      }
    } catch (err) {
      console.error('Load profile error:', err);
    }
  },

  async uploadProfileImage(input, inputId, previewId) {
    const file = input.files?.[0];
    if (!file) return;

    const preview = document.getElementById(previewId);
    if (preview) preview.innerHTML = '<p style="color:var(--text-secondary);">⏳ 上传中...</p>';

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '上传失败' }));
        throw new Error(err.error);
      }

      const data = await res.json();
      document.getElementById(inputId).value = data.url;
      if (preview) {
        const isAvatar = inputId === 'profile-avatar';
        preview.innerHTML = `<img src="${escapeHtml(data.url)}" alt="预览" style="width:${isAvatar ? '80px;height:80px;border-radius:50%' : '100%;max-height:150px;border-radius:8px'};object-fit:cover;border:2px solid var(--border);">`;
      }
    } catch (err) {
      if (preview) preview.innerHTML = `<p style="color:#e74c3c;">❌ ${err.message}</p>`;
    }

    input.value = '';
  },

  async saveProfile() {
    const socialPlatforms = ['github', 'twitter', 'email', 'wechat', 'bilibili', 'zhihu', 'juejin', 'website', 'telegram', 'rss'];
    const socialLinks = {};
    socialPlatforms.forEach(p => {
      const input = document.getElementById(`profile-social-${p}`);
      if (input && input.value.trim()) socialLinks[p] = input.value.trim();
    });

    const skillsRaw = document.getElementById('profile-skills').value.trim();
    const skills = skillsRaw ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    // 收集项目列表
    const projects = [];
    document.querySelectorAll('.project-entry').forEach(entry => {
      const name = entry.querySelector('.proj-name')?.value.trim();
      if (name) {
        projects.push({
          name,
          description: entry.querySelector('.proj-desc')?.value.trim() || '',
          url: entry.querySelector('.proj-url')?.value.trim() || '',
          tech: entry.querySelector('.proj-tech')?.value.trim() || '',
        });
      }
    });

    // 收集经历列表
    const experience = [];
    document.querySelectorAll('.experience-entry').forEach(entry => {
      const title = entry.querySelector('.exp-entry-title')?.value.trim();
      if (title) {
        experience.push({
          title,
          company: entry.querySelector('.exp-entry-company')?.value.trim() || '',
          period: entry.querySelector('.exp-entry-period')?.value.trim() || '',
          description: entry.querySelector('.exp-entry-desc')?.value.trim() || '',
        });
      }
    });

    const body = {
      name: document.getElementById('profile-name').value.trim(),
      title: document.getElementById('profile-title').value.trim(),
      bio: document.getElementById('profile-bio').value.trim(),
      avatar: document.getElementById('profile-avatar').value.trim(),
      cover: document.getElementById('profile-cover').value.trim(),
      skills,
      about: document.getElementById('profile-about').value,
      socialLinks,
      projects,
      experience,
    };

    try {
      await apiFetch('/profile', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      alert('个人信息已保存');
    } catch (err) {
      alert('保存失败: ' + err.message);
    }
  },

  addProjectEntry(data = {}) {
    const container = document.getElementById('projects-list');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'project-entry dynamic-entry';
    div.innerHTML = `
      <div class="dynamic-entry-header">
        <span class="dynamic-entry-label">项目</span>
        <button type="button" class="btn-danger" onclick="this.closest('.dynamic-entry').remove()" style="padding:0.3rem 0.6rem;font-size:0.8rem;">✕</button>
      </div>
      <input type="text" class="proj-name" placeholder="项目名称" value="${escapeHtml(data.name || '')}">
      <input type="text" class="proj-desc" placeholder="一句话描述" value="${escapeHtml(data.description || '')}">
      <input type="text" class="proj-url" placeholder="链接地址 (https://...)" value="${escapeHtml(data.url || '')}">
      <input type="text" class="proj-tech" placeholder="技术栈 (React, Node.js...)" value="${escapeHtml(data.tech || '')}">
    `;
    container.appendChild(div);
  },

  addExperienceEntry(data = {}) {
    const container = document.getElementById('experience-list');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'experience-entry dynamic-entry';
    div.innerHTML = `
      <div class="dynamic-entry-header">
        <span class="dynamic-entry-label">经历</span>
        <button type="button" class="btn-danger" onclick="this.closest('.dynamic-entry').remove()" style="padding:0.3rem 0.6rem;font-size:0.8rem;">✕</button>
      </div>
      <input type="text" class="exp-entry-title" placeholder="职位/身份" value="${escapeHtml(data.title || '')}">
      <input type="text" class="exp-entry-company" placeholder="公司/组织" value="${escapeHtml(data.company || '')}">
      <input type="text" class="exp-entry-period" placeholder="时间段 (2020.06 - 至今)" value="${escapeHtml(data.period || '')}">
      <textarea class="exp-entry-desc" placeholder="简要描述（可选）" rows="2">${escapeHtml(data.description || '')}</textarea>
    `;
    container.appendChild(div);
  },

  bindEditor() {
    const titleInput = document.getElementById('post-title');
    const coverInput = document.getElementById('post-cover');
    const contentInput = document.getElementById('post-content');
    if (titleInput) titleInput.addEventListener('input', debounce(() => this.updateSlugPreview(), 300));
    if (coverInput) coverInput.addEventListener('input', debounce(() => this.updateCoverPreview(), 300));

    // 绑定自动保存
    if (contentInput) {
      contentInput.addEventListener('input', () => this.onContentChange());
    }
    if (titleInput) {
      titleInput.addEventListener('input', () => this.onContentChange());
    }

    // 绑定快捷键
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const panel = document.getElementById('editor-panel');
        if (panel && !panel.classList.contains('hidden')) {
          const dfPanel = document.getElementById('editor-panel');
          if (dfPanel.classList.contains('distraction-free')) {
            this.toggleDistractionFree();
          } else {
            this.hideEditor();
          }
        }
      }
    });
  },

  // 自动保存相关
  onContentChange() {
    this.contentChanged = true;
    clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => this.autosave(), 5000);
  },

  async autosave() {
    if (!this.editingPost || !this.contentChanged) return;

    const indicator = document.getElementById('autosave-indicator');
    if (indicator) indicator.textContent = '保存中...';

    try {
      const body = {
        title: document.getElementById('post-title').value.trim(),
        content: document.getElementById('post-content').value,
        summary: document.getElementById('post-summary').value.trim(),
        cover: document.getElementById('post-cover').value.trim(),
      };

      const result = await apiFetch(`/articles/${this.editingPost.id}/autosave`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      this.contentChanged = false;
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      if (indicator) {
        if (result.skipped) {
          indicator.textContent = `已保存 ${time}`;
        } else {
          indicator.textContent = `已保存 ${time}`;
        }
      }
    } catch (err) {
      const indicator = document.getElementById('autosave-indicator');
      if (indicator) indicator.textContent = '保存失败';
      console.error('Autosave error:', err);
    }
  },

  // 版本历史
  async showVersionHistory() {
    if (!this.editingPost) return;

    const panel = document.getElementById('version-history-panel');
    const list = document.getElementById('version-list');
    if (!panel || !list) return;

    panel.classList.remove('hidden');
    list.innerHTML = '<p>加载中...</p>';

    try {
      const versions = await apiFetch(`/articles/${this.editingPost.id}/versions`, {
        headers: { 'Authorization': `Bearer ${this.token}` },
      });

      if (versions.length === 0) {
        list.innerHTML = '<p class="empty-state">暂无版本历史</p>';
        return;
      }

      list.innerHTML = versions.map(v => `
        <div class="version-item" data-id="${v.id}" onclick="Admin.previewVersion(${v.id})">
          <div class="version-title">${escapeHtml(v.title || '无标题')}</div>
          <div class="version-time">${formatDateTime(v.saved_at)}</div>
        </div>
      `).join('');
    } catch (err) {
      list.innerHTML = '<p>加载失败</p>';
      console.error(err);
    }
  },

  hideVersionHistory() {
    const panel = document.getElementById('version-history-panel');
    if (panel) panel.classList.add('hidden');
    this.selectedVersionId = null;
  },

  async previewVersion(versionId) {
    if (!this.editingPost) return;

    this.selectedVersionId = versionId;
    const preview = document.getElementById('version-preview');
    const content = document.getElementById('version-preview-content');
    const title = document.getElementById('version-preview-title');
    if (!preview || !content) return;

    try {
      const version = await apiFetch(`/articles/${this.editingPost.id}/versions/${versionId}`, {
        headers: { 'Authorization': `Bearer ${this.token}` },
      });

      if (title) title.textContent = version.title || '无标题';
      content.innerHTML = `<pre style="white-space:pre-wrap;word-break:break-all;">${escapeHtml(version.content)}</pre>`;
      preview.classList.remove('hidden');
    } catch (err) {
      alert('加载版本失败');
      console.error(err);
    }
  },

  closeVersionPreview() {
    const preview = document.getElementById('version-preview');
    if (preview) preview.classList.add('hidden');
    this.selectedVersionId = null;
  },

  async restoreVersion() {
    if (!this.editingPost || !this.selectedVersionId) return;

    if (!confirm('确定恢复到此版本？当前内容将保存为新版本。')) return;

    try {
      const result = await apiFetch(`/articles/${this.editingPost.id}/restore/${this.selectedVersionId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      });

      // 更新编辑器内容
      if (result.article) {
        document.getElementById('post-title').value = result.article.title;
        document.getElementById('post-content').value = result.article.content;
        document.getElementById('post-summary').value = result.article.summary;
      }

      this.hideVersionHistory();
      alert('已恢复到指定版本');
    } catch (err) {
      alert('恢复失败: ' + err.message);
      console.error(err);
    }
  },

  // 专注模式
  toggleDistractionFree() {
    const panel = document.getElementById('editor-panel');
    const sidebar = document.getElementById('editor-sidebar');
    if (!panel) return;

    panel.classList.toggle('distraction-free');
    if (panel.classList.contains('distraction-free')) {
      if (sidebar) sidebar.style.display = 'none';
    } else {
      if (sidebar) sidebar.style.display = '';
    }
  },

  // 导出功能
  async exportArticles(format) {
    try {
      const res = await fetch(`/api/export?format=${format}`, {
        headers: { 'Authorization': `Bearer ${this.token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '导出失败' }));
        throw new Error(err.error);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blog-export.${format === 'json' ? 'json' : 'md'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('导出失败: ' + err.message);
    }
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
    document.getElementById('post-pinned').checked = post?.pinned ?? false;

    // 设置可见性
    const visibility = post?.visibility || 'public';
    const radios = document.querySelectorAll('input[name="post-visibility"]');
    radios.forEach(r => r.checked = r.value === visibility);

    // 密码字段留空（不显示已有的密码哈希）
    document.getElementById('post-password').value = '';

    // 重置自动保存状态
    this.contentChanged = false;
    clearTimeout(this.autosaveTimer);
    const indicator = document.getElementById('autosave-indicator');
    if (indicator) indicator.textContent = '';

    this.updateCoverPreview();
    document.getElementById('editor-panel').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  },

  hideEditor() {
    document.getElementById('editor-panel').classList.add('hidden');
    document.body.style.overflow = '';
    this.editingPost = null;
    clearTimeout(this.autosaveTimer);
    this.contentChanged = false;

    // 移除专注模式
    const panel = document.getElementById('editor-panel');
    if (panel) panel.classList.remove('distraction-free');
    const sidebar = document.getElementById('editor-sidebar');
    if (sidebar) sidebar.style.display = '';
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

    const visibility = document.querySelector('input[name="post-visibility"]:checked')?.value || 'public';
    const password = document.getElementById('post-password').value.trim();

    const body = {
      title,
      slug: document.getElementById('post-slug').value.trim() || undefined,
      content,
      summary: document.getElementById('post-summary').value.trim(),
      cover: document.getElementById('post-cover').value.trim(),
      published: document.getElementById('post-published').checked,
      pinned: document.getElementById('post-pinned').checked,
      visibility,
      password: password || undefined,
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

  generateCover() {
    const section = document.getElementById('ai-prompt-section');
    if (!section) return;
    const isVisible = section.style.display !== 'none';
    section.style.display = isVisible ? 'none' : '';
    if (!isVisible) {
      const title = document.getElementById('post-title').value.trim();
      const promptInput = document.getElementById('ai-prompt-input');
      if (promptInput && title && !promptInput.value) {
        promptInput.value = `为文章「${title}」生成一张高质量的封面配图`;
      }
      promptInput?.focus();
    }
  },

  async doGenerateCover() {
    const promptInput = document.getElementById('ai-prompt-input');
    const prompt = promptInput?.value.trim();
    if (!prompt) { alert('请输入图片描述'); return; }

    const preview = document.getElementById('cover-preview');
    if (preview) preview.innerHTML = '<p style="color:var(--text-secondary);">⏳ AI 生成中，请稍候...</p>';

    try {
      const data = await apiFetch('/ai/generate-cover', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (data.url) {
        document.getElementById('post-cover').value = data.url;
        if (preview) preview.innerHTML = `<img src="${escapeHtml(data.url)}" alt="AI 生成封面">`;
        document.getElementById('ai-prompt-section').style.display = 'none';
      }
    } catch (err) {
      if (preview) preview.innerHTML = `<p style="color:#e74c3c;">❌ ${err.message}</p>`;
    }
  },

  async uploadCover(input) {
    const file = input.files?.[0];
    if (!file) return;

    const preview = document.getElementById('cover-preview');
    if (preview) preview.innerHTML = '<p style="color:var(--text-secondary);">⏳ 上传中...</p>';

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '上传失败' }));
        throw new Error(err.error);
      }

      const data = await res.json();
      document.getElementById('post-cover').value = data.url;
      if (preview) preview.innerHTML = `<img src="${escapeHtml(data.url)}" alt="上传封面">`;
    } catch (err) {
      if (preview) preview.innerHTML = `<p style="color:#e74c3c;">❌ ${err.message}</p>`;
    }

    // 清空 input 以允许重复上传同一文件
    input.value = '';
  },
};

// ==================== 日历页面 ====================
const CalendarPage = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth() + 1,
  calendarData: {},

  async init() {
    ThemeManager.init();
    ThemeManager.bindButton('themeToggle');
    Navbar.init('navbar');
    BackToTop.init('backToTop');

    document.getElementById('prevMonth')?.addEventListener('click', () => this.prevMonth());
    document.getElementById('nextMonth')?.addEventListener('click', () => this.nextMonth());

    await this.loadCalendar();
  },

  async loadCalendar() {
    const titleEl = document.getElementById('calendarTitle');
    const statsEl = document.getElementById('calendarStats');
    const daysEl = document.getElementById('calendarDays');
    const articlesEl = document.getElementById('calendarArticles');

    if (titleEl) titleEl.textContent = `${this.currentYear}年${this.currentMonth}月`;

    try {
      const data = await apiFetch('/calendar');
      this.calendarData = data;

      const key = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}`;
      const monthArticles = data[key] || [];

      // 统计
      if (statsEl) {
        statsEl.innerHTML = `
          <span>📝 本月 ${monthArticles.length} 篇文章</span>
          <span>📅 ${this.currentYear}年共 ${this.getYearTotal()} 篇</span>
        `;
      }

      // 渲染日历
      if (daysEl) this.renderCalendarGrid(monthArticles);

      // 文章列表
      if (articlesEl) {
        if (monthArticles.length === 0) {
          articlesEl.innerHTML = '<p class="empty-state">本月暂无文章</p>';
        } else {
          articlesEl.innerHTML = `
            <h3>📝 本月文章</h3>
            <div class="calendar-article-list">
              ${monthArticles.map(a => `
                <a href="/post/${encodeURIComponent(a.slug)}" class="calendar-article-item">
                  <span class="article-day">${a.day}日</span>
                  <span class="article-title">${escapeHtml(a.title)}</span>
                </a>
              `).join('')}
            </div>
          `;
        }
      }
    } catch (err) {
      console.error('Load calendar error:', err);
      if (daysEl) daysEl.innerHTML = '<p class="empty-state">加载失败</p>';
    }
  },

  renderCalendarGrid(articles) {
    const daysEl = document.getElementById('calendarDays');
    if (!daysEl) return;

    const firstDay = new Date(this.currentYear, this.currentMonth - 1, 1).getDay();
    const daysInMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();
    const today = new Date();

    const articleDays = new Map();
    articles.forEach(a => {
      if (!articleDays.has(a.day)) articleDays.set(a.day, []);
      articleDays.get(a.day).push(a);
    });

    let html = '';

    // 空白填充
    for (let i = 0; i < firstDay; i++) {
      html += '<span class="calendar-day empty"></span>';
    }

    // 日期
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = today.getFullYear() === this.currentYear &&
                      today.getMonth() + 1 === this.currentMonth &&
                      today.getDate() === day;
      const hasArticles = articleDays.has(day);

      let className = 'calendar-day';
      if (isToday) className += ' today';
      if (hasArticles) className += ' has-article';

      if (hasArticles) {
        const dayArticles = articleDays.get(day);
        html += `<span class="${className}" onclick="CalendarPage.showDayArticles(${day})" title="${dayArticles.map(a => a.title).join(', ')}">${day}</span>`;
      } else {
        html += `<span class="${className}">${day}</span>`;
      }
    }

    daysEl.innerHTML = html;
  },

  getYearTotal() {
    let total = 0;
    for (let m = 1; m <= 12; m++) {
      const key = `${this.currentYear}-${String(m).padStart(2, '0')}`;
      total += (this.calendarData[key] || []).length;
    }
    return total;
  },

  showDayArticles(day) {
    const key = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}`;
    const articles = (this.calendarData[key] || []).filter(a => a.day === day);
    if (articles.length === 1) {
      window.location.href = `/post/${encodeURIComponent(articles[0].slug)}`;
    }
  },

  prevMonth() {
    this.currentMonth--;
    if (this.currentMonth < 1) {
      this.currentMonth = 12;
      this.currentYear--;
    }
    this.loadCalendar();
  },

  nextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 12) {
      this.currentMonth = 1;
      this.currentYear++;
    }
    this.loadCalendar();
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
  // 日历页面
  if (document.getElementById('calendarGrid')) {
    CalendarPage.init();
  }
});
