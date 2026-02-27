#!/usr/bin/env python3
"""
AI Daily Pulse - 数据抓取脚本
面向后端开发者的 AI 提效信息中心，自动聚合 AI 快讯、GitHub Trending、HuggingFace 模型和 arXiv 论文
"""

import json
import os
import time
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

import requests
import feedparser
from bs4 import BeautifulSoup

# 配置日志
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# 数据输出目录
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(DATA_DIR, exist_ok=True)

# 请求超时时间（秒）
REQUEST_TIMEOUT = 30

# 重试次数
MAX_RETRIES = 3


def safe_request(url: str, params: dict = None, headers: dict = None) -> Optional[requests.Response]:
    """带重试逻辑的 HTTP GET 请求"""
    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.get(
                url,
                params=params,
                headers=headers or {"User-Agent": "AI-Daily-Pulse/1.0"},
                timeout=REQUEST_TIMEOUT,
            )
            resp.raise_for_status()
            return resp
        except Exception as e:
            logger.warning(f"请求失败 (尝试 {attempt + 1}/{MAX_RETRIES}): {url} — {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(2 ** attempt)
    return None


def save_json(filename: str, data: dict) -> None:
    """将数据保存为 JSON 文件"""
    path = os.path.join(DATA_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    logger.info(f"已保存: {path}")


def load_json(filename: str) -> Optional[dict]:
    """加载已有的 JSON 文件"""
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


# ---------------------------------------------------------------------------
# 1. arXiv 论文
# ---------------------------------------------------------------------------

def fetch_arxiv(max_results: int = 15) -> dict:
    """从 arXiv API 获取最新 AI/LLM 相关论文"""
    logger.info("正在抓取 arXiv 论文...")
    categories = "cat:cs.AI+OR+cat:cs.CL+OR+cat:cs.LG"
    url = "http://export.arxiv.org/api/query"
    params = {
        "search_query": categories,
        "sortBy": "submittedDate",
        "sortOrder": "descending",
        "max_results": max_results,
    }

    resp = safe_request(url, params=params)
    if resp is None:
        logger.error("arXiv 数据抓取失败，使用现有数据")
        return load_json("arxiv.json") or {"updated": datetime.now(timezone.utc).isoformat(), "papers": []}

    feed = feedparser.parse(resp.text)
    papers = []
    for entry in feed.entries:
        try:
            papers.append({
                "id": entry.get("id", "").split("/abs/")[-1],
                "title": entry.get("title", "").replace("\n", " ").strip(),
                "authors": [a.get("name", "") for a in entry.get("authors", [])[:5]],
                "summary": entry.get("summary", "").replace("\n", " ").strip()[:300],
                "published": entry.get("published", "")[:10],
                "link": entry.get("link", ""),
                "categories": [t.get("term", "") for t in entry.get("tags", [])],
            })
        except Exception as e:
            logger.warning(f"解析 arXiv 条目失败: {e}")

    result = {"updated": datetime.now(timezone.utc).isoformat(), "papers": papers}
    logger.info(f"arXiv: 获取到 {len(papers)} 篇论文")
    return result


# ---------------------------------------------------------------------------
# 2. Hugging Face 热门模型
# ---------------------------------------------------------------------------

def fetch_huggingface(limit: int = 15) -> dict:
    """从 HuggingFace API 获取最近更新的热门模型"""
    logger.info("正在抓取 HuggingFace 模型...")
    url = "https://huggingface.co/api/models"
    params = {
        "sort": "downloads",
        "direction": -1,
        "limit": limit,
        "filter": "text-generation",
    }

    resp = safe_request(url, params=params)
    if resp is None:
        logger.error("HuggingFace 数据抓取失败，使用现有数据")
        return load_json("huggingface.json") or {"updated": datetime.now(timezone.utc).isoformat(), "models": []}

    raw = resp.json()
    models = []
    for item in raw:
        try:
            model_id = item.get("id", "")
            author = model_id.split("/")[0] if "/" in model_id else ""
            name = model_id.split("/")[-1] if "/" in model_id else model_id
            models.append({
                "id": model_id,
                "name": name,
                "author": author,
                "downloads": item.get("downloads", 0),
                "likes": item.get("likes", 0),
                "tags": item.get("tags", [])[:5],
                "link": f"https://huggingface.co/{model_id}",
                "updated": item.get("lastModified", "")[:10],
            })
        except Exception as e:
            logger.warning(f"解析 HuggingFace 条目失败: {e}")

    result = {"updated": datetime.now(timezone.utc).isoformat(), "models": models}
    logger.info(f"HuggingFace: 获取到 {len(models)} 个模型")
    return result


# ---------------------------------------------------------------------------
# 3. GitHub Trending
# ---------------------------------------------------------------------------

def fetch_github_trending(language: str = "") -> dict:
    """爬取 GitHub Trending 中的热门 AI/ML 仓库（不限语言）"""
    logger.info("正在抓取 GitHub Trending...")

    # 优先尝试第三方 API（不限定语言）
    api_url = "https://api.gitterapp.com/repositories?since=daily"
    resp = safe_request(api_url)
    if resp:
        try:
            raw = resp.json()
            repos = []
            for item in raw[:15]:
                repos.append({
                    "name": item.get("fullname", item.get("name", "")),
                    "description": item.get("description", "")[:200],
                    "stars": item.get("stars", 0),
                    "stars_today": item.get("currentPeriodStars", 0),
                    "language": item.get("language", ""),
                    "link": item.get("url", f"https://github.com/{item.get('fullname', '')}"),
                })
            if repos:
                result = {"updated": datetime.now(timezone.utc).isoformat(), "repositories": repos}
                logger.info(f"GitHub Trending: 获取到 {len(repos)} 个仓库")
                return result
        except Exception as e:
            logger.warning(f"gitterapp API 解析失败: {e}")

    # 备用：直接爬取 GitHub Trending 页面（不限语言）
    url = "https://github.com/trending?since=daily"
    resp = safe_request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; AI-Daily-Pulse/1.0)"})
    if resp is None:
        logger.error("GitHub Trending 数据抓取失败，使用现有数据")
        return load_json("github_trending.json") or {"updated": datetime.now(timezone.utc).isoformat(), "repositories": []}

    soup = BeautifulSoup(resp.text, "lxml")
    repos = []
    articles = soup.select("article.Box-row")[:15]
    for article in articles:
        try:
            h2 = article.select_one("h2.h3 a")
            if not h2:
                continue
            full_name = h2.get("href", "").strip("/")
            desc_el = article.select_one("p.col-9")
            desc = desc_el.get_text(strip=True) if desc_el else ""
            lang_el = article.select_one("[itemprop='programmingLanguage']")
            lang = lang_el.get_text(strip=True) if lang_el else ""
            stars_el = article.select("a.Link--muted")
            stars_text = stars_el[0].get_text(strip=True).replace(",", "") if stars_el else "0"
            today_el = article.select_one("span.d-inline-block.float-sm-right")
            today_text = today_el.get_text(strip=True) if today_el else "0 stars today"
            stars_today_text = today_text.split()[0].replace(",", "") if today_text else "0"

            try:
                stars = int(stars_text)
            except ValueError:
                stars = 0
            try:
                stars_today = int(stars_today_text)
            except ValueError:
                stars_today = 0

            repos.append({
                "name": full_name,
                "description": desc[:200],
                "stars": stars,
                "stars_today": stars_today,
                "language": lang,
                "link": f"https://github.com/{full_name}",
            })
        except Exception as e:
            logger.warning(f"解析 GitHub Trending 条目失败: {e}")

    result = {"updated": datetime.now(timezone.utc).isoformat(), "repositories": repos}
    logger.info(f"GitHub Trending: 获取到 {len(repos)} 个仓库")
    return result


# ---------------------------------------------------------------------------
# 4. RSS 新闻源
# ---------------------------------------------------------------------------

RSS_FEEDS = [
    # 中文 AI 资讯源（优先）
    ("机器之心", "https://www.jiqizhixin.com/rss"),
    ("量子位", "https://www.qbitai.com/feed"),
    ("InfoQ 中文", "https://www.infoq.cn/feed"),
    ("开源中国", "https://www.oschina.net/news/rss"),
    ("36氪", "https://36kr.com/feed"),
    # 保留少量英文源（会自动标记 [EN]）
    ("OpenAI Blog", "https://openai.com/blog/rss.xml"),
    ("Hugging Face Blog", "https://huggingface.co/blog/feed.xml"),
]


def is_chinese(text: str) -> bool:
    """检测文本是否包含中文字符"""
    for char in text:
        if '\u4e00' <= char <= '\u9fff':
            return True
    return False


def mark_english_title(title: str) -> str:
    """对英文标题添加 [EN] 标记"""
    if is_chinese(title):
        return title
    return f"[EN] {title}"


def fetch_rss_news(max_per_feed: int = 5) -> dict:
    """从多个 RSS 源获取 AI 相关文章"""
    logger.info("正在抓取 RSS 新闻...")
    articles = []

    for source_name, feed_url in RSS_FEEDS:
        try:
            resp = safe_request(feed_url)
            if resp is None:
                logger.warning(f"RSS 源不可用: {source_name}")
                continue

            feed = feedparser.parse(resp.text)
            count = 0
            for entry in feed.entries[:max_per_feed]:
                try:
                    published = entry.get("published", entry.get("updated", ""))
                    if published:
                        # 尝试解析日期
                        try:
                            dt = datetime(*entry.get("published_parsed", time.gmtime())[:6], tzinfo=timezone.utc)
                            published_date = dt.strftime("%Y-%m-%d")
                        except Exception:
                            published_date = published[:10]
                    else:
                        published_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

                    summary = entry.get("summary", "")
                    # 去除 HTML 标签
                    soup = BeautifulSoup(summary, "lxml")
                    clean_summary = soup.get_text(strip=True)[:300]

                    articles.append({
                        "title": mark_english_title(entry.get("title", "").strip()),
                        "source": source_name,
                        "published": published_date,
                        "summary": clean_summary,
                        "link": entry.get("link", ""),
                        "category": "AI News",
                    })
                    count += 1
                except Exception as e:
                    logger.warning(f"解析 RSS 条目失败 ({source_name}): {e}")

            logger.info(f"  {source_name}: {count} 篇文章")
        except Exception as e:
            logger.warning(f"RSS 源抓取失败 ({source_name}): {e}")

    # 按发布日期排序（最新优先）
    articles.sort(key=lambda x: x.get("published", ""), reverse=True)

    result = {"updated": datetime.now(timezone.utc).isoformat(), "articles": articles[:20]}
    logger.info(f"RSS: 共获取 {len(articles)} 篇文章")
    return result


# ---------------------------------------------------------------------------
# 5. 统计数据与历史趋势
# ---------------------------------------------------------------------------

def update_stats(arxiv_data: dict, hf_data: dict, github_data: dict, rss_data: dict) -> dict:
    """生成统计数据"""
    # 收集标签
    tag_counts: dict[str, int] = {}
    for paper in arxiv_data.get("papers", []):
        for cat in paper.get("categories", []):
            tag_counts[cat] = tag_counts.get(cat, 0) + 1
    for model in hf_data.get("models", []):
        for tag in model.get("tags", []):
            tag_counts[tag] = tag_counts.get(tag, 0) + 1

    top_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    # 编程语言统计
    lang_counts: dict[str, int] = {}
    for repo in github_data.get("repositories", []):
        lang = repo.get("language", "")
        if lang:
            lang_counts[lang] = lang_counts.get(lang, 0) + 1

    top_languages = sorted(lang_counts.items(), key=lambda x: x[1], reverse=True)[:5]

    # 加载静态数据文件的条目数
    tools_data = load_json("ai_tools.json") or {}
    tips_data = load_json("dev_tips.json") or {}

    return {
        "updated": datetime.now(timezone.utc).isoformat(),
        "counts": {
            "arxiv": len(arxiv_data.get("papers", [])),
            "huggingface": len(hf_data.get("models", [])),
            "github_trending": len(github_data.get("repositories", [])),
            "rss_news": len(rss_data.get("articles", [])),
            "ai_tools": len(tools_data.get("tools", [])),
            "dev_tips": len(tips_data.get("tips", [])),
        },
        "top_tags": [{"tag": t, "count": c} for t, c in top_tags],
        "top_languages": [{"language": l, "count": c} for l, c in top_languages],
    }


def update_history(stats_data: dict) -> dict:
    """更新 7 天历史趋势数据"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    history = load_json("history.json") or {
        "updated": datetime.now(timezone.utc).isoformat(),
        "dates": [],
        "arxiv": [],
        "huggingface": [],
        "github_trending": [],
        "rss_news": [],
        "ai_tools": [],
        "dev_tips": [],
    }

    # 确保新字段存在（向后兼容）
    for field in ("ai_tools", "dev_tips"):
        if field not in history:
            history[field] = [0] * len(history.get("dates", []))

    counts = stats_data.get("counts", {})

    # 如果今天的数据已存在，则更新；否则追加
    if today in history.get("dates", []):
        idx = history["dates"].index(today)
        history["arxiv"][idx] = counts.get("arxiv", 0)
        history["huggingface"][idx] = counts.get("huggingface", 0)
        history["github_trending"][idx] = counts.get("github_trending", 0)
        history["rss_news"][idx] = counts.get("rss_news", 0)
        history["ai_tools"][idx] = counts.get("ai_tools", 0)
        history["dev_tips"][idx] = counts.get("dev_tips", 0)
    else:
        history["dates"].append(today)
        history["arxiv"].append(counts.get("arxiv", 0))
        history["huggingface"].append(counts.get("huggingface", 0))
        history["github_trending"].append(counts.get("github_trending", 0))
        history["rss_news"].append(counts.get("rss_news", 0))
        history["ai_tools"].append(counts.get("ai_tools", 0))
        history["dev_tips"].append(counts.get("dev_tips", 0))

    # 只保留最近 7 天
    if len(history["dates"]) > 7:
        history["dates"] = history["dates"][-7:]
        history["arxiv"] = history["arxiv"][-7:]
        history["huggingface"] = history["huggingface"][-7:]
        history["github_trending"] = history["github_trending"][-7:]
        history["rss_news"] = history["rss_news"][-7:]
        history["ai_tools"] = history["ai_tools"][-7:]
        history["dev_tips"] = history["dev_tips"][-7:]

    history["updated"] = datetime.now(timezone.utc).isoformat()
    return history


# ---------------------------------------------------------------------------
# 主函数
# ---------------------------------------------------------------------------

def main():
    logger.info("=== AI Daily Pulse 数据抓取开始 ===")
    start_time = time.time()

    # 各数据源独立抓取，互不影响
    try:
        arxiv_data = fetch_arxiv()
        save_json("arxiv.json", arxiv_data)
    except Exception as e:
        logger.error(f"arXiv 抓取异常: {e}")
        arxiv_data = load_json("arxiv.json") or {"papers": []}

    try:
        hf_data = fetch_huggingface()
        save_json("huggingface.json", hf_data)
    except Exception as e:
        logger.error(f"HuggingFace 抓取异常: {e}")
        hf_data = load_json("huggingface.json") or {"models": []}

    try:
        github_data = fetch_github_trending()
        save_json("github_trending.json", github_data)
    except Exception as e:
        logger.error(f"GitHub Trending 抓取异常: {e}")
        github_data = load_json("github_trending.json") or {"repositories": []}

    try:
        rss_data = fetch_rss_news()
        # Save as both rss_news.json (backward compat) and ai_news.json (new frontend)
        save_json("rss_news.json", rss_data)
        save_json("ai_news.json", rss_data)
    except Exception as e:
        logger.error(f"RSS 抓取异常: {e}")
        rss_data = load_json("rss_news.json") or {"articles": []}

    # 更新统计和历史数据
    try:
        stats_data = update_stats(arxiv_data, hf_data, github_data, rss_data)
        save_json("stats.json", stats_data)

        history_data = update_history(stats_data)
        save_json("history.json", history_data)
    except Exception as e:
        logger.error(f"统计数据更新异常: {e}")

    elapsed = time.time() - start_time
    logger.info(f"=== 数据抓取完成，耗时 {elapsed:.1f} 秒 ===")


if __name__ == "__main__":
    main()
