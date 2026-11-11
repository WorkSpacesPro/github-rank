// ======= 初始化主题 (防止刷新闪烁) =======
(function(){
  var t = localStorage.getItem("theme");
  if(t === "dark" || t === "light") { document.documentElement.setAttribute("data-theme", t); }
  else { document.documentElement.setAttribute("data-theme", window.matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light"); }
})();

// ======= 全局状态 =======
let rawData = {};         // 原始 JSON 数据
let currentCategory = ""; // 当前选中的分类
let currentData = [];     // 当前分类下的原始数据
let filteredData = [];    // 过滤和排序后的数据
let sortKey = "stars";    // 默认按 star 排序
let sortOrder = "desc";   // 默认降序

// ======= 公共组件渲染 (导航、按钮、页脚) =======
function renderLayout() {
  const path = window.location.pathname;
  const isAbout = path.includes("about.html");
  const activeHome = isAbout ? "" : "active";
  const activeAbout = isAbout ? "active" : "";

  // 1. 注入顶部悬浮按钮
  document.getElementById('app-header').innerHTML = `
    <button class='nav-toggle' type='button' aria-label='Toggle navigation' aria-expanded='false'>
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

  // 2. 注入左侧导航栏
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
          <li><a href="#">CF 生态排行</a></li>
          <li><a href="about.html" class="${activeAbout}">关于我们</a></li>
        </ul>
      </div>
    </nav>
  `;

  // 3. 注入底部页脚
  document.getElementById('app-footer').innerHTML = `
    <footer class="footer">
      <p>© 2026 GitHub 开源排行榜 | 数据来源于 GitHub Actions 自动抓取</p>
      <p>Powered by <a href="https://github.com" target="_blank">GitHub</a> & <a href="https://pages.cloudflare.com" target="_blank">Cloudflare Pages</a></p>
    </footer>
  `;

  // 绑定事件
  bindEvents();
}

// ======= 事件绑定 (水波纹、菜单、返回顶部) =======
function bindEvents() {
  // 1. 主题切换 (水波纹)
  var btn = document.querySelector('.theme-toggle');
  if (btn) {
    btn.addEventListener('click', function(e){
      var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      var next = isDark ? 'light' : 'dark';
      var rect = btn.getBoundingClientRect();
      var x = rect.left + rect.width / 2;
      var y = rect.top + rect.height / 2;
      
      document.documentElement.style.setProperty('--toggle-x', x + 'px');
      document.documentElement.style.setProperty('--toggle-y', y + 'px');
      
      function apply(){
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
      }
      if (document.startViewTransition) document.startViewTransition(apply);
      else apply();
    });
  }

  // 2. 移动端侧边栏
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  var backdrop = document.querySelector('.nav-backdrop');
  if (toggle && nav && backdrop) {
    function open() {
      nav.classList.add('nav--open');
      backdrop.classList.add('nav-backdrop--visible');
    }
    function close() {
      nav.classList.remove('nav--open');
      backdrop.classList.remove('nav-backdrop--visible');
    }
    toggle.addEventListener('click', function() {
      nav.classList.contains('nav--open') ? close() : open();
    });
    backdrop.addEventListener('click', close);
    nav.addEventListener('click', function(e) {
      if (e.target.closest('a')) close();
    });
  }

  // 3. 返回顶部
  const backToTopBtn = document.getElementById('back-to-top');
  if (backToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) backToTopBtn.classList.add('show');
      else backToTopBtn.classList.remove('show');
    });
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

// ======= 首页专属：数据加载与初始化 =======
const formatNum = (num) => num ? num.toLocaleString() : '0';

async function loadRankData() {
  const tableBody = document.getElementById('table-body');
  if (!tableBody) return; // 如果不是首页，直接退出

  try {
    const res = await fetch(`data/rank.json?t=${Date.now()}`);
    if (!res.ok) throw new Error('找不到 data/rank.json');
    
    rawData = await res.json();
    const categories = Object.keys(rawData);
    if (categories.length === 0) throw new Error('JSON 数据为空');

    document.getElementById('update-time').textContent = `共 ${categories.length} 个分类 | 数据自动同步`;

    const tabsContainer = document.getElementById('tabs');
    tabsContainer.innerHTML = '';
    
    // 渲染分类标签
    categories.forEach((cat, index) => {
      const btn = document.createElement('button');
      btn.className = `tab-btn ${index === 0 ? 'active' : ''}`;
      btn.textContent = cat;
      btn.onclick = () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // 动态修改浏览器标签标题
        document.title = `${cat} - GitHub 开源排行榜`;
        
        currentCategory = cat;
        currentData = rawData[cat] || [];
        applySearchAndSort(); 
      };
      tabsContainer.appendChild(btn);
    });

    currentCategory = categories[0];
    currentData = rawData[categories[0]] || [];

    // 绑定搜索框
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        applySearchAndSort();
      });
    }

    // 绑定表头点击排序
    document.querySelectorAll('th.sortable').forEach(th => {
      // 初始化时给默认排序的表头加箭头
      if(th.dataset.key === sortKey) th.classList.add(sortOrder);

      th.addEventListener('click', () => {
        const key = th.dataset.key;
        if (sortKey === key) {
          sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          sortKey = key;
          sortOrder = 'desc'; 
        }
        
        // 更新表头 UI 箭头
        document.querySelectorAll('th.sortable').forEach(t => t.classList.remove('asc', 'desc'));
        th.classList.add(sortOrder);

        applySearchAndSort();
      });
    });

    // 首次渲染
    applySearchAndSort();

  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="6" class="loading" style="color:#cf222e;">⚠️ ${err.message}</td></tr>`;
    document.getElementById('update-time').textContent = '加载失败';
  }
}

// ======= 核心逻辑：搜索 + 排序 二合一 =======
function applySearchAndSort() {
  const searchInput = document.getElementById('search-input');
  const query = searchInput ? searchInput.value.toLowerCase() : '';
  
  // 1. 过滤数据
  filteredData = currentData.filter(item => {
    const text = (item.full_name + (item.description || '') + (item.language || '')).toLowerCase();
    return text.includes(query);
  });

  // 2. 排序数据
  filteredData.sort((a, b) => {
    let valA = a[sortKey];
    let valB = b[sortKey];
    
    // 处理 null/undefined 的情况（比如第一次跑涨星为空）
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

// ======= 渲染表格内容 (带奖牌和 TOP10) =======
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
    
    // 🎯 前三名奖牌，4-10名加粗
    let rankHtml = index + 1;
    let rankClass = "col-rank"; 
    
    if (index === 0) rankHtml = '🥇';
    else if (index === 1) rankHtml = '🥈';
    else if (index === 2) rankHtml = '🥉';
    else if (index < 10) {
      rankClass += " top-10"; // 添加专门给 4-10 名准备的 CSS 类
    }

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
  renderLayout(); // 公共组件
  loadRankData(); // 首页数据逻辑（About页会自动跳过）
});
