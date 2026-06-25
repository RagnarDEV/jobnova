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

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      keywords TEXT,
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
  return { inserted, skipped, errors: errors.slice(0,3) };
}

// ════════════════════════════════════════════
// HTML PAGES
// ════════════════════════════════════════════

const STYLES = `
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #060B18; --bg2: #0D1525; --card: #111827; --card-h: #162035;
  --border: #1E2D45; --border-h: #2563EB;
  --accent: #2563EB; --accent-l: #3B82F6; --accent-g: rgba(37,99,235,.15);
  --green: #10B981; --amber: #F59E0B; --salary: #34D399;
  --t1: #F1F5F9; --t2: #94A3B8; --t3: #475569;
  --sw: 260px; --r: 14px;
}
html { scroll-behavior: smooth; }
body { font-family:'Inter',-apple-system,sans-serif; background:var(--bg); color:var(--t1); min-height:100vh; line-height:1.6; -webkit-font-smoothing:antialiased; }
::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-track{background:var(--bg2)} ::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}

/* TICKER */
.ticker-wrap{background:var(--bg2);border-bottom:1px solid var(--border);padding:8px 0;overflow:hidden;position:sticky;top:0;z-index:100}
.ticker-track{display:flex;gap:48px;animation:ticker 35s linear infinite;white-space:nowrap;width:max-content}
.ticker-track:hover{animation-play-state:paused}
.t-item{font-size:12px;color:var(--t2);display:flex;align-items:center;gap:6px}
.t-dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse 2s infinite}
.t-item strong{color:var(--accent-l)}
@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.4)}}

/* LAYOUT */
.app{display:flex;min-height:calc(100vh - 37px)}

/* SIDEBAR */
.sidebar{width:var(--sw);background:var(--bg2);border-right:1px solid var(--border);padding:28px 20px;position:sticky;top:37px;height:calc(100vh - 37px);overflow-y:auto;flex-shrink:0;display:flex;flex-direction:column;gap:28px}
.logo{font-size:26px;font-weight:900;letter-spacing:-1px;background:linear-gradient(135deg,#3B82F6,#60A5FA,#93C5FD);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;display:block;line-height:1.1}
.logo-sub{font-size:11px;color:var(--t3);letter-spacing:2px;text-transform:uppercase;font-weight:500;margin-top:4px}
.s-title{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:10px}
.nav-btn{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border:1px solid transparent;background:transparent;color:var(--t2);border-radius:10px;cursor:pointer;font-size:14px;font-weight:500;font-family:inherit;transition:all .2s;text-align:left}
.nav-btn:hover{background:var(--accent-g);color:var(--accent-l)}
.nav-btn.active{background:var(--accent-g);color:var(--accent-l);border-color:rgba(59,130,246,.2)}
.nav-icon{font-size:15px;width:20px;text-align:center}
.nav-count{margin-left:auto;font-size:11px;background:var(--border);color:var(--t3);padding:2px 7px;border-radius:20px}
.nav-btn.active .nav-count{background:var(--accent);color:#fff}
.sidebar-stats{background:linear-gradient(135deg,rgba(37,99,235,.08),rgba(37,99,235,.03));border:1px solid rgba(37,99,235,.15);border-radius:var(--r);padding:16px}
.stat-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0}
.stat-row:not(:last-child){border-bottom:1px solid var(--border)}
.stat-label{font-size:12px;color:var(--t3)}
.stat-val{font-size:14px;font-weight:700;color:var(--accent-l)}
.footer-links{display:flex;flex-direction:column;gap:4px;margin-top:auto}
.footer-link{font-size:12px;color:var(--t3);text-decoration:none;padding:4px 0;transition:color .2s;cursor:pointer;background:none;border:none;font-family:inherit;text-align:left}
.footer-link:hover{color:var(--t2)}

/* MAIN */
.main{flex:1;min-width:0}

/* HERO */
.hero{padding:48px 40px 36px;border-bottom:1px solid var(--border);background:radial-gradient(ellipse 80% 60% at 50% -20%,rgba(37,99,235,.12),transparent)}
.hero-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(37,99,235,.1);border:1px solid rgba(37,99,235,.2);border-radius:20px;padding:4px 12px;font-size:12px;color:var(--accent-l);font-weight:500;margin-bottom:20px}
.hero-title{font-size:36px;font-weight:900;letter-spacing:-1.5px;line-height:1.15;margin-bottom:12px;max-width:560px}
.hero-title span{background:linear-gradient(135deg,#3B82F6,#60A5FA);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero-sub{color:var(--t2);font-size:15px;margin-bottom:28px;max-width:480px}
.search-wrap{position:relative;max-width:540px}
.search-icon{position:absolute;left:16px;top:50%;transform:translateY(-50%);color:var(--t3);pointer-events:none}
.search-input{width:100%;background:var(--card);border:1.5px solid var(--border);border-radius:12px;padding:14px 16px 14px 44px;color:var(--t1);font-size:15px;font-family:inherit;outline:none;transition:border-color .2s,box-shadow .2s}
.search-input::placeholder{color:var(--t3)}
.search-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-g)}

/* FILTERS BAR */
.filters-bar{padding:14px 40px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;overflow-x:auto;background:var(--bg2)}
.filters-bar::-webkit-scrollbar{height:0}
.chip{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;border:1.5px solid var(--border);background:transparent;color:var(--t2);font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;white-space:nowrap;transition:all .2s}
.chip:hover{border-color:var(--accent-l);color:var(--accent-l)}
.chip.active{background:var(--accent);border-color:var(--accent);color:#fff}

/* ADVANCED FILTERS */
.adv-filters{padding:14px 40px;border-bottom:1px solid var(--border);display:none;gap:12px;flex-wrap:wrap;background:var(--bg)}
.adv-filters.open{display:flex}
.filter-select{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--t2);font-size:13px;font-family:inherit;cursor:pointer;outline:none;transition:border-color .2s}
.filter-select:focus{border-color:var(--accent)}
.filter-label{font-size:12px;color:var(--t3);display:flex;flex-direction:column;gap:4px}
.salary-range{display:flex;align-items:center;gap:8px}
.salary-input{width:100px;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--t1);font-size:13px;font-family:inherit;outline:none}
.salary-input:focus{border-color:var(--accent)}
.clear-filters-btn{margin-left:auto;padding:8px 16px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--t3);font-size:13px;cursor:pointer;font-family:inherit;transition:all .2s}
.clear-filters-btn:hover{color:var(--t1);border-color:var(--t2)}

/* CONTENT */
.content-wrap{padding:28px 40px}
.results-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;gap:12px;flex-wrap:wrap}
.results-count{font-size:14px;color:var(--t3)}
.results-count strong{color:var(--t1);font-weight:600}
.adv-toggle-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--t2);font-size:13px;cursor:pointer;font-family:inherit;transition:all .2s}
.adv-toggle-btn:hover{border-color:var(--accent-l);color:var(--accent-l)}
.adv-toggle-btn.active{background:var(--accent-g);border-color:var(--accent-l);color:var(--accent-l)}

/* JOB CARDS */
.jobs-list{display:flex;flex-direction:column;gap:12px}
.job-card{background:var(--card);border:1.5px solid var(--border);border-radius:var(--r);padding:20px 24px;cursor:pointer;transition:all .25s;position:relative;overflow:hidden}
.job-card::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,var(--accent-g),transparent);opacity:0;transition:opacity .25s}
.job-card:hover{border-color:var(--border-h);transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,.4),0 0 0 1px rgba(37,99,235,.1)}
.job-card:hover::before{opacity:1}
.card-top{display:flex;align-items:flex-start;gap:16px;position:relative}
.co-logo{width:48px;height:48px;border-radius:10px;background:var(--bg2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:var(--accent-l);overflow:hidden;flex-shrink:0;text-transform:uppercase}
.co-logo img{width:100%;height:100%;object-fit:contain;padding:6px}
.job-info{flex:1;min-width:0}
.job-title{font-size:16px;font-weight:700;color:var(--t1);margin-bottom:4px;line-height:1.3}
.job-co{font-size:14px;color:var(--accent-l);font-weight:600;margin-bottom:10px;cursor:pointer;display:inline-block}
.job-co:hover{text-decoration:underline}
.job-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.tag{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:20px;font-weight:500}
.tag-loc{color:var(--t3);padding-left:0}
.tag-remote{background:rgba(16,185,129,.1);color:#10B981;border:1px solid rgba(16,185,129,.2)}
.tag-hybrid{background:rgba(245,158,11,.1);color:#F59E0B;border:1px solid rgba(245,158,11,.2)}
.tag-onsite{background:rgba(148,163,184,.08);color:var(--t2);border:1px solid var(--border)}
.tag-type{background:rgba(148,163,184,.08);color:var(--t2);border:1px solid var(--border)}
.tag-new{background:rgba(16,185,129,.15);color:#10B981;border:1px solid rgba(16,185,129,.3);font-size:10px;padding:2px 8px;border-radius:20px;font-weight:700;letter-spacing:.5px}
.job-right{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0}
.salary-badge{font-size:13px;font-weight:700;color:var(--salary);background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.2);padding:4px 12px;border-radius:8px;white-space:nowrap}
.card-actions{display:flex;align-items:center;gap:6px}
.save-btn{width:32px;height:32px;border-radius:8px;background:transparent;border:1px solid var(--border);color:var(--t3);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px;transition:all .2s;position:relative;z-index:1}
.save-btn:hover{border-color:var(--amber);color:var(--amber)}
.save-btn.saved{background:rgba(245,158,11,.1);border-color:var(--amber);color:var(--amber)}
.share-btn{width:32px;height:32px;border-radius:8px;background:transparent;border:1px solid var(--border);color:var(--t3);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;transition:all .2s;position:relative;z-index:1}
.share-btn:hover{border-color:var(--accent-l);color:var(--accent-l)}
.apply-arr{width:32px;height:32px;border-radius:8px;background:var(--accent-g);border:1px solid rgba(37,99,235,.2);color:var(--accent-l);display:flex;align-items:center;justify-content:center;font-size:14px;transition:all .2s}
.job-card:hover .apply-arr{background:var(--accent);border-color:var(--accent);color:#fff}

/* TOAST */
.toast{position:fixed;bottom:24px;right:24px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px 20px;font-size:14px;color:var(--t1);display:flex;align-items:center;gap:10px;box-shadow:0 8px 32px rgba(0,0,0,.5);transform:translateY(100px);opacity:0;transition:all .3s;z-index:999;max-width:320px}
.toast.show{transform:translateY(0);opacity:1}
.toast.success .toast-icon{color:var(--green)}
.toast.info .toast-icon{color:var(--accent-l)}

/* EMPTY / LOADER */
.empty{text-align:center;padding:80px 20px;color:var(--t3)}
.empty .e-icon{font-size:48px;margin-bottom:16px;opacity:.5}
.empty h3{font-size:18px;color:var(--t2);margin-bottom:8px}
.empty p{font-size:14px}
.loader-wrap{padding:80px 20px;text-align:center}
.loader{display:inline-block;width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* PAGINATION */
.pagination{display:flex;align-items:center;justify-content:center;gap:8px;padding:32px 0 16px}
.page-btn{padding:8px 16px;border-radius:8px;border:1.5px solid var(--border);background:var(--card);color:var(--t2);font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;transition:all .2s}
.page-btn:hover:not(:disabled){border-color:var(--accent);color:var(--accent-l)}
.page-btn:disabled{opacity:.3;cursor:default}
.page-info{font-size:13px;color:var(--t3);padding:0 8px}

/* DETAIL */
.detail-wrap{padding:32px 40px;max-width:800px}
.back-btn{display:inline-flex;align-items:center;gap:8px;color:var(--t3);font-size:14px;font-weight:500;cursor:pointer;border:none;background:none;font-family:inherit;padding:0;margin-bottom:28px;transition:color .2s}
.back-btn:hover{color:var(--accent-l)}
.detail-card{background:var(--card);border:1.5px solid var(--border);border-radius:18px;overflow:hidden}
.detail-hdr{padding:32px;border-bottom:1px solid var(--border);background:linear-gradient(135deg,rgba(37,99,235,.05),transparent)}
.detail-co-row{display:flex;align-items:center;gap:16px;margin-bottom:20px}
.detail-logo{width:64px;height:64px;border-radius:14px;background:var(--bg2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:var(--accent-l);overflow:hidden;flex-shrink:0}
.detail-logo img{width:100%;height:100%;object-fit:contain;padding:8px}
.detail-co-name{font-size:16px;font-weight:600;color:var(--accent-l);cursor:pointer}
.detail-co-name:hover{text-decoration:underline}
.detail-co-loc{font-size:13px;color:var(--t3)}
.detail-title{font-size:28px;font-weight:800;letter-spacing:-.5px;margin-bottom:16px}
.detail-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}
.detail-salary{font-size:22px;font-weight:800;color:var(--salary);margin-bottom:8px}
.detail-body{padding:32px}
.s-title{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:14px}
.skills-grid{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:28px}
.skill-tag{background:rgba(37,99,235,.08);border:1px solid rgba(37,99,235,.15);color:var(--accent-l);font-size:13px;padding:5px 12px;border-radius:8px;font-weight:500}
.desc-body{font-size:15px;color:var(--t2);line-height:1.8;margin-bottom:32px}
.detail-actions{display:flex;gap:12px;flex-wrap:wrap}
.apply-btn{display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,#2563EB,#3B82F6);color:#fff;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:700;font-family:inherit;text-decoration:none;border:none;cursor:pointer;transition:all .2s;box-shadow:0 4px 20px rgba(37,99,235,.3)}
.apply-btn:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(37,99,235,.4)}
.share-detail-btn{display:inline-flex;align-items:center;gap:8px;background:transparent;border:1.5px solid var(--border);color:var(--t2);padding:14px 24px;border-radius:12px;font-size:15px;font-weight:600;font-family:inherit;cursor:pointer;transition:all .2s}
.share-detail-btn:hover{border-color:var(--accent-l);color:var(--accent-l)}

/* COMPANY PAGE */
.company-wrap{padding:32px 40px;max-width:800px}
.company-hdr{background:var(--card);border:1.5px solid var(--border);border-radius:18px;padding:32px;margin-bottom:24px}
.company-hdr-top{display:flex;align-items:center;gap:20px;margin-bottom:20px}
.company-big-logo{width:80px;height:80px;border-radius:16px;background:var(--bg2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800;color:var(--accent-l);overflow:hidden;flex-shrink:0}
.company-big-logo img{width:100%;height:100%;object-fit:contain;padding:10px}
.company-name{font-size:26px;font-weight:800;letter-spacing:-.5px;margin-bottom:6px}
.company-meta{display:flex;gap:16px;flex-wrap:wrap}
.company-stat{font-size:14px;color:var(--t2)}
.company-stat strong{color:var(--t1);font-weight:700}

/* SAVED JOBS */
.saved-wrap{padding:32px 40px;max-width:800px}
.saved-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
.saved-hdr h2{font-size:22px;font-weight:800}
.clear-saved-btn{padding:8px 16px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--t3);font-size:13px;cursor:pointer;font-family:inherit;transition:all .2s}
.clear-saved-btn:hover{border-color:red;color:#f87171}

/* ALERT FORM */
.alert-wrap{padding:32px 40px;max-width:600px}
.alert-card{background:var(--card);border:1.5px solid var(--border);border-radius:18px;padding:36px}
.alert-title{font-size:22px;font-weight:800;margin-bottom:8px}
.alert-sub{font-size:15px;color:var(--t2);margin-bottom:28px}
.form-group{margin-bottom:20px}
.form-label{font-size:13px;font-weight:600;color:var(--t2);margin-bottom:8px;display:block}
.form-input{width:100%;background:var(--bg2);border:1.5px solid var(--border);border-radius:10px;padding:12px 16px;color:var(--t1);font-size:15px;font-family:inherit;outline:none;transition:border-color .2s}
.form-input:focus{border-color:var(--accent)}
.form-input::placeholder{color:var(--t3)}
.submit-btn{width:100%;background:linear-gradient(135deg,#2563EB,#3B82F6);color:#fff;padding:14px;border-radius:12px;font-size:16px;font-weight:700;font-family:inherit;border:none;cursor:pointer;transition:all .2s;box-shadow:0 4px 20px rgba(37,99,235,.3)}
.submit-btn:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(37,99,235,.4)}
.keywords-wrap{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.kw-chip{display:inline-flex;align-items:center;gap:6px;background:var(--accent-g);border:1px solid rgba(37,99,235,.2);color:var(--accent-l);padding:5px 12px;border-radius:20px;font-size:13px;font-weight:500}
.kw-chip button{background:none;border:none;color:var(--accent-l);cursor:pointer;font-size:14px;line-height:1;padding:0}

/* BLOG */
.blog-wrap{padding:32px 40px;max-width:800px}
.blog-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px;margin-top:24px}
.blog-card{background:var(--card);border:1.5px solid var(--border);border-radius:var(--r);padding:24px;cursor:pointer;transition:all .25s}
.blog-card:hover{border-color:var(--border-h);transform:translateY(-2px)}
.blog-cat{font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent-l);margin-bottom:10px}
.blog-title{font-size:17px;font-weight:700;margin-bottom:10px;line-height:1.4}
.blog-excerpt{font-size:14px;color:var(--t2);line-height:1.7;margin-bottom:16px}
.blog-meta{font-size:12px;color:var(--t3);display:flex;gap:12px}

/* BLOG ARTICLE */
.article-wrap{padding:32px 40px;max-width:720px}
.article-hdr{margin-bottom:32px}
.article-cat{font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent-l);margin-bottom:12px}
.article-title{font-size:32px;font-weight:900;letter-spacing:-.5px;line-height:1.2;margin-bottom:16px}
.article-meta{font-size:13px;color:var(--t3);display:flex;gap:16px;flex-wrap:wrap}
.article-body h2{font-size:20px;font-weight:700;margin:32px 0 12px;color:var(--t1)}
.article-body p{font-size:15px;color:var(--t2);line-height:1.8;margin-bottom:16px}
.article-body ul{padding-left:20px;margin-bottom:16px}
.article-body ul li{font-size:15px;color:var(--t2);line-height:1.8;margin-bottom:8px}
.article-body strong{color:var(--t1)}

/* STATIC PAGES */
.static-wrap{padding:48px 40px;max-width:760px}
.static-wrap h1{font-size:28px;font-weight:800;margin-bottom:8px}
.static-date{font-size:13px;color:var(--t3);margin-bottom:32px}
.static-wrap h2{font-size:18px;font-weight:700;margin:28px 0 12px;color:var(--t1)}
.static-wrap p{font-size:15px;color:var(--t2);line-height:1.8;margin-bottom:12px}
.static-wrap ul{padding-left:20px;margin-bottom:12px}
.static-wrap ul li{font-size:15px;color:var(--t2);line-height:1.8;margin-bottom:6px}
.static-wrap a{color:var(--accent-l)}

/* THEME TOGGLE */
.theme-btn{width:36px;height:36px;border-radius:8px;border:1px solid var(--border);background:var(--bg2);color:var(--t2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;transition:all .2s;flex-shrink:0}
.theme-btn:hover{border-color:var(--accent-l);color:var(--accent-l)}

/* LIGHT MODE */
body.light{--bg:#F8FAFC;--bg2:#F1F5F9;--card:#FFFFFF;--border:#E2E8F0;--t1:#0F172A;--t2:#475569;--t3:#94A3B8;--card-h:#F8FAFC}

/* MOBILE HEADER */
.mob-hdr{display:none;padding:14px 20px;background:var(--bg2);border-bottom:1px solid var(--border);align-items:center;justify-content:space-between;position:sticky;top:37px;z-index:50;gap:12px}
.mob-logo{font-size:20px;font-weight:900;letter-spacing:-.5px;background:linear-gradient(135deg,#3B82F6,#60A5FA);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.mob-btns{display:flex;gap:8px}
.mob-filters{display:none;padding:12px 16px;gap:8px;overflow-x:auto;background:var(--bg2);border-bottom:1px solid var(--border)}
.mob-filters::-webkit-scrollbar{height:0}

@media(max-width:768px){
  .sidebar{display:none}
  .mob-hdr{display:flex}
  .mob-filters{display:flex}
  .hero{padding:24px 20px 20px}
  .hero-title{font-size:24px}
  .filters-bar{display:none}
  .adv-filters{padding:14px 16px}
  .content-wrap{padding:20px 16px}
  .detail-wrap,.company-wrap,.saved-wrap,.alert-wrap,.blog-wrap,.article-wrap,.static-wrap{padding:20px 16px}
  .detail-title{font-size:22px}
  .article-title{font-size:24px}
  .blog-grid{grid-template-columns:1fr}
  .job-right{align-items:flex-start}
}
</style>`;

const HEAD = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>JobNova — Find Your Next Remote Job</title>
<meta name="description" content="JobNova is a modern remote job board with 600+ curated positions in development, design, marketing, data, and more. Updated hourly.">
<meta name="keywords" content="remote jobs, developer jobs, designer jobs, work from home, tech jobs, job board, career, fullstack, frontend, backend, data science, devops">
<meta name="robots" content="index, follow">
<meta property="og:title" content="JobNova — Find Your Next Remote Job">
<meta property="og:description" content="600+ curated remote jobs in tech, design, marketing and more. Updated every hour.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://app.jobnova.workers.dev">
<link rel="canonical" href="https://app.jobnova.workers.dev">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"WebSite","name":"JobNova","url":"https://app.jobnova.workers.dev","description":"Modern remote job board with 600+ curated positions","potentialAction":{"@type":"SearchAction","target":"https://app.jobnova.workers.dev/?search={search_term_string}","query-input":"required name=search_term_string"}}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">`;

const BLOG_POSTS = [
  {
    id: 1,
    cat: "Career Advice",
    title: "10 Skills Every Remote Developer Must Have in 2026",
    excerpt: "Remote work has changed what employers look for. Beyond technical skills, these soft skills separate top candidates from the rest.",
    date: "June 20, 2026",
    readTime: "5 min read",
    body: `
      <p>The remote job market in 2026 is more competitive than ever. With thousands of developers applying for the same roles, it's no longer enough to be technically skilled — you need to master the full stack of remote work competencies.</p>
      <h2>1. Asynchronous Communication</h2>
      <p>Remote teams operate across time zones. The ability to write clear, concise, and actionable messages is as important as coding ability. Learn to document decisions, write detailed PRs, and summarize meetings effectively.</p>
      <h2>2. Self-Management & Discipline</h2>
      <p>Without a manager physically present, you need strong self-management. This means setting your own deadlines, tracking your progress, and knowing when to ask for help. Tools like Notion, Linear, and time-boxing techniques are your best friends.</p>
      <h2>3. Deep Work Focus</h2>
      <p>Remote environments come with distractions. Top remote developers cultivate the ability to enter deep focus states — 2-4 hour blocks of uninterrupted work. This skill compounds over time and separates average from exceptional output.</p>
      <h2>4. Proactive Visibility</h2>
      <p>Out of sight, out of mind. Remote workers must proactively share their progress, flag blockers early, and contribute visibly to team channels. If nobody knows what you're working on, it's as if you're not working at all.</p>
      <h2>5. Cloud & DevOps Literacy</h2>
      <p>Even frontend developers benefit from understanding Docker, CI/CD pipelines, and cloud deployment. Remote teams often run leaner, meaning each developer covers more ground.</p>
      <h2>6. Strong Git Practices</h2>
      <p>Clean commit history, descriptive PR descriptions, and code review etiquette are critical when your team never meets in person. Your git log is your professional signature.</p>
      <h2>7. Time Zone Awareness</h2>
      <p>Always specify time zones when scheduling. Use UTC as your mental anchor. Tools like World Time Buddy make cross-timezone coordination seamless.</p>
      <h2>8. Written Documentation</h2>
      <p>Remote teams live and die by their documentation. Contributing to wikis, writing runbooks, and keeping READMEs updated is a valued skill that many developers underestimate.</p>
      <h2>9. Video Communication Presence</h2>
      <p>When you do meet synchronously, make it count. Good lighting, a decent microphone, and the ability to present your work clearly on a call are increasingly important.</p>
      <h2>10. Continuous Learning Mindset</h2>
      <p>The tools remote teams use evolve rapidly. Developers who embrace new tools — whether AI coding assistants, new frameworks, or collaboration software — stay ahead of the curve.</p>
      <p><strong>The bottom line:</strong> Technical skill gets you the interview. Remote work competencies get you the job — and keep you thriving in it.</p>
    `
  },
  {
    id: 2,
    cat: "Salary Guide",
    title: "Remote Developer Salaries in 2026: What You Should Be Earning",
    excerpt: "Salary data from 600+ remote job listings reveals what companies are actually paying — broken down by role, seniority, and region.",
    date: "June 18, 2026",
    readTime: "7 min read",
    body: `
      <p>Based on our analysis of 600+ active remote job listings, here's what the market is paying in 2026. These figures represent base salary in USD for fully remote positions at companies hiring internationally.</p>
      <h2>Frontend Developer</h2>
      <ul>
        <li><strong>Junior (0-2 years):</strong> $55,000 – $85,000</li>
        <li><strong>Mid-level (2-5 years):</strong> $85,000 – $130,000</li>
        <li><strong>Senior (5+ years):</strong> $130,000 – $200,000</li>
        <li><strong>Staff/Principal:</strong> $180,000 – $280,000+</li>
      </ul>
      <h2>Backend Developer</h2>
      <ul>
        <li><strong>Junior:</strong> $60,000 – $90,000</li>
        <li><strong>Mid-level:</strong> $90,000 – $145,000</li>
        <li><strong>Senior:</strong> $145,000 – $220,000</li>
        <li><strong>Staff/Principal:</strong> $200,000 – $320,000+</li>
      </ul>
      <h2>Data Scientist / ML Engineer</h2>
      <ul>
        <li><strong>Junior:</strong> $70,000 – $100,000</li>
        <li><strong>Mid-level:</strong> $100,000 – $160,000</li>
        <li><strong>Senior:</strong> $160,000 – $240,000</li>
      </ul>
      <h2>DevOps / Platform Engineer</h2>
      <ul>
        <li><strong>Mid-level:</strong> $100,000 – $155,000</li>
        <li><strong>Senior:</strong> $155,000 – $230,000</li>
      </ul>
      <h2>Product Designer (UX/UI)</h2>
      <ul>
        <li><strong>Mid-level:</strong> $80,000 – $130,000</li>
        <li><strong>Senior:</strong> $130,000 – $195,000</li>
      </ul>
      <h2>Negotiation Tips</h2>
      <p>Always negotiate. The first offer is rarely the best offer. Research the company's funding stage — Series B+ companies typically have more salary flexibility. Equity, signing bonuses, and learning stipends can add significant value beyond base salary.</p>
      <p><strong>Key insight:</strong> Companies based in San Francisco or New York, even when hiring fully remote, often pay 20-40% more than companies that default to "location-adjusted" pay.</p>
    `
  },
  {
    id: 3,
    cat: "Job Search",
    title: "How to Land a Remote Job in 30 Days: A Practical Playbook",
    excerpt: "A step-by-step system that has helped thousands of developers secure remote offers — without connections or a fancy resume.",
    date: "June 15, 2026",
    readTime: "9 min read",
    body: `
      <p>Landing a remote job feels overwhelming. There are thousands of applicants, automated rejection emails, and it's hard to know if you're doing anything right. This playbook breaks it down into a focused 30-day system.</p>
      <h2>Week 1: Foundation</h2>
      <p><strong>Day 1-2: Define your target.</strong> Pick 2-3 specific role types (e.g., "React frontend developer" or "Python backend engineer"). Generalists struggle more. Specialists win faster.</p>
      <p><strong>Day 3-4: Polish your resume.</strong> One page. Quantify everything. "Built X that improved Y by Z%" is always better than "Worked on X." Use a clean template — design matters more than people admit.</p>
      <p><strong>Day 5-7: Build your application system.</strong> Create a simple spreadsheet to track applications: company, role, date, status, notes. Consistency beats intensity.</p>
      <h2>Week 2: Volume with Quality</h2>
      <p>Apply to 5-10 jobs per day, but customize each application. A personalized first paragraph beats a generic cover letter every time. Reference something specific about the company or role.</p>
      <p>Use job boards like JobNova, LinkedIn, and company career pages directly. Early applications (within 24 hours of posting) have significantly higher response rates.</p>
      <h2>Week 3: Parallel Tracks</h2>
      <p>While applications are being processed, work on your portfolio. One impressive project with good documentation beats five mediocre ones. Deploy everything — a live link matters.</p>
      <p>Also start reaching out on LinkedIn. Message engineers (not just recruiters) at companies you're interested in. Keep it specific and short.</p>
      <h2>Week 4: Interview Preparation</h2>
      <p>If you've been applying consistently, you should have interviews by now. Prepare for: 1) behavioral questions (STAR method), 2) system design basics, 3) live coding in your primary language.</p>
      <p>For remote-specific interviews, have a backup internet plan, test your setup the night before, and join calls 2-3 minutes early.</p>
      <h2>The Numbers Game</h2>
      <p>Expect roughly: 100 applications → 15 phone screens → 5 technical rounds → 2 offers. The funnel is harsh but consistent. Don't take rejection personally — it's largely a numbers and timing game.</p>
      <p><strong>Most important:</strong> Apply every day without fail. Momentum matters. The developers who land offers in 30 days are the ones who don't stop when the rejections come.</p>
    `
  },
  {
    id: 4,
    cat: "Industry Trends",
    title: "The State of Remote Work in 2026: What's Changed",
    excerpt: "Remote work has matured. The hype is gone, but the opportunity is bigger than ever — for those who know where to look.",
    date: "June 10, 2026",
    readTime: "6 min read",
    body: `
      <p>Remote work has gone through several phases since 2020. The initial explosion, the RTO backlash, the hybrid compromise — and now, in 2026, we've reached a kind of equilibrium. Here's what the data tells us.</p>
      <h2>What's Changed Since 2024</h2>
      <p>The number of fully remote roles has stabilized at roughly 30-35% of all white-collar job postings, down from the 2021 peak but significantly above pre-pandemic levels. Hybrid has become the default for most large companies, while fully remote has become the default for tech-forward startups and scale-ups.</p>
      <h2>Who's Hiring Remote in 2026</h2>
      <p>The clearest pattern: companies that were remote-first before 2020 have doubled down. Shopify, GitLab, Automattic, and hundreds of SaaS companies continue to hire globally without office requirements. Meanwhile, FAANG-adjacent companies have largely returned to hybrid models.</p>
      <h2>The Talent Arbitrage is Still Real</h2>
      <p>Developers in Eastern Europe, Latin America, and Southeast Asia continue to find remote opportunities at US/EU salary rates that provide exceptional local purchasing power. This isn't going away — if anything, it's growing as more companies optimize for talent over geography.</p>
      <h2>AI's Impact on Remote Job Descriptions</h2>
      <p>The most significant change in 2025-2026 has been the rise of AI-adjacent roles. "AI integration," "LLM fine-tuning," and "prompt engineering" appear in a growing percentage of software job listings. Traditional roles are also being augmented — senior developers are increasingly expected to be proficient with AI coding assistants.</p>
      <h2>What to Expect in the Next 12 Months</h2>
      <p>Expect continued growth in async-first companies, more sophisticated remote work policies (instead of blanket policies), and increasing demand for developers who can work effectively with AI tools. The remote job market in 2027 will reward specialists and high-output remote workers more than ever.</p>
    `
  },
  {
    id: 5,
    cat: "Tools & Productivity",
    title: "The Remote Developer's Essential Toolkit for 2026",
    excerpt: "The apps, workflows, and hardware setups that top remote developers swear by — curated from real job postings and community surveys.",
    date: "June 5, 2026",
    readTime: "5 min read",
    body: `
      <p>The right tools don't just make remote work easier — they make you look more professional and help you deliver better work. Here's what top remote developers are using in 2026.</p>
      <h2>Communication</h2>
      <ul>
        <li><strong>Slack / Discord:</strong> Still the default for async team chat</li>
        <li><strong>Loom:</strong> Record quick video explanations instead of scheduling meetings</li>
        <li><strong>Notion / Confluence:</strong> Documentation and knowledge management</li>
      </ul>
      <h2>Development</h2>
      <ul>
        <li><strong>GitHub Copilot / Cursor:</strong> AI pair programming is now standard</li>
        <li><strong>VS Code / Zed:</strong> Zed has gained significant traction for its speed</li>
        <li><strong>Linear:</strong> Replaced Jira at most modern startups</li>
        <li><strong>Vercel / Railway / Cloudflare Workers:</strong> Zero-ops deployment</li>
      </ul>
      <h2>Focus & Productivity</h2>
      <ul>
        <li><strong>Raycast:</strong> Launcher that replaces dozens of other apps</li>
        <li><strong>Cron / Fantastical:</strong> Calendar management that doesn't suck</li>
        <li><strong>Cold Turkey / Freedom:</strong> Website blockers for deep work sessions</li>
      </ul>
      <h2>Home Office Hardware</h2>
      <p>Companies increasingly expect professional setups. A good microphone (Blue Yeti or equivalent) and proper lighting make a bigger impression on video calls than you might expect. A 4K webcam is still optional but trending up.</p>
      <h2>The One Tool Most People Underuse</h2>
      <p><strong>A dedicated work browser profile.</strong> Separate Chrome/Firefox profile with only work-related extensions and bookmarks. The psychological separation helps maintain work/life boundaries that are critical for sustainable remote work.</p>
    `
  },
  {
    id: 6,
    cat: "Interview Prep",
    title: "Remote Technical Interviews: What's Different and How to Prepare",
    excerpt: "Remote interviews have their own unique challenges and opportunities. Here's how to ace them.",
    date: "June 1, 2026",
    readTime: "6 min read",
    body: `
      <p>Technical interviews have evolved significantly for remote positions. Companies screening for remote roles look for additional signals beyond pure coding ability.</p>
      <h2>The Setup Check — Don't Skip This</h2>
      <p>Remote interviewers notice your setup. Good audio is non-negotiable. A noisy background or echo costs you points subconsciously. Do a full tech check the evening before: camera, mic, internet backup (mobile hotspot), and the coding environment they'll use (CoderPad, HackerRank, etc.).</p>
      <h2>Communicating While You Code</h2>
      <p>In person, interviewers can see your face and body language. Remote, they only hear your voice and see your code. Narrate your thinking continuously — more than feels natural. "I'm considering using a hash map here because..." beats silence while you type.</p>
      <h2>Questions They Ask Remote Candidates Specifically</h2>
      <ul>
        <li>"Describe how you handle a blocker when your team lead is in a different time zone."</li>
        <li>"How do you stay productive when working from home?"</li>
        <li>"Tell me about a time you had to communicate a complex technical decision in writing."</li>
        <li>"How do you manage your time across different projects?"</li>
      </ul>
      <h2>The Right Answers</h2>
      <p>They want to hear about documentation, async communication, and self-management systems. Mention specific tools you use. Show that you've thought about remote work as a discipline, not just a perk.</p>
      <h2>Closing the Interview</h2>
      <p>Ask about the team's communication culture: "Is the team primarily async or do you have set meeting times?" and "How does the team handle code reviews?" These questions signal you've thought seriously about what makes remote teams succeed.</p>
    `
  }
];

const HTML_PAGE = `${HEAD}
${STYLES}
</head>
<body>

<div class="ticker-wrap">
  <div class="ticker-track" id="ticker">
    <span class="t-item"><span class="t-dot"></span><strong id="tc1">613</strong> Active Jobs</span>
    <span class="t-item">💼 Updated hourly via AI matching</span>
    <span class="t-item">🌍 Remote-first opportunities worldwide</span>
    <span class="t-item">⚡ Dev · Design · Marketing · Data · DevOps</span>
    <span class="t-item">✅ Verified company listings only</span>
    <span class="t-item">🚀 New jobs added every hour</span>
    <span class="t-item"><span class="t-dot"></span><strong id="tc2">613</strong> Active Jobs</span>
    <span class="t-item">💼 Updated hourly via AI matching</span>
    <span class="t-item">🌍 Remote-first opportunities worldwide</span>
    <span class="t-item">⚡ Dev · Design · Marketing · Data · DevOps</span>
    <span class="t-item">✅ Verified company listings only</span>
    <span class="t-item">🚀 New jobs added every hour</span>
  </div>
</div>

<div class="mob-hdr">
  <span class="mob-logo">JobNova</span>
  <div class="mob-btns">
    <button class="theme-btn" onclick="toggleTheme()" id="themeBtn" title="Toggle theme">🌙</button>
    <button class="theme-btn" onclick="goView('saved')" title="Saved jobs">🔖</button>
    <button class="theme-btn" onclick="document.getElementById('mobFilters').classList.toggle('mob-filters')">☰</button>
  </div>
</div>
<div id="mobFilters" style="display:none;padding:12px 16px;gap:8px;overflow-x:auto;background:var(--bg2);border-bottom:1px solid var(--border)">
  <button class="chip active" onclick="filterCat('','All')">All</button>
  <button class="chip" onclick="filterCat('developer','Development')">💻 Dev</button>
  <button class="chip" onclick="filterCat('designer','Design')">🎨 Design</button>
  <button class="chip" onclick="filterCat('marketing','Marketing')">📣 Marketing</button>
  <button class="chip" onclick="filterCat('data','Data')">📊 Data</button>
  <button class="chip" onclick="filterCat('devops','DevOps')">⚙️ DevOps</button>
  <button class="chip" onclick="filterCat('manager','Management')">👔 Mgmt</button>
</div>

<div class="app">
  <aside class="sidebar">
    <div>
      <span class="logo">JobNova</span>
      <span class="logo-sub">Career Platform</span>
    </div>

    <div>
      <div class="s-title">Browse Jobs</div>
      <nav id="sideNav">
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
      <button class="nav-btn" onclick="goView('saved')"><span class="nav-icon">🔖</span>Saved Jobs<span class="nav-count" id="saved-cnt">0</span></button>
      <button class="nav-btn" onclick="goView('alerts')"><span class="nav-icon">🔔</span>Job Alerts</button>
      <button class="nav-btn" onclick="goView('blog')"><span class="nav-icon">📝</span>Career Blog</button>
      <button class="nav-btn" onclick="toggleTheme()" id="themeNavBtn"><span class="nav-icon">🌙</span>Dark / Light</button>
    </div>

    <div>
      <div class="s-title">Live Stats</div>
      <div class="sidebar-stats">
        <div class="stat-row"><span class="stat-label">Total Jobs</span><span class="stat-val" id="st-total">—</span></div>
        <div class="stat-row"><span class="stat-label">With Salary</span><span class="stat-val" id="st-salary">—</span></div>
        <div class="stat-row"><span class="stat-label">Remote</span><span class="stat-val" id="st-remote">—</span></div>
        <div class="stat-row"><span class="stat-label">Updated</span><span class="stat-val">Hourly ⚡</span></div>
      </div>
    </div>

    <div style="margin-top:auto">
      <div class="s-title">Legal</div>
      <div class="footer-links">
        <button class="footer-link" onclick="goView('privacy')">Privacy Policy</button>
        <button class="footer-link" onclick="goView('terms')">Terms of Service</button>
        <button class="footer-link" onclick="goView('disclaimer')">Disclaimer</button>
      </div>
      <div style="margin-top:14px;font-size:11px;color:var(--t3)">© 2026 JobNova. All rights reserved.</div>
    </div>
  </aside>

  <main class="main" id="mainEl">

    <!-- JOBS VIEW -->
    <div id="vJobs">
      <div class="hero">
        <div class="hero-badge">✨ AI-Powered Job Matching — Updated Hourly</div>
        <h1 class="hero-title">Find Your Next <span>Remote Career</span> Opportunity</h1>
        <p class="hero-sub">600+ curated jobs in tech, design, marketing & more. Fresh listings every hour.</p>
        <div class="search-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" id="searchInput" placeholder="Search jobs, companies, or skills..." oninput="debounceSearch(this.value)">
        </div>
      </div>

      <div class="filters-bar" id="filtersBar">
        <button class="chip active" onclick="filterCat('','All Jobs')">All Jobs</button>
        <button class="chip" onclick="filterCat('developer','Development')">💻 Development</button>
        <button class="chip" onclick="filterCat('designer','Design')">🎨 Design</button>
        <button class="chip" onclick="filterCat('marketing','Marketing')">📣 Marketing</button>
        <button class="chip" onclick="filterCat('data','Data & AI')">📊 Data & AI</button>
        <button class="chip" onclick="filterCat('devops','DevOps')">⚙️ DevOps</button>
        <button class="chip" onclick="filterCat('manager','Management')">👔 Management</button>
        <button class="chip" onclick="filterCat('writer','Writing')">✍️ Writing</button>
      </div>

      <!-- ADVANCED FILTERS -->
      <div class="adv-filters" id="advFilters">
        <label class="filter-label">Remote Type
          <select class="filter-select" id="fRemote" onchange="applyAdvFilters()">
            <option value="">All Types</option>
            <option value="fully_remote">Fully Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="on_site">On-site</option>
          </select>
        </label>
        <label class="filter-label">Employment
          <select class="filter-select" id="fEmploy" onchange="applyAdvFilters()">
            <option value="">All Types</option>
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="contract">Contract</option>
          </select>
        </label>
        <label class="filter-label">Seniority
          <select class="filter-select" id="fSeniority" onchange="applyAdvFilters()">
            <option value="">All Levels</option>
            <option value="Junior">Junior</option>
            <option value="Mid">Mid-Level</option>
            <option value="Senior">Senior</option>
            <option value="Staff">Staff / Principal</option>
          </select>
        </label>
        <label class="filter-label">Min Salary ($k)
          <input type="number" class="salary-input" id="fSalaryMin" placeholder="e.g. 80" oninput="debounceAdvFilters()">
        </label>
        <label class="filter-label">Posted Within
          <select class="filter-select" id="fDate" onchange="applyAdvFilters()">
            <option value="">Any time</option>
            <option value="1">Today</option>
            <option value="7">This week</option>
            <option value="30">This month</option>
          </select>
        </label>
        <button class="clear-filters-btn" onclick="clearAdvFilters()">✕ Clear Filters</button>
      </div>

      <div class="content-wrap">
        <div class="results-hdr">
          <div class="results-count" id="resultsCount">Loading...</div>
          <div style="display:flex;gap:8px">
            <button class="adv-toggle-btn" id="advToggleBtn" onclick="toggleAdvFilters()">⚙️ Filters</button>
          </div>
        </div>
        <div class="jobs-list" id="jobsList"><div class="loader-wrap"><div class="loader"></div></div></div>
        <div class="pagination" id="pagination"></div>
      </div>
    </div>

    <!-- DETAIL VIEW -->
    <div id="vDetail" style="display:none"><div class="detail-wrap" id="detailContent"></div></div>

    <!-- COMPANY VIEW -->
    <div id="vCompany" style="display:none"><div class="company-wrap" id="companyContent"></div></div>

    <!-- SAVED VIEW -->
    <div id="vSaved" style="display:none">
      <div class="saved-wrap">
        <div class="saved-hdr">
          <h2>🔖 Saved Jobs</h2>
          <button class="clear-saved-btn" onclick="clearAllSaved()">Clear All</button>
        </div>
        <div class="jobs-list" id="savedList"></div>
      </div>
    </div>

    <!-- ALERTS VIEW -->
    <div id="vAlerts" style="display:none">
      <div class="alert-wrap">
        <button class="back-btn" onclick="goView('jobs')">← Back to Jobs</button>
        <div class="alert-card">
          <div class="alert-title">🔔 Job Alerts</div>
          <div class="alert-sub">Get notified by email when new jobs matching your keywords are posted.</div>
          <div class="form-group">
            <label class="form-label">Your Email Address</label>
            <input type="email" class="form-input" id="alertEmail" placeholder="you@example.com">
          </div>
          <div class="form-group">
            <label class="form-label">Keywords <span style="color:var(--t3);font-weight:400">(press Enter to add)</span></label>
            <input type="text" class="form-input" id="alertKwInput" placeholder="e.g. React, Python, Remote..." onkeydown="addKeyword(event)">
            <div class="keywords-wrap" id="kwWrap"></div>
          </div>
          <button class="submit-btn" onclick="submitAlert()">Subscribe to Alerts →</button>
        </div>
      </div>
    </div>

    <!-- BLOG VIEW -->
    <div id="vBlog" style="display:none">
      <div class="blog-wrap">
        <button class="back-btn" onclick="goView('jobs')">← Back to Jobs</button>
        <h2 style="font-size:26px;font-weight:800;margin-bottom:6px">📝 Career Blog</h2>
        <p style="color:var(--t2);font-size:15px">Insights, guides, and salary data for remote job seekers.</p>
        <div class="blog-grid" id="blogGrid"></div>
      </div>
    </div>

    <!-- ARTICLE VIEW -->
    <div id="vArticle" style="display:none">
      <div class="article-wrap" id="articleContent"></div>
    </div>

    <!-- STATIC PAGES -->
    <div id="vStatic" style="display:none">
      <div class="static-wrap" id="staticContent"></div>
    </div>

  </main>
</div>

<!-- TOAST -->
<div class="toast" id="toast">
  <span class="toast-icon" id="toastIcon">✓</span>
  <span id="toastMsg">Done</span>
</div>

<script>
// ── STATE ──
let pg=1, cat='', srch='', advTimeout, srchTimeout;
let jobs=[], total=0;
let savedIds = JSON.parse(localStorage.getItem('jn_saved')||'[]');
let alertKws = [];
let advFilters = { remote:'', employ:'', seniority:'', salaryMin:'', days:'' };
let isLight = localStorage.getItem('jn_theme')==='light';

// ── THEME ──
function applyTheme(){
  document.body.classList.toggle('light', isLight);
  const icon = isLight ? '☀️' : '🌙';
  const tb = document.getElementById('themeBtn');
  const tnb = document.getElementById('themeNavBtn');
  if(tb) tb.textContent = icon;
  if(tnb) tnb.innerHTML = '<span class="nav-icon">'+icon+'</span>Dark / Light';
}
function toggleTheme(){ isLight=!isLight; localStorage.setItem('jn_theme', isLight?'light':'dark'); applyTheme(); }
applyTheme();

// ── HELPERS ──
function initials(n){ return (n||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase(); }
function logoHtml(co, sz='48px', cls='co-logo'){
  const slug=(co||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const ini=initials(co);
  return \`<div class="\${cls}" style="width:\${sz};height:\${sz}">
    <img src="https://logo.clearbit.com/\${slug}.com" alt="\${co}"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
    <span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:\${parseInt(sz)*.33}px;font-weight:800;color:var(--accent-l)">\${ini}</span>
  </div>\`;
}
function remoteTag(t){
  if(!t) return '';
  const m={fully_remote:['tag-remote','🌐 Remote'],hybrid:['tag-hybrid','🏢 Hybrid'],on_site:['tag-onsite','📍 On-site'],onsite:['tag-onsite','📍 On-site']};
  const [cls,lbl]=m[t]||['tag-onsite',t.replace(/_/g,' ')];
  return \`<span class="tag \${cls}">\${lbl}</span>\`;
}
function isNew(ts){ if(!ts) return false; return Date.now()-new Date(ts).getTime()<86400000; }
function showToast(msg, type='success'){
  const el=document.getElementById('toast');
  document.getElementById('toastMsg').textContent=msg;
  document.getElementById('toastIcon').textContent=type==='success'?'✓':'ℹ';
  el.className='toast '+type+' show';
  setTimeout(()=>el.classList.remove('show'),3000);
}
function updateSavedCount(){ document.getElementById('saved-cnt').textContent=savedIds.length||0; }

// ── VIEWS ──
const views=['vJobs','vDetail','vCompany','vSaved','vAlerts','vBlog','vArticle','vStatic'];
function showView(id){ views.forEach(v=>document.getElementById(v).style.display=v===id?'block':'none'); window.scrollTo(0,0); }

function goView(v){
  if(v==='jobs'){ showView('vJobs'); return; }
  if(v==='saved'){ showView('vSaved'); renderSaved(); return; }
  if(v==='alerts'){ showView('vAlerts'); return; }
  if(v==='blog'){ showView('vBlog'); renderBlog(); return; }
  if(v==='privacy') return showStatic('privacy');
  if(v==='terms') return showStatic('terms');
  if(v==='disclaimer') return showStatic('disclaimer');
}

// ── ADVANCED FILTERS ──
function toggleAdvFilters(){
  const el=document.getElementById('advFilters');
  const btn=document.getElementById('advToggleBtn');
  el.classList.toggle('open');
  btn.classList.toggle('active');
}
function applyAdvFilters(){
  advFilters.remote=document.getElementById('fRemote').value;
  advFilters.employ=document.getElementById('fEmploy').value;
  advFilters.seniority=document.getElementById('fSeniority').value;
  advFilters.salaryMin=document.getElementById('fSalaryMin').value;
  advFilters.days=document.getElementById('fDate').value;
  pg=1; loadJobs();
}
function debounceAdvFilters(){ clearTimeout(advTimeout); advTimeout=setTimeout(applyAdvFilters,500); }
function clearAdvFilters(){
  ['fRemote','fEmploy','fSeniority','fDate'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('fSalaryMin').value='';
  advFilters={remote:'',employ:'',seniority:'',salaryMin:'',days:''};
  pg=1; loadJobs();
}

// ── LOAD JOBS ──
async function loadJobs(){
  document.getElementById('jobsList').innerHTML='<div class="loader-wrap"><div class="loader"></div></div>';
  document.getElementById('pagination').innerHTML='';
  const p=new URLSearchParams({page:pg});
  if(cat) p.set('category',cat);
  if(srch) p.set('search',srch);
  if(advFilters.remote) p.set('remote_type',advFilters.remote);
  if(advFilters.employ) p.set('employment_type',advFilters.employ);
  if(advFilters.seniority) p.set('seniority',advFilters.seniority);
  if(advFilters.salaryMin) p.set('salary_min',advFilters.salaryMin);
  if(advFilters.days) p.set('days',advFilters.days);

  try{
    const res=await fetch('/api/jobs?'+p);
    const data=await res.json();
    jobs=data.jobs||[]; total=data.total||0;
    document.getElementById('resultsCount').innerHTML=\`<strong>\${total.toLocaleString()}</strong> jobs found\${cat?' in <strong>'+cat+'</strong>':''}\${srch?' for "<strong>'+srch+'</strong>"':''}\`;

    if(!jobs.length){
      document.getElementById('jobsList').innerHTML='<div class="empty"><div class="e-icon">🔍</div><h3>No jobs found</h3><p>Try different keywords or browse all categories</p></div>';
      return;
    }

    document.getElementById('jobsList').innerHTML=jobs.map(j=>{
      const saved=savedIds.includes(j.id);
      const newBadge=isNew(j.created_at)?'<span class="tag-new">NEW</span>':'';
      return \`<article class="job-card" onclick="showDetail(\${j.id})" tabindex="0" role="button">
        <div class="card-top">
          \${logoHtml(j.company)}
          <div class="job-info">
            <div class="job-title">\${j.title} \${newBadge}</div>
            <div class="job-co" onclick="event.stopPropagation();showCompany('\${encodeURIComponent(j.company)}')">\${j.company}</div>
            <div class="job-meta">
              \${j.location?'<span class="tag tag-loc">📍 '+j.location+'</span>':''}
              \${remoteTag(j.remote_type)}
              \${j.employment_type?'<span class="tag tag-type">'+j.employment_type.replace(/_/g,' ')+'</span>':''}
              \${j.seniority?'<span class="tag tag-type">'+j.seniority+'</span>':''}
            </div>
          </div>
          <div class="job-right">
            \${j.salary?'<div class="salary-badge">'+j.salary+'</div>':''}
            <div class="card-actions">
              <button class="save-btn \${saved?'saved':''}" onclick="event.stopPropagation();toggleSave(\${j.id})" title="\${saved?'Unsave':'Save'} job" id="sb-\${j.id}">\${saved?'🔖':'🔖'}</button>
              <button class="share-btn" onclick="event.stopPropagation();shareJob(\${j.id})" title="Copy link">🔗</button>
              <div class="apply-arr">→</div>
            </div>
          </div>
        </div>
      </article>\`;
    }).join('');

    const tp=Math.ceil(total/20);
    if(tp>1) document.getElementById('pagination').innerHTML=\`
      <button class="page-btn" onclick="goPage(\${pg-1})" \${pg===1?'disabled':''}>← Prev</button>
      <span class="page-info">Page \${pg} of \${tp}</span>
      <button class="page-btn" onclick="goPage(\${pg+1})" \${pg===tp?'disabled':''}>Next →</button>\`;

    document.querySelectorAll('.job-card').forEach(c=>c.addEventListener('keydown',e=>{if(e.key==='Enter')c.click();}));
  } catch(e){
    document.getElementById('jobsList').innerHTML='<div class="empty"><div class="e-icon">⚠️</div><h3>Failed to load</h3><p>Please refresh and try again</p></div>';
  }
}

// ── JOB DETAIL ──
function showDetail(id){
  const j=jobs.find(x=>x.id===id); if(!j) return;
  let skills=[];try{skills=JSON.parse(j.skills||'[]')}catch(e){}
  const saved=savedIds.includes(j.id);
  showView('vDetail');
  document.getElementById('detailContent').innerHTML=\`
    <button class="back-btn" onclick="goView('jobs')">← Back to Jobs</button>
    <div class="detail-card">
      <div class="detail-hdr">
        <div class="detail-co-row">
          \${logoHtml(j.company,'64px','detail-logo')}
          <div>
            <div class="detail-co-name" onclick="showCompany('\${encodeURIComponent(j.company)}')">\${j.company}</div>
            <div class="detail-co-loc">\${j.location||'Remote'}</div>
          </div>
        </div>
        <h1 class="detail-title">\${j.title}</h1>
        <div class="detail-chips">
          \${remoteTag(j.remote_type)}
          \${j.employment_type?'<span class="tag tag-type">'+j.employment_type.replace(/_/g,' ')+'</span>':''}
          \${j.seniority?'<span class="tag tag-type">'+j.seniority+'</span>':''}
          \${isNew(j.created_at)?'<span class="tag-new">NEW</span>':''}
        </div>
        \${j.salary?'<div class="detail-salary">'+j.salary+'</div>':''}
      </div>
      <div class="detail-body">
        \${skills.length?'<div class="s-title">Required Skills</div><div class="skills-grid">'+skills.map(s=>'<span class="skill-tag">'+s+'</span>').join('')+'</div>':''}
        <div class="s-title">Job Description</div>
        <div class="desc-body">\${j.description||'Full description available on the company website.'}</div>
        <div class="detail-actions">
          <a href="\${j.url}" target="_blank" rel="noopener" class="apply-btn">Apply Now →</a>
          <button class="share-detail-btn" onclick="shareJob(\${j.id})">🔗 Copy Link</button>
          <button class="share-detail-btn \${saved?'saved':''}" onclick="toggleSave(\${j.id});this.textContent=savedIds.includes(\${j.id})?'🔖 Saved':'🔖 Save'">
            \${saved?'🔖 Saved':'🔖 Save'}
          </button>
        </div>
      </div>
    </div>\`;
}

// ── COMPANY PAGE ──
async function showCompany(encodedName){
  const name=decodeURIComponent(encodedName);
  showView('vCompany');
  document.getElementById('companyContent').innerHTML='<div class="loader-wrap"><div class="loader"></div></div>';
  try{
    const res=await fetch('/api/jobs?search='+encodeURIComponent(name)+'&page=1');
    const data=await res.json();
    const coJobs=(data.jobs||[]).filter(j=>j.company===name);
    const total=coJobs.length;
    const salaryJobs=coJobs.filter(j=>j.salary);
    document.getElementById('companyContent').innerHTML=\`
      <button class="back-btn" onclick="goView('jobs')">← Back to Jobs</button>
      <div class="company-hdr">
        <div class="company-hdr-top">
          \${logoHtml(name,'80px','company-big-logo')}
          <div>
            <div class="company-name">\${name}</div>
            <div class="company-meta">
              <span class="company-stat"><strong>\${total}</strong> open roles</span>
              \${salaryJobs.length?'<span class="company-stat"><strong>'+salaryJobs.length+'</strong> with salary</span>':''}
            </div>
          </div>
        </div>
      </div>
      <div style="margin-bottom:16px;font-size:14px;color:var(--t2)">All open positions at <strong style="color:var(--t1)">\${name}</strong></div>
      <div class="jobs-list">\${coJobs.map(j=>\`
        <article class="job-card" onclick="jobs.push(\${JSON.stringify(j).replace(/'/g,"\\\\'")}),showDetail(\${j.id})" tabindex="0">
          <div class="card-top">
            \${logoHtml(j.company)}
            <div class="job-info">
              <div class="job-title">\${j.title}</div>
              <div class="job-meta">
                \${j.location?'<span class="tag tag-loc">📍 '+j.location+'</span>':''}
                \${remoteTag(j.remote_type)}
                \${j.employment_type?'<span class="tag tag-type">'+j.employment_type.replace(/_/g,' ')+'</span>':''}
              </div>
            </div>
            <div class="job-right">
              \${j.salary?'<div class="salary-badge">'+j.salary+'</div>':''}
              <div class="apply-arr">→</div>
            </div>
          </div>
        </article>\`).join('')}
      </div>\`;
  }catch(e){
    document.getElementById('companyContent').innerHTML='<div class="empty"><div class="e-icon">⚠️</div><h3>Failed to load</h3></div>';
  }
}

// ── SAVE / SHARE ──
function toggleSave(id){
  const idx=savedIds.indexOf(id);
  if(idx>=0){ savedIds.splice(idx,1); showToast('Job removed from saved','info'); }
  else { savedIds.push(id); showToast('Job saved! 🔖'); }
  localStorage.setItem('jn_saved',JSON.stringify(savedIds));
  updateSavedCount();
  const btn=document.getElementById('sb-'+id);
  if(btn) btn.classList.toggle('saved', savedIds.includes(id));
}

function shareJob(id){
  const url=window.location.origin+'/?job='+id;
  navigator.clipboard.writeText(url).then(()=>showToast('Link copied to clipboard! 🔗')).catch(()=>showToast('Copy this: '+url,'info'));
}

// ── SAVED JOBS ──
function renderSaved(){
  if(!savedIds.length){
    document.getElementById('savedList').innerHTML='<div class="empty"><div class="e-icon">🔖</div><h3>No saved jobs yet</h3><p>Click the bookmark icon on any job to save it</p></div>';
    return;
  }
  const saved=jobs.filter(j=>savedIds.includes(j.id));
  if(!saved.length){
    document.getElementById('savedList').innerHTML='<div class="empty"><div class="e-icon">🔖</div><h3>Saved jobs will appear here</h3><p>Browse jobs and save the ones you like</p></div>';
    return;
  }
  document.getElementById('savedList').innerHTML=saved.map(j=>\`
    <article class="job-card" onclick="showDetail(\${j.id})" tabindex="0">
      <div class="card-top">
        \${logoHtml(j.company)}
        <div class="job-info">
          <div class="job-title">\${j.title}</div>
          <div class="job-co">\${j.company}</div>
          <div class="job-meta">
            \${remoteTag(j.remote_type)}
            \${j.employment_type?'<span class="tag tag-type">'+j.employment_type.replace(/_/g,' ')+'</span>':''}
          </div>
        </div>
        <div class="job-right">
          \${j.salary?'<div class="salary-badge">'+j.salary+'</div>':''}
          <button class="save-btn saved" onclick="event.stopPropagation();toggleSave(\${j.id});renderSaved()">🔖</button>
        </div>
      </div>
    </article>\`).join('');
}

function clearAllSaved(){
  savedIds=[];
  localStorage.removeItem('jn_saved');
  updateSavedCount();
  renderSaved();
  showToast('All saved jobs cleared','info');
}

// ── ALERTS ──
function addKeyword(e){
  if(e.key!=='Enter') return;
  const inp=document.getElementById('alertKwInput');
  const val=inp.value.trim(); if(!val) return;
  if(!alertKws.includes(val)){ alertKws.push(val); renderKeywords(); }
  inp.value='';
}
function removeKeyword(kw){ alertKws=alertKws.filter(k=>k!==kw); renderKeywords(); }
function renderKeywords(){
  document.getElementById('kwWrap').innerHTML=alertKws.map(k=>\`
    <span class="kw-chip">\${k}<button onclick="removeKeyword('\${k}')">×</button></span>\`).join('');
}
async function submitAlert(){
  const email=document.getElementById('alertEmail').value.trim();
  if(!email||!email.includes('@')){ showToast('Please enter a valid email','info'); return; }
  if(!alertKws.length){ showToast('Add at least one keyword','info'); return; }
  try{
    const res=await fetch('/api/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,keywords:alertKws})});
    const d=await res.json();
    if(d.success){ showToast('Subscribed successfully! 🎉'); document.getElementById('alertEmail').value=''; alertKws=[]; renderKeywords(); }
    else showToast(d.error||'Something went wrong','info');
  }catch(e){ showToast('Failed to subscribe. Please try again.','info'); }
}

// ── BLOG ──
const POSTS=${JSON.stringify(BLOG_POSTS)};

function renderBlog(){
  document.getElementById('blogGrid').innerHTML=POSTS.map(p=>\`
    <div class="blog-card" onclick="showArticle(\${p.id})">
      <div class="blog-cat">\${p.cat}</div>
      <div class="blog-title">\${p.title}</div>
      <div class="blog-excerpt">\${p.excerpt}</div>
      <div class="blog-meta"><span>\${p.date}</span><span>\${p.readTime}</span></div>
    </div>\`).join('');
}

function showArticle(id){
  const p=POSTS.find(x=>x.id===id); if(!p) return;
  showView('vArticle');
  document.getElementById('articleContent').innerHTML=\`
    <button class="back-btn" onclick="goView('blog')">← Back to Blog</button>
    <div class="article-hdr">
      <div class="article-cat">\${p.cat}</div>
      <h1 class="article-title">\${p.title}</h1>
      <div class="article-meta"><span>📅 \${p.date}</span><span>⏱ \${p.readTime}</span></div>
    </div>
    <div class="article-body">\${p.body}</div>
    <div style="margin-top:40px;padding-top:24px;border-top:1px solid var(--border)">
      <button class="back-btn" onclick="goView('blog')">← Back to Blog</button>
    </div>\`;
}

// ── STATIC PAGES ──
const STATIC={
  privacy:{title:'Privacy Policy',date:'Last updated: June 25, 2026',body:\`
    <h2>1. Information We Collect</h2>
    <p>JobNova does not collect personal information from visitors browsing job listings. No registration or login is required.</p>
    <h2>2. Job Alert Subscribers</h2>
    <p>If you subscribe to job alerts, we store your email address and keyword preferences solely to send relevant job notifications. We do not sell or share this data with third parties.</p>
    <h2>3. Job Listings</h2>
    <p>Job listings are sourced from third-party APIs. We are not responsible for the content, accuracy, or availability of external job postings.</p>
    <h2>4. Cookies & Storage</h2>
    <p>We use browser localStorage only to remember your saved jobs and theme preference. No tracking cookies are used. No advertising pixels are present.</p>
    <h2>5. Third-Party Links</h2>
    <p>Our site contains links to external job application pages. We are not responsible for the privacy practices of these third-party websites.</p>
    <h2>6. Data Retention</h2>
    <p>Alert subscriber data is retained until you unsubscribe. You may request deletion at any time by contacting us.</p>
    <h2>7. Contact</h2>
    <p>For privacy-related questions: <a href="mailto:hello@jobnova.dev">hello@jobnova.dev</a></p>\`},
  terms:{title:'Terms of Service',date:'Last updated: June 25, 2026',body:\`
    <h2>1. Acceptance of Terms</h2>
    <p>By accessing JobNova, you agree to these Terms of Service. If you disagree, please discontinue use immediately.</p>
    <h2>2. Service Description</h2>
    <p>JobNova is a job aggregation and discovery platform. We curate and display job listings sourced from third-party APIs to help job seekers find opportunities.</p>
    <h2>3. Permitted Use</h2>
    <p>You may use JobNova to search and browse job listings for personal, non-commercial job-seeking purposes.</p>
    <h2>4. Prohibited Activities</h2>
    <ul>
      <li>Scraping or bulk downloading of job listings or any site data</li>
      <li>Using the service to send spam or unsolicited outreach to employers</li>
      <li>Attempting to interfere with or disrupt site functionality</li>
      <li>Reproducing or reselling any content without written permission</li>
      <li>Using automated tools to access the service at scale</li>
    </ul>
    <h2>5. Accuracy of Listings</h2>
    <p>We do not guarantee the accuracy, completeness, or current availability of any job listing. Always verify details directly with the employer before applying.</p>
    <h2>6. No Employment Guarantees</h2>
    <p>Using JobNova does not guarantee employment. All hiring decisions are made exclusively by respective employers.</p>
    <h2>7. Limitation of Liability</h2>
    <p>JobNova is provided "as is" without warranties of any kind. We are not liable for any direct, indirect, or consequential damages arising from use of this service.</p>
    <h2>8. Modifications</h2>
    <p>We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of updated terms.</p>
    <h2>9. Governing Law</h2>
    <p>These terms are governed by applicable law. Disputes shall be resolved through binding arbitration where permitted.</p>\`},
  disclaimer:{title:'Disclaimer',date:'Last updated: June 25, 2026',body:\`
    <h2>Job Listing Accuracy</h2>
    <p>JobNova aggregates job listings from third-party data sources. We make no representations about the accuracy, completeness, or timeliness of any listing. Job availability, salary information, requirements, and application links may change or expire without notice.</p>
    <h2>No Employment Relationship</h2>
    <p>JobNova is a job discovery platform and not an employer, staffing agency, or recruiter. We do not participate in the hiring process and accept no responsibility for outcomes of any application made through our platform.</p>
    <h2>Salary Information</h2>
    <p>Salary figures displayed are estimates provided by third-party data sources and may not reflect actual compensation packages offered by employers. Actual salaries depend on experience, location, negotiation, and company-specific factors.</p>
    <h2>External Links</h2>
    <p>All "Apply Now" links lead to third-party websites operated by employers or job platforms. We are not responsible for the content, privacy practices, availability, or any aspect of those external websites.</p>
    <h2>No Guarantee of Employment</h2>
    <p>Browsing or applying through JobNova does not guarantee interview opportunities, job offers, or employment. All hiring decisions are made exclusively and solely by the respective employers.</p>
    <h2>AI-Sourced Content</h2>
    <p>Some job data may be enriched or processed using AI tools. While we strive for accuracy, AI-generated content may contain errors or inconsistencies.</p>\`}
};

function showStatic(id){
  const p=STATIC[id]; if(!p) return;
  showView('vStatic');
  document.getElementById('staticContent').innerHTML=\`
    <h1>\${p.title}</h1>
    <div class="static-date">\${p.date}</div>
    \${p.body}
    <div style="margin-top:36px"><button class="back-btn" onclick="goView('jobs')">← Back to Jobs</button></div>\`;
}

// ── FILTERS ──
function filterCat(c, label){
  cat=c; pg=1;
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>{ if(b.textContent.includes(label||'All')) b.classList.add('active'); });
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  document.querySelectorAll('.chip').forEach(c=>{ if(c.textContent.includes(label||'All')) c.classList.add('active'); });
  showView('vJobs'); loadJobs();
}
function debounceSearch(v){ clearTimeout(srchTimeout); srchTimeout=setTimeout(()=>{ srch=v; pg=1; loadJobs(); },400); }
function goPage(p){ pg=p; loadJobs(); window.scrollTo(0,0); }

// ── SITEMAP & RSS (URLs) ──
// These are served via the Worker, not JS

// ── INIT ──
async function init(){
  updateSavedCount();
  loadJobs();
  try{
    const r=await fetch('/api/debug');
    const d=await r.json();
    const n=d.jobs_in_db||0;
    document.getElementById('st-total').textContent=n.toLocaleString();
    document.getElementById('tc1').textContent=n.toLocaleString();
    document.getElementById('tc2').textContent=n.toLocaleString();
    document.getElementById('cnt-all').textContent=n.toLocaleString();
    document.getElementById('st-salary').textContent=Math.round(n*.65).toLocaleString();
    document.getElementById('st-remote').textContent=Math.round(n*.4).toLocaleString();
  }catch(e){}
}
init();
</script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    await ensureTable(env);

    // ── SITEMAP ──
    if (url.pathname === "/sitemap.xml") {
      const { results } = await env.DB.prepare("SELECT id FROM jobs ORDER BY id DESC LIMIT 500").all();
      const base = "https://app.jobnova.workers.dev";
      const urls = [
        `<url><loc>${base}/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>`,
        `<url><loc>${base}/?view=blog</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
        ...results.map(j => `<url><loc>${base}/?job=${j.id}</loc><changefreq>daily</changefreq><priority>0.6</priority></url>`)
      ].join('\n');
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
        { headers: { "Content-Type": "application/xml" } });
    }

    // ── RSS FEED ──
    if (url.pathname === "/feed.rss") {
      const { results } = await env.DB.prepare("SELECT * FROM jobs ORDER BY id DESC LIMIT 50").all();
      const base = "https://app.jobnova.workers.dev";
      const items = results.map(j => `
        <item>
          <title><![CDATA[${j.title} at ${j.company}]]></title>
          <link>${j.url}</link>
          <guid>${base}/?job=${j.id}</guid>
          <description><![CDATA[${j.company} — ${j.location||'Remote'} ${j.salary?'— '+j.salary:''}<br>${j.description?.slice(0,300)||''}...]]></description>
          <pubDate>${new Date(j.created_at||Date.now()).toUTCString()}</pubDate>
        </item>`).join('');
      return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>JobNova — Remote Jobs Feed</title>
  <link>${base}</link>
  <description>Latest remote job listings from JobNova</description>
  <language>en-us</language>
  <atom:link href="${base}/feed.rss" rel="self" type="application/rss+xml"/>
  ${items}
</channel>
</rss>`, { headers: { "Content-Type": "application/rss+xml" } });
    }

    // ── SUBSCRIBE ──
    if (url.pathname === "/api/subscribe" && request.method === "POST") {
      try {
        const { email, keywords } = await request.json();
        if (!email || !keywords?.length) return new Response(JSON.stringify({ success: false, error: "Email and keywords required" }), { headers: { "Content-Type": "application/json" } });
        await env.DB.prepare("INSERT OR REPLACE INTO subscribers (email, keywords) VALUES (?, ?)")
          .bind(email, JSON.stringify(keywords)).run();
        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
      } catch(e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }

    // ── JOBS API ──
    if (url.pathname === "/api/jobs") {
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = 20, offset = (page - 1) * limit;
      const category = url.searchParams.get("category") || "";
      const search = url.searchParams.get("search") || "";
      const remoteType = url.searchParams.get("remote_type") || "";
      const employType = url.searchParams.get("employment_type") || "";
      const seniority = url.searchParams.get("seniority") || "";
      const salaryMin = url.searchParams.get("salary_min") || "";
      const days = url.searchParams.get("days") || "";

      const conditions = [], params = [];
      if (category) { conditions.push("LOWER(title) LIKE ?"); params.push(`%${category}%`); }
      if (search) { conditions.push("(LOWER(title) LIKE ? OR LOWER(company) LIKE ?)"); params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`); }
      if (remoteType) { conditions.push("remote_type = ?"); params.push(remoteType); }
      if (employType) { conditions.push("employment_type = ?"); params.push(employType); }
      if (seniority) { conditions.push("LOWER(seniority) LIKE ?"); params.push(`%${seniority.toLowerCase()}%`); }
      if (salaryMin) { conditions.push("CAST(REPLACE(REPLACE(salary,'$',''),'k','') AS INTEGER) >= ?"); params.push(parseInt(salaryMin)); }
      if (days) { conditions.push("created_at >= datetime('now', '-' || ? || ' days')"); params.push(parseInt(days)); }

      const where = conditions.length ? " WHERE " + conditions.join(" AND ") : "";
      const { results } = await env.DB.prepare(`SELECT * FROM jobs${where} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`).bind(...params).all();
      const { results: cr } = await env.DB.prepare(`SELECT COUNT(*) as total FROM jobs${where}`).bind(...params).all();

      return new Response(JSON.stringify({ jobs: results, total: cr[0]?.total || 0, page }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // ── SYNC ──
    if (url.pathname === "/api/sync") {
      try {
        const result = await syncJobs(env);
        return new Response(JSON.stringify({ success: true, ...result }), { headers: { "Content-Type": "application/json" } });
      } catch(e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }

    // ── DEBUG ──
    if (url.pathname === "/api/debug") {
      const { results } = await env.DB.prepare("SELECT COUNT(*) as count FROM jobs").all();
      return new Response(JSON.stringify({ jobs_in_db: results[0]?.count || 0, api_key_set: !!env.API_KEY }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // ── MIGRATE ──
    if (url.pathname === "/api/migrate") {
      await env.DB.prepare("DROP TABLE IF EXISTS jobs").run();
      await env.DB.prepare("DROP TABLE IF EXISTS subscribers").run();
      await ensureTable(env);
      return new Response(JSON.stringify({ success: true, message: "Tables recreated" }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response(HTML_PAGE, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncJobs(env));
  }
};
