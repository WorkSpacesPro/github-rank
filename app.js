// 初始化主题
(function() {
  const t = localStorage.getItem("theme");
  if (t) document.documentElement.setAttribute("data-theme", t);
  else if (window.matchMedia("(prefers-color-scheme: dark)").matches) 
    document.documentElement.setAttribute("data-theme", "dark");
})();

// 🌟 核心：带有波纹扩散效果的切换逻辑
document.getElementById('theme-btn').addEventListener('click', (e) => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  
  // 如果不支持 View Transitions，直接切换
  if (!document.startViewTransition) {
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    return;
  }

  // 获取点击坐标
  const x = e.clientX;
  const y = e.clientY;
  const endRadius = Math.hypot(
    Math.max(x, innerWidth - x),
    Math.max(y, innerHeight - y)
  );

  // 执行过渡
  const transition = document.startViewTransition(() => {
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });

  transition.ready.then(() => {
    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${endRadius}px at ${x}px ${y}px)`,
    ];
    document.documentElement.animate(
      { clipPath: isDark ? clipPath.reverse() : clipPath },
      {
        duration: 500,
        easing: "ease-in-out",
        pseudoElement: isDark ? "::view-transition-old(root)" : "::view-transition-new(root)",
      }
    );
  });
});

const formatNum = (num) => num ? num.toLocaleString() : '0';

async function loadRankData() {
  try {
    const res = await fetch(`data/rank.json?t=${Date.now()}`);
    if (!res.ok) throw new Error('找不到 data/rank.json，请确认 Actions 是否成功运行');
    
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
