// src/templates/home.js
import { TOKENS_CSS, NAV_CSS, AD_CSS, HOME_CSS } from './styles.js';
import { adSlot } from './components.js';
import { SITE_NAME } from './layout.js';

export function renderHome(baseUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="google-site-verification" content="7Q0EJk3kQKNLNzIhyzH4k5CsuHsQEa-U0Pwp_w_b0n0"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${SITE_NAME} — Find Your Next Remote Job</title>
<meta name="description" content="JobNova is a modern remote job board with curated positions in development, design, marketing, data, and more. Updated hourly.">
<meta name="robots" content="index, follow">
<meta property="og:title" content="${SITE_NAME} — Find Your Next Remote Job">
<meta property="og:description" content="Curated remote jobs updated hourly.">
<meta property="og:type" content="website">
<meta property="og:url" content="${baseUrl}">
<link rel="canonical" href="${baseUrl}">
<link rel="alternate" type="application/rss+xml" title="${SITE_NAME} Jobs Feed" href="${baseUrl}/feed.rss">
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", "name": SITE_NAME, "url": baseUrl, "potentialAction": { "@type": "SearchAction", "target": `${baseUrl}/?search={search_term_string}`, "query-input": "required name=search_term_string" } })}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
${TOKENS_CSS}${NAV_CSS}${AD_CSS}${HOME_CSS}
</style>
</head>
<body>

<div class="drawer-overlay" id="drawerOverlay" onclick="closeDrawer()"></div>
<div class="sheet-overlay" id="sheetOverlay" onclick="closeSheet()"></div>

<div class="mob-drawer" id="mobDrawer">
  <button class="drawer-close" onclick="closeDrawer()">✕</button>
  <div><span class="nav-logo grad-text" style="font-size:22px">${SITE_NAME}</span></div>
  <div>
    <div class="s-title">Browse Jobs</div>
    <button class="nav-btn" onclick="filterCat('','All Jobs');closeDrawer()"><span class="nav-icon">🔍</span>All Jobs</button>
    <button class="nav-btn" onclick="filterCat('developer','Development');closeDrawer()"><span class="nav-icon">💻</span>Development</button>
    <button class="nav-btn" onclick="filterCat('designer','Design');closeDrawer()"><span class="nav-icon">🎨</span>Design</button>
    <button class="nav-btn" onclick="filterCat('marketing','Marketing');closeDrawer()"><span class="nav-icon">📣</span>Marketing</button>
    <button class="nav-btn" onclick="filterCat('data','Data & AI');closeDrawer()"><span class="nav-icon">📊</span>Data & AI</button>
    <button class="nav-btn" onclick="filterCat('devops','DevOps');closeDrawer()"><span class="nav-icon">⚙️</span>DevOps</button>
    <button class="nav-btn" onclick="filterCat('manager','Management');closeDrawer()"><span class="nav-icon">👔</span>Management</button>
    <button class="nav-btn" onclick="filterCat('writer','Writing');closeDrawer()"><span class="nav-icon">✍️</span>Writing</button>
  </div>
  <div>
    <div class="s-title">Tools</div>
    <button class="nav-btn" onclick="goView('alerts');closeDrawer()"><span class="nav-icon">🔔</span>Job Alerts</button>
    <a href="/blog" class="nav-btn" style="text-decoration:none"><span class="nav-icon">📝</span>Career Blog</a>
    <button class="nav-btn" onclick="toggleTheme()"><span class="nav-icon" id="drawerThemeIcon">🌙</span>Dark / Light</button>
  </div>
  <div style="margin-top:auto">
    <div class="s-title">Legal</div>
    <a href="/privacy" class="footer-link-s">Privacy Policy</a>
    <a href="/terms" class="footer-link-s">Terms of Service</a>
    <a href="/disclaimer" class="footer-link-s">Disclaimer</a>
    <div style="margin-top:12px;font-size:10px;color:var(--t3)">© ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.</div>
  </div>
</div>

<nav class="nav">
  <a href="/" class="nav-logo grad-text">${SITE_NAME}</a>
  <div class="nav-links">
    <a href="/" class="nav-link">Jobs</a>
    <a href="/blog" class="nav-link">Blog</a>
    <a href="/privacy" class="nav-link">Privacy</a>
    <a href="/" class="nav-cta">Browse →</a>
  </div>
</nav>

<div class="mob-hdr">
  <span class="mob-logo grad-text">${SITE_NAME}</span>
  <div class="mob-btns">
    <button class="mob-btn" onclick="toggleTheme()" id="themeBtn">🌙</button>
    <button class="mob-btn" onclick="openDrawer()">☰</button>
  </div>
</div>

<div class="app">
  <aside class="sidebar">
    <div><span class="nav-logo grad-text" style="font-size:22px">${SITE_NAME}</span></div>
    <div>
      <div class="s-title">Browse Jobs</div>
      <nav>
        <button class="nav-btn active" onclick="filterCat('','All Jobs')"><span class="nav-icon">🔍</span>All Jobs<span class="nav-count" id="cnt-all">—</span></button>
        <button class="nav-btn" onclick="filterCat('developer','Development')"><span class="nav-icon">💻</span>Development<span class="nav-count">—</span></button>
        <button class="nav-btn" onclick="filterCat('designer','Design')"><span class="nav-icon">🎨</span>Design<span class="nav-count">—</span></button>
        <button class="nav-btn" onclick="filterCat('marketing','Marketing')"><span class="nav-icon">📣</span>Marketing<span class="nav-count">—</span></button>
        <button class="nav-btn" onclick="filterCat('data','Data & AI')"><span class="nav-icon">📊</span>Data & AI<span class="nav-count">—</span></button>
        <button class="nav-btn" onclick="filterCat('devops','DevOps')"><span class="nav-icon">⚙️</span>DevOps<span class="nav-count">—</span></button>
        <button class="nav-btn" onclick="filterCat('manager','Management')"><span class="nav-icon">👔</span>Management<span class="nav-count">—</span></button>
        <button class="nav-btn" onclick="filterCat('writer','Writing')"><span class="nav-icon">✍️</span>Writing<span class="nav-count">—</span></button>
      </nav>
    </div>
    <div>
      <div class="s-title">Tools</div>
      <button class="nav-btn" onclick="goView('saved')"><span class="nav-icon">🔖</span>Saved Jobs<span class="nav-count js-saved-count">0</span></button>
      <button class="nav-btn" onclick="goView('alerts')"><span class="nav-icon">🔔</span>Job Alerts</button>
      <a href="/blog" class="nav-btn" style="text-decoration:none"><span class="nav-icon">📝</span>Career Blog</a>
      <button class="nav-btn" onclick="toggleTheme()"><span class="nav-icon" id="themeNavIcon">🌙</span>Dark / Light</button>
    </div>
    <div>${adSlot('sidebar', '300x60')}</div>
    <div>
      <div class="s-title">Live Stats</div>
      <div class="stats-card">
        <div class="stat-row"><span class="stat-label">Total Jobs</span><span class="stat-val" id="st-total">—</span></div>
        <div class="stat-row"><span class="stat-label">With Salary</span><span class="stat-val" id="st-salary">—</span></div>
        <div class="stat-row"><span class="stat-label">Remote</span><span class="stat-val" id="st-remote">—</span></div>
        <div class="stat-row"><span class="stat-label">Updated</span><span class="stat-val">Hourly ⚡</span></div>
      </div>
    </div>
    <div style="margin-top:auto">
      <div class="s-title">Legal</div>
      <a href="/privacy" class="footer-link-s">Privacy Policy</a>
      <a href="/terms" class="footer-link-s">Terms of Service</a>
      <a href="/disclaimer" class="footer-link-s">Disclaimer</a>
      <a href="/feed.rss" class="footer-link-s">RSS Feed</a>
      <div style="margin-top:12px;font-size:10px;color:var(--t3)">© ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.</div>
    </div>
  </aside>

  <main class="main">
    <div id="vJobs">
      <div class="hero">
        <div class="hero-eyebrow"><span class="hero-eyebrow-dot"></span>AI-Powered Job Matching — Updated Every Hour</div>
        <h1 class="hero-title">Find Your Next<br><span class="grad-text">Remote Career</span> Opportunity</h1>
        <p class="hero-sub">Curated remote jobs in tech, design, marketing & more.</p>
        <div class="hero-stats">
          <div class="hero-stat"><span class="hero-stat-num" id="stat-jobs">—</span><span class="hero-stat-label">Active Jobs</span></div>
          <div class="hero-stat"><span class="hero-stat-num">50+</span><span class="hero-stat-label">Companies</span></div>
          <div class="hero-stat"><span class="hero-stat-num">Hourly</span><span class="hero-stat-label">Updates</span></div>
        </div>
        <div class="search-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" id="searchInput" placeholder="Search jobs, companies, or skills..." oninput="debounceSearch(this.value)">
        </div>
      </div>

      <div class="filters-bar">
        <button class="chip active" onclick="filterCat('','All Jobs')">All Jobs</button>
        <button class="chip" onclick="filterCat('developer','Development')">💻 Dev</button>
        <button class="chip" onclick="filterCat('designer','Design')">🎨 Design</button>
        <button class="chip" onclick="filterCat('marketing','Marketing')">📣 Marketing</button>
        <button class="chip" onclick="filterCat('data','Data & AI')">📊 Data</button>
        <button class="chip" onclick="filterCat('devops','DevOps')">⚙️ DevOps</button>
        <button class="chip" onclick="filterCat('manager','Management')">👔 Mgmt</button>
        <button class="chip" onclick="filterCat('writer','Writing')">✍️ Writing</button>
      </div>

      <div class="adv-filters" id="advFilters">
        <label class="filter-label">Remote<select class="filter-select" id="fRemote" onchange="applyAdvFilters()"><option value="">All</option><option value="fully_remote">Fully Remote</option><option value="hybrid">Hybrid</option><option value="on_site">On-site</option></select></label>
        <label class="filter-label">Employment<select class="filter-select" id="fEmploy" onchange="applyAdvFilters()"><option value="">All</option><option value="full_time">Full Time</option><option value="part_time">Part Time</option><option value="contract">Contract</option></select></label>
        <label class="filter-label">Seniority<select class="filter-select" id="fSeniority" onchange="applyAdvFilters()"><option value="">All</option><option value="Junior">Junior</option><option value="Mid">Mid-Level</option><option value="Senior">Senior</option><option value="Staff">Staff</option></select></label>
        <label class="filter-label">Min Salary<input type="number" class="salary-input" id="fSalaryMin" placeholder="$k" oninput="debounceAdv()"></label>
        <label class="filter-label">Posted<select class="filter-select" id="fDate" onchange="applyAdvFilters()"><option value="">Any time</option><option value="1">Today</option><option value="7">This week</option><option value="30">This month</option></select></label>
        <button class="clear-btn" onclick="clearAdvFilters()">✕ Clear</button>
      </div>

      <div class="content-wrap">
        <div class="results-hdr">
          <div class="results-count" id="resultsCount">Loading...</div>
          <button class="adv-toggle-btn" id="advToggleBtn" onclick="toggleAdv()">⚙️ Filters</button>
        </div>
        ${adSlot('jobs-list-top', '320x50')}
        <div class="jobs-list" id="jobsList"><div class="loader-wrap"><div class="loader"></div></div></div>
        <div class="pagination" id="pagination"></div>
      </div>
    </div>

    <div id="vSaved" style="display:none">
      <div class="content-wrap" style="max-width:800px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
          <h2 style="font-size:20px;font-weight:800;color:var(--t1)">🔖 Saved Jobs</h2>
          <button onclick="clearAllSaved()" style="padding:8px 15px;border-radius:9px;border:1px solid var(--border2);background:transparent;color:var(--t3);font-size:12px;cursor:pointer;font-family:inherit" onmouseover="this.style.borderColor='var(--red)';this.style.color='var(--red)'" onmouseout="this.style.borderColor='var(--border2)';this.style.color='var(--t3)'">Clear All</button>
        </div>
        <div class="jobs-list" id="savedList"></div>
      </div>
    </div>

    <div id="vAlerts" style="display:none">
      <div class="content-wrap">
        <button onclick="goView('jobs')" style="display:inline-flex;align-items:center;gap:7px;color:var(--t3);font-size:13px;cursor:pointer;border:none;background:none;font-family:inherit;margin-bottom:22px" onmouseover="this.style.color='var(--accent2)'" onmouseout="this.style.color='var(--t3)'">← Back to Jobs</button>
        <div class="form-card">
          <div style="font-size:20px;font-weight:800;margin-bottom:6px;color:var(--t1)">🔔 Job Alerts</div>
          <div style="font-size:13px;color:var(--t2);margin-bottom:22px">Get notified by email when new matching jobs are posted.</div>
          <div class="form-group">
            <label class="form-label">Your Email</label>
            <input type="email" class="form-input" id="alertEmail" placeholder="you@example.com">
          </div>
          <div class="form-group">
            <label class="form-label">Keywords <span style="color:var(--t3);font-weight:400;text-transform:none;letter-spacing:0;font-size:11px">(press Enter)</span></label>
            <input type="text" class="form-input" id="alertKwInput" placeholder="e.g. React, Python..." onkeydown="addKeyword(event)">
            <div style="margin-top:8px" id="kwWrap"></div>
          </div>
          <button class="submit-btn" onclick="submitAlert()">Subscribe to Alerts →</button>
        </div>
      </div>
    </div>
  </main>
</div>

<!-- Bottom tab bar: real mobile navigation, not a shrunk sidebar -->
<div class="bottom-tabbar">
  <button class="tab-btn active" data-view="vJobs" onclick="goView('jobs')"><span class="tab-icon">🏠</span>Jobs</button>
  <button class="tab-btn" onclick="openSheet()"><span class="tab-icon">⚙️</span>Filters</button>
  <button class="tab-btn" data-view="vSaved" onclick="goView('saved')"><span class="tab-icon">🔖</span>Saved</button>
  <button class="tab-btn" data-view="vAlerts" onclick="goView('alerts')"><span class="tab-icon">🔔</span>Alerts</button>
  <a class="tab-btn" href="/blog"><span class="tab-icon">📝</span>Blog</a>
</div>

<!-- Mobile filter bottom sheet -->
<div class="filter-sheet" id="filterSheet">
  <div class="sheet-handle"></div>
  <div style="font-size:15px;font-weight:800;margin-bottom:14px;color:var(--t1)">Filters</div>
  <div style="display:flex;flex-direction:column;gap:12px">
    <label class="filter-label">Remote<select class="filter-select" style="width:100%" onchange="document.getElementById('fRemote').value=this.value;applyAdvFilters()"><option value="">All</option><option value="fully_remote">Fully Remote</option><option value="hybrid">Hybrid</option><option value="on_site">On-site</option></select></label>
    <label class="filter-label">Employment<select class="filter-select" style="width:100%" onchange="document.getElementById('fEmploy').value=this.value;applyAdvFilters()"><option value="">All</option><option value="full_time">Full Time</option><option value="part_time">Part Time</option><option value="contract">Contract</option></select></label>
    <label class="filter-label">Seniority<select class="filter-select" style="width:100%" onchange="document.getElementById('fSeniority').value=this.value;applyAdvFilters()"><option value="">All</option><option value="Junior">Junior</option><option value="Mid">Mid-Level</option><option value="Senior">Senior</option><option value="Staff">Staff</option></select></label>
    <label class="filter-label">Posted<select class="filter-select" style="width:100%" onchange="document.getElementById('fDate').value=this.value;applyAdvFilters()"><option value="">Any time</option><option value="1">Today</option><option value="7">This week</option><option value="30">This month</option></select></label>
    <button class="clear-btn" onclick="clearAdvFilters();closeSheet()">✕ Clear all</button>
    <button class="submit-btn" onclick="closeSheet()">Apply Filters</button>
  </div>
</div>

<div class="toast" id="toast">
  <span id="toastIcon" style="font-size:16px">✓</span>
  <span id="toastMsg">Done</span>
  <div class="toast-bar" id="toastBar"></div>
</div>

<script src="/assets/app.js"></script>
</body>
</html>`;
}
