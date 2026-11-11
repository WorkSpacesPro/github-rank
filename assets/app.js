// ======= 1. 初始化主题 (防止刷新闪烁) =======
(function(){
  var t = localStorage.getItem("theme");
  if(t === "dark" || t === "light") { document.documentElement.setAttribute("data-theme", t); }
  else { document.documentElement.setAttribute("data-theme", window.matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light"); }
})();

// ======= 2. 多语言字典 =======
const I18N = {
  zh: {
    pageTitle: "GitHub 开源排行榜",
    searchPlaceholder: "搜索项目名、语言或简介...",
    thProject: "项目",
    thGrowth: "涨星",
    thLang: "语言",
    thDesc: "简介",
    navTitle: "开源排行榜",
    navCategory: "目录导航",
    footerText: "© 2026 GitHub 开源排行榜 | 数据来源于 GitHub Actions 自动抓取",
    loading: "加载中...",
    noData: "没有找到匹配的数据",
    langBtn: "English"
  },
  en: {
    pageTitle: "GitHub Open Source Rankings",
    searchPlaceholder: "Search projects, languages...",
    thProject: "Project",
    thGrowth: "Growth",
    thLang: "Language",
    thDesc: "Description",
    navTitle: "Open Source Rank",
    navCategory: "Navigation",
    footerText: "© 2026 GitHub Rankings | Data by GitHub Actions",
    loading: "Loading...",
    noData: "No matching data found",
    langBtn: "中文"
  }
};

// ======= 3. 全局状态 =======
let currentLang = localStorage.getItem('lang') || 'zh';
let currentCategory = ""; // 当前高亮的分类 (存英文 file 名)
let currentData = [];     // 当前分类的数据
let filteredData = [];    // 搜索过滤后的数据
let sortKey = "stars";    // 默认排序字段
let sortOrder = "desc";   // 默认降序
let categoriesData = [];  // 缓存分类列表

// ======= 4. 公共组件渲染 =======
async function renderLayout() {
  const path = window.location.pathname;
  const dict = I18N[currentLang];
  
  // 替换 HTML 里的静态文本 (index.html 里带 data-i18n 的标签)
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = dict[el.dataset.i18n];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = dict[el.dataset.i18nPlaceholder];
  });

  // 注入顶部的按钮
  document.getElementById('app-header').innerHTML = `
    <button class='nav-toggle' type='button' aria-label='Toggle navigation'>
      <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M4 12h16'/><path d='M4 6h16'/><path d='M4 18h16'/></svg>
    </button>
    <div class='nav-backdrop'></div>
    <button class="theme-toggle" type="button" aria-label="Toggle theme">
      <svg class="icon-sun" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
      <svg class="icon-moon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
    </button>
    <button class="back-to-top" id="back-to-top" aria-label="Return to top">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
    </button>
  `;

  // 注入页脚
  document.getElementById('app-footer').innerHTML = `
    <footer class="footer">
      <p>${dict.footerText}</p>
      <p>Powered by <a href="https://github.com" target="_blank">GitHub</a> & <a href="https://pages.cloudflare.com" target="_blank">Cloudflare Pages</a></p>
    </footer>
  `;

  // 动态加载导航配置
  try {
    const res = await fetch('data/nav.json?t=' + Date.now());
    const navItems = await res.json();
    let navHtml = '';
    navItems.forEach(item => {
      const isActive = path.includes(item.link) || (path.endsWith('/') && item.link === 'index.html');
      const activeClass = isActive ? 'active' : '';
      const target = item.link.startsWith('http') ? 'target="_blank"' : '';
      const name = currentLang === 'zh' ? item.zh : item.en;
      navHtml += `<li><a href="${item.link}" class="${activeClass}" ${target}>${name}</a></li>`;
    });

    // 注入侧边栏 (底部的语言切换按钮)
    document.getElementById('app-sidebar').innerHTML = `
      <nav class="nav" style="display:flex; flex-direction:column;">
        <div class="nav-inner" style="flex:1;">
          <div class="nav-header">
            <img src="assets/logo.png" alt="Logo" class="nav-logo">
            <span class="nav-title">${dict.navTitle}</span>
          </div>
          <div class="nav-section-title">${dict.navCategory}</div>
          <ul class="nav-list">${navHtml}</ul>
        </div>
        <div style="padding: 1rem; border-top: 1px solid var(--border);">
          <button id="lang-toggle" style="width:100%; padding:0.6rem; background:var(--bg-alt); border:1px solid var(--border); border-radius:6px; cursor:pointer; color:var(--text-muted); font-family:var(--font); font-size:0.85rem; transition:all 0.2s;">
            🌐 ${dict.langBtn}
          </button>
        </div>
      </nav>
    `;
    bindEvents();
  } catch (err) {
    console.error('导航加载失败', err);
  }
}

// ======= 5. 事件绑定 =======
function bindEvents() {
  // 语言切换
  const langBtn = document.getElementById('lang-toggle');
  if (langBtn) {
    langBtn.addEventListener('click', () => {
      currentLang = currentLang === 'zh' ? 'en' : 'zh';
      localStorage.setItem('lang', currentLang);
      renderLayout(); // 重新渲染导航和静态文本
      if (categoriesData.length > 0) renderTabs(); // 重新渲染标签，无需重新请求数据
    });
  }

  // 主题切换 (水波纹)
  var btn = document.querySelector('.theme-toggle');
  if (btn) {
    btn.addEventListener('click', function(){
      var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      var next = isDark ? 'light' : 'dark';
      var rect = btn.getBoundingClientRect();
      document.documentElement.style.setProperty('--toggle-x', (rect.left + rect.width / 2) + 'px');
      document.documentElement.style.setProperty('--toggle-y', (rect.top + rect.height / 2) + 'px');
      function apply(){
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
      }
      if (document.startViewTransition) document.startViewTransition(apply);
      else apply();
    });
  }

  // 移动端菜单开关
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  var backdrop = document.querySelector('.nav-backdrop');
  if (toggle && nav && backdrop) {
    toggle.addEventListener('click', () => { nav.classList.toggle('nav--open'); backdrop.classList.toggle('nav-backdrop--visible'); });
    backdrop.addEventListener('click', () => { nav.classList.remove('nav--open'); backdrop.classList.remove('nav-backdrop--visible'); });
  }

  // 返回顶部
  const backToTopBtn = document.getElementById('back-to-top');
  if (backToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) backToTopBtn.classList.add('show');
      else backToTopBtn.classList.remove('show');
    });
    backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // 搜索框
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.addEventListener('input', () => applySearchAndSort());

  // 表头排序
  document.querySelectorAll('th.sortable').forEach(th => {
    if(th.dataset.key === sortKey) th.classList.add(sortOrder);
    th.addEventListener('click', () => {
      const key = th.dataset.key;
      if (sortKey === key) sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      else { sortKey = key; sortOrder = 'desc'; }
      document.querySelectorAll('th.sortable').forEach(t => t.classList.remove('asc', 'desc'));
      th.classList.add(sortOrder);
      applySearchAndSort();
    });
  });
}

// ======= 6. 首页数据初始化 =======
const formatNum = (num) => num ? num.toLocaleString() : '0';

async function initApp() {
  const tableBody = document.getElementById('table-body');
  if (!tableBody) return; // 防止在 about.html 报错

  try {
    // 拉取分类列表
    const res = await fetch(`data/categories.json?t=${Date.now()}`);
    if (!res.ok) throw new Error("找不到 categories.json");
    
    categoriesData = await res.json();
    renderTabs();

  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="6" class="loading" style="color:#cf222e;">⚠️ ${err.message}</td></tr>`;
  }
}

// 渲染标签栏 (独立拆分，方便语言切换时重绘)
function renderTabs() {
  const tabsContainer = document.getElementById('tabs');
  if (!tabsContainer) return;
  tabsContainer.innerHTML = '';
  
  categoriesData.forEach((item, index) => {
    const btn = document.createElement('button');
    // 判断当前高亮
    const isActive = item.file === currentCategory || (index === 0 && !currentCategory);
    btn.className = `tab-btn ${isActive ? 'active' : ''}`;
    
    // 中英文显示标签
    btn.textContent = currentLang === 'zh' ? item.zh : item.en;
    
    btn.onclick = () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // 动态替换页面标题
      const displayName = currentLang === 'zh' ? item.zh : item.en;
      document.title = `${displayName} - GitHub Rankings`;
      
      // 清空搜索框
      const searchInput = document.getElementById('search-input');
      if (searchInput) searchInput.value = '';
      
      // 加载数据
      loadCategoryData(item.file);
    };
    tabsContainer.appendChild(btn);
  });

  // 首次加载，默认加载第一个分类
  if (!currentCategory && categoriesData.length > 0) {
    loadCategoryData(categoriesData[0].file);
  }
}

// 加载具体分类数据 (按需加载)
async function loadCategoryData(catFile) {
  const tableBody = document.getElementById('table-body');
  
  // 骨架屏
  tableBody.innerHTML = `
    <tr class="skeleton-row"><td colspan="6"><div class="skeleton"></div></td></tr>
    <tr class="skeleton-row"><td colspan="6"><div class="skeleton"></div></td></tr>
    <tr class="skeleton-row"><td colspan="6"><div class="skeleton"></div></td></tr>
  `;

  try {
    // 直接请求英文文件名
    const res = await fetch(`data/${catFile}.json?t=${Date.now()}`);
    if (!res.ok) throw new Error(`找不到 ${catFile}.json`);
    
    currentData = await res.json();
    currentCategory = catFile; // 保存当前分类名
    
    // 重置排序状态
    sortKey = "stars";
    sortOrder = "desc";
    document.querySelectorAll('th.sortable').forEach(t => t.classList.remove('asc', 'desc'));
    const defaultTh = document.querySelector(`th[data-key="stars"]`);
    if (defaultTh) defaultTh.classList.add("desc");

    applySearchAndSort();
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="6" class="loading" style="color:#cf222e;">⚠️ ${err.message}</td></tr>`;
  }
}

// ======= 7. 核心逻辑：搜索 + 排序 =======
function applySearchAndSort() {
  const searchInput = document.getElementById('search-input');
  const query = searchInput ? searchInput.value.toLowerCase() : '';
  
  // 过滤
  filteredData = currentData.filter(item => {
    const text = (item.full_name + (item.description || '') + (item.language || '')).toLowerCase();
    return text.includes(query);
  });

  // 排序
  filteredData.sort((a, b) => {
    let valA = a[sortKey];
    let valB = b[sortKey];
    
    if (valA === null || valA === undefined) valA = -1;
    if (valB === null || valB === undefined) valB = -1;

    if (typeof valA === 'string') {
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else {
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    }
  });

  renderTable(filteredData);
}

// ======= 8. 渲染表格 =======
function renderTable(items) {
  const tbody = document.getElementById('table-body');
  const dict = I18N[currentLang];
  tbody.innerHTML = '';
  
  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="loading">${dict.noData}</td></tr>`;
    return;
  }

  items.forEach((item, index) => {
    const tr = document.createElement('tr');
    const growthText = (item.growth !== null && item.growth !== undefined) 
                       ? `+${formatNum(item.growth)}` : '—';
    const desc = item.description || '';
    
    // 前三名奖牌，4-10名加粗
    let rankHtml = index + 1;
    let rankClass = "col-rank"; 
    if (index === 0) rankHtml = '🥇';
    else if (index === 1) rankHtml = '🥈';
    else if (index === 2) rankHtml = '🥉';
    else if (index < 10) rankClass += " top-10";

    tr.innerHTML = `
      <td class="${rankClass}">${rankHtml}</td>
      <td><a href="${item.html_url}" target="_blank" rel="noopener">${item.full_name}</a></td>
      <td class="col-stars">${formatNum(item.stars)}</td>
      <td class="col-growth">${growthText}</td>
      <td class="col-lang">${item.language || '-'}</td>
      <td class="col-desc" title="${desc}">${desc}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ======= 9. 获取 GitHub 仓库实时数据 (About 页面用) =======
async function fetchRepoStats() {
  const starsEl = document.getElementById('gh-stars');
  const forksEl = document.getElementById('gh-forks');
  if (!starsEl || !forksEl) return;

  try {
    const res = await fetch('https://api.github.com/repos/Ameretool/github-rank');
    if (!res.ok) throw new Error('获取失败');
    const data = await res.json();
    const format = (num) => num >= 1000 ? (num / 1000).toFixed(1) + 'k' : num;
    starsEl.textContent = format(data.stargazers_count);
    forksEl.textContent = format(data.forks_count);
  } catch (error) {
    starsEl.textContent = '0';
    forksEl.textContent = '0';
  }
}

// ======= 10. 启动 =======
document.addEventListener('DOMContentLoaded', () => {
  // 先替换当前语言的静态文本
  const dict = I18N[currentLang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = dict[el.dataset.i18n];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = dict[el.dataset.i18nPlaceholder];
  });

  renderLayout();
  initApp();
  fetchRepoStats();
});
