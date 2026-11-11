// 初始化主题
(function(){
  var t = localStorage.getItem("theme");
  if(t === "dark" || t === "light") { document.documentElement.setAttribute("data-theme", t); }
  else { document.documentElement.setAttribute("data-theme", window.matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light"); }
})();

// 水波纹主题切换
(function(){
  var btn = document.querySelector('.theme-toggle');
  if (!btn) return;
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
    if (document.startViewTransition) {
      document.startViewTransition(apply);
    } else {
      apply();
    }
  });
})();

// 移动端侧边栏菜单逻辑
(function(){
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  var backdrop = document.querySelector('.nav-backdrop');
  if (!toggle || !nav) return;
  function open() {
    nav.classList.add('nav--open');
    if (backdrop) backdrop.classList.add('nav-backdrop--visible');
    toggle.setAttribute('aria-expanded', 'true');
  }
  function close() {
    nav.classList.remove('nav--open');
    if (backdrop) backdrop.classList.remove('nav-backdrop--visible');
    toggle.setAttribute('aria-expanded', 'false');
  }
  toggle.addEventListener('click', function() {
    nav.classList.contains('nav--open') ? close() : open();
  });
  if (backdrop) backdrop.addEventListener('click', close);
  nav.addEventListener('click', function(e) {
    if (e.target && e.target.closest && e.target.closest('a')) close();
  });
})();

// 排行榜数据加载与渲染
const formatNum = (num) => num ? num.toLocaleString() : '0';

async function loadRankData() {
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
    document.getElementById('table-body').innerHTML = 
      `<tr><td colspan="6" class="loading" style="color:#cf222e;">⚠️ ${err.message}</td></tr>`;
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

document.addEventListener('DOMContentLoaded', loadRankData);
