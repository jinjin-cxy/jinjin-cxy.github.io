# AI Daily Pulse 🤖

**今今的 AI 提效信息中心 · 面向后端开发者 · 每日自动聚合 · GitHub Pages 部署**

[![Daily Update](https://github.com/jinjin-cxy/jinjin-cxy.github.io/actions/workflows/daily-update.yml/badge.svg)](https://github.com/jinjin-cxy/jinjin-cxy.github.io/actions/workflows/daily-update.yml)

> 🌐 在线访问：[jinjin-cxy.github.io](https://jinjin-cxy.github.io)

---

## 功能特性

- 📰 **AI 快讯**：聚合 OpenAI Blog、Google AI Blog、The Batch、Hacker News、InfoQ 等面向开发者的 AI 资讯
- 🛠️ **AI 工具**：精选 12 款后端开发者必备 AI 工具（n8n、LangChain、Dify、Cursor、Ollama 等）
- ⚡ **提效技巧**：10 个 AI 提效实战技巧（Prompt Engineering、Copilot 最佳实践、LangChain 集成等）
- ⭐ **热门开源**：GitHub Trending 热门 AI 相关仓库（不限语言，涵盖 Python/TypeScript/Go/Rust 等）
- 🤗 **热门模型**：HuggingFace 每日热门模型更新
- 📄 **前沿论文**：arXiv `cs.AI`、`cs.CL`、`cs.LG` 最新论文
- 🗺️ **学习路线图**：后端开发者 AI 提效 5 步学习路线
- 📊 **仪表盘**：6 个统计卡片、7 天趋势图、数据源分布饼图、热门标签柱状图
- 🌙 **深色/浅色模式**：支持系统偏好和手动切换
- 📱 **响应式设计**：完美适配移动端和桌面端

## 文件结构

```
jinjin-cxy.github.io/
├── index.html                  # 主页面
├── css/style.css               # 样式（现代极简风）
├── js/app.js                   # 前端逻辑（数据加载、渲染、图表）
├── data/
│   ├── ai_news.json            # AI 快讯数据（由 RSS 抓取生成）
│   ├── ai_tools.json           # AI 工具数据（静态维护）
│   ├── dev_tips.json           # 提效技巧数据（静态维护）
│   ├── arxiv.json              # arXiv 论文数据
│   ├── huggingface.json        # HuggingFace 模型数据
│   ├── github_trending.json    # GitHub Trending 数据
│   ├── rss_news.json           # RSS 新闻数据（同 ai_news.json）
│   ├── stats.json              # 统计数据（仪表盘）
│   └── history.json            # 7 天历史趋势数据
├── scripts/
│   ├── fetch_data.py           # Python 数据抓取脚本
│   └── requirements.txt        # Python 依赖
└── .github/workflows/
    └── daily-update.yml        # GitHub Actions 自动更新工作流
```

## 自动更新

通过 GitHub Actions 实现每日自动数据抓取：
- **触发时间**：每天 UTC 00:00 和 12:00（即北京时间 08:00 和 20:00）
- **手动触发**：支持在 Actions 页面手动运行
- **更新内容**：自动抓取最新数据并提交到 `data/` 目录

## 本地运行数据抓取

```bash
cd scripts
pip install -r requirements.txt
python fetch_data.py
```

## 技术栈

- **前端**：纯 HTML + CSS + JavaScript（无重框架，轻量快速）
- **图表**：Chart.js 4.x（CDN 引入）
- **字体**：Google Fonts（Plus Jakarta Sans / Inter）
- **部署**：GitHub Pages
- **自动化**：GitHub Actions + Python 3.11
- **数据格式**：JSON

---

*Powered by GitHub Actions ⚡*
