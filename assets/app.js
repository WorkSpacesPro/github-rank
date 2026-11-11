// ======= 1. 初始化主题 (防止刷新闪烁) =======
(function(){
  var t = // ======= 1. 初始化主题 =======
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
    catCount: (n) => `共 ${n} 个分类 | 点击标签秒级加载`
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
    catCount: (n) => `${n} categories | Click tabs to load instantly`
  }
};

// ======= 3. 全局状态 =======
let currentLang = localStorage.getItem('lang') || 'zh';
let currentCategory = ""; 
let currentData = [];     
let filteredData = [];    
let sortKey = "stars";    
let sortOrder = "desc";   
let categoriesData = [];  

function getSafeFilename(catName) {
  return catName.replace(/ /g, "_").replace(/\//g, "_").replace(/\+/g, "");
}

// ======= 4. 公共组件渲染 =======
async function renderLayout() {
  const path = window.location.pathname;
  const dict = I18N[currentLang];
  
  // 🎯 替换 HTML 里的文本和 Placeholder
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = dict[el.dataset.i18n]; });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = dict[el.dataset.i18nPlaceholder]; });
  
  if (!currentCategory) document.title = dict.pageTitle;

  // 右上角按钮组
  document.getElementById('app-header').innerHTML = `
    <button class='nav-toggle' type='button'>
      <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M4 12h16'/><path d='M4 6h16'/><path d='M4 18h16'/></svg>
    </button>
    <div class='nav-backdrop'></div>
    <div class="header-actions">
      <button id="lang-toggle" class="action-btn" aria-label="Switch Language">${currentLang === 'zh' ? 'EN' : '中'}</button>
      <button class="theme-toggle action-btn" type="button" aria-label="Toggle theme">
        <svg class="icon-sun" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        <svg class="icon-moon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
      </button>
    </div>
    <button class="back-to-top" id="back-to-top" aria-label="Return to top">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
    </button>
  `;

  document.getElementById('app-footer').innerHTML = `
    <footer class="footer">
      <p>${dict.footerText}</p>
      <p>Powered by <a href="https://github.com" target="_blank">GitHub</a> & <a href="https://pages.cloudflare.com" target="_blank">Cloudflare Pages</a></p>
    </footer>
  `;

  // 加载导航
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

    document.getElementById('app-sidebar').innerHTML = `
      <nav class="nav">
        <div class="nav-inner">
          <div class="nav-header">
            <img src="assets/logo.png" alt="Logo" class="nav-logo">
            <span class="nav-title">${dict.navTitle}</span>
          </div>
          <div class="nav-section-title">${dict.navCategory}</div>
          <ul class="nav-list">${navHtml}</ul>
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
      
      renderLayout(); // 刷新静态文本和导航
      
      if (categoriesData.length > 0) {
        renderTabs(); // 刷新标签
        const activeItem = categoriesData.find(c => {
           const file = typeof c === 'string' ? getSafeFilename(c) : c.file;
           return file === currentCategory;
        });
        if(activeItem) {
           const displayName = typeof activeItem === 'string' ? activeItem : (currentLang === 'zh' ? activeItem.zh : activeItem.en);
           document.title = `${displayName} - GitHub Rankings`;
        }
      }
    });
  }

  // 主题切换
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

  // 侧边栏开关
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

  // 排序
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
  if (!tableBody) return;

  try {
    const res = await fetch(`data/categories.json?t=${Date.now()}`);
    if (!res.ok) throw new Error("找不到 categories.json");
    categoriesData = await res.json();
    renderTabs();
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="6" class="loading" style="color:#cf222e;">⚠️ ${err.message}</td></tr>`;
  }
}

function renderTabs() {
  const tabsContainer = document.getElementById('tabs');
  if (!tabsContainer) return;
  const dict = I18N[currentLang];
  tabsContainer.innerHTML = '';
  
  // 🎯 更新页面中间的“共 X 个分类”提示
  document.getElementById('update-time').textContent = dict.catCount(categoriesData.length);

  categoriesData.forEach((item, index) => {
    const btn = document.createElement('button');
    
    let displayName = "";
    let file = "";
    if (typeof item === 'string') {
      displayName = item;
      file = getSafeFilename(item);
    } else {
      displayName = currentLang === 'zh' ? item.zh : item.en;
      file = item.file;
    }

    const isActive = file === currentCategory || (index === 0 && !currentCategory);
    btn.className = `tab-btn ${isActive ? 'active' : ''}`;
    btn.textContent = displayName;
    
    btn.onclick = () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.title = `${displayName} - GitHub Rankings`;
      const searchInput = document.getElementById('search-input');
      if (searchInput) searchInput.value = '';
      loadCategoryData(file);
    };
    tabsContainer.appendChild(btn);
  });

  if (!currentCategory && categoriesData.length > 0) {
    let firstFile = typeof categoriesData[0] === 'string' ? getSafeFilename(categoriesData[0]) : categoriesData[0].file;
    loadCategoryData(firstFile);
  }
}

async function loadCategoryData(catFile) {
  const tableBody = document.getElementById('table-body');
  tableBody.innerHTML = `
    <tr class="skeleton-row"><td colspan="6"><div class="skeleton"></div></td></tr>
    <tr class="skeleton-row"><td colspan="6"><div class="skeleton"></div></td></tr>
    <tr class="skeleton-row"><td colspan="6"><div class="skeleton"></div></td></tr>
  `;

  try {
    const res = await fetch(`data/${catFile}.json?t=${Date.now()}`);
    if (!res.ok) throw new Error(`找不到 ${catFile}.json`);
    
    currentData = await res.json();
    currentCategory = catFile;
    
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

function applySearchAndSort() {
  const searchInput = document.getElementById('search-input');
  const query = searchInput ? searchInput.value.toLowerCase() : '';
  
  filteredData = currentData.filter(item => {
    const text = (item.full_name + (item.description || '') + (item.language || '')).toLowerCase();
    return text.includes(query);
  });

  filteredData.sort((a, b) => {
    let valA = a[sortKey] ?? -1;
    let valB = b[sortKey] ?? -1;
    if (typeof valA === 'string') return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    return sortOrder === 'asc' ? valA - valB : valB - valA;
  });

  renderTable(filteredData);
}

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
    const growthText = (item.growth !== null && item.growth !== undefined) ? `+${formatNum(item.growth)}` : '—';
    const desc = item.description || '';
    
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

async function fetchRepoStats() {
  const starsEl = document.getElementById('gh-stars');
  const forksEl = document.getElementById('gh-forks');
  if (!starsEl || !forksEl) return;
  try {
    const res = await fetch('https://api.github.com/repos/Ameretool/github-rank');
    const data = await res.json();
    const format = (num) => num >= 1000 ? (num / 1000).toFixed(1) + 'k' : num;
    starsEl.textContent = format(data.stargazers_count);
    forksEl.textContent = format(data.forks_count);
  } catch (error) {
    starsEl.textContent = '0'; forksEl.textContent = '0';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderLayout();
  initApp();
  fetchRepoStats();
});.getItem("theme");
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
    noData: "没有找到匹配的数据"
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
    noData: "No matching data found"
  }
};

// ======= 3. 全局状态 =======
let currentLang = localStorage.getItem('lang') || 'zh';
let currentCategory = ""; 
let currentData = [];     
let filteredData = [];    
let sortKey = "stars";    
let sortOrder = "desc";   
let categoriesData = [];  

// ======= 4. 公共组件渲染 =======
async function renderLayout() {
  const path = window.location.pathname;
  const dict = I18N[currentLang];
  
  // 替换 HTML 里的静态文本
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = dict[el.dataset.i18n];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = dict[el.dataset.i18nPlaceholder];
  });

  // 修改网页标题
  if (!currentCategory) {
    document.title = dict.pageTitle;
  }

  // 注入顶部：左侧菜单按钮 + 右上角语言/主题按钮组
  document.getElementById('app-header').innerHTML = `
    <button class='nav-toggle' type='button' aria-label='Toggle navigation'>
      <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M4 12h16'/><path d='M4 6h16'/><path d='M4 18h16'/></svg>
    </button>
    <div class='nav-backdrop'></div>
    
    <!-- 右上角悬浮按钮组 -->
    <div class="header-actions">
      <button id="lang-toggle" class="action-btn" aria-label="Switch Language">
        ${currentLang === 'zh' ? 'EN' : '中'}
      </button>
      <button class="theme-toggle action-btn" type="button" aria-label="Toggle theme">
        <svg class="icon-sun" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        <svg class="icon-moon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
      </button>
    </div>
    
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

    // 注入左侧导航栏
    document.getElementById('app-sidebar').innerHTML = `
      <nav class="nav">
        <div class="nav-inner">
          <div class="nav-header">
            <img src="assets/logo.png" alt="Logo" class="nav-logo">
            <span class="nav-title">${dict.navTitle}</span>
          </div>
          <div class="nav-section-title">${dict.navCategory}</div>
          <ul class="nav-list">${navHtml}</ul>
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
      renderLayout(); 
      if (categoriesData.length > 0) {
        renderTabs();
        // 语言切换后，恢复当前选中的标签高亮，并更新标题
        const activeItem = categoriesData.find(c => c.file === currentCategory);
        if(activeItem) {
           const displayName = currentLang === 'zh' ? activeItem.zh : activeItem.en;
           document.title = `${displayName} - GitHub Rankings`;
        }
      }
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

  // 移动端侧边栏
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
  if (!tableBody) return;

  try {
    const res = await fetch(`data/categories.json?t=${Date.now()}`);
    if (!res.ok) throw new Error("找不到 categories.json");
    categoriesData = await res.json();
    renderTabs();
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="6" class="loading" style="color:#cf222e;">⚠️ ${err.message}</td></tr>`;
  }
}

function renderTabs() {
  const tabsContainer = document.getElementById('tabs');
  if (!tabsContainer) return;
  tabsContainer.innerHTML = '';
  
  categoriesData.forEach((item, index) => {
    const btn = document.createElement('button');
    const isActive = item.file === currentCategory || (index === 0 && !currentCategory);
    btn.className = `tab-btn ${isActive ? 'active' : ''}`;
    btn.textContent = currentLang === 'zh' ? item.zh : item.en;
    
    btn.onclick = () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const displayName = currentLang === 'zh' ? item.zh : item.en;
      document.title = `${displayName} - GitHub Rankings`;
      
      const searchInput = document.getElementById('search-input');
      if (searchInput) searchInput.value = '';
      
      loadCategoryData(item.file);
    };
    tabsContainer.appendChild(btn);
  });

  if (!currentCategory && categoriesData.length > 0) {
    loadCategoryData(categoriesData[0].file);
  }
}

async function loadCategoryData(catFile) {
  const tableBody = document.getElementById('table-body');
  tableBody.innerHTML = `
    <tr class="skeleton-row"><td colspan="6"><div class="skeleton"></div></td></tr>
    <tr class="skeleton-row"><td colspan="6"><div class="skeleton"></div></td></tr>
    <tr class="skeleton-row"><td colspan="6"><div class="skeleton"></div></td></tr>
  `;

  try {
    const res = await fetch(`data/${catFile}.json?t=${Date.now()}`);
    if (!res.ok) throw new Error(`找不到 ${catFile}.json`);
    
    currentData = await res.json();
    currentCategory = catFile;
    
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

// ======= 7. 搜索与排序 =======
function applySearchAndSort() {
  const searchInput = document.getElementById('search-input');
  const query = searchInput ? searchInput.value.toLowerCase() : '';
  
  filteredData = currentData.filter(item => {
    const text = (item.full_name + (item.description || '') + (item.language || '')).toLowerCase();
    return text.includes(query);
  });

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
    const growthText = (item.growth !== null && item.growth !== undefined) ? `+${formatNum(item.growth)}` : '—';
    const desc = item.description || '';
    
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

// ======= 9. 获取 GitHub 仓库数据 (About页) =======
async function fetchRepoStats() {
  const starsEl = document.getElementById('gh-stars');
  const forksEl = document.getElementById('gh-forks');
  if (!starsEl || !forksEl) return;

  try {
    const res = await fetch('https://api.github.com/repos/Ameretool/github-rank');
    const data = await res.json();
    const format = (num) => num >= 1000 ? (num / 1000).toFixed(1) + 'k' : num;
    starsEl.textContent = format(data.stargazers_count);
    forksEl.textContent = format(data.forks_count);
  } catch (error) {
    starsEl.textContent = '0'; forksEl.textContent = '0';
  }
}

// ======= 10. 启动 =======
document.addEventListener('DOMContentLoaded', () => {
  renderLayout();
  initApp();
  fetchRepoStats();
});
