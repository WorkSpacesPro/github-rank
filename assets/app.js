// ======= 1. 初始化主题 =======
(function(){
  var t = localStorage.getItem("theme");
  if(t === "dark" || t === "light") { document.documentElement.setAttribute("data-theme", t); }
  else { document.documentElement.setAttribute("data-theme", window.matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light"); }
})();

// ======= 2. 多语言字典 =======
const I18N = {
  zh: {
    pageTitle: "GitHub 开源排行榜", searchPlaceholder: "搜索项目名、语言或简介...",
    thProject: "项目", thGrowth: "涨星", thLang: "语言", thDesc: "简介",
    navTitle: "开源排行榜", navCategory: "目录导航",
    footerText: "© 2026 GitHub 开源排行榜 | 数据来源于 GitHub Actions 自动抓取",
    loading: "正在获取数据...", noData: "没有找到匹配的数据",
    catCount: (n) => `共 ${n} 个分类 | 点击标签秒级加载`,
    allCats: "全部分类", allCatsTitle: "全部分类",
    groupHot: "综合热榜", groupAI: "AI 前沿", groupCF: "Cloudflare 生态", groupLang: "编程语言", groupDev: "开发者场景"
  },
  en: {
    pageTitle: "GitHub Open Source Rankings", searchPlaceholder: "Search projects...",
    thProject: "Project", thGrowth: "Growth", thLang: "Language", thDesc: "Description",
    navTitle: "Open Source Rank", navCategory: "Navigation",
    footerText: "© 2026 GitHub Rankings | Data by GitHub Actions",
    loading: "Fetching data...", noData: "No matching data",
    catCount: (n) => `${n} categories | Click tabs to load instantly`,
    allCats: "All Categories", allCatsTitle: "All Categories",
    groupHot: "Hot & Trending", groupAI: "AI Frontier", groupCF: "Cloudflare Eco", groupLang: "Languages", groupDev: "Dev Scenarios"
  }
};

// ======= 3. 核心配置：大类分组映射 =======
// 我们根据 JSON 里的 file 字段，把标签分到这 5 个组里
const CATEGORY_GROUPS = {
  hot: { color: "red", icon: "🔥", files: ["top", "rising", "forks"] },
  ai: { color: "purple", icon: "🤖", files: ["agent", "local_llm", "aigc"] },
  cf: { color: "orange", icon: "☁️", files: ["cf_image", "cf_blog", "cf_shorturl", "cf_tools", "cf_workers", "cf_proxy"] },
  lang: { color: "blue", icon: "💻", files: ["python", "javascript", "typescript", "rust", "go", "java", "frontend"] },
  dev: { color: "green", icon: "🛠️", files: ["self_hosted", "dev_tools", "awesome", "saas"] }
};

// 顶部固定的热门标签
const DEFAULT_TABS = ["top", "rising", "agent", "cf_image"];

let currentLang = localStorage.getItem('lang') || 'zh';
let currentCategory = ""; 
let currentData = [];     
let filteredData = [];    
let sortKey = "stars";    
let sortOrder = "desc";   
let categoriesData = []; // 存放从 json 读出来的所有分类

function getSafeFilename(catName) { return catName.replace(/ /g, "_").replace(/\//g, "_").replace(/\+/g, ""); }

// ======= 4. 公共组件渲染 =======
async function renderLayout() {
  const path = window.location.pathname;
  const dict = I18N[currentLang];
  
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = dict[el.dataset.i18n]; });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = dict[el.dataset.i18nPlaceholder]; });
  if (!currentCategory) document.title = dict.pageTitle;

  document.getElementById('app-header').innerHTML = `
    <button class='nav-toggle' type='button'>
      <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M4 12h16'/><path d='M4 6h16'/><path d='M4 18h16'/></svg>
    </button>
    <div class='nav-backdrop'></div>
    <div class="header-actions">
      <button id="lang-toggle" class="action-btn">${currentLang === 'zh' ? 'EN' : '中'}</button>
      <button class="theme-toggle action-btn" type="button">
        <svg class="icon-sun" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        <svg class="icon-moon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
      </button>
    </div>
    <button class="back-to-top" id="back-to-top">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
    </button>
  `;

  document.getElementById('app-footer').innerHTML = `
    <footer class="footer">
      <p>${dict.footerText}</p>
      <p>Powered by <a href="https://github.com" target="_blank">GitHub</a> & <a href="https://pages.cloudflare.com" target="_blank">Cloudflare Pages</a></p>
    </footer>
  `;

  try {
    const res = await fetch('data/nav.json?t=' + Date.now());
    const navItems = await res.json();
    let navHtml = '';
    navItems.forEach(item => {
      if (item.link === 'divider') {
        navHtml += `<hr style="border:none; border-top:1px solid var(--border); margin:10px 0;">`;
        return;
      }
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
      renderLayout(); 
      if (categoriesData.length > 0) {
        renderTabsAndDrawer();
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

  // 侧边栏
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

  // 搜索
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

  // 🌟 抽屉逻辑
  const drawer = document.getElementById('category-drawer');
  const overlay = document.getElementById('drawer-overlay');
  const openBtn = document.getElementById('open-drawer-btn');
  const closeBtn = document.getElementById('close-drawer-btn');

  function toggleDrawer(open) {
    if (open) { drawer.classList.add('open'); overlay.classList.add('open'); }
    else { drawer.classList.remove('open'); overlay.classList.remove('open'); }
  }

  if(openBtn) openBtn.addEventListener('click', () => toggleDrawer(true));
  if(closeBtn) closeBtn.addEventListener('click', () => toggleDrawer(false));
  if(overlay) overlay.addEventListener('click', () => toggleDrawer(false));
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
    renderTabsAndDrawer();
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="6" class="loading" style="color:#cf222e;">⚠️ ${err.message}</td></tr>`;
  }
}

// 🌟 渲染顶部标签和抽屉内容
function renderTabsAndDrawer() {
  const tabsContainer = document.getElementById('tabs');
  const drawerContent = document.getElementById('drawer-content');
  const dict = I18N[currentLang];
  tabsContainer.innerHTML = '';
  drawerContent.innerHTML = '';
  
  const timeEl = document.getElementById('update-time');
  if (timeEl) {
      timeEl.removeAttribute('data-i18n');
      timeEl.textContent = dict.catCount(categoriesData.length);
  }

  // 1. 生成顶部的默认热门标签
  const defaultItems = categoriesData.filter(item => DEFAULT_TABS.includes(item.file));
  defaultItems.forEach(item => {
    const btn = document.createElement('button');
    btn.dataset.file = item.file;
    const isActive = item.file === currentCategory;
    btn.className = `tab-btn ${isActive ? 'active' : ''}`;
    btn.textContent = currentLang === 'zh' ? item.zh : item.en;
    btn.onclick = () => switchCategory(item);
    tabsContainer.appendChild(btn);
  });

  // 2. 生成抽屉里的彩色折叠分类
  const groupNames = {
    hot: dict.groupHot, ai: dict.groupAI, cf: dict.groupCF, lang: dict.groupLang, dev: dict.groupDev
  };

  for (const [groupKey, groupConfig] of Object.entries(CATEGORY_GROUPS)) {
    // 找到当前大类包含的所有子分类
    const groupItems = categoriesData.filter(item => groupConfig.files.includes(item.file));
    if (groupItems.length === 0) continue; // 如果这个大类下没数据就跳过

    // 创建 details 折叠框
    const details = document.createElement('details');
    details.className = 'color-details';
    details.dataset.color = groupConfig.color;
    
    // 默认展开第一个大类
    if (groupKey === 'hot') details.open = true;

    const summary = document.createElement('summary');
    summary.innerHTML = `<span>${groupConfig.icon} ${groupNames[groupKey]}</span> <span style="font-size:0.8rem; color:var(--text-muted)">${groupItems.length}</span>`;
    details.appendChild(summary);

    // 创建子分类列表
    const listDiv = document.createElement('div');
    listDiv.className = 'cat-list';
    groupItems.forEach(item => {
      const catDiv = document.createElement('div');
      catDiv.className = `cat-item ${item.file === currentCategory ? 'active' : ''}`;
      catDiv.textContent = currentLang === 'zh' ? item.zh : item.en;
      catDiv.onclick = () => {
        switchCategory(item);
        // 点击后自动关闭抽屉
        document.getElementById('category-drawer').classList.remove('open');
        document.getElementById('drawer-overlay').classList.remove('open');
      };
      listDiv.appendChild(catDiv);
    });
    details.appendChild(listDiv);
    drawerContent.appendChild(details);
  }

  // 如果没有选中任何分类，默认加载第一个热门标签
  if (!currentCategory && defaultItems.length > 0) {
    switchCategory(defaultItems[0]);
  }
}

// 🌟 切换分类的统一逻辑 (同时联动顶部和抽屉的高亮)
function switchCategory(item) {
  currentCategory = item.file;
  const displayName = currentLang === 'zh' ? item.zh : item.en;
  document.title = `${displayName} - GitHub Rankings`;
  
  // 1. 更新顶部标签高亮
  document.querySelectorAll('.tab-btn').forEach(b => {
    if (b.dataset.file === item.file) b.classList.add('active');
    else b.classList.remove('active');
  });

  // 2. 更新抽屉列表高亮
  document.querySelectorAll('.cat-item').forEach(c => c.classList.remove('active'));
  // 利用索引或文本匹配重新激活
  document.querySelectorAll('.cat-item').forEach(c => {
    if (c.textContent === displayName) c.classList.add('active');
  });

  // 3. 清空搜索并加载数据
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';
  loadCategoryData(item.file);
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
    let valA = a[sortKey] ?? -1;
    let valB = b[sortKey] ?? -1;
    if (typeof valA === 'string') return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    return sortOrder === 'asc' ? valA - valB : valB - valA;
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

// ======= 9. 获取 GitHub 仓库数据 =======
async function fetchRepoStats() {
  const starsEl = document.getElementById('gh-stars');
  const forksEl = document.getElementById('gh-forks');
  if (!starsEl || !forksEl) return;
  try {
    const siteRes = await fetch('data/site.json');
    const siteConfig = await siteRes.json();
    const repoName = siteConfig.githubRepo;

    const linkReadme = document.getElementById('link-readme');
    const linkLicense = document.getElementById('link-license');
    const linkRepo = document.getElementById('link-repo');
    if (linkReadme && linkLicense && linkRepo) {
      linkReadme.href = `https://github.com/${repoName}`;
      linkLicense.href = `https://github.com/${repoName}/blob/main/LICENSE`;
      linkRepo.href = `https://github.com/${repoName}`;
    }

    const apiRes = await fetch(`https://api.github.com/repos/${repoName}`);
    if (!apiRes.ok) throw new Error('获取失败');
    const data = await apiRes.json();
    const format = (num) => num >= 1000 ? (num / 1000).toFixed(1) + 'k' : num;
    starsEl.textContent = format(data.stargazers_count);
    forksEl.textContent = format(data.forks_count);
  } catch (error) {
    if (starsEl) starsEl.textContent = '0';
    if (forksEl) forksEl.textContent = '0';
  }
}

// ======= 10. 启动 =======
document.addEventListener('DOMContentLoaded', () => {
  renderLayout();
  initApp();
  fetchRepoStats();
});
