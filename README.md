# 🔥 GitHub 开源排行榜 (GitHub Open Source Rankings)

> 极简、极速、全自动的 GitHub 开源项目趋势追踪榜单。

🔗 **在线演示**: [https://grank.gb.ooo](https://grank.gb.ooo) *(请在此处填入你真实的域名)*

一个基于 **GitHub Actions** + **原生三剑客 (HTML/CSS/JS)** + **Cloudflare Pages** 搭建的高性能排行榜。每天自动抓取 GitHub 最新数据，涵盖主流语言、AI 风口、开发者工具以及极度细分的 Cloudflare 建站生态。

---

## ✨ 核心特性

- ⚡ **极致秒开，按需加载**：摒弃庞大框架，原生 JS 驱动。采用**数据拆包（Code Splitting）**策略，首页极速渲染，点哪个分类才去拉取哪份 JSON 数据，告别首屏白屏。
- ☁️ **23+ 精细化分类**：不仅包含全站总榜、各主流语言、AI 大模型，还独创了**完整的 Cloudflare 建站生态**（涵盖 CF 图床、CF 博客、短链、Workers、代理工具等）。
- 🌓 **无极暗黑模式**：支持系统级深浅色跟随。点击右上角小太阳，带有丝滑的**水波纹扩散动画 (View Transitions API)**。
- 🌍 **中英双语无缝切换**：全站文案、分类标签、数据表头均支持中文/英文实时切换，状态自动保存于本地。
- 🔍 **毫秒级搜索与排序**：内置前端搜索过滤；点击表头（Stars / 涨星 / 语言）瞬间完成升序/降序排列。
- 🏅 **荣誉榜单呈现**：前三名自带 🥇🥈🥉 奖牌，4-10 名加粗高亮，数据一目了然。
- 🛠️ **完全数据驱动**：导航菜单、站点信息、分类配置全部解耦为 `data/` 目录下的 JSON 文件，**改配置无需动代码**。

---

## 🚀 自动化架构

本项目采用 **"前端纯静态 + 后端全自动"** 的 Serverless 架构，零服务器成本：

1. **数据抓取**：GitHub Actions 每日定时触发，运行 `github_rank.py` 调用 GitHub API。
2. **快照对比**：脚本读取历史 `snapshot.json`，精准计算每个项目每天的**新增 Star 数（涨星）**。
3. **数据拆包**：将全量数据拆分为 `top.json`、`python.json`、`cf_blog.json` 等独立小文件，存入 `data/` 目录，并生成 `categories.json` 双语映射表。
4. **自动提交**：Actions 自动将生成的数据 Commit 并 Push 回仓库。
5. **自动部署**：Cloudflare Pages 监听到仓库更新，自动拉取并分发至全球边缘 CDN。

---

## 📦 目录结构

```text
github-rank/
├── .github/workflows/rank.yml  # GitHub Actions 定时抓取任务
├── assets/
│   ├── app.js                  # 前端核心逻辑 (渲染/多语言/按需加载/搜索排序)
│   ├── style.css               # 极简黑白灰样式与水波纹动画
│   └── logo.png                # 站点 Logo
├── data/                       # 自动生成的数据目录
│   ├── categories.json         # 分类中英双语映射表
│   ├── nav.json                # 左侧导航菜单配置
│   ├── site.json               # 站点全局配置 (仓库路径等)
│   ├── top.json                # 示例：按需加载的独立数据包
│   └── snapshot.json           # 历史快照 (用于计算涨星)
├── github_rank.py              # 核心数据抓取与生成脚本
├── index.html                  # 首页
└── about.html                  # 关于页面
