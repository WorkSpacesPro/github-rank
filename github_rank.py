#!/usr/bin/env python3
import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
import requests

API = "https://api.github.com"
SESSION = requests.Session()
SESSION.headers.update({
    "Accept": "application/vnd.github+json",
    "User-Agent": "github-star-rank"
})
if os.getenv("GITHUB_TOKEN"):
    SESSION.headers["Authorization"] = f"Bearer {os.environ['GITHUB_TOKEN']}"

def default_categories():
    last_year = datetime.now().year - 1
    return {
        # === 🌟 综合维度 ===
        "总榜 Top":          {"query": "stars:>50000", "limit": 50, "file": "top", "en": "Top Overall"},
        f"明日之星(>{last_year})": {"query": f"created:>{last_year}-01-01 stars:>2000", "limit": 30, "file": "rising", "en": "Rising Stars"},
        "Fork 最多(脚手架)":  {"query": "stars:>10000 forks:>5000", "limit": 30, "file": "forks", "en": "Most Forked"},
        
        # === 🤖 AI 风口 ===
        "AI 智能体(Agent)":   {"query": "topic:ai-agent stars:>1000", "limit": 30, "file": "agent", "en": "AI Agent"},
        "本地大模型(Ollama)": {"query": "topic:local-llm stars:>1000", "limit": 30, "file": "local_llm", "en": "Local LLM"},
        "AIGC (生图/视频)":   {"query": "topic:stable-diffusion stars:>3000", "limit": 30, "file": "aigc", "en": "AIGC Tools"},

        # === 🛠️ 开发者场景 ===
        "自托管/隐私":        {"query": "topic:self-hosted stars:>10000", "limit": 30, "file": "self_hosted", "en": "Self-Hosted"},
        "开发者工具/CLI":     {"query": "topic:cli-tool stars:>5000", "limit": 30, "file": "dev_tools", "en": "Dev Tools"},
        "Awesome/学习资源":   {"query": "topic:awesome stars:>30000", "limit": 30, "file": "awesome", "en": "Awesome Lists"},
        "独立开发/SaaS":      {"query": "topic:saas-boilerplate stars:>2000", "limit": 30, "file": "saas", "en": "SaaS Boilerplate"},
        
        # === ☁️ Cloudflare 建站生态 (已去重、去掉Typecho) ===
        "CF 图床/相册":       {"query": "cloudflare image hosting OR cloudflare imagebed stars:>200", "limit": 30, "file": "cf_image", "en": "CF Image Host"},
        "CF 博客建站 (Jekyll/Hexo)": {"query": "cloudflare pages blog OR jekyll cloudflare OR hexo cloudflare OR hugo cloudflare stars:>100", "limit": 30, "file": "cf_blog", "en": "CF Blog Builders"},
        "CF 全能工具 (Workers)":  {"query": "topic:cloudflare-workers stars:>1000", "limit": 30, "file": "cf_workers", "en": "CF Workers"},
        "CF 网络/代理工具":   {"query": "cloudflare vless OR cloudflare trojan OR cloudflare proxy stars:>500", "limit": 30, "file": "cf_proxy", "en": "CF Proxy Tools"},

        # === 💻 主流语言 ===
        "Python":       {"query": "language:Python stars:>20000", "limit": 30, "file": "python", "en": "Python"},
        "JavaScript":   {"query": "language:JavaScript stars:>20000", "limit": 30, "file": "javascript", "en": "JavaScript"},
        "TypeScript":   {"query": "language:TypeScript stars:>15000", "limit": 30, "file": "typescript", "en": "TypeScript"},
        "Rust":         {"query": "language:Rust stars:>10000", "limit": 30, "file": "rust", "en": "Rust"},
        "Go":           {"query": "language:Go stars:>10000", "limit": 30, "file": "go", "en": "Go"},
        "Java":         {"query": "language:Java stars:>15000", "limit": 30, "file": "java", "en": "Java"},
        "前端":         {"query": "topic:frontend stars:>10000", "limit": 30, "file": "frontend", "en": "Frontend"},
    }

def sleep_for_rate_limit(resp):
    if int(resp.headers.get("X-RateLimit-Remaining", "1")) > 0: return
    reset = int(resp.headers.get("X-RateLimit-Reset", "0"))
    wait = max(1, reset - int(time.time()) + 1)
    print(f"[rate-limit] 等待 {wait}s", file=sys.stderr)
    time.sleep(wait)

def api_get(url, params=None, retries=4):
    last_err = None
    for i in range(retries):
        try:
            resp = SESSION.get(url, params=params, timeout=30)
            if resp.status_code == 200:
                sleep_for_rate_limit(resp)
                return resp.json()
            if resp.status_code in (403, 429):
                sleep_for_rate_limit(resp)
                time.sleep(2 ** i)
                continue
            if resp.status_code == 422:
                raise ValueError(f"查询语法错误: {resp.text[:300]}")
            resp.raise_for_status()
        except requests.RequestException as e:
            last_err = e
            time.sleep(2 ** i)
    raise RuntimeError(f"请求失败: {url} ({last_err})")

def search_repos(query, limit):
    out, page = [], 1
    while len(out) < limit and page <= 10:
        per_page = min(100, limit - len(out))
        data = api_get(f"{API}/search/repositories", {
            "q": query, "sort": "stars", "order": "desc", "per_page": per_page, "page": page
        })
        items = data.get("items") or []
        out.extend(items)
        if len(items) < per_page: break
        page += 1
    return out[:limit]

def slim(item):
    desc = (item.get("description") or "").replace("\n", " ").replace("|", "\\|")
    return {
        "full_name": item["full_name"],
        "html_url": item["html_url"],
        "description": desc.strip(),
        "stars": item["stargazers_count"],
        "forks": item["forks_count"],
        "language": item.get("language") or "-",
        "topics": item.get("topics", []),
        "created_at": item.get("created_at", ""),
        "pushed_at": item.get("pushed_at", ""),
    }

def load_snapshot(path):
    p = Path(path)
    if not p.exists(): return {}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {}

def save_snapshot(path, snapshot):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")

def sort_rows(rows, mode):
    if mode == "forks": return sorted(rows, key=lambda r: r["forks"], reverse=True)
    if mode == "growth": return sorted(rows, key=lambda r: (r["growth"] is None, -(r["growth"] or 0)))
    return sorted(rows, key=lambda r: r["stars"], reverse=True)

def render_markdown(all_data, sort_mode):
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = ["# GitHub 开源排行榜", "", f"> 自动生成于 {now} ｜ 排序：{sort_mode}", ""]
    for cat, rows in all_data.items():
        lines += [f"## {cat}", "", "| # | 项目 | ⭐ Stars | 涨星 | 语言 | 简介 |", "|---|------|--------:|-----:|------|------|"]
        for i, r in enumerate(rows, 1):
            growth = f"+{r['growth']:,}" if r["growth"] else "—"
            desc = r["description"]
            if len(desc) > 80: desc = desc[:80] + "…"
            lines.append(f"| {i} | [{r['full_name']}]({r['html_url']}) | {r['stars']:,} | {growth} | {r['language']} | {desc} |")
        lines.append("")
    return "\n".join(lines)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--snapshot", default="data/snapshot.json")
    ap.add_argument("--out-md", default="RANK.md")
    ap.add_argument("--sort", default="stars", choices=["stars", "forks", "growth"])
    args = ap.parse_args()

    categories = default_categories()
    if not os.getenv("GITHUB_TOKEN"):
        print("⚠️ 未设置 GITHUB_TOKEN，API 限制很严", file=sys.stderr)

    old = load_snapshot(args.snapshot).get("stars", {})
    new_stars, all_data = {}, {}

    for cat, cfg in categories.items():
        print(f"抓取 [{cat}] ...", file=sys.stderr)
        rows = []
        for raw in search_repos(cfg["query"], cfg.get("limit", 30)):
            r = slim(raw)
            prev = old.get(r["full_name"])
            r["growth"] = (r["stars"] - prev) if prev is not None else None
            new_stars[r["full_name"]] = r["stars"]
            rows.append(r)
        all_data[cat] = sort_rows(rows, args.sort)

    Path(args.out_md).write_text(render_markdown(all_data, args.sort) + "\n", encoding="utf-8")

    data_dir = Path("data")
    data_dir.mkdir(parents=True, exist_ok=True)
    
    # 生成包含中英文映射的分类列表
    categories_list = [{"zh": cat, "en": cfg["en"], "file": cfg["file"]} for cat, cfg in categories.items()]
    (data_dir / "categories.json").write_text(json.dumps(categories_list, ensure_ascii=False), encoding="utf-8")

    # 按分类生成独立的 JSON 文件
    for cat, items in all_data.items():
        safe_name = categories[cat]["file"]
        (data_dir / f"{safe_name}.json").write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
        
    (data_dir / "rank.json").write_text(json.dumps(all_data, ensure_ascii=False, indent=2), encoding="utf-8")

    merged = {**old, **new_stars}
    save_snapshot(args.snapshot, {"fetched_at": datetime.now(timezone.utc).isoformat(), "stars": merged})
    print(f"✅ 生成完毕", file=sys.stderr)

if __name__ == "__main__":
    main()
