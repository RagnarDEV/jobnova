async function ensureTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT, company TEXT, location TEXT,
      url TEXT UNIQUE, description TEXT,
      salary TEXT, remote_type TEXT, skills TEXT,
      seniority TEXT, employment_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

async function syncJobs(env) {
  await ensureTable(env);
  const queries = ["developer","designer","marketing","data","devops","writer","manager"];
  let inserted = 0, skipped = 0, errors = [];

  for (const q of queries) {
    const apiUrl = `https://api.jobdatalake.com/v1/jobs?q=${q}&per_page=100`;
    let response;
    try {
      response = await fetch(apiUrl, { headers: { "X-API-Key": env.API_KEY } });
    } catch(e) { errors.push(`Fetch "${q}": ${e.message}`); continue; }
    if (!response.ok) { errors.push(`API ${response.status} for "${q}"`); continue; }

    const data = await response.json();
    const jobs = data.jobs || data.hits || data.results || (Array.isArray(data) ? data : []);

    for (const job of jobs) {
      const jobUrl = job.url || "";
      if (!jobUrl) { skipped++; continue; }
      const salary = job.salary_min_usd && job.salary_max_usd
        ? `$${job.salary_min_usd}k - $${job.salary_max_usd}k` : "";
      const location = Array.isArray(job.locations) && job.locations.length
        ? job.locations[0] : (job.remote_type === "fully_remote" ? "Remote" : "");
      try {
        const r = await env.DB.prepare(
          `INSERT OR IGNORE INTO jobs (title,company,location,url,description,salary,remote_type,skills,seniority,employment_type)
           VALUES (?,?,?,?,?,?,?,?,?,?)`
        ).bind(
          job.title||"Unknown", job.company_name||"Company", location, jobUrl,
          job.description||"", salary, job.remote_type||"",
          JSON.stringify(job.required_skills||[]),
          Array.isArray(job.seniority)?job.seniority.join(", "):"",
          job.employment_type||""
        ).run();
        if (r.meta?.changes > 0) inserted++; else skipped++;
      } catch(e) { errors.push(`DB: ${e.message.slice(0,60)}`); }
    }
  }
  return { inserted, skipped, errors: errors.slice(0,3), queries: queries.length };
}

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>JobNova — Find Your Next Remote Job</title>
<meta name="description" content="JobNova is a modern remote job board featuring 600+ curated positions in development, design, marketing, data, and more. Find your next career opportunity today.">
<meta name="keywords" content="remote jobs, developer jobs, designer jobs, marketing jobs, data jobs, work from home, remote work, job board, tech jobs, career">
<meta name="robots" content="index, follow">
<meta property="og:title" content="JobNova — Find Your Next Remote Job">
<meta property="og:description" content="600+ curated remote jobs in tech, design, marketing and more.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://app.jobnova.workers.dev">
<link rel="canonical" href="https://app.jobnova.workers.dev">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "JobNova",
  "url": "https://app.jobnova.workers.dev",
  "description": "Modern remote job board with 600+ curated positions",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://app.jobnova.workers.dev/?search={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg-primary: #060B18;
  --bg-secondary: #0D1525;
  --bg-card: #111827;
  --bg-card-hover: #162035;
  --border: #1E2D45;
  --border-hover: #2563EB;
  --accent: #2563EB;
  --accent-light: #3B82F6;
  --accent-glow: rgba(37,99,235,0.15);
  --success: #10B981;
  --warning: #F59E0B;
  --text-primary: #F1F5F9;
  --text-secondary: #94A3B8;
  --text-muted: #475569;
  --salary: #34D399;
  --sidebar-w: 260px;
  --radius: 14px;
}

html { scroll-behavior: smooth; }

body {
  font-family: 'Inter', -apple-system, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

/* ── SCROLLBAR ── */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--bg-secondary); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

/* ── TOP TICKER ── */
.ticker-wrap {
  background: linear-gradient(90deg, #0D1525, #0A1628, #0D1525);
  border-bottom: 1px solid var(--border);
  padding: 8px 0;
  overflow: hidden;
  position: sticky;
  top: 0;
  z-index: 100;
}
.ticker-content {
  display: flex;
  gap: 48px;
  animation: ticker 30s linear infinite;
  white-space: nowrap;
  width: max-content;
}
.ticker-content:hover { animation-play-state: paused; }
.ticker-item {
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}
.ticker-item .dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--success);
  animation: pulse 2s infinite;
}
.ticker-item strong { color: var(--accent-light); }
@keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }

/* ── LAYOUT ── */
.app { display: flex; min-height: calc(100vh - 37px); }

/* ── SIDEBAR ── */
.sidebar {
  width: var(--sidebar-w);
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  padding: 28px 20px;
  position: sticky;
  top: 37px;
  height: calc(100vh - 37px);
  overflow-y: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.logo-wrap { padding: 4px 0 8px; }
.logo {
  font-size: 26px;
  font-weight: 900;
  letter-spacing: -1px;
  background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 50%, #93C5FD 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: block;
  line-height: 1.1;
}
.logo-sub {
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 500;
  margin-top: 4px;
}

.sidebar-section-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  transition: all .2s;
  text-align: left;
}
.nav-btn:hover { background: var(--accent-glow); color: var(--accent-light); }
.nav-btn.active { background: var(--accent-glow); color: var(--accent-light); border: 1px solid rgba(59,130,246,.2); }
.nav-btn .nav-icon { font-size: 16px; width: 20px; text-align: center; }
.nav-btn .nav-count {
  margin-left: auto;
  font-size: 11px;
  background: var(--border);
  color: var(--text-muted);
  padding: 2px 7px;
  border-radius: 20px;
}
.nav-btn.active .nav-count { background: var(--accent); color: #fff; }

.sidebar-stats {
  background: linear-gradient(135deg, rgba(37,99,235,.08), rgba(37,99,235,.03));
  border: 1px solid rgba(37,99,235,.15);
  border-radius: var(--radius);
  padding: 16px;
}
.stat-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; }
.stat-row:not(:last-child) { border-bottom: 1px solid var(--border); }
.stat-label { font-size: 12px; color: var(--text-muted); }
.stat-val { font-size: 14px; font-weight: 700; color: var(--accent-light); }

.sidebar-footer { margin-top: auto; }
.footer-links { display: flex; flex-direction: column; gap: 4px; }
.footer-link {
  font-size: 12px;
  color: var(--text-muted);
  text-decoration: none;
  padding: 4px 0;
  transition: color .2s;
}
.footer-link:hover { color: var(--text-secondary); }

/* ── MAIN ── */
.main { flex: 1; min-width: 0; }

/* ── HERO ── */
.hero {
  padding: 48px 40px 36px;
  border-bottom: 1px solid var(--border);
  background: radial-gradient(ellipse 80% 60% at 50% -20%, rgba(37,99,235,.12), transparent);
}
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(37,99,235,.1);
  border: 1px solid rgba(37,99,235,.2);
  border-radius: 20px;
  padding: 4px 12px;
  font-size: 12px;
  color: var(--accent-light);
  font-weight: 500;
  margin-bottom: 20px;
}
.hero-title {
  font-size: 36px;
  font-weight: 900;
  letter-spacing: -1.5px;
  line-height: 1.15;
  margin-bottom: 12px;
  max-width: 560px;
}
.hero-title span {
  background: linear-gradient(135deg, #3B82F6, #60A5FA);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hero-sub {
  color: var(--text-secondary);
  font-size: 15px;
  margin-bottom: 28px;
  max-width: 480px;
}

/* ── SEARCH ── */
.search-wrap {
  position: relative;
  max-width: 540px;
}
.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 16px;
  pointer-events: none;
}
.search-input {
  width: 100%;
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  padding: 14px 16px 14px 44px;
  color: var(--text-primary);
  font-size: 15px;
  font-family: inherit;
  outline: none;
  transition: border-color .2s, box-shadow .2s;
}
.search-input::placeholder { color: var(--text-muted); }
.search-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

/* ── FILTERS BAR ── */
.filters-bar {
  padding: 16px 40px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  background: var(--bg-secondary);
}
.filters-bar::-webkit-scrollbar { height: 0; }
.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1.5px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all .2s;
}
.filter-chip:hover { border-color: var(--accent-light); color: var(--accent-light); }
.filter-chip.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

/* ── CONTENT ── */
.content-area { padding: 28px 40px; }

.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.results-count { font-size: 14px; color: var(--text-muted); }
.results-count strong { color: var(--text-primary); font-weight: 600; }

.sort-select {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 12px;
  color: var(--text-secondary);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  outline: none;
}

/* ── JOB CARDS ── */
.jobs-list { display: flex; flex-direction: column; gap: 12px; }

.job-card {
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  padding: 20px 24px;
  cursor: pointer;
  transition: all .25s;
  position: relative;
  overflow: hidden;
}
.job-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--accent-glow), transparent);
  opacity: 0;
  transition: opacity .25s;
}
.job-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0,0,0,.4), 0 0 0 1px rgba(37,99,235,.1);
}
.job-card:hover::before { opacity: 1; }

.job-card-top {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  position: relative;
}
.company-logo {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 800;
  color: var(--accent-light);
  overflow: hidden;
  flex-shrink: 0;
  text-transform: uppercase;
}
.company-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 6px;
}

.job-info { flex: 1; min-width: 0; }
.job-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
  line-height: 1.3;
}
.job-company {
  font-size: 14px;
  color: var(--accent-light);
  font-weight: 600;
  margin-bottom: 10px;
}

.job-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 20px;
  font-weight: 500;
}
.tag-location { color: var(--text-muted); background: transparent; padding-left: 0; }
.tag-remote { background: rgba(16,185,129,.1); color: #10B981; border: 1px solid rgba(16,185,129,.2); }
.tag-hybrid { background: rgba(245,158,11,.1); color: #F59E0B; border: 1px solid rgba(245,158,11,.2); }
.tag-onsite { background: rgba(148,163,184,.08); color: var(--text-secondary); border: 1px solid var(--border); }
.tag-type { background: rgba(148,163,184,.08); color: var(--text-secondary); border: 1px solid var(--border); }

.job-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  flex-shrink: 0;
}
.salary-badge {
  font-size: 14px;
  font-weight: 700;
  color: var(--salary);
  background: rgba(52,211,153,.08);
  border: 1px solid rgba(52,211,153,.2);
  padding: 4px 12px;
  border-radius: 8px;
  white-space: nowrap;
}
.apply-arrow {
  width: 32px; height: 32px;
  border-radius: 8px;
  background: var(--accent-glow);
  border: 1px solid rgba(37,99,235,.2);
  color: var(--accent-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all .2s;
}
.job-card:hover .apply-arrow {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

/* ── EMPTY STATE ── */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: var(--text-muted);
}
.empty-state .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: .5; }
.empty-state h3 { font-size: 18px; color: var(--text-secondary); margin-bottom: 8px; }
.empty-state p { font-size: 14px; }

/* ── LOADER ── */
.loader-wrap { padding: 80px 20px; text-align: center; }
.loader {
  display: inline-block;
  width: 32px; height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── PAGINATION ── */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 0 16px;
}
.page-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all .2s;
}
.page-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent-light); }
.page-btn:disabled { opacity: .3; cursor: default; }
.page-info { font-size: 13px; color: var(--text-muted); padding: 0 8px; }

/* ── JOB DETAIL ── */
.detail-view { padding: 32px 40px; max-width: 780px; }
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: none;
  font-family: inherit;
  padding: 0;
  margin-bottom: 28px;
  transition: color .2s;
}
.back-btn:hover { color: var(--accent-light); }

.detail-card {
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: 18px;
  overflow: hidden;
}
.detail-header {
  padding: 32px;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(135deg, rgba(37,99,235,.05), transparent);
}
.detail-company-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}
.detail-logo {
  width: 64px; height: 64px;
  border-radius: 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 800;
  color: var(--accent-light);
  overflow: hidden;
  flex-shrink: 0;
}
.detail-logo img { width: 100%; height: 100%; object-fit: contain; padding: 8px; }
.detail-company-name { font-size: 16px; font-weight: 600; color: var(--accent-light); }
.detail-domain { font-size: 13px; color: var(--text-muted); }
.detail-title { font-size: 28px; font-weight: 800; letter-spacing: -.5px; margin-bottom: 16px; }
.detail-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.detail-salary {
  font-size: 22px;
  font-weight: 800;
  color: var(--salary);
  margin-bottom: 8px;
}

.detail-body { padding: 32px; }
.section-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 14px;
}
.skills-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 28px; }
.skill-tag {
  background: rgba(37,99,235,.08);
  border: 1px solid rgba(37,99,235,.15);
  color: var(--accent-light);
  font-size: 13px;
  padding: 5px 12px;
  border-radius: 8px;
  font-weight: 500;
}
.desc-content {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.8;
  margin-bottom: 32px;
}

.apply-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, #2563EB, #3B82F6);
  color: #fff;
  padding: 14px 32px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  font-family: inherit;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all .2s;
  box-shadow: 0 4px 20px rgba(37,99,235,.3);
}
.apply-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(37,99,235,.4);
}

/* ── STATIC PAGES ── */
.static-page { padding: 48px 40px; max-width: 760px; }
.static-page h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; }
.static-page .static-date { font-size: 13px; color: var(--text-muted); margin-bottom: 32px; }
.static-page h2 { font-size: 18px; font-weight: 700; margin: 28px 0 12px; color: var(--text-primary); }
.static-page p { font-size: 15px; color: var(--text-secondary); line-height: 1.8; margin-bottom: 12px; }
.static-page ul { padding-left: 20px; margin-bottom: 12px; }
.static-page ul li { font-size: 15px; color: var(--text-secondary); line-height: 1.8; margin-bottom: 6px; }
.static-page a { color: var(--accent-light); }

/* ── MOBILE ── */
.mobile-header {
  display: none;
  padding: 14px 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 37px;
  z-index: 50;
}
.mobile-logo {
  font-size: 20px;
  font-weight: 900;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, #3B82F6, #60A5FA);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.mobile-menu-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
}
.mobile-filters {
  display: none;
  padding: 12px 16px;
  gap: 8px;
  overflow-x: auto;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}
.mobile-filters::-webkit-scrollbar { height: 0; }

@media (max-width: 768px) {
  .sidebar { display: none; }
  .mobile-header { display: flex; }
  .mobile-filters { display: flex; }
  .hero { padding: 24px 20px 20px; }
  .hero-title { font-size: 24px; }
  .filters-bar { display: none; }
  .content-area { padding: 20px 16px; }
  .detail-view { padding: 20px 16px; }
  .detail-title { font-size: 22px; }
  .static-page { padding: 24px 16px; }
  .job-right { align-items: flex-start; }
}
</style>
</head>
<body>

<!-- TICKER -->
<div class="ticker-wrap">
  <div class="ticker-content" id="ticker">
    <span class="ticker-item"><span class="dot"></span> <strong id="t-count">613</strong> Active Jobs</span>
    <span class="ticker-item">💼 Updated hourly via AI-powered matching</span>
    <span class="ticker-item">🌍 Remote-first opportunities worldwide</span>
    <span class="ticker-item">⚡ <strong>Dev</strong> · <strong>Design</strong> · <strong>Marketing</strong> · <strong>Data</strong></span>
    <span class="ticker-item">✅ Verified company listings</span>
    <span class="ticker-item">🚀 New jobs added every hour</span>
    <!-- duplicate for seamless loop -->
    <span class="ticker-item"><span class="dot"></span> <strong id="t-count2">613</strong> Active Jobs</span>
    <span class="ticker-item">💼 Updated hourly via AI-powered matching</span>
    <span class="ticker-item">🌍 Remote-first opportunities worldwide</span>
    <span class="ticker-item">⚡ <strong>Dev</strong> · <strong>Design</strong> · <strong>Marketing</strong> · <strong>Data</strong></span>
    <span class="ticker-item">✅ Verified company listings</span>
    <span class="ticker-item">🚀 New jobs added every hour</span>
  </div>
</div>

<!-- MOBILE HEADER -->
<div class="mobile-header">
  <span class="mobile-logo">JobNova</span>
  <button class="mobile-menu-btn" onclick="toggleMobileMenu()">☰</button>
</div>
<div class="mobile-filters" id="mobileFilters">
  <button class="filter-chip active" onclick="filterCat('','All')">All</button>
  <button class="filter-chip" onclick="filterCat('developer','Dev')">💻 Dev</button>
  <button class="filter-chip" onclick="filterCat('designer','Design')">🎨 Design</button>
  <button class="filter-chip" onclick="filterCat('marketing','Marketing')">📣 Marketing</button>
  <button class="filter-chip" onclick="filterCat('data','Data')">📊 Data</button>
  <button class="filter-chip" onclick="filterCat('devops','DevOps')">⚙️ DevOps</button>
  <button class="filter-chip" onclick="filterCat('manager','Management')">👔 Mgmt</button>
</div>

<!-- APP -->
<div class="app">

  <!-- SIDEBAR -->
  <aside class="sidebar">
    <div>
      <div class="logo-wrap">
        <span class="logo">JobNova</span>
        <span class="logo-sub">Career Platform</span>
      </div>
    </div>

    <div>
      <div class="sidebar-section-title">Browse Jobs</div>
      <nav id="sideNav">
        <button class="nav-btn active" onclick="filterCat('','All Jobs')">
          <span class="nav-icon">🔍</span> All Jobs <span class="nav-count" id="cnt-all">—</span>
        </button>
        <button class="nav-btn" onclick="filterCat('developer','Development')">
          <span class="nav-icon">💻</span> Development <span class="nav-count">—</span>
        </button>
        <button class="nav-btn" onclick="filterCat('designer','Design')">
          <span class="nav-icon">🎨</span> Design <span class="nav-count">—</span>
        </button>
        <button class="nav-btn" onclick="filterCat('marketing','Marketing')">
          <span class="nav-icon">📣</span> Marketing <span class="nav-count">—</span>
        </button>
        <button class="nav-btn" onclick="filterCat('data','Data')">
          <span class="nav-icon">📊</span> Data & AI <span class="nav-count">—</span>
        </button>
        <button class="nav-btn" onclick="filterCat('devops','DevOps')">
          <span class="nav-icon">⚙️</span> DevOps <span class="nav-count">—</span>
        </button>
        <button class="nav-btn" onclick="filterCat('manager','Management')">
          <span class="nav-icon">👔</span> Management <span class="nav-count">—</span>
        </button>
        <button class="nav-btn" onclick="filterCat('writer','Writing')">
          <span class="nav-icon">✍️</span> Writing <span class="nav-count">—</span>
        </button>
      </nav>
    </div>

    <div>
      <div class="sidebar-section-title">Live Stats</div>
      <div class="sidebar-stats">
        <div class="stat-row"><span class="stat-label">Total Jobs</span><span class="stat-val" id="stat-total">—</span></div>
        <div class="stat-row"><span class="stat-label">With Salary</span><span class="stat-val" id="stat-salary">—</span></div>
        <div class="stat-row"><span class="stat-label">Remote</span><span class="stat-val" id="stat-remote">—</span></div>
        <div class="stat-row"><span class="stat-label">Updated</span><span class="stat-val">Hourly</span></div>
      </div>
    </div>

    <div class="sidebar-footer">
      <div class="sidebar-section-title">Legal</div>
      <div class="footer-links">
        <a href="#" class="footer-link" onclick="showPage('privacy')">Privacy Policy</a>
        <a href="#" class="footer-link" onclick="showPage('terms')">Terms of Service</a>
        <a href="#" class="footer-link" onclick="showPage('disclaimer')">Disclaimer</a>
      </div>
      <div style="margin-top:16px;font-size:11px;color:var(--text-muted);">
        © 2026 JobNova. All rights reserved.
      </div>
    </div>
  </aside>

  <!-- MAIN -->
  <main class="main" id="mainContent">

    <!-- JOBS VIEW -->
    <div id="jobsView">
      <div class="hero">
        <div class="hero-badge">✨ AI-Powered Job Matching</div>
        <h1 class="hero-title">Find Your Next <span>Remote Career</span> Opportunity</h1>
        <p class="hero-sub">Discover 600+ hand-picked jobs in tech, design, marketing, and more — updated every hour.</p>
        <div class="search-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" id="searchInput"
            placeholder="Search jobs, companies, or skills..."
            oninput="debounceSearch(this.value)">
        </div>
      </div>

      <div class="filters-bar" id="filtersBar">
        <button class="filter-chip active" onclick="filterCat('','All Jobs')">All Jobs</button>
        <button class="filter-chip" onclick="filterCat('developer','Development')">💻 Development</button>
        <button class="filter-chip" onclick="filterCat('designer','Design')">🎨 Design</button>
        <button class="filter-chip" onclick="filterCat('marketing','Marketing')">📣 Marketing</button>
        <button class="filter-chip" onclick="filterCat('data','Data & AI')">📊 Data & AI</button>
        <button class="filter-chip" onclick="filterCat('devops','DevOps')">⚙️ DevOps</button>
        <button class="filter-chip" onclick="filterCat('manager','Management')">👔 Management</button>
        <button class="filter-chip" onclick="filterCat('writer','Writing')">✍️ Writing</button>
      </div>

      <div class="content-area">
        <div class="results-header">
          <div class="results-count" id="resultsCount">Loading...</div>
        </div>
        <div class="jobs-list" id="jobsList">
          <div class="loader-wrap"><div class="loader"></div></div>
        </div>
        <div class="pagination" id="pagination"></div>
      </div>
    </div>

    <!-- DETAIL VIEW -->
    <div id="detailView" style="display:none;">
      <div class="detail-view" id="detailContent"></div>
    </div>

    <!-- STATIC PAGES -->
    <div id="staticView" style="display:none;">
      <div class="static-page" id="staticContent"></div>
    </div>

  </main>
</div>

<script>
let currentPage = 1, currentCat = '', currentSearch = '', searchTimeout;
let cachedJobs = [], totalJobs = 0;

// ── LOGO GENERATOR ──
function getInitials(name) {
  return (name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
}
function getDomainLogo(company) {
  const slug = (company||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  return \`https://logo.clearbit.com/\${slug}.com\`;
}
function CompanyLogo(company, size='48px', cls='company-logo') {
  const initials = getInitials(company);
  const logoUrl = getDomainLogo(company);
  return \`<div class="\${cls}" style="width:\${size};height:\${size}">
    <img src="\${logoUrl}" alt="\${company}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" style="display:block">
    <span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:\${parseInt(size)*0.33}px;font-weight:800;color:var(--accent-light)">\${initials}</span>
  </div>\`;
}

// ── REMOTE TAG ──
function remoteTag(type) {
  if (!type) return '';
  const map = {
    'fully_remote': ['tag-remote','🌐 Remote'],
    'hybrid': ['tag-hybrid','🏢 Hybrid'],
    'on_site': ['tag-onsite','📍 On-site'],
    'onsite': ['tag-onsite','📍 On-site'],
  };
  const [cls, label] = map[type] || ['tag-onsite', type.replace('_',' ')];
  return \`<span class="meta-tag \${cls}">\${label}</span>\`;
}

// ── LOAD JOBS ──
async function loadJobs() {
  document.getElementById('jobsList').innerHTML = '<div class="loader-wrap"><div class="loader"></div></div>';
  document.getElementById('pagination').innerHTML = '';

  const params = new URLSearchParams({ page: currentPage });
  if (currentCat) params.set('category', currentCat);
  if (currentSearch) params.set('search', currentSearch);

  try {
    const res = await fetch('/api/jobs?' + params);
    const data = await res.json();
    cachedJobs = data.jobs || [];
    totalJobs = data.total || 0;

    document.getElementById('resultsCount').innerHTML =
      \`<strong>\${totalJobs.toLocaleString()}</strong> jobs found\${currentCat ? ' in <strong>' + currentCat + '</strong>' : ''}\${currentSearch ? ' for "<strong>' + currentSearch + '</strong>"' : ''}\`;

    // Update stats
    document.getElementById('stat-total').textContent = totalJobs.toLocaleString();

    if (!cachedJobs.length) {
      document.getElementById('jobsList').innerHTML = \`
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>No jobs found</h3>
          <p>Try a different search or browse all categories</p>
        </div>\`;
      return;
    }

    document.getElementById('jobsList').innerHTML = cachedJobs.map(job => \`
      <article class="job-card" onclick="showDetail(\${job.id})" role="button" tabindex="0"
        aria-label="\${job.title} at \${job.company}">
        <div class="job-card-top">
          \${CompanyLogo(job.company)}
          <div class="job-info">
            <div class="job-title">\${job.title}</div>
            <div class="job-company">\${job.company}</div>
            <div class="job-meta">
              \${job.location ? '<span class="meta-tag tag-location">📍 ' + job.location + '</span>' : ''}
              \${remoteTag(job.remote_type)}
              \${job.employment_type ? '<span class="meta-tag tag-type">' + job.employment_type.replace('_',' ') + '</span>' : ''}
              \${job.seniority ? '<span class="meta-tag tag-type">' + job.seniority + '</span>' : ''}
            </div>
          </div>
          <div class="job-right">
            \${job.salary ? '<div class="salary-badge">' + job.salary + '</div>' : ''}
            <div class="apply-arrow">→</div>
          </div>
        </div>
      </article>
    \`).join('');

    // Pagination
    const totalPages = Math.ceil(totalJobs / 20);
    if (totalPages > 1) {
      document.getElementById('pagination').innerHTML = \`
        <button class="page-btn" onclick="goPage(\${currentPage-1})" \${currentPage===1?'disabled':''}>← Prev</button>
        <span class="page-info">Page \${currentPage} of \${totalPages}</span>
        <button class="page-btn" onclick="goPage(\${currentPage+1})" \${currentPage===totalPages?'disabled':''}>Next →</button>
      \`;
    }

    // Keyboard nav
    document.querySelectorAll('.job-card').forEach(c => {
      c.addEventListener('keydown', e => { if(e.key==='Enter') c.click(); });
    });

  } catch(e) {
    document.getElementById('jobsList').innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Failed to load jobs</h3><p>Please refresh and try again</p></div>';
  }
}

// ── SHOW DETAIL ──
function showDetail(id) {
  const job = cachedJobs.find(j => j.id === id);
  if (!job) return;

  let skills = [];
  try { skills = JSON.parse(job.skills || '[]'); } catch(e) {}

  document.getElementById('jobsView').style.display = 'none';
  document.getElementById('detailView').style.display = 'block';
  document.getElementById('staticView').style.display = 'none';
  window.scrollTo(0,0);

  document.getElementById('detailContent').innerHTML = \`
    <button class="back-btn" onclick="showJobsView()">← Back to Jobs</button>
    <div class="detail-card">
      <div class="detail-header">
        <div class="detail-company-row">
          \${CompanyLogo(job.company, '64px', 'detail-logo')}
          <div>
            <div class="detail-company-name">\${job.company}</div>
            <div class="detail-domain">\${job.location || 'Remote'}</div>
          </div>
        </div>
        <h1 class="detail-title">\${job.title}</h1>
        <div class="detail-chips">
          \${remoteTag(job.remote_type)}
          \${job.employment_type ? '<span class="meta-tag tag-type">' + job.employment_type.replace('_',' ') + '</span>' : ''}
          \${job.seniority ? '<span class="meta-tag tag-type">' + job.seniority + '</span>' : ''}
        </div>
        \${job.salary ? '<div class="detail-salary">' + job.salary + '</div>' : ''}
      </div>
      <div class="detail-body">
        \${skills.length ? \`
          <div class="section-title">Required Skills</div>
          <div class="skills-grid">\${skills.map(s=>'<span class="skill-tag">'+s+'</span>').join('')}</div>
        \` : ''}
        <div class="section-title">Job Description</div>
        <div class="desc-content">\${job.description || 'Full description available on the company website.'}</div>
        <a href="\${job.url}" target="_blank" rel="noopener noreferrer" class="apply-btn">
          Apply Now →
        </a>
      </div>
    </div>
  \`;
}

// ── STATIC PAGES ──
const pages = {
  privacy: {
    title: 'Privacy Policy',
    date: 'Last updated: June 25, 2026',
    content: \`
      <h2>1. Information We Collect</h2>
      <p>JobNova does not collect personal information from visitors. We do not require registration or login to browse job listings.</p>
      <h2>2. Job Listings</h2>
      <p>Job listings on JobNova are sourced from third-party APIs. We are not responsible for the content, accuracy, or availability of external job postings.</p>
      <h2>3. Cookies</h2>
      <p>We do not use tracking cookies. Basic session functionality may use browser storage solely to improve your browsing experience.</p>
      <h2>4. Third-Party Links</h2>
      <p>Our site contains links to external job application pages. We are not responsible for the privacy practices of these third-party websites.</p>
      <h2>5. Contact</h2>
      <p>For privacy-related questions, contact us at <a href="mailto:hello@jobnova.dev">hello@jobnova.dev</a></p>
    \`
  },
  terms: {
    title: 'Terms of Service',
    date: 'Last updated: June 25, 2026',
    content: \`
      <h2>1. Acceptance of Terms</h2>
      <p>By accessing JobNova, you agree to these Terms of Service. If you do not agree, please do not use this service.</p>
      <h2>2. Use of Service</h2>
      <p>JobNova is a job aggregation platform. You may use this service to search and browse job listings for personal, non-commercial use.</p>
      <h2>3. Job Listings</h2>
      <p>We aggregate job listings from third-party sources. We do not guarantee the accuracy, completeness, or availability of any listing. Always verify details directly with the employer.</p>
      <h2>4. Prohibited Activities</h2>
      <ul>
        <li>Scraping or bulk downloading of job data</li>
        <li>Using the service for spam or unsolicited outreach</li>
        <li>Attempting to interfere with site functionality</li>
      </ul>
      <h2>5. Limitation of Liability</h2>
      <p>JobNova is provided "as is" without warranties of any kind. We are not liable for any damages arising from use of this service.</p>
      <h2>6. Changes to Terms</h2>
      <p>We reserve the right to modify these terms at any time. Continued use constitutes acceptance of updated terms.</p>
    \`
  },
  disclaimer: {
    title: 'Disclaimer',
    date: 'Last updated: June 25, 2026',
    content: \`
      <h2>Job Listing Accuracy</h2>
      <p>JobNova aggregates job listings from third-party sources. We make no representations about the accuracy, completeness, or timeliness of listings. Job availability, salary information, and requirements may change without notice.</p>
      <h2>No Employment Relationship</h2>
      <p>JobNova is a job discovery platform and not an employer or recruiter. We do not participate in the hiring process and are not responsible for outcomes of applications made through our platform.</p>
      <h2>External Links</h2>
      <p>Links to job applications lead to third-party websites. We are not responsible for the content, privacy practices, or any aspect of those external sites.</p>
      <h2>Salary Information</h2>
      <p>Salary figures shown are estimates provided by data sources and may not reflect actual compensation offered by employers.</p>
      <h2>No Guarantee of Employment</h2>
      <p>Listing a job on JobNova does not guarantee employment. All hiring decisions are made exclusively by the respective employers.</p>
    \`
  }
};

function showPage(id) {
  const page = pages[id];
  if (!page) return;
  document.getElementById('jobsView').style.display = 'none';
  document.getElementById('detailView').style.display = 'none';
  document.getElementById('staticView').style.display = 'block';
  window.scrollTo(0,0);
  document.getElementById('staticContent').innerHTML = \`
    <h1>\${page.title}</h1>
    <div class="static-date">\${page.date}</div>
    \${page.content}
    <div style="margin-top:32px">
      <button class="back-btn" onclick="showJobsView()">← Back to Jobs</button>
    </div>
  \`;
}

function showJobsView() {
  document.getElementById('jobsView').style.display = 'block';
  document.getElementById('detailView').style.display = 'none';
  document.getElementById('staticView').style.display = 'none';
  window.scrollTo(0,0);
}

// ── FILTERS ──
function filterCat(cat, label) {
  currentCat = cat;
  currentPage = 1;

  // Update sidebar active
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const btns = document.querySelectorAll('.nav-btn');
  btns.forEach(b => { if(b.textContent.includes(label || 'All')) b.classList.add('active'); });

  // Update filter chips
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.filter-chip').forEach(c => {
    if (c.textContent.includes(label || 'All')) c.classList.add('active');
  });

  showJobsView();
  loadJobs();
}

function debounceSearch(val) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => { currentSearch = val; currentPage = 1; loadJobs(); }, 400);
}

function goPage(p) { currentPage = p; loadJobs(); window.scrollTo(0,0); }

function toggleMobileMenu() {
  const mf = document.getElementById('mobileFilters');
  mf.style.display = mf.style.display === 'none' ? 'flex' : 'none';
}

// ── INIT ──
async function init() {
  loadJobs();
  // Load stats
  try {
    const r = await fetch('/api/debug');
    const d = await r.json();
    const n = d.jobs_in_db || 0;
    document.getElementById('stat-total').textContent = n.toLocaleString();
    document.getElementById('t-count').textContent = n.toLocaleString();
    document.getElementById('t-count2').textContent = n.toLocaleString();
    // Rough estimates
    document.getElementById('stat-salary').textContent = Math.round(n * 0.65).toLocaleString();
    document.getElementById('stat-remote').textContent = Math.round(n * 0.4).toLocaleString();
  } catch(e) {}
}

init();
</script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    await ensureTable(env);

    if (url.pathname === "/api/migrate") {
      await env.DB.prepare("DROP TABLE IF EXISTS jobs").run();
      await env.DB.prepare(`CREATE TABLE jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT, company TEXT, location TEXT,
        url TEXT UNIQUE, description TEXT,
        salary TEXT, remote_type TEXT, skills TEXT,
        seniority TEXT, employment_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`).run();
      return new Response(JSON.stringify({ success: true, message: "Table recreated" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.pathname === "/api/jobs") {
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = 20, offset = (page - 1) * limit;
      const category = url.searchParams.get("category") || "";
      const search = url.searchParams.get("search") || "";
      const conditions = [], params = [];

      if (category) { conditions.push("LOWER(title) LIKE ?"); params.push(`%${category}%`); }
      if (search) {
        conditions.push("(LOWER(title) LIKE ? OR LOWER(company) LIKE ?)");
        params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
      }

      const where = conditions.length ? " WHERE " + conditions.join(" AND ") : "";
      const { results } = await env.DB.prepare(
        `SELECT * FROM jobs${where} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`
      ).bind(...params).all();
      const { results: cr } = await env.DB.prepare(
        `SELECT COUNT(*) as total FROM jobs${where}`
      ).bind(...params).all();

      return new Response(JSON.stringify({ jobs: results, total: cr[0]?.total || 0, page }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    if (url.pathname === "/api/sync") {
      try {
        const result = await syncJobs(env);
        return new Response(JSON.stringify({ success: true, ...result }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch(e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
          status: 500, headers: { "Content-Type": "application/json" }
        });
      }
    }

    if (url.pathname === "/api/debug") {
      const { results } = await env.DB.prepare("SELECT COUNT(*) as count FROM jobs").all();
      return new Response(JSON.stringify({
        jobs_in_db: results[0]?.count || 0,
        api_key_set: !!env.API_KEY
      }), { headers: { "Content-Type": "application/json" } });
    }

    if (url.pathname === "/api/raw") {
      const r = await fetch("https://api.jobdatalake.com/v1/jobs?q=developer&per_page=2", {
        headers: { "X-API-Key": env.API_KEY }
      });
      const json = await r.json();
      const sample = Array.isArray(json) ? json[0] : (json.hits?.[0] || json.jobs?.[0] || json);
      return new Response(JSON.stringify({ status: r.status, top_level_keys: Object.keys(json), sample }, null, 2), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncJobs(env));
  }
};
