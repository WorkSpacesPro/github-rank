// 初始化主题
(function() {
  const t = localStorage.getItem("theme");
  if (t) document.documentElement.setAttribute("data-theme", t);
  else if (window.matchMedia("(prefers-color-scheme: dark)").matches) 
    document.documentElement.setAttribute("data-theme", "dark");
})();

// 完美复刻 mkdnsite 的圆形扩散动画
const themeBtn = document.getElementById('theme-btn');
if (themeBtn) {
  themeBtn.addEventListener('click', function(e) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    
    // 获取按钮的真实坐标
    const rect = themeBtn.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    // 存入 CSS 变量供 Keyframes 使用
    document.documentElement.style.setProperty('--mkdn-toggle-x', x + 'px');
    document.documentElement.style.setProperty('--mkdn-toggle-y', y + 'px');

    function apply() {
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    }

    // 触发过渡动画
    if (document.startViewTransition) {
      document.startViewTransition(apply);
    } else {
      apply(); // 不支持该 API 的旧浏览器直接切换
    }
  });
}

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
      `<tr><td colspan="6" class="loading" style="color:#ef4444;">⚠️ ${err.message}</td></tr>`;
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
