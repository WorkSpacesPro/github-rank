// ======= 初始化主题 (防止闪烁) =======
(function(){
  var t = localStorage.getItem("theme");
  if(t === "dark" || t === "light") { document.documentElement.setAttribute("data-theme", t); }
  else { document.documentElement.setAttribute("data-theme", window.matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light"); }
})();

// ======= 全局状态 =======
let currentCategory = ""; // 当前选中的分类
let currentData = [];     // 当前分类下的数据
let filteredData = [];    // 过滤和排序后的数据
let sortKey = "stars";    // 默认按 star 排序
let sortOrder = "desc";   // 默认降序

// ======= 公共组件渲染 =======
function renderLayout() {
  const path = window.location.pathname;
  const isAbout = path.includes("about.html");
  const activeHome = isAbout ? "" : "active";
  const activeAbout = isAbout ? "active" : "";

  document.getElementById('app-header').innerHTML = `
    <button class='nav-toggle' type='button' aria-label='Toggle navigation'>
      <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M4 12h16'/><path d='M4 6h16'/><path d='M4 18h16'/></svg>
    </button>
    <div class='nav-backdrop'></div>
    <button class="theme-toggle" type="button" aria-label="Toggle theme">
      <svg class="icon-sun" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
      <svg class="icon-moon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
    </button>
    <button class="back-to-top" id="back-to-top" aria-label="返回顶部">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
    </button>
  `;

  document.getElementById('app-sidebar').innerHTML = `
    <nav class="nav" aria-label="Site navigation">
      <div class="nav-inner">
        <div class="nav-header">
          <img src="assets/logo.png" alt="Logo" class="nav-logo">
          <span class="nav-title">开源排行榜</span>
        </div>
        <div class="nav-section-title">目录导航</div>
        <ul class="nav-list">
          <li><a href="index.html" class="${activeHome}">开源总排行</a></li>
          
          <li><a href="about.html" class="${activeAbout}">关于我们</a></li>
        </ul>
      </div>
    </nav>
  `;

  document.getElementById('app-footer').innerHTML = `
    <footer class="footer">
      <p>© 2026 GitHub 开源排行榜 | 数据来源于 GitHub Actions 自动抓取</p>
      <p>Powered by <a href="https://github.com" target="_blank">GitHub</a> & <a href="https://pages.cloudflare.com" target="_blank">Cloudflare Pages</a></p>
    </footer>
  `;

  bindEvents();
}

// ======= 事件绑定 =======
function bindEvents() {
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

  // 移动端侧边栏
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  var backdrop = document.querySelector('.nav-backdrop');
  if (toggle && nav && backdrop) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('nav--open');
      backdrop.classList.toggle('nav-backdrop--visible');
    });
    backdrop.addEventListener('click', () => {
      nav.classList.remove('nav--open');
      backdrop.classList.remove('nav-backdrop--visible');
    });
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

  // 绑定搜索框
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      applySearchAndSort();
    });
  }

  // 绑定表头点击排序
  document.querySelectorAll('th.sortable').forEach(th => {
    if(th.dataset.key === sortKey) th.classList.add(sortOrder);
    th.addEventListener('click', () => {
      const key = th.dataset.key;
      if (sortKey === key) {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        sortKey = key;
        sortOrder = 'desc'; 
      }
      document.querySelectorAll('th.sortable').forEach(t => t.classList.remove('asc', 'desc'));
      th.classList.add(sortOrder);
      applySearchAndSort();
    });
  });
}

// ======= 首页专属：按需加载数据 =======
const formatNum = (num) => num ? num.toLocaleString() : '0';

async function initApp() {
  const tableBody = document.getElementById('table-body');
  if (!tableBody) return; // 不是首页直接退出

  try {
    // 1. 极速拉取极小的分类列表
    const res = await fetch(`data/categories.json?t=${Date.now()}`);
    if (!res.ok) throw new Error("找不到 categories.json，请检查 Actions");
    
    const categories = await res.json();
    document.getElementById('update-time').textContent = `共 ${categories.length} 个分类 | 点击标签秒级加载`;

    // 2. 渲染标签
    const tabsContainer = document.getElementById('tabs');
    tabsContainer.innerHTML = '';
    
    categories.forEach((cat, index) => {
      const btn = document.createElement('button');
      btn.className = `tab-btn ${index === 0 ? 'active' : ''}`;
      btn.textContent = cat;
      btn.onclick = () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.title = `${cat} - GitHub 开源排行榜`;
        
        // 切换分类时，清空搜索框
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';
        
        // 加载对应数据
        loadCategoryData(cat); 
      };
      tabsContainer.appendChild(btn);
    });

    // 默认加载第一个分类
    loadCategoryData(categories[0]);

  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="6" class="loading" style="color:#cf222e;">⚠️ ${err.message}</td></tr>`;
  }
}

async function loadCategoryData(cat) {
  const tableBody = document.getElementById('table-body');
  
  // 显示骨架屏
  tableBody.innerHTML = `
    <tr class="skeleton-row"><td colspan="6"><div class="skeleton"></div></td></tr>
    <tr class="skeleton-row"><td colspan="6"><div class="skeleton"></div></td></tr>
    <tr class="skeleton-row"><td colspan="6"><div class="skeleton"></div></td></tr>
  `;

  try {
    // 注意：这里的替换规则必须和 Python 脚本里的一模一样
    const safeName = cat.replace(/ /g, "_").replace(/\//g, "_").replace(/\+/g, "");
    const res = await fetch(`data/${safeName}.json?t=${Date.now()}`);
    if (!res.ok) throw new Error("找不到该分类的数据文件");
    
    currentData = await res.json();
    currentCategory = cat;
    
    // 重置排序为默认（按 Stars 降序）
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

// ======= 核心逻辑：搜索 + 排序 =======
function applySearchAndSort() {
  const searchInput = document.getElementById('search-input');
  const query = searchInput ? searchInput.value.toLowerCase() : '';
  
  // 1. 过滤
  filteredData = currentData.filter(item => {
    const text = (item.full_name + (item.description || '') + (item.language || '')).toLowerCase();
    return text.includes(query);
  });

  // 2. 排序
  filteredData.sort((a, b) => {
    let valA = a[sortKey];
    let valB = b[sortKey];
    
    // 处理 null/undefined
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

// ======= 渲染表格 =======
function renderTable(items) {
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';
  
  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading">没有找到匹配的数据</td></tr>';
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

// ======= 启动 =======
document.addEventListener('DOMContentLoaded', () => {
  renderLayout(); // 注入导航和页脚
  initApp();      // 启动按需加载逻辑
});
