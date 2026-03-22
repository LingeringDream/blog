// ========== 全局配置 ==========
const CONFIG = {
  postsPerPage: 6,
  apiBase: '/api',
  storageKeys: {
    theme: 'blog-theme',
    token: 'admin-token'
  }
};

// ========== 工具函数 ==========
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// 防抖函数
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// 格式化日期
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('zh-CN', options);
}

// 计算阅读时间
function calculateReadTime(text) {
  const wordsPerMinute = 500; // 中文阅读速度
  const words = text.length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} 分钟阅读`;
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========== 主题管理 ==========
const ThemeManager = {
  init() {
    const saved = localStorage.getItem(CONFIG.storageKeys.theme);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (saved === 'dark' || (!saved && prefersDark)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    this.addButton();
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(CONFIG.storageKeys.theme, next);
    this.updateIcon();
  },

  addButton() {
    const btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.innerHTML = this.getIcon();
    btn.onclick = () => this.toggle();
    
    const nav = document.querySelector('header nav');
    if (nav) nav.prepend(btn);
  },

  updateIcon() {
    const btn = document.querySelector('.theme-toggle');
    if (btn) btn.innerHTML = this.getIcon();
  },

  getIcon() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return isDark ? '☀️' : '🌙';
  }
};

// ========== 阅读进度条 ==========
const ReadingProgress = {
  init() {
    if (!$('.post-detail')) return;
    
    this.progressBar = document.createElement('div');
    this.progressBar.className = 'reading-progress';
    document.body.prepend(this.progressBar);
    
    window.addEventListener('scroll', () => this.update());
    this.update();
  },

  update() {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = window.scrollY;
    const percent = (scrolled / docHeight) * 100;
    this.progressBar.style.width = `${Math.min(percent, 100)}%`;
  }
};

// ========== 返回顶部按钮 ==========
const BackToTop = {
  init() {
    this.button = document.createElement('button');
    this.button.className = 'back-to-top';
    this.button.innerHTML = '↑';
    this.button.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.appendChild(this.button);
    
    window.addEventListener('scroll', debounce(() => this.toggle(), 100));
  },

  toggle() {
    if (window.scrollY > 300) {
      this.button.classList.add('visible');
    } else {
      this.button.classList.remove('visible');
    }
  }
};

// ========== 目录生成 ==========
const TOCGenerator = {
  init() {
    const content = $('.post-detail .content');
    if (!content) return;
    
    const headings = content.querySelectorAll('h2, h3');
    if (headings.length < 3) return; // 少于3个标题不显示目录
    
    this.generateTOC(headings);
    this.observeActiveHeading(headings);
  },

  generateTOC(headings) {
    const container = document.createElement('div');
    container.className = 'toc-container';
    container.innerHTML = '<h3>📑 目录</h3>';
    
    const list = document.createElement('ul');
    
    headings.forEach((heading, index) => {
      const id = `heading-${index}`;
      heading.id = id;
      
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${id}`;
      a.textContent = heading.textContent;
      a.className = heading.tagName === 'H3' ? 'toc-h3' : '';
      
      a.onclick = (e) => {
        e.preventDefault();
        heading.scrollIntoView({ behavior: 'smooth' });
      };
      
      li.appendChild(a);
      list.appendChild(li);
    });
    
    container.appendChild(list);
    
    // 插入到合适位置
    const postDetail = $('.post-detail');
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.gap = '2rem';
    
    const contentWrapper = document.createElement('div');
    contentWrapper.style.flex = '1';
    
    postDetail.parentNode.insertBefore(wrapper, postDetail);
    wrapper.appendChild(contentWrapper);
    wrapper.appendChild(container);
    
    // 移动内容
    while (postDetail.firstChild) {
      contentWrapper.appendChild(postDetail.firstChild);
    }
    postDetail.remove();
  },

  observeActiveHeading(headings) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          $$('.toc-container a').forEach(a => {
            a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
          });
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    
    headings.forEach(h => observer.observe(h));
  }
};

// ========== 代码语法高亮 ==========
const SyntaxHighlighter = {
  keywords: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'new', 'this', 'true', 'false', 'null', 'undefined'],
  
  highlight(code) {
    // 转义 HTML
    let html = escapeHtml(code);
    
    // 注释
    html = html.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>');
    html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');
    
    // 字符串
    html = html.replace(/(&quot;[^&]*&quot;|&#39;[^&]*&#39;|`[^`]*`)/g, '<span class="string">$1</span>');
    
    // 关键字
    this.keywords.forEach(kw => {
      const regex = new RegExp(`\\b(${kw})\\b`, 'g');
      html = html.replace(regex, '<span class="keyword">$1</span>');
    });
    
    // 数字
    html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
    
    return html;
  },
  
  processCodeBlocks() {
    $$('.post-detail .content pre code').forEach(block => {
      const html = this.highlight(block.textContent);
      block.innerHTML = html;
    });
  }
};

// ========== 骨架屏加载 ==========
const SkeletonLoader = {
  render(container, count = 6) {
    container.innerHTML = Array(count).fill(`
      <div class="skeleton-card">
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text-sm"></div>
      </div>
    `).join('');
  },
  
  clear(container) {
    container.innerHTML = '';
  }
};

// ========== 博客前端功能 ==========
const Blog = {
  currentPage: 1,
  totalPages: 1,

  async init() {
    // 检查是否在文章详情页
    const slug = this.getSlugFromPath();
    if (slug) {
      await this.loadPost(slug);
    } else {
      await this.loadPosts();
    }
    
    // 初始化通用组件
    ThemeManager.init();
    ReadingProgress.init();
    BackToTop.init();
  },

  getSlugFromPath() {
    const path = window.location.pathname;
    const match = path.match(/\/post\/(.+)$/);
    return match ? match[1] : null;
  },

  async loadPosts(page = 1) {
    const container = $('#posts-container');
    if (!container) return;
    
    SkeletonLoader.render(container);
    
    try {
      const res = await fetch(`${CONFIG.apiBase}/posts?page=${page}&limit=${CONFIG.postsPerPage}`);
      const data = await res.json();
      
      SkeletonLoader.clear(container);
      this.renderPosts(data.posts, container);
      this.totalPages = data.totalPages;
      this.renderPagination(container);
    } catch (err) {
      container.innerHTML = '<p class="error">加载失败，请刷新重试</p>';
      console.error('Load posts error:', err);
    }
  },

  renderPosts(posts, container) {
    container.innerHTML = posts.map(post => `
      <article class="post-card">
        ${post.cover ? `<img src="${escapeHtml(post.cover)}" alt="${escapeHtml(post.title)}" loading="lazy">` : ''}
        <div class="post-card-content">
          <h2><a href="/post/${escapeHtml(post.slug)}">${escapeHtml(post.title)}</a></h2>
          <p>${escapeHtml(post.summary || '')}</p>
          <span class="date">${formatDate(post.createdAt)}</span>
        </div>
      </article>
    `).join('');
  },

  renderPagination(container) {
    if (this.totalPages <= 1) return;
    
    const pagination = document.createElement('div');
    pagination.className = 'pagination';
    
    pagination.innerHTML = `
      <button ${this.currentPage === 1 ? 'disabled' : ''} onclick="Blog.loadPosts(${this.currentPage - 1})">
        ← 上一页
      </button>
      <span class="page-num">${this.currentPage} / ${this.totalPages}</span>
      <button ${this.currentPage === this.totalPages ? 'disabled' : ''} onclick="Blog.loadPosts(${this.currentPage + 1})">
        下一页 →
      </button>
    `;
    
    container.appendChild(pagination);
  },

  async loadPost(slug) {
    const container = $('#post-content');
    if (!container) return;
    
    try {
      const res = await fetch(`${CONFIG.apiBase}/posts/${slug}`);
      if (!res.ok) throw new Error('Post not found');
      
      const post = await res.json();
      
      document.title = `${post.title} - ${document.title}`;
      
      // 渲染元信息
      const meta = $('.post-detail .meta');
      if (meta) {
        meta.innerHTML = `
          <span>📅 ${formatDate(post.createdAt)}</span>
          <span>⏱️ ${calculateReadTime(post.content)}</span>
          ${post.updatedAt !== post.createdAt ? `<span>✏️ 更新于 ${formatDate(post.updatedAt)}</span>` : ''}
        `;
      }
      
      // 渲染封面
      if (post.cover) {
        const coverContainer = $('.cover-container');
        if (coverContainer) {
          coverContainer.innerHTML = `<img src="${escapeHtml(post.cover)}" alt="${escapeHtml(post.title)}" class="cover-image">`;
        }
      }
      
      // 渲染内容（简单 Markdown）
      container.innerHTML = this.parseMarkdown(post.content);
      
      // 初始化文章页功能
      TOCGenerator.init();
      SyntaxHighlighter.processCodeBlocks();
      
    } catch (err) {
      container.innerHTML = `
        <div class="error">
          <h1>文章未找到</h1>
          <p><a href="/">返回首页</a></p>
        </div>
      `;
    }
  },

  parseMarkdown(text) {
    if (!text) return '';
    
    let html = escapeHtml(text);
    
    // 代码块
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre data-lang="${lang || ''}"><code>${code.trim()}</code></pre>`;
    });
    
    // 行内代码
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // 标题
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // 粗体和斜体
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // 引用
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    
    // 链接
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    
    // 图片
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');
    
    // 无序列表
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    
    // 有序列表
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    
    // 分割线
    html = html.replace(/^---$/gm, '<hr>');
    
    // 段落
    html = html.split(/\n\n+/).map(block => {
      if (block.match(/^<(h[1-6]|ul|ol|li|blockquote|pre|hr)/)) {
        return block;
      }
      return `<p>${block}</p>`;
    }).join('\n');
    
    return html;
  }
};

// ========== 管理后台功能 ==========
const Admin = {
  token: null,
  currentPost: null,

  init() {
    this.token = localStorage.getItem(CONFIG.storageKeys.token);
    ThemeManager.init();
  },

  checkAuth() {
    if (this.token) {
      this.showPanel();
    }
  },

  async login() {
    const token = $('#admin-token').value.trim();
    if (!token) {
      alert('请输入令牌');
      return;
    }
    
    try {
      const res = await fetch(`${CONFIG.apiBase}/posts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        this.token = token;
        localStorage.setItem(CONFIG.storageKeys.token, token);
        this.showPanel();
      } else {
        alert('令牌无效');
      }
    } catch (err) {
      alert('登录失败');
    }
  },

  logout() {
    this.token = null;
    localStorage.removeItem(CONFIG.storageKeys.token);
    location.reload();
  },

  async showPanel() {
    $('#login-screen').classList.add('hidden');
    $('#admin-panel').classList.remove('hidden');
    
    await this.loadPosts();
    await this.loadSettings();
  },

  async loadPosts() {
    const container = $('#admin-posts');
    container.innerHTML = '<p>加载中...</p>';
    
    try {
      const res = await fetch(`${CONFIG.apiBase}/posts?all=true`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const posts = await res.json();
      
      container.innerHTML = posts.map(post => `
        <div class="admin-post-item">
          <div class="post-info">
            <h3>${escapeHtml(post.title)}</h3>
            <span>${formatDate(post.createdAt)} · ${post.published ? '✅ 已发布' : '📝 草稿'}</span>
          </div>
          <div>
            <button class="btn-secondary" onclick="Admin.editPost('${post.slug}')">编辑</button>
            <button class="btn-danger" onclick="Admin.deletePost('${post.slug}')">删除</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = '<p>加载失败</p>';
    }
  },

  async loadSettings() {
    try {
      const res = await fetch(`${CONFIG.apiBase}/settings`);
      const settings = await res.json();
      
      $('#setting-site-name').value = settings.siteName || '';
      $('#setting-site-desc').value = settings.siteDescription || '';
    } catch (err) {
      console.error('Load settings error:', err);
    }
  },

  showTab(tabId) {
    $$('.tab-content').forEach(el => el.classList.add('hidden'));
    $$('.tab').forEach(el => el.classList.remove('active'));
    
    $(`#tab-${tabId}`).classList.remove('hidden');
    event.target.classList.add('active');
  },

  showEditor(post = null) {
    this.currentPost = post;
    
    $('#post-title').value = post?.title || '';
    $('#post-slug').value = post?.slug || '';
    $('#post-content').value = post?.content || '';
    $('#post-summary').value = post?.summary || '';
    $('#post-cover').value = post?.cover || '';
    $('#post-published').checked = post?.published || false;
    
    if (post?.cover) {
      $('#cover-preview').innerHTML = `<img src="${escapeHtml(post.cover)}">`;
    } else {
      $('#cover-preview').innerHTML = '';
    }
    
    $('#editor-panel').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  },

  hideEditor() {
    $('#editor-panel').classList.add('hidden');
    document.body.style.overflow = '';
    this.currentPost = null;
  },

  async editPost(slug) {
    try {
      const res = await fetch(`${CONFIG.apiBase}/posts/${slug}`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const post = await res.json();
      this.showEditor(post);
    } catch (err) {
      alert('加载文章失败');
    }
  },

  async savePost() {
    const post = {
      title: $('#post-title').value.trim(),
      slug: $('#post-slug').value.trim() || undefined,
      content: $('#post-content').value,
      summary: $('#post-summary').value.trim(),
      cover: $('#post-cover').value.trim(),
      published: $('#post-published').checked
    };
    
    if (!post.title || !post.content) {
      alert('标题和内容不能为空');
      return;
    }
    
    try {
      const url = this.currentPost 
        ? `${CONFIG.apiBase}/posts/${this.currentPost.slug}`
        : `${CONFIG.apiBase}/posts`;
      
      const res = await fetch(url, {
        method: this.currentPost ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(post)
      });
      
      if (res.ok) {
        this.hideEditor();
        this.loadPosts();
      } else {
        alert('保存失败');
      }
    } catch (err) {
      alert('保存失败');
    }
  },

  async deletePost(slug) {
    if (!confirm('确定删除这篇文章？')) return;
    
    try {
      const res = await fetch(`${CONFIG.apiBase}/posts/${slug}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      
      if (res.ok) {
        this.loadPosts();
      } else {
        alert('删除失败');
      }
    } catch (err) {
      alert('删除失败');
    }
  },

  async saveSettings() {
    const settings = {
      siteName: $('#setting-site-name').value.trim(),
      siteDescription: $('#setting-site-desc').value.trim()
    };
    
    try {
      const res = await fetch(`${CONFIG.apiBase}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(settings)
      });
      
      if (res.ok) {
        alert('设置已保存');
      } else {
        alert('保存失败');
      }
    } catch (err) {
      alert('保存失败');
    }
  },

  async generateCover() {
    const title = $('#post-title').value.trim();
    if (!title) {
      alert('请先输入文章标题');
      return;
    }
    
    $('#cover-preview').innerHTML = '<p>生成中...</p>';
    
    try {
      const res = await fetch(`${CONFIG.apiBase}/generate-cover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ title })
      });
      
      const data = await res.json();
      
      if (data.url) {
        $('#post-cover').value = data.url;
        $('#cover-preview').innerHTML = `<img src="${escapeHtml(data.url)}">`;
      } else {
        throw new Error('No URL');
      }
    } catch (err) {
      $('#cover-preview').innerHTML = '<p style="color:red">生成失败</p>';
    }
  }
};

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
  if ($('#posts-container') || $('#post-content')) {
    Blog.init();
  }
  if ($('#login-screen')) {
    Admin.init();
  }
});
