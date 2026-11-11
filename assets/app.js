// ======= 初始化主题 (防止闪烁) =======
(function(){
  var t = localStorage.getItem("theme");
  if(t === "dark" || t === "light") { document.documentElement.setAttribute("data-theme", t); }
  else { document.documentElement.setAttribute("data-theme", window.matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light"); }
})();

// ======= 公共组件渲染 (导航、按钮、页脚) =======
function renderLayout() {
  const path = window.location.pathname;
  const isAbout = path.includes("about.html");
  const activeHome = isAbout ? "" : "active";
  const activeAbout = isAbout ? "active" : "";

  // 1. 注入顶部悬浮按钮 + 返回顶部按钮
  document.getElementById('app-header').innerHTML = `
    <button class='nav-toggle' type='button' aria-label='Toggle navigation' aria-expanded='false'>
      <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M4 12h16'/><path d='M4 6h16'/><path d='M4 18h16'/></svg>
    </button>
    <div class='nav-backdrop'></div>
    <button class="theme-toggle" type="button" aria-label="Toggle theme">
      <svg class="icon-sun" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
      <svg class="icon-moon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
    </button>
    <!-- 👇 新增的返回顶部按钮 -->
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

// ======= 事件绑定 =======
function bindEvents() {
  // 1. 主题切换
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

  // 2. 移动端菜单
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

  // 3. 🎯 返回顶部监听逻辑
  const backToTopBtn = document.getElementById('back-to-top');
  if (backToTopBtn) {
    // 监听滚动
    window.addEventListener('scroll', () => {
      // 当滚动超过 300 像素时显示，否则隐藏
      if (window.scrollY > 300) {
        backToTopBtn.classList.add('show');
      } else {
        backToTopBtn.classList.remove('show');
      }
    });

    // 点击平滑回到顶部
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
}

// ======= 首页专属：数据加载 =======
const formatNum = (num) => num ? num.toLocaleString() : '0';

async function loadRankData() {
  const tableBody = document.getElementById('table-body');
  if (!tableBody) return; // 不是首页则直接退出

  try {
    const res = await fetch(`data/rank.json?t=${Date.now()}`);
    if (!res.ok) throw new Error('找不到 data/rank.json');
    
    const data = await res.json();
    const categories = Object.keys(data);
    if (categories.length === 0) throw new Error('JSON 数据为空');

    document.getElementById('update-time').textContent = `共 ${categories.length} 个分类 | 数据自动同步`;

    const tabsContainer = document.getElementById('tabs');
    tabsContainer.innerHTML = '';
    
    categories.forEach((cat, index) => {
      const btn = document.createElement('button');
      btn.className = `tab-btn ${index === 0 ? 'active' : ''}`;
      btn.textContent = cat;
      btn.onclick = () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderTable(data[cat]);
      };
      tabsContainer.appendChild(btn);
    });

    renderTable(data[categories[0]]);
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="6" class="loading" style="color:#cf222e;">⚠️ ${err.message}</td></tr>`;
    document.getElementById('update-time').textContent = '加载失败';
  }
}

function renderTable(items) {
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';
  
  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading">暂无数据</td></tr>';
    return;
  }

  items.forEach((item, index) => {
    const tr = document.createElement('tr');
    const growthText = (item.growth !== null && item.growth !== undefined) 
                       ? `+${formatNum(item.growth)}` : '—';
    const desc = item.description || '';
    
    tr.innerHTML = `
      <td class="col-rank">${index + 1}</td>
      <td><a href="${item.html_url}" target="_blank" rel="noopener">${item.full_name}</a></td>
      <td class="col-stars">${formatNum(item.stars)}</td>
      <td class="col-growth">${growthText}</td>
      <td class="col-lang">${item.language || '-'}</td>
      <td class="col-desc" title="${desc}">${desc}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ======= 页面加载完成后执行 =======
document.addEventListener('DOMContentLoaded', () => {
  renderLayout();
  loadRankData();
});
