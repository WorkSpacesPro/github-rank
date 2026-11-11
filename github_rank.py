#!/usr/bin/env python3
"""
GitHub 开源排行榜生成器
- 按分类（总榜 / 语言 / topic / 新秀）拉取 star 排行
- 与上次快照对比，算出每个项目的"涨星量"
- 自动排序，输出 Markdown / JSON

用法：
    export GITHUB_TOKEN=ghp_xxxx
    python github_rank.py --out-md RANK.md
"""

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
    "User-Agent": "github-star-rank",
})
if os.getenv("GITHUB_TOKEN"):
    SESSION.headers["Authorization"] = f"Bearer {os.environ['GITHUB_TOKEN']}"


def default_categories():
    last_year = datetime.now().year - 1
    return {
        "总榜 Top":     {"query": "stars:>50000",                        "limit": 50},
        f"新秀(>{last_year})": {"query": f"created:>{last_year}-01-01 stars:>2000", "limit": 30},
        "AI / LLM":     {"query": "topic:llm stars:>3000",               "limit": 30},
        "机器学习":      {"query": "topic:machine-learning stars:>5000",  "limit": 30},
        "Python":       {"query": "language:Python stars:>20000",        "limit": 30},
        "JavaScript":   {"query": "language:JavaScript stars:>20000",    "limit": 30},
        "TypeScript":   {"query": "language:TypeScript stars:>15000",    "limit": 30},
        "Rust":         {"query": "language:Rust stars:>10000",          "limit": 30},
        "Go":           {"query": "language:Go stars:>10000",            "limit": 30},
        "前端":         {"query": "topic:frontend stars:>10000",         "limit": 30},
    }


# ---------------------------------------------------------------- 请求层

def sleep_for_rate_limit(resp):
    """剩余额度为 0 时，睡到窗口重置。"""
    if int(resp.headers.get("X-RateLimit-Remaining", "1")) > 0:
        return
    reset = int(resp.headers.get("X-RateLimit-Reset", "0"))
    wait = max(1, reset - int(time.time()) + 1)
    print(f"[rate-limit] 额度用尽，等待 {wait}s", file=sys.stderr)
    time.sleep(wait)


def api_get(url, params=None, retries=4):
    last_err = None
    for i in range(retries):
        try:
            resp = SESSION.get(url, params=params, timeout=30)
        except requests.RequestException as e:
            last_err = e
            time.sleep(2 ** i)
            continue

        if resp.status_code == 200:
            sleep_for_rate_limit(resp)
            return resp.json()

        if resp.status_code in (403, 429):          # 限速
            sleep_for_rate_limit(resp)
            time.sleep(2 ** i)
            continue

        if resp.status_code == 422:                 # 查询语法错误
            raise ValueError(f"查询语法有问题: {resp.text[:300]}")

        resp.raise_for_status()

    raise RuntimeError(f"请求失败: {url} ({last_err})")


def search_repos(query, limit):
    """调用 Search API，按 star 降序取前 limit 条（最多 1000 条）。"""
    out, page = [], 1
    while len(out) < limit and page <= 10:
        per_page = min(100, limit - len(out))
        data = api_get(f"{API}/search/repositories", {
            "q": query,
            "sort": "stars",
            "order": "desc",
            "per_page": per_page,
            "page": page,
        })
        items = data.get("items") or []
        out.extend(items)
        if len(items) < per_page:
            break
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


# ---------------------------------------------------------------- 快照

def load_snapshot(path):
    p = Path(path)
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_snapshot(path, snapshot):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")


# ---------------------------------------------------------------- 排序 & 渲染

def sort_rows(rows, mode):
    if mode == "forks":
        return sorted(rows, key=lambda r: r["forks"], reverse=True)
    if mode == "growth":       # 没快照的排后面
        return sorted(rows, key=lambda r: (r["growth"] is None, -(r["growth"] or 0)))
    return sorted(rows, key=lambda r: r["stars"], reverse=True)   # 默认 stars


def render_markdown(all_data, sort_mode):
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = ["# GitHub 开源排行榜", "", f"> 自动生成于 {now} ｜ 排序：{sort_mode}", ""]

    # 目录
    for cat in all_data:
        lines.append(f"- [{cat}](#{cat.lower().replace(' ', '-')})")
    lines.append("")

    for cat, rows in all_data.items():
        lines += [f"## {cat}", "",
                  "| # | 项目 | ⭐ Stars | 涨星 | 语言 | 简介 |",
                  "|---|------|--------:|-----:|------|------|"]
        for i, r in enumerate(rows, 1):
            growth = f"+{r['growth']:,}" if r["growth"] else "—"
            desc = r["description"]
            if len(desc) > 80:
                desc = desc[:80] + "…"
            lines.append(
                f"| {i} | [{r['full_name']}]({r['html_url']}) | {r['stars']:,} "
                f"| {growth} | {r['language']} | {desc} |"
            )
        lines.append("")
    return "\n".join(lines)


# ---------------------------------------------------------------- 主流程

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--categories", help="自定义分类 JSON 文件")
    ap.add_argument("--snapshot", default="data/snapshot.json")
    ap.add_argument("--out-md", default="RANK.md")
    ap.add_argument("--out-json", default="data/rank.json")
    ap.add_argument("--sort", default="stars", choices=["stars", "forks", "growth"])
    args = ap.parse_args()

    categories = default_categories()
    if args.categories:
        categories = json.loads(Path(args.categories).read_text(encoding="utf-8"))

    if not os.getenv("GITHUB_TOKEN"):
        print("⚠️  未设置 GITHUB_TOKEN，Search API 只有 10 次/分钟，会很慢", file=sys.stderr)

    old = load_snapshot(args.snapshot).get("stars", {})
    new_stars, all_data = {}, {}

    for cat, cfg in categories.items():
        print(f"抓取 [{cat}]  {cfg['query']} ...", file=sys.stderr)
        rows = []
        for raw in search_repos(cfg["query"], cfg.get("limit", 30)):
            r = slim(raw)
            prev = old.get(r["full_name"])
            r["growth"] = (r["stars"] - prev) if prev is not None else None
            new_stars[r["full_name"]] = r["stars"]
            rows.append(r)
        all_data[cat] = sort_rows(rows, args.sort)

    # 输出
    md = render_markdown(all_data, args.sort)
    Path(args.out_md).write_text(md + "\n", encoding="utf-8")

    Path(args.out_json).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out_json).write_text(
        json.dumps(all_data, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # 更新快照（合并旧数据，避免丢掉本次没抓到的项目）
    merged = {**old, **new_stars}
    save_snapshot(args.snapshot, {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "stars": merged,
    })

    print(f"✅ 已生成 {args.out_md} / {args.out_json}", file=sys.stderr)


if __name__ == "__main__":
    main()
