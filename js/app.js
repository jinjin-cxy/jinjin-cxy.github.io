/**
 * AI Daily Pulse — 前端逻辑
 * 负责数据加载、页面渲染、图表初始化、主题切换
 */

// ============================================================
// 工具函数
// ============================================================

/** 格式化数字（如 1234 → 1.2k） */
function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

/** 转义 HTML 特殊字符 */
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 格式化日期为可读字符串 */
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return "今天";
  if (diff === 1) return "昨天";
  if (diff < 7) return `${diff} 天前`;
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

/** 加载 JSON 数据文件（带错误处理） */
async function loadJSON(path) {
  try {
    const resp = await fetch(path);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch (e) {
    console.warn(`加载数据失败: ${path}`, e);
    return null;
  }
}

/** 难度等级映射 */
function difficultyClass(difficulty) {
  if (difficulty === "入门") return "beginner";
  if (difficulty === "进阶") return "intermediate";
  if (difficulty === "高级") return "advanced";
  return "beginner";
}

// ============================================================
// 主题切换
// ============================================================

const THEME_KEY = "ai-daily-pulse-theme";

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  applyTheme(theme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const btn = document.getElementById("themeToggle");
  if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(current === "dark" ? "light" : "dark");
}

// ============================================================
// Tab 切换
// ============================================================

function initTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`panel-${target}`)?.classList.add("active");
    });
  });
}

// ============================================================
// 滚动淡入动画
// ============================================================

function initScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));
}

// ============================================================
// 渲染函数
// ============================================================

/** 渲染统计卡片 */
function renderStats(stats) {
  if (!stats) return;
  const counts = stats.counts || {};
  const map = {
    "stat-news": counts.rss_news ?? 0,
    "stat-tools": counts.ai_tools ?? 0,
    "stat-tips": counts.dev_tips ?? 0,
    "stat-github": counts.github_trending ?? 0,
    "stat-hf": counts.huggingface ?? 0,
    "stat-arxiv": counts.arxiv ?? 0,
  };
  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) {
      animateCounter(el, val);
    }
  });

  // 更新 tab 徽章
  const tabCountMap = {
    "tab-count-news": counts.rss_news ?? 0,
    "tab-count-tools": counts.ai_tools ?? 0,
    "tab-count-tips": counts.dev_tips ?? 0,
    "tab-count-github": counts.github_trending ?? 0,
    "tab-count-hf": counts.huggingface ?? 0,
    "tab-count-arxiv": counts.arxiv ?? 0,
  };
  Object.entries(tabCountMap).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });
}

/** 数字滚动动画 */
function animateCounter(el, target) {
  let current = 0;
  const step = Math.ceil(target / 30);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 40);
}

/** 渲染最后更新时间 */
function renderUpdatedTime(dateStr) {
  if (!dateStr) return;
  const el = document.getElementById("lastUpdated");
  if (!el) return;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return;
  el.textContent = d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Shanghai",
  }) + " CST";
}

// -------- AI 快讯卡片 --------

function renderAINews(data) {
  const container = document.getElementById("news-cards");
  if (!container) return;
  const articles = data?.articles ?? [];
  if (!articles.length) {
    container.innerHTML = emptyState("📰", "暂无新闻数据");
    return;
  }

  container.innerHTML = articles
    .map(
      (a) => `
    <div class="content-card fade-in">
      <div class="card-header">
        <div class="card-title">
          <a href="${escHtml(a.link)}" target="_blank" rel="noopener">${escHtml(a.title)}</a>
        </div>
      </div>
      <div class="card-meta">
        <span class="card-source">📰 ${escHtml(a.source || "")}</span>
        <span>·</span>
        <span class="card-date">📅 ${escHtml(formatDate(a.published))}</span>
      </div>
      <p class="card-summary">${escHtml(a.summary || "")}</p>
      <div class="card-footer">
        <div class="card-tags">
          ${a.category ? `<span class="tag-badge primary">${escHtml(a.category)}</span>` : ""}
        </div>
        <a class="card-link" href="${escHtml(a.link)}" target="_blank" rel="noopener">阅读全文 →</a>
      </div>
    </div>`
    )
    .join("");

  initScrollAnimations();
  document.getElementById("news-count").textContent = `共 ${articles.length} 篇文章`;
}

// -------- AI 工具卡片 --------

function renderAITools(data, filter) {
  const container = document.getElementById("tools-cards");
  if (!container) return;
  let tools = data?.tools ?? [];
  if (!tools.length) {
    container.innerHTML = emptyState("🛠️", "暂无工具数据");
    return;
  }

  if (filter && filter !== "all") {
    tools = tools.filter((t) => t.category === filter);
  }

  container.innerHTML = tools
    .map(
      (t) => `
    <div class="content-card fade-in">
      <div class="tool-card-header">
        <div class="tool-icon">${escHtml(t.icon || "🔧")}</div>
        <div class="tool-card-info">
          <div class="tool-card-name">${escHtml(t.name)}</div>
          <div class="tool-card-badges">
            <span class="category-badge">${escHtml(t.category || "")}</span>
            <span class="difficulty-badge ${difficultyClass(t.difficulty)}">${escHtml(t.difficulty || "")}</span>
          </div>
        </div>
      </div>
      <p class="card-summary">${escHtml(t.description || "")}</p>
      <div class="card-footer">
        <div></div>
        <a class="card-link" href="${escHtml(t.link)}" target="_blank" rel="noopener">访问官网 →</a>
      </div>
    </div>`
    )
    .join("");

  initScrollAnimations();
  document.getElementById("tools-count").textContent = `共 ${tools.length} 款工具`;
}

// -------- 提效技巧卡片 --------

function renderDevTips(data, filter) {
  const container = document.getElementById("tips-cards");
  if (!container) return;
  let tips = data?.tips ?? [];
  if (!tips.length) {
    container.innerHTML = emptyState("⚡", "暂无技巧数据");
    return;
  }

  if (filter && filter !== "all") {
    tips = tips.filter((t) => t.difficulty === filter);
  }

  container.innerHTML = tips
    .map(
      (t) => `
    <div class="content-card fade-in">
      <div class="card-header">
        <div style="font-size:1.5rem;flex-shrink:0">${escHtml(t.icon || "💡")}</div>
        <div class="card-title">${escHtml(t.title)}</div>
      </div>
      <p class="card-summary">${escHtml(t.description || "")}</p>
      <div class="card-footer">
        <div class="card-tags">
          <span class="category-badge">${escHtml(t.category || "")}</span>
          <span class="difficulty-badge ${difficultyClass(t.difficulty)}">${escHtml(t.difficulty || "")}</span>
          ${(t.tags || [])
            .slice(0, 3)
            .map((tag) => `<span class="tag-badge">${escHtml(tag)}</span>`)
            .join("")}
        </div>
        ${t.link ? `<a class="card-link" href="${escHtml(t.link)}" target="_blank" rel="noopener">查看详情 →</a>` : ""}
      </div>
    </div>`
    )
    .join("");

  initScrollAnimations();
  document.getElementById("tips-count").textContent = `共 ${tips.length} 个技巧`;
}

// -------- arXiv 论文卡片 --------

function renderArxiv(data) {
  const container = document.getElementById("arxiv-cards");
  if (!container) return;
  const papers = data?.papers ?? [];
  if (!papers.length) {
    container.innerHTML = emptyState("📄", "暂无论文数据");
    return;
  }

  container.innerHTML = papers
    .map(
      (p) => `
    <div class="content-card fade-in">
      <div class="card-header">
        <div class="card-title">
          <a href="${escHtml(p.link)}" target="_blank" rel="noopener">${escHtml(p.title)}</a>
        </div>
      </div>
      <div class="card-meta">
        <span class="card-author">👤 ${escHtml((p.authors || []).slice(0, 3).join(", "))}${p.authors?.length > 3 ? " 等" : ""}</span>
        <span>·</span>
        <span class="card-date">📅 ${escHtml(formatDate(p.published))}</span>
      </div>
      <p class="card-summary">${escHtml(p.summary || "")}</p>
      <div class="card-footer">
        <div class="card-tags">
          ${(p.categories || [])
            .slice(0, 3)
            .map((c) => `<span class="tag-badge primary">${escHtml(c)}</span>`)
            .join("")}
        </div>
        <a class="card-link" href="${escHtml(p.link)}" target="_blank" rel="noopener">查看论文 →</a>
      </div>
    </div>`
    )
    .join("");

  initScrollAnimations();
  document.getElementById("arxiv-count").textContent = `共 ${papers.length} 篇论文`;
}

// -------- HuggingFace 模型卡片 --------

function renderHuggingFace(data) {
  const container = document.getElementById("hf-cards");
  if (!container) return;
  const models = data?.models ?? [];
  if (!models.length) {
    container.innerHTML = emptyState("🤗", "暂无模型数据");
    return;
  }

  container.innerHTML = models
    .map(
      (m) => `
    <div class="content-card fade-in">
      <div class="card-header">
        <div class="card-title">
          <a href="${escHtml(m.link)}" target="_blank" rel="noopener">${escHtml(m.name)}</a>
        </div>
      </div>
      <div class="card-meta">
        <span class="card-author">🏷️ ${escHtml(m.author || "")}</span>
        <span>·</span>
        <span class="card-date">📅 ${escHtml(formatDate(m.updated))}</span>
      </div>
      <div class="card-footer">
        <div class="card-tags">
          ${(m.tags || [])
            .slice(0, 4)
            .map((t) => `<span class="tag-badge">${escHtml(t)}</span>`)
            .join("")}
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center">
          <span class="metric-badge">⬇️ ${formatNumber(m.downloads || 0)}</span>
          <span class="metric-badge">❤️ ${formatNumber(m.likes || 0)}</span>
          <a class="card-link" href="${escHtml(m.link)}" target="_blank" rel="noopener">查看 →</a>
        </div>
      </div>
    </div>`
    )
    .join("");

  initScrollAnimations();
  document.getElementById("hf-count").textContent = `共 ${models.length} 个模型`;
}

// -------- GitHub Trending 卡片 --------

function renderGithubTrending(data) {
  const container = document.getElementById("github-cards");
  if (!container) return;
  const repos = data?.repositories ?? [];
  if (!repos.length) {
    container.innerHTML = emptyState("💻", "暂无仓库数据");
    return;
  }

  const langColors = {
    Python: "#3572A5",
    JavaScript: "#f1e05a",
    TypeScript: "#2b7489",
    "C++": "#f34b7d",
    Go: "#00ADD8",
    Rust: "#dea584",
    Java: "#b07219",
    C: "#555555",
    "C#": "#178600",
    Ruby: "#701516",
  };

  container.innerHTML = repos
    .map((r) => {
      const color = langColors[r.language] || "#8b949e";
      return `
    <div class="content-card fade-in">
      <div class="card-header">
        <div class="card-title">
          <a href="${escHtml(r.link)}" target="_blank" rel="noopener">${escHtml(r.name)}</a>
        </div>
      </div>
      <p class="card-summary">${escHtml(r.description || "")}</p>
      <div class="card-footer">
        <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">
          ${r.language ? `<span class="metric-badge"><span class="lang-dot" style="background:${color}"></span>${escHtml(r.language)}</span>` : ""}
          <span class="metric-badge">⭐ ${formatNumber(r.stars || 0)}</span>
          ${r.stars_today ? `<span class="metric-badge">🔥 +${r.stars_today} 今日</span>` : ""}
        </div>
        <a class="card-link" href="${escHtml(r.link)}" target="_blank" rel="noopener">查看 →</a>
      </div>
    </div>`;
    })
    .join("");

  initScrollAnimations();
  document.getElementById("github-count").textContent = `共 ${repos.length} 个仓库`;
}

/** 空状态占位 */
function emptyState(icon, text) {
  return `<div class="empty-state">
    <div class="empty-state-icon">${icon}</div>
    <p class="empty-state-text">${text}</p>
  </div>`;
}

// ============================================================
// 图表初始化
// ============================================================

let trendChart, pieChart, tagChart;

/** 销毁已有图表（防止重叠） */
function destroyChart(chart) {
  if (chart) {
    chart.destroy();
  }
}

function initCharts(history, stats) {
  initTrendChart(history);
  initPieChart(stats);
  initTagChart(stats);
}

/** 7 天趋势折线图 */
function initTrendChart(history) {
  const canvas = document.getElementById("trendChart");
  if (!canvas) return;
  destroyChart(trendChart);

  const dates = history?.dates ?? [];
  const labels = dates.map((d) => {
    const date = new Date(d);
    return isNaN(date.getTime()) ? d : date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  });

  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const textColor = isDark ? "#94a3b8" : "#64748b";

  trendChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "AI 快讯",
          data: history?.rss_news ?? [],
          borderColor: "#6366f1",
          backgroundColor: "rgba(99,102,241,0.08)",
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
        },
        {
          label: "HuggingFace",
          data: history?.huggingface ?? [],
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245,158,11,0.08)",
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
        },
        {
          label: "GitHub",
          data: history?.github_trending ?? [],
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,0.08)",
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
        },
        {
          label: "arXiv",
          data: history?.arxiv ?? [],
          borderColor: "#06b6d4",
          backgroundColor: "rgba(6,182,212,0.08)",
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: { color: textColor, font: { size: 11 }, boxWidth: 12, padding: 12 },
        },
        tooltip: { mode: "index", intersect: false },
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 10 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 10 }, stepSize: 5 },
        },
      },
      interaction: { mode: "nearest", axis: "x", intersect: false },
    },
  });
}

/** 数据源分布饼图 */
function initPieChart(stats) {
  const canvas = document.getElementById("pieChart");
  if (!canvas) return;
  destroyChart(pieChart);

  const counts = stats?.counts ?? {};
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const textColor = isDark ? "#94a3b8" : "#64748b";

  pieChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["AI 快讯", "HuggingFace", "GitHub", "arXiv"],
      datasets: [
        {
          data: [
            counts.rss_news ?? 0,
            counts.huggingface ?? 0,
            counts.github_trending ?? 0,
            counts.arxiv ?? 0,
          ],
          backgroundColor: ["#6366f1", "#f59e0b", "#10b981", "#06b6d4"],
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: textColor, font: { size: 11 }, boxWidth: 10, padding: 10 },
        },
      },
    },
  });
}

/** 热门标签柱状图 */
function initTagChart(stats) {
  const canvas = document.getElementById("tagChart");
  if (!canvas) return;
  destroyChart(tagChart);

  const tags = (stats?.top_tags ?? []).slice(0, 8);
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const textColor = isDark ? "#94a3b8" : "#64748b";

  tagChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: tags.map((t) => t.tag),
      datasets: [
        {
          data: tags.map((t) => t.count),
          backgroundColor: [
            "#6366f1","#8b5cf6","#06b6d4","#10b981",
            "#f59e0b","#ef4444","#ec4899","#14b8a6",
          ],
          borderRadius: 6,
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => ` ${ctx.raw} 次` },
        },
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 10 } },
          beginAtZero: true,
        },
        y: {
          grid: { display: false },
          ticks: { color: textColor, font: { size: 10 } },
        },
      },
    },
  });
}

/** 当主题变化时重绘图表 */
function redrawCharts(history, stats) {
  destroyChart(trendChart);
  destroyChart(pieChart);
  destroyChart(tagChart);
  trendChart = null;
  pieChart = null;
  tagChart = null;
  initCharts(history, stats);
}

// ============================================================
// 排序功能
// ============================================================

function initSorting() {
  document.querySelectorAll(".sort-select").forEach((select) => {
    select.addEventListener("change", () => {
      const tab = select.dataset.tab;
      const order = select.value;
      sortCards(tab, order);
    });
  });
}

function sortCards(tab, order) {
  const appData = window.__appData || {};

  if (tab === "news") {
    const items = [...(appData.news?.articles ?? [])];
    if (order === "date") items.sort((a, b) => (b.published || "").localeCompare(a.published || ""));
    appData.news = { ...appData.news, articles: items };
    renderAINews(appData.news);
  } else if (tab === "tools") {
    renderAITools(appData.tools, order);
  } else if (tab === "tips") {
    renderDevTips(appData.tips, order);
  } else if (tab === "arxiv") {
    const items = [...(appData.arxiv?.papers ?? [])];
    if (order === "date") items.sort((a, b) => (b.published || "").localeCompare(a.published || ""));
    appData.arxiv = { ...appData.arxiv, papers: items };
    renderArxiv(appData.arxiv);
  } else if (tab === "hf") {
    const items = [...(appData.hf?.models ?? [])];
    if (order === "date") items.sort((a, b) => (b.updated || "").localeCompare(a.updated || ""));
    else if (order === "downloads") items.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    else if (order === "likes") items.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    appData.hf = { ...appData.hf, models: items };
    renderHuggingFace(appData.hf);
  } else if (tab === "github") {
    const items = [...(appData.github?.repositories ?? [])];
    if (order === "stars") items.sort((a, b) => (b.stars || 0) - (a.stars || 0));
    else if (order === "stars_today") items.sort((a, b) => (b.stars_today || 0) - (a.stars_today || 0));
    appData.github = { ...appData.github, repositories: items };
    renderGithubTrending(appData.github);
  }
}

// ============================================================
// 主入口
// ============================================================

async function main() {
  // 初始化主题
  initTheme();

  // 绑定主题切换按钮
  document.getElementById("themeToggle")?.addEventListener("click", () => {
    toggleTheme();
    // 重绘图表以适应新主题颜色
    const appData = window.__appData || {};
    if (appData.history && appData.stats) {
      setTimeout(() => redrawCharts(appData.history, appData.stats), 50);
    }
  });

  // 初始化 Tab
  initTabs();

  // 初始化排序
  initSorting();

  // 显示加载状态
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) overlay.classList.add("visible");

  try {
    // 并行加载所有数据
    const [newsData, toolsData, tipsData, arxivData, hfData, githubData, statsData, historyData] = await Promise.all([
      loadJSON("data/ai_news.json"),
      loadJSON("data/ai_tools.json"),
      loadJSON("data/dev_tips.json"),
      loadJSON("data/arxiv.json"),
      loadJSON("data/huggingface.json"),
      loadJSON("data/github_trending.json"),
      loadJSON("data/stats.json"),
      loadJSON("data/history.json"),
    ]);

    // 缓存数据供排序使用
    window.__appData = {
      news: newsData,
      tools: toolsData,
      tips: tipsData,
      arxiv: arxivData,
      hf: hfData,
      github: githubData,
      stats: statsData,
      history: historyData,
    };

    // 渲染各部分
    const updatedTime = statsData?.updated || newsData?.updated || "";
    renderUpdatedTime(updatedTime);
    renderStats(statsData);
    renderAINews(newsData);
    renderAITools(toolsData);
    renderDevTips(tipsData);
    renderArxiv(arxivData);
    renderHuggingFace(hfData);
    renderGithubTrending(githubData);

    // 等待 Chart.js 加载完毕后初始化图表
    if (typeof Chart !== "undefined") {
      initCharts(historyData, statsData);
    } else {
      window.addEventListener("chartjs-ready", () => initCharts(historyData, statsData));
    }
  } catch (e) {
    console.error("数据加载失败:", e);
  } finally {
    if (overlay) overlay.classList.remove("visible");
  }

  // 初始化滚动动画
  initScrollAnimations();
}

// DOM 就绪后启动
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
