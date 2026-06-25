async function ensureTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT, company TEXT, location TEXT,
      url TEXT UNIQUE, description TEXT,
      salary TEXT, remote_type TEXT, skills TEXT,
      seniority TEXT, employment_type TEXT,
      job_handle TEXT,
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
          `INSERT OR IGNORE INTO jobs
           (title,company,location,url,description,salary,remote_type,skills,seniority,employment_type,job_handle)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`
        ).bind(
          job.title||"Unknown",
          job.company_name||"Company",
          location, jobUrl,
          job.description||"",
          salary,
          job.remote_type||"",
          JSON.stringify(job.required_skills||[]),
          Array.isArray(job.seniority)?job.seniority.join(", "):"",
          job.employment_type||"",
          job.job_handle||""
        ).run();
        if (r.meta?.changes > 0) inserted++; else skipped++;
      } catch(e) { errors.push(`DB: ${e.message.slice(0,60)}`); }
    }
  }
  return { inserted, skipped, errors: errors.slice(0,3) };
}

const BLOG_POSTS = [
  {
    id:1, cat:"Career Advice",
    title:"10 Skills Every Remote Developer Must Have in 2026",
    excerpt:"Remote work has changed what employers look for. Beyond technical skills, these soft skills separate top candidates from the rest.",
    date:"June 20, 2026", readTime:"5 min read",
    body:`<p>The remote job market in 2026 is more competitive than ever. With thousands of developers applying for the same roles, it's no longer enough to be technically skilled — you need to master the full stack of remote work competencies.</p>
      <h2>1. Asynchronous Communication</h2><p>Remote teams operate across time zones. The ability to write clear, concise, and actionable messages is as important as coding ability.</p>
      <h2>2. Self-Management & Discipline</h2><p>Without a manager physically present, you need strong self-management. Tools like Notion, Linear, and time-boxing techniques are your best friends.</p>
      <h2>3. Deep Work Focus</h2><p>Top remote developers cultivate the ability to enter deep focus states — 2-4 hour blocks of uninterrupted work.</p>
      <h2>4. Proactive Visibility</h2><p>Remote workers must proactively share their progress, flag blockers early, and contribute visibly to team channels.</p>
      <h2>5. Cloud & DevOps Literacy</h2><p>Even frontend developers benefit from understanding Docker, CI/CD pipelines, and cloud deployment.</p>
      <h2>6. Strong Git Practices</h2><p>Clean commit history, descriptive PR descriptions, and code review etiquette are critical when your team never meets in person.</p>
      <h2>7. Time Zone Awareness</h2><p>Always specify time zones when scheduling. Use UTC as your mental anchor.</p>
      <h2>8. Written Documentation</h2><p>Remote teams live and die by their documentation. Contributing to wikis and keeping READMEs updated is a valued skill.</p>
      <h2>9. Video Communication Presence</h2><p>Good lighting, a decent microphone, and the ability to present your work clearly on a call are increasingly important.</p>
      <h2>10. Continuous Learning Mindset</h2><p>Developers who embrace new tools — AI coding assistants, new frameworks, collaboration software — stay ahead of the curve.</p>`
  },
  {
    id:2, cat:"Salary Guide",
    title:"Remote Developer Salaries in 2026: What You Should Be Earning",
    excerpt:"Salary data from 600+ remote job listings reveals what companies are actually paying — broken down by role, seniority, and region.",
    date:"June 18, 2026", readTime:"7 min read",
    body:`<p>Based on our analysis of 600+ active remote job listings, here's what the market is paying in 2026.</p>
      <h2>Frontend Developer</h2><ul><li><strong>Junior:</strong> $55k – $85k</li><li><strong>Mid-level:</strong> $85k – $130k</li><li><strong>Senior:</strong> $130k – $200k</li><li><strong>Staff:</strong> $180k – $280k+</li></ul>
      <h2>Backend Developer</h2><ul><li><strong>Junior:</strong> $60k – $90k</li><li><strong>Mid-level:</strong> $90k – $145k</li><li><strong>Senior:</strong> $145k – $220k</li></ul>
      <h2>Data Scientist / ML Engineer</h2><ul><li><strong>Junior:</strong> $70k – $100k</li><li><strong>Mid-level:</strong> $100k – $160k</li><li><strong>Senior:</strong> $160k – $240k</li></ul>
      <h2>DevOps / Platform Engineer</h2><ul><li><strong>Mid-level:</strong> $100k – $155k</li><li><strong>Senior:</strong> $155k – $230k</li></ul>
      <h2>Negotiation Tips</h2><p>Always negotiate. The first offer is rarely the best offer. Equity, signing bonuses, and learning stipends can add significant value beyond base salary.</p>`
  },
  {
    id:3, cat:"Job Search",
    title:"How to Land a Remote Job in 30 Days: A Practical Playbook",
    excerpt:"A step-by-step system that has helped thousands of developers secure remote offers — without connections or a fancy resume.",
    date:"June 15, 2026", readTime:"9 min read",
    body:`<p>Landing a remote job feels overwhelming. This playbook breaks it down into a focused 30-day system.</p>
      <h2>Week 1: Foundation</h2><p>Define your target role. Polish your resume — one page, quantify everything. Build a tracking spreadsheet.</p>
      <h2>Week 2: Volume with Quality</h2><p>Apply to 5-10 jobs per day with personalized applications. Early applications (within 24 hours) have significantly higher response rates.</p>
      <h2>Week 3: Parallel Tracks</h2><p>Work on your portfolio while applications are processing. One impressive deployed project beats five mediocre ones.</p>
      <h2>Week 4: Interview Preparation</h2><p>Prepare for behavioral questions (STAR method), system design basics, and live coding. For remote interviews, test your setup the night before.</p>
      <h2>The Numbers Game</h2><p>Expect roughly: 100 applications → 15 phone screens → 5 technical rounds → 2 offers. Apply every day without fail.</p>`
  },
  {
    id:4, cat:"Industry Trends",
    title:"The State of Remote Work in 2026: What's Changed",
    excerpt:"Remote work has matured. The hype is gone, but the opportunity is bigger than ever — for those who know where to look.",
    date:"June 10, 2026", readTime:"6 min read",
    body:`<p>Remote work has reached equilibrium in 2026. Here's what the data tells us.</p>
      <h2>What's Changed Since 2024</h2><p>Fully remote roles have stabilized at 30-35% of white-collar job postings. Hybrid is the default for large companies; fully remote is the default for tech startups.</p>
      <h2>Who's Hiring Remote in 2026</h2><p>Companies that were remote-first before 2020 have doubled down. Shopify, GitLab, Automattic, and hundreds of SaaS companies continue to hire globally.</p>
      <h2>AI's Impact on Remote Job Descriptions</h2><p>"AI integration," "LLM fine-tuning," and "prompt engineering" appear in a growing percentage of software job listings.</p>
      <h2>What to Expect in the Next 12 Months</h2><p>Continued growth in async-first companies and increasing demand for developers proficient with AI tools.</p>`
  },
  {
    id:5, cat:"Tools & Productivity",
    title:"The Remote Developer's Essential Toolkit for 2026",
    excerpt:"The apps, workflows, and hardware setups that top remote developers swear by.",
    date:"June 5, 2026", readTime:"5 min read",
    body:`<p>The right tools make remote work easier and make you look more professional.</p>
      <h2>Communication</h2><ul><li><strong>Slack / Discord:</strong> Async team chat</li><li><strong>Loom:</strong> Record quick video explanations</li><li><strong>Notion:</strong> Documentation</li></ul>
      <h2>Development</h2><ul><li><strong>GitHub Copilot / Cursor:</strong> AI pair programming</li><li><strong>Linear:</strong> Replaced Jira at most startups</li><li><strong>Cloudflare Workers:</strong> Zero-ops deployment</li></ul>
      <h2>Focus & Productivity</h2><ul><li><strong>Raycast:</strong> Launcher that replaces dozens of apps</li><li><strong>Cold Turkey:</strong> Website blocker for deep work</li></ul>
      <h2>The One Tool Most People Underuse</h2><p>A dedicated work browser profile with only work-related extensions. The psychological separation helps maintain work/life boundaries.</p>`
  },
  {
    id:6, cat:"Interview Prep",
    title:"Remote Technical Interviews: What's Different and How to Prepare",
    excerpt:"Remote interviews have their own unique challenges and opportunities. Here's how to ace them.",
    date:"June 1, 2026", readTime:"6 min read",
    body:`<p>Technical interviews have evolved for remote positions. Companies look for additional signals beyond pure coding ability.</p>
      <h2>The Setup Check</h2><p>Do a full tech check the evening before: camera, mic, internet backup, and the coding environment they'll use.</p>
      <h2>Communicating While You Code</h2><p>Narrate your thinking continuously — more than feels natural. "I'm considering using a hash map here because..." beats silence.</p>
      <h2>Questions They Ask Remote Candidates</h2><ul><li>"How do you handle a blocker when your team lead is in a different time zone?"</li><li>"How do you stay productive when working from home?"</li><li>"Tell me about a time you communicated a complex technical decision in writing."</li></ul>
      <h2>Closing the Interview</h2><p>Ask about the team's communication culture: "Is the team primarily async or do you have set meeting times?"</p>`
  }
];

const HTML_PAGE = `<!DOCTYPE html>
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
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#060B18;--bg2:#0D1525;--card:#111827;--border:#1E2D45;--border-h:#2563EB;
  --accent:#2563EB;--accent-l:#3B82F6;--accent-g:rgba(37,99,235,.15);
  --green:#10B981;--amber:#F59E0B;--salary:#34D399;
  --t1:#F1F5F9;--t2:#94A3B8;--t3:#475569;
  --sw:260px;--r:14px;
}
html{scroll-behavior:smooth}
body{font-family:'Inter',-apple-system,sans-serif;background:var(--bg);color:var(--t1);min-height:100vh;line-height:1.6;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:var(--bg2)}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}

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
.sidebar{width:var(--sw);background:var(--bg2);border-right:1px solid var(--border);padding:28px 20px;position:sticky;top:37px;height:calc(100vh - 37px);overflow-y:auto;flex-shrink:0;display:flex;flex-direction:column;gap:24px}
.logo{font-size:26px;font-weight:900;letter-spacing:-1px;background:linear-gradient(135deg,#3B82F6,#60A5FA,#93C5FD);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;display:block;line-height:1.1}
.logo-sub{font-size:11px;color:var(--t3);letter-spacing:2px;text-transform:uppercase;font-weight:500;margin-top:4px}
.s-title{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:8px}
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
.footer-links{display:flex;flex-direction:column;gap:4px}
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
.adv-filters{padding:14px 40px;border-bottom:1px solid var(--border);display:none;gap:12px;flex-wrap:wrap;background:var(--bg);align-items:flex-end}
.adv-filters.open{display:flex}
.filter-select{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--t2);font-size:13px;font-family:inherit;cursor:pointer;outline:none;transition:border-color .2s}
.filter-select:focus{border-color:var(--accent)}
.filter-label{font-size:12px;color:var(--t3);display:flex;flex-direction:column;gap:4px}
.salary-input{width:100px;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--t1);font-size:13px;font-family:inherit;outline:none}
.salary-input:focus{border-color:var(--accent)}
.clear-filters-btn{padding:8px 16px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--t3);font-size:13px;cursor:pointer;font-family:inherit;transition:all .2s}
.clear-filters-btn:hover{color:var(--t1);border-color:var(--t2)}

/* CONTENT */
.content-wrap{padding:28px 40px}
.results-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;gap:12px;flex-wrap:wrap}
.results-count{font-size:14px;color:var(--t3)}
.results-count strong{color:var(--t1);font-weight:600}
.adv-toggle-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--t2);font-size:13px;cursor:pointer;font-family:inherit;transition:all .2s}
.adv-toggle-btn:hover,.adv-toggle-btn.active{background:var(--accent-g);border-color:var(--accent-l);color:var(--accent-l)}

/* JOB CARDS */
.jobs-list{display:flex;flex-direction:column;gap:12px}
.job-card{background:var(--card);border:1.5px solid var(--border);border-radius:var(--r);padding:20px 24px;cursor:pointer;transition:all .25s;position:relative;overflow:hidden}
.job-card::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,var(--accent-g),transparent);opacity:0;transition:opacity .25s}
.job-card:hover{border-color:var(--border-h);transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,.4)}
.job-card:hover::before{opacity:1}
.card-top{display:flex;align-items:flex-start;gap:16px;position:relative}
.co-logo{width:48px;height:48px;border-radius:10px;background:var(--bg2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:var(--accent-l);overflow:hidden;flex-shrink:0;text-transform:uppercase}
.co-logo img{width:100%;height:100%;object-fit:contain;padding:6px}
.job-info{flex:1;min-width:0}
.job-title{font-size:16px;font-weight:700;color:var(--t1);margin-bottom:4px;line-height:1.3}
.job-co{font-size:14px;color:var(--accent-l);font-weight:600;margin-bottom:10px;cursor:pointer;display:inline-block;background:none;border:none;font-family:inherit;padding:0}
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
.save-btn,.share-btn{width:32px;height:32px;border-radius:8px;background:transparent;border:1px solid var(--border);color:var(--t3);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;transition:all .2s;position:relative;z-index:1}
.save-btn:hover{border-color:var(--amber);color:var(--amber)}
.save-btn.saved{background:rgba(245,158,11,.1);border-color:var(--amber);color:var(--amber)}
.share-btn:hover{border-color:var(--accent-l);color:var(--accent-l)}
.apply-arr{width:32px;height:32px;border-radius:8px;background:var(--accent-g);border:1px solid rgba(37,99,235,.2);color:var(--accent-l);display:flex;align-items:center;justify-content:center;font-size:14px;transition:all .2s}
.job-card:hover .apply-arr{background:var(--accent);border-color:var(--accent);color:#fff}

/* TOAST */
.toast{position:fixed;bottom:24px;right:24px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px 20px;font-size:14px;color:var(--t1);display:flex;align-items:center;gap:10px;box-shadow:0 8px 32px rgba(0,0,0,.5);transform:translateY(100px);opacity:0;transition:all .3s;z-index:999;max-width:320px}
.toast.show{transform:translateY(0);opacity:1}
.toast-icon{font-size:16px}

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
.detail-co-name{font-size:16px;font-weight:600;color:var(--accent-l);cursor:pointer;background:none;border:none;font-family:inherit;padding:0}
.detail-co-name:hover{text-decoration:underline}
.detail-co-loc{font-size:13px;color:var(--t3)}
.detail-title{font-size:28px;font-weight:800;letter-spacing:-.5px;margin-bottom:16px}
.detail-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}
.detail-salary{font-size:22px;font-weight:800;color:var(--salary);margin-bottom:8px}
.detail-body{padding:32px}
.s-title{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:14px}
.skills-grid{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:28px}
.skill-tag{background:rgba(37,99,235,.08);border:1px solid rgba(37,99,235,.15);color:var(--accent-l);font-size:13px;padding:5px 12px;border-radius:8px;font-weight:500}
.desc-body{font-size:15px;color:var(--t2);line-height:1.8;margin-bottom:32px;white-space:pre-line}
.detail-actions{display:flex;gap:12px;flex-wrap:wrap}
.apply-btn{display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,#2563EB,#3B82F6);color:#fff;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:700;font-family:inherit;text-decoration:none;border:none;cursor:pointer;transition:all .2s;box-shadow:0 4px 20px rgba(37,99,235,.3)}
.apply-btn:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(37,99,235,.4)}
.share-detail-btn{display:inline-flex;align-items:center;gap:8px;background:transparent;border:1.5px solid var(--border);color:var(--t2);padding:14px 24px;border-radius:12px;font-size:15px;font-weight:600;font-family:inherit;cursor:pointer;transition:all .2s}
.share-detail-btn:hover{border-color:var(--accent-l);color:var(--accent-l)}

/* COMPANY */
.company-wrap{padding:32px 40px;max-width:800px}
.company-hdr{background:var(--card);border:1.5px solid var(--border);border-radius:18px;padding:32px;margin-bottom:24px}
.company-hdr-top{display:flex;align-items:center;gap:20px;margin-bottom:16px}
.company-big-logo{width:80px;height:80px;border-radius:16px;background:var(--bg2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800;color:var(--accent-l);overflow:hidden;flex-shrink:0}
.company-big-logo img{width:100%;height:100%;object-fit:contain;padding:10px}
.company-name{font-size:26px;font-weight:800;letter-spacing:-.5px;margin-bottom:6px}
.company-stat{font-size:14px;color:var(--t2)}
.company-stat strong{color:var(--t1);font-weight:700}

/* SAVED */
.saved-wrap{padding:32px 40px;max-width:800px}
.saved-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
.saved-hdr h2{font-size:22px;font-weight:800}
.clear-saved-btn{padding:8px 16px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--t3);font-size:13px;cursor:pointer;font-family:inherit;transition:all .2s}
.clear-saved-btn:hover{border-color:#f87171;color:#f87171}

/* ALERTS */
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
.submit-btn:hover{transform:translateY(-1px)}
.kw-chip{display:inline-flex;align-items:center;gap:6px;background:var(--accent-g);border:1px solid rgba(37,99,235,.2);color:var(--accent-l);padding:5px 12px;border-radius:20px;font-size:13px;font-weight:500;margin:4px}
.kw-chip button{background:none;border:none;color:var(--accent-l);cursor:pointer;font-size:14px;line-height:1;padding:0}

/* BLOG */
.blog-wrap{padding:32px 40px;max-width:900px}
.blog-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;margin-top:24px}
.blog-card{background:var(--card);border:1.5px solid var(--border);border-radius:var(--r);padding:24px;cursor:pointer;transition:all .25s}
.blog-card:hover{border-color:var(--border-h);transform:translateY(-2px)}
.blog-cat{font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent-l);margin-bottom:10px}
.blog-title{font-size:17px;font-weight:700;margin-bottom:10px;line-height:1.4}
.blog-excerpt{font-size:14px;color:var(--t2);line-height:1.7;margin-bottom:16px}
.blog-meta{font-size:12px;color:var(--t3);display:flex;gap:12px}

/* ARTICLE */
.article-wrap{padding:32px 40px;max-width:720px}
.article-cat{font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent-l);margin-bottom:12px}
.article-title{font-size:32px;font-weight:900;letter-spacing:-.5px;line-height:1.2;margin-bottom:16px}
.article-meta{font-size:13px;color:var(--t3);display:flex;gap:16px;margin-bottom:32px}
.article-body h2{font-size:20px;font-weight:700;margin:28px 0 12px;color:var(--t1)}
.article-body p{font-size:15px;color:var(--t2);line-height:1.8;margin-bottom:14px}
.article-body ul{padding-left:20px;margin-bottom:14px}
.article-body ul li{font-size:15px;color:var(--t2);line-height:1.8;margin-bottom:6px}
.article-body strong{color:var(--t1)}

/* STATIC */
.static-wrap{padding:48px 40px;max-width:760px}
.static-wrap h1{font-size:28px;font-weight:800;margin-bottom:8px}
.static-date{font-size:13px;color:var(--t3);margin-bottom:32px}
.static-wrap h2{font-size:18px;font-weight:700;margin:28px 0 12px}
.static-wrap p{font-size:15px;color:var(--t2);line-height:1.8;margin-bottom:12px}
.static-wrap ul{padding-left:20px;margin-bottom:12px}
.static-wrap ul li{font-size:15px;color:var(--t2);line-height:1.8;margin-bottom:6px}
.static-wrap a{color:var(--accent-l)}

/* THEME TOGGLE */
.theme-btn{width:36px;height:36px;border-radius:8px;border:1px solid var(--border);background:var(--bg2);color:var(--t2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;transition:all .2s}
.theme-btn:hover{border-color:var(--accent-l);color:var(--accent-l)}

/* LIGHT MODE */
body.light{--bg:#F8FAFC;--bg2:#F1F5F9;--card:#FFFFFF;--border:#E2E8F0;--t1:#0F172A;--t2:#475569;--t3:#94A3B8}

/* MOBILE HEADER */
.mob-hdr{display:none;padding:14px 20px;background:var(--bg2);border-bottom:1px solid var(--border);align-items:center;justify-content:space-between;position:sticky;top:37px;z-index:50;gap:12px}
.mob-logo{font-size:20px;font-weight:900;letter-spacing:-.5px;background:linear-gradient(135deg,#3B82F6,#60A5FA);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.mob-btns{display:flex;gap:8px}

/* MOBILE DRAWER */
.drawer-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:200;backdrop-filter:blur(2px)}
.drawer-overlay.open{display:block}
.mob-drawer{position:fixed;top:0;left:-290px;width:280px;height:100vh;background:var(--bg2);border-right:1px solid var(--border);z-index:201;transition:left .3s ease;overflow-y:auto;padding:24px 16px;display:flex;flex-direction:column;gap:24px}
.mob-drawer.open{left:0}
.drawer-close{position:absolute;top:16px;right:16px;background:none;border:1px solid var(--border);color:var(--t2);width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center}

@media(max-width:768px){
  .sidebar{display:none}
  .mob-hdr{display:flex}
  .hero{padding:24px 20px 20px}
  .hero-title{font-size:24px}
  .filters-bar{padding:12px 16px}
  .adv-filters{padding:14px 16px}
  .content-wrap{padding:20px 16px}
  .detail-wrap,.company-wrap,.saved-wrap,.alert-wrap,.blog-wrap,.article-wrap,.static-wrap{padding:20px 16px}
  .detail-title{font-size:22px}
  .article-title{font-size:24px}
  .blog-grid{grid-template-columns:1fr}
  .job-right{align-items:flex-start}
  .detail-actions{flex-direction:column}
  .apply-btn,.share-detail-btn{width:100%;justify-content:center}
}
</style>
</head>
<body>

<!-- DRAWER OVERLAY -->
<div class="drawer-overlay" id="drawerOverlay" onclick="closeDrawer()"></div>

<!-- MOBILE DRAWER -->
<div class="mob-drawer" id="mobDrawer">
  <button class="drawer-close" onclick="closeDrawer()">✕</button>
  <div>
    <span class="logo">JobNova</span>
    <span class="logo-sub">Career Platform</span>
  </div>
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
    <button class="nav-btn" onclick="goView('saved');closeDrawer()"><span class="nav-icon">🔖</span>Saved Jobs</button>
    <button class="nav-btn" onclick="goView('alerts');closeDrawer()"><span class="nav-icon">🔔</span>Job Alerts</button>
    <button class="nav-btn" onclick="goView('blog');closeDrawer()"><span class="nav-icon">📝</span>Career Blog</button>
    <button class="nav-btn" onclick="toggleTheme()"><span class="nav-icon" id="drawerThemeIcon">🌙</span>Dark / Light</button>
  </div>
  <div style="margin-top:auto">
    <div class="s-title">Legal</div>
    <button class="footer-link" onclick="showStatic('privacy');closeDrawer()">Privacy Policy</button>
    <button class="footer-link" onclick="showStatic('terms');closeDrawer()">Terms of Service</button>
    <button class="footer-link" onclick="showStatic('disclaimer');closeDrawer()">Disclaimer</button>
    <div style="margin-top:16px;font-size:11px;color:var(--t3)">© 2026 JobNova</div>
  </div>
</div>

<!-- TICKER -->
<div class="ticker-wrap">
  <div class="ticker-track">
    <span class="t-item"><span class="t-dot"></span><strong id="tc1">613</strong> Active Jobs</span>
    <span class="t-item">💼 Updated hourly via AI matching</span>
    <span class="t-item">🌍 Remote-first opportunities worldwide</span>
    <span class="t-item">⚡ Dev · Design · Marketing · Data · DevOps</span>
    <span class="t-item">✅ Verified company listings</span>
    <span class="t-item">🚀 New jobs added every hour</span>
    <span class="t-item"><span class="t-dot"></span><strong id="tc2">613</strong> Active Jobs</span>
    <span class="t-item">💼 Updated hourly via AI matching</span>
    <span class="t-item">🌍 Remote-first opportunities worldwide</span>
    <span class="t-item">⚡ Dev · Design · Marketing · Data · DevOps</span>
    <span class="t-item">✅ Verified company listings</span>
    <span class="t-item">🚀 New jobs added every hour</span>
  </div>
</div>

<!-- MOBILE HEADER -->
<div class="mob-hdr">
  <span class="mob-logo">JobNova</span>
  <div class="mob-btns">
    <button class="theme-btn" onclick="toggleTheme()" id="themeBtn">🌙</button>
    <button class="theme-btn" onclick="goView('saved')">🔖</button>
    <button class="theme-btn" onclick="openDrawer()">☰</button>
  </div>
</div>

<!-- APP -->
<div class="app">

  <!-- SIDEBAR -->
  <aside class="sidebar">
    <div>
      <span class="logo">JobNova</span>
      <span class="logo-sub">Career Platform</span>
    </div>
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
      <button class="nav-btn" onclick="goView('saved')"><span class="nav-icon">🔖</span>Saved Jobs<span class="nav-count" id="saved-cnt">0</span></button>
      <button class="nav-btn" onclick="goView('alerts')"><span class="nav-icon">🔔</span>Job Alerts</button>
      <button class="nav-btn" onclick="goView('blog')"><span class="nav-icon">📝</span>Career Blog</button>
      <button class="nav-btn" onclick="toggleTheme()"><span class="nav-icon" id="themeNavIcon">🌙</span>Dark / Light</button>
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
        <button class="footer-link" onclick="showStatic('privacy')">Privacy Policy</button>
        <button class="footer-link" onclick="showStatic('terms')">Terms of Service</button>
        <button class="footer-link" onclick="showStatic('disclaimer')">Disclaimer</button>
      </div>
      <div style="margin-top:14px;font-size:11px;color:var(--t3)">© 2026 JobNova. All rights reserved.</div>
    </div>
  </aside>

  <!-- MAIN -->
  <main class="main">

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

      <div class="filters-bar">
        <button class="chip active" onclick="filterCat('','All Jobs')">All Jobs</button>
        <button class="chip" onclick="filterCat('developer','Development')">💻 Development</button>
        <button class="chip" onclick="filterCat('designer','Design')">🎨 Design</button>
        <button class="chip" onclick="filterCat('marketing','Marketing')">📣 Marketing</button>
        <button class="chip" onclick="filterCat('data','Data & AI')">📊 Data & AI</button>
        <button class="chip" onclick="filterCat('devops','DevOps')">⚙️ DevOps</button>
        <button class="chip" onclick="filterCat('manager','Management')">👔 Management</button>
        <button class="chip" onclick="filterCat('writer','Writing')">✍️ Writing</button>
      </div>

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
          <input type="number" class="salary-input" id="fSalaryMin" placeholder="e.g. 80" oninput="debounceAdv()">
        </label>
        <label class="filter-label">Posted Within
          <select class="filter-select" id="fDate" onchange="applyAdvFilters()">
            <option value="">Any time</option>
            <option value="1">Today</option>
            <option value="7">This week</option>
            <option value="30">This month</option>
          </select>
        </label>
        <button class="clear-filters-btn" onclick="clearAdvFilters()">✕ Clear</button>
      </div>

      <div class="content-wrap">
        <div class="results-hdr">
          <div class="results-count" id="resultsCount">Loading...</div>
          <button class="adv-toggle-btn" id="advToggleBtn" onclick="toggleAdv()">⚙️ Filters</button>
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
          <div class="alert-sub">Get notified by email when new matching jobs are posted.</div>
          <div class="form-group">
            <label class="form-label">Your Email Address</label>
            <input type="email" class="form-input" id="alertEmail" placeholder="you@example.com">
          </div>
          <div class="form-group">
            <label class="form-label">Keywords <span style="color:var(--t3);font-weight:400">(press Enter to add)</span></label>
            <input type="text" class="form-input" id="alertKwInput" placeholder="e.g. React, Python, Remote..." onkeydown="addKeyword(event)">
            <div style="margin-top:10px" id="kwWrap"></div>
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
    <div id="vArticle" style="display:none"><div class="article-wrap" id="articleContent"></div></div>

    <!-- STATIC PAGES -->
    <div id="vStatic" style="display:none"><div class="static-wrap" id="staticContent"></div></div>

  </main>
</div>

<!-- TOAST -->
<div class="toast" id="toast"><span class="toast-icon" id="toastIcon">✓</span><span id="toastMsg">Done</span></div>

<script>
// ── STATE ──
let pg=1, cat='', srch='', advT, srchT;
let jobs=[], total=0;
let savedIds=JSON.parse(localStorage.getItem('jn_saved')||'[]');
let alertKws=[];
let adv={remote:'',employ:'',seniority:'',salaryMin:'',days:''};
let isLight=localStorage.getItem('jn_theme')==='light';

// ── THEME ──
function applyTheme(){
  document.body.classList.toggle('light',isLight);
  const ic=isLight?'☀️':'🌙';
  const tb=document.getElementById('themeBtn');
  const tni=document.getElementById('themeNavIcon');
  const dti=document.getElementById('drawerThemeIcon');
  if(tb)tb.textContent=ic;
  if(tni)tni.textContent=ic;
  if(dti)dti.textContent=ic;
}
function toggleTheme(){isLight=!isLight;localStorage.setItem('jn_theme',isLight?'light':'dark');applyTheme();}
applyTheme();

// ── DRAWER ──
function openDrawer(){
  document.getElementById('mobDrawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeDrawer(){
  document.getElementById('mobDrawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
  document.body.style.overflow='';
}

// ── HELPERS ──
function initials(n){return(n||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();}
function logoHtml(co,sz='48px',cls='co-logo'){
  const slug=(co||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const ini=initials(co);
  return \`<div class="\${cls}" style="width:\${sz};height:\${sz}">
    <img src="https://logo.clearbit.com/\${slug}.com" alt="\${co}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
    <span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:\${parseInt(sz)*.33}px;font-weight:800;color:var(--accent-l)">\${ini}</span>
  </div>\`;
}
function remoteTag(t){
  if(!t)return'';
  const m={fully_remote:['tag-remote','🌐 Remote'],hybrid:['tag-hybrid','🏢 Hybrid'],on_site:['tag-onsite','📍 On-site'],onsite:['tag-onsite','📍 On-site']};
  const[cls,lbl]=m[t]||['tag-onsite',t.replace(/_/g,' ')];
  return\`<span class="tag \${cls}">\${lbl}</span>\`;
}
function isNew(ts){if(!ts)return false;return Date.now()-new Date(ts).getTime()<86400000;}
function showToast(msg,type='success'){
  const el=document.getElementById('toast');
  document.getElementById('toastMsg').textContent=msg;
  document.getElementById('toastIcon').textContent=type==='success'?'✓':'ℹ';
  el.className='toast show';
  setTimeout(()=>el.classList.remove('show'),3000);
}
function updateSavedCount(){document.getElementById('saved-cnt').textContent=savedIds.length||0;}

// ── VIEWS ──
const VIEWS=['vJobs','vDetail','vCompany','vSaved','vAlerts','vBlog','vArticle','vStatic'];
function showView(id){VIEWS.forEach(v=>document.getElementById(v).style.display=v===id?'block':'none');window.scrollTo(0,0);}

function goView(v){
  if(v==='jobs'){showView('vJobs');return;}
  if(v==='saved'){showView('vSaved');renderSaved();return;}
  if(v==='alerts'){showView('vAlerts');return;}
  if(v==='blog'){showView('vBlog');renderBlog();return;}
}

// ── ADV FILTERS ──
function toggleAdv(){
  const el=document.getElementById('advFilters');
  const btn=document.getElementById('advToggleBtn');
  el.classList.toggle('open');
  btn.classList.toggle('active');
}
function applyAdvFilters(){
  adv.remote=document.getElementById('fRemote').value;
  adv.employ=document.getElementById('fEmploy').value;
  adv.seniority=document.getElementById('fSeniority').value;
  adv.salaryMin=document.getElementById('fSalaryMin').value;
  adv.days=document.getElementById('fDate').value;
  pg=1;loadJobs();
}
function debounceAdv(){clearTimeout(advT);advT=setTimeout(applyAdvFilters,500);}
function clearAdvFilters(){
  ['fRemote','fEmploy','fSeniority','fDate'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('fSalaryMin').value='';
  adv={remote:'',employ:'',seniority:'',salaryMin:'',days:''};
  pg=1;loadJobs();
}

// ── LOAD JOBS ──
async function loadJobs(){
  document.getElementById('jobsList').innerHTML='<div class="loader-wrap"><div class="loader"></div></div>';
  document.getElementById('pagination').innerHTML='';
  const p=new URLSearchParams({page:pg});
  if(cat)p.set('category',cat);
  if(srch)p.set('search',srch);
  if(adv.remote)p.set('remote_type',adv.remote);
  if(adv.employ)p.set('employment_type',adv.employ);
  if(adv.seniority)p.set('seniority',adv.seniority);
  if(adv.salaryMin)p.set('salary_min',adv.salaryMin);
  if(adv.days)p.set('days',adv.days);
  try{
    const res=await fetch('/api/jobs?'+p);
    const data=await res.json();
    jobs=data.jobs||[];total=data.total||0;
    document.getElementById('resultsCount').innerHTML=\`<strong>\${total.toLocaleString()}</strong> jobs found\${cat?' in <strong>'+cat+'</strong>':''}\${srch?' for "<strong>'+srch+'</strong>"':''}\`;
    if(!jobs.length){
      document.getElementById('jobsList').innerHTML='<div class="empty"><div class="e-icon">🔍</div><h3>No jobs found</h3><p>Try different keywords or browse all categories</p></div>';
      return;
    }
    document.getElementById('jobsList').innerHTML=jobs.map(j=>{
      const saved=savedIds.includes(j.id);
      const newBadge=isNew(j.created_at)?'<span class="tag-new">NEW</span>':'';
      return\`<article class="job-card" onclick="showDetail(\${j.id})" tabindex="0" role="button">
        <div class="card-top">
          \${logoHtml(j.company)}
          <div class="job-info">
            <div class="job-title">\${j.title} \${newBadge}</div>
            <button class="job-co" onclick="event.stopPropagation();showCompany('\${encodeURIComponent(j.company)}')">\${j.company}</button>
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
              <button class="save-btn\${saved?' saved':''}" onclick="event.stopPropagation();toggleSave(\${j.id})" id="sb-\${j.id}" title="Save job">\${saved?'🔖':'🔖'}</button>
              <button class="share-btn" onclick="event.stopPropagation();shareJob(\${j.id})" title="Copy link">🔗</button>
              <div class="apply-arr">→</div>
            </div>
          </div>
        </div>
      </article>\`;
    }).join('');
    const tp=Math.ceil(total/20);
    if(tp>1)document.getElementById('pagination').innerHTML=\`
      <button class="page-btn" onclick="goPage(\${pg-1})" \${pg===1?'disabled':''}>← Prev</button>
      <span class="page-info">Page \${pg} of \${tp}</span>
      <button class="page-btn" onclick="goPage(\${pg+1})" \${pg===tp?'disabled':''}>Next →</button>\`;
    document.querySelectorAll('.job-card').forEach(c=>c.addEventListener('keydown',e=>{if(e.key==='Enter')c.click();}));
  }catch(e){
    document.getElementById('jobsList').innerHTML='<div class="empty"><div class="e-icon">⚠️</div><h3>Failed to load</h3><p>Please refresh and try again</p></div>';
  }
}

// ── JOB DETAIL ──
async function showDetail(id){
  showView('vDetail');
  document.getElementById('detailContent').innerHTML=\`
    <button class="back-btn" onclick="goView('jobs')">← Back to Jobs</button>
    <div class="loader-wrap"><div class="loader"></div></div>\`;
  let j=jobs.find(x=>x.id===id);
  try{
    const res=await fetch('/api/job?id='+id);
    if(res.ok){const d=await res.json();if(!d.error)j=d;}
  }catch(e){}
  if(!j){
    document.getElementById('detailContent').innerHTML=\`<button class="back-btn" onclick="goView('jobs')">← Back to Jobs</button><div class="empty"><div class="e-icon">⚠️</div><h3>Job not found</h3></div>\`;
    return;
  }
  let skills=[];try{skills=JSON.parse(j.skills||'[]');}catch(e){}
  const saved=savedIds.includes(j.id);
  document.getElementById('detailContent').innerHTML=\`
    <button class="back-btn" onclick="goView('jobs')">← Back to Jobs</button>
    <div class="detail-card">
      <div class="detail-hdr">
        <div class="detail-co-row">
          \${logoHtml(j.company,'64px','detail-logo')}
          <div>
            <button class="detail-co-name" onclick="showCompany('\${encodeURIComponent(j.company)}')">\${j.company}</button>
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
        <div class="desc-body">\${j.description&&j.description.length>20?j.description:'<span style="color:var(--t3)">Full description available on the company website. Click Apply Now to view complete details.</span>'}</div>
        <div class="detail-actions">
          <a href="\${j.url}" target="_blank" rel="noopener" class="apply-btn">Apply Now →</a>
          <button class="share-detail-btn" onclick="shareJob(\${j.id})">🔗 Copy Link</button>
          <button class="share-detail-btn" id="save-detail-btn" onclick="toggleSave(\${j.id});updateSaveBtn(\${j.id})">\${saved?'🔖 Saved':'🔖 Save'}</button>
        </div>
      </div>
    </div>\`;
}

function updateSaveBtn(id){
  const btn=document.getElementById('save-detail-btn');
  if(btn)btn.textContent=savedIds.includes(id)?'🔖 Saved':'🔖 Save';
}

// ── COMPANY ──
async function showCompany(encodedName){
  const name=decodeURIComponent(encodedName);
  showView('vCompany');
  document.getElementById('companyContent').innerHTML='<div class="loader-wrap"><div class="loader"></div></div>';
  try{
    const res=await fetch('/api/jobs?search='+encodeURIComponent(name)+'&page=1');
    const data=await res.json();
    const coJobs=(data.jobs||[]).filter(j=>j.company===name);
    document.getElementById('companyContent').innerHTML=\`
      <button class="back-btn" onclick="goView('jobs')">← Back to Jobs</button>
      <div class="company-hdr">
        <div class="company-hdr-top">
          \${logoHtml(name,'80px','company-big-logo')}
          <div>
            <div class="company-name">\${name}</div>
            <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:6px">
              <span class="company-stat"><strong>\${coJobs.length}</strong> open roles</span>
              \${coJobs.filter(j=>j.salary).length?'<span class="company-stat"><strong>'+coJobs.filter(j=>j.salary).length+'</strong> with salary</span>':''}
            </div>
          </div>
        </div>
      </div>
      <div style="margin-bottom:16px;font-size:14px;color:var(--t2)">All open positions at <strong style="color:var(--t1)">\${name}</strong></div>
      <div class="jobs-list">\${coJobs.map(j=>\`
        <article class="job-card" onclick="jobs=[...jobs,\${JSON.stringify(j)}];showDetail(\${j.id})" tabindex="0">
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
  if(idx>=0){savedIds.splice(idx,1);showToast('Removed from saved','info');}
  else{savedIds.push(id);showToast('Job saved! 🔖');}
  localStorage.setItem('jn_saved',JSON.stringify(savedIds));
  updateSavedCount();
  const btn=document.getElementById('sb-'+id);
  if(btn)btn.classList.toggle('saved',savedIds.includes(id));
}
function shareJob(id){
  const url=window.location.origin+'/?job='+id;
  navigator.clipboard.writeText(url).then(()=>showToast('Link copied! 🔗')).catch(()=>showToast('Copy: '+url,'info'));
}

// ── SAVED ──
function renderSaved(){
  if(!savedIds.length){
    document.getElementById('savedList').innerHTML='<div class="empty"><div class="e-icon">🔖</div><h3>No saved jobs yet</h3><p>Click the bookmark icon on any job to save it</p></div>';
    return;
  }
  const saved=jobs.filter(j=>savedIds.includes(j.id));
  if(!saved.length){
    document.getElementById('savedList').innerHTML='<div class="empty"><div class="e-icon">🔖</div><h3>Browse jobs and save the ones you like</h3></div>';
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
function clearAllSaved(){savedIds=[];localStorage.removeItem('jn_saved');updateSavedCount();renderSaved();showToast('Cleared','info');}

// ── ALERTS ──
function addKeyword(e){
  if(e.key!=='Enter')return;
  const inp=document.getElementById('alertKwInput');
  const val=inp.value.trim();if(!val)return;
  if(!alertKws.includes(val)){alertKws.push(val);renderKws();}
  inp.value='';
}
function removeKw(kw){alertKws=alertKws.filter(k=>k!==kw);renderKws();}
function renderKws(){
  document.getElementById('kwWrap').innerHTML=alertKws.map(k=>\`<span class="kw-chip">\${k}<button onclick="removeKw('\${k}')">×</button></span>\`).join('');
}
async function submitAlert(){
  const email=document.getElementById('alertEmail').value.trim();
  if(!email||!email.includes('@')){showToast('Please enter a valid email','info');return;}
  if(!alertKws.length){showToast('Add at least one keyword','info');return;}
  try{
    const res=await fetch('/api/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,keywords:alertKws})});
    const d=await res.json();
    if(d.success){showToast('Subscribed! 🎉');document.getElementById('alertEmail').value='';alertKws=[];renderKws();}
    else showToast(d.error||'Something went wrong','info');
  }catch(e){showToast('Failed. Please try again.','info');}
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
  const p=POSTS.find(x=>x.id===id);if(!p)return;
  showView('vArticle');
  document.getElementById('articleContent').innerHTML=\`
    <button class="back-btn" onclick="goView('blog')">← Back to Blog</button>
    <div class="article-cat">\${p.cat}</div>
    <h1 class="article-title">\${p.title}</h1>
    <div class="article-meta"><span>📅 \${p.date}</span><span>⏱ \${p.readTime}</span></div>
    <div class="article-body">\${p.body}</div>
    <div style="margin-top:40px;padding-top:24px;border-top:1px solid var(--border)">
      <button class="back-btn" onclick="goView('blog')">← Back to Blog</button>
    </div>\`;
}

// ── STATIC PAGES ──
const STATIC={
  privacy:{title:'Privacy Policy',date:'Last updated: June 25, 2026',body:\`
    <h2>1. Information We Collect</h2><p>JobNova does not collect personal information from visitors browsing job listings. No registration or login is required.</p>
    <h2>2. Job Alert Subscribers</h2><p>If you subscribe to job alerts, we store your email address and keyword preferences solely to send relevant job notifications. We do not sell or share this data.</p>
    <h2>3. Cookies & Storage</h2><p>We use browser localStorage only to remember your saved jobs and theme preference. No tracking cookies are used.</p>
    <h2>4. Third-Party Links</h2><p>Our site contains links to external job application pages. We are not responsible for the privacy practices of these websites.</p>
    <h2>5. Contact</h2><p>For privacy-related questions: <a href="mailto:hello@jobnova.dev">hello@jobnova.dev</a></p>\`},
  terms:{title:'Terms of Service',date:'Last updated: June 25, 2026',body:\`
    <h2>1. Acceptance of Terms</h2><p>By accessing JobNova, you agree to these Terms of Service.</p>
    <h2>2. Service Description</h2><p>JobNova is a job aggregation and discovery platform. We curate job listings from third-party APIs.</p>
    <h2>3. Prohibited Activities</h2><ul><li>Scraping or bulk downloading of job listings</li><li>Using the service to send spam</li><li>Attempting to interfere with site functionality</li></ul>
    <h2>4. Accuracy of Listings</h2><p>We do not guarantee the accuracy or availability of any job listing. Always verify details directly with the employer.</p>
    <h2>5. Limitation of Liability</h2><p>JobNova is provided "as is" without warranties. We are not liable for any damages arising from use of this service.</p>\`},
  disclaimer:{title:'Disclaimer',date:'Last updated: June 25, 2026',body:\`
    <h2>Job Listing Accuracy</h2><p>JobNova aggregates listings from third-party sources. We make no representations about accuracy or timeliness. Job availability and salary information may change without notice.</p>
    <h2>No Employment Relationship</h2><p>JobNova is a discovery platform, not an employer or recruiter. We do not participate in the hiring process.</p>
    <h2>Salary Information</h2><p>Salary figures are estimates from data sources and may not reflect actual compensation offered by employers.</p>
    <h2>No Guarantee of Employment</h2><p>Listing a job on JobNova does not guarantee employment. All hiring decisions are made exclusively by respective employers.</p>\`}
};
function showStatic(id){
  const p=STATIC[id];if(!p)return;
  showView('vStatic');
  document.getElementById('staticContent').innerHTML=\`
    <h1>\${p.title}</h1>
    <div class="static-date">\${p.date}</div>
    \${p.body}
    <div style="margin-top:36px"><button class="back-btn" onclick="goView('jobs')">← Back to Jobs</button></div>\`;
}

// ── FILTERS ──
function filterCat(c,label){
  cat=c;pg=1;
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>{if(b.textContent.includes(label||'All'))b.classList.add('active');});
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  document.querySelectorAll('.chip').forEach(c=>{if(c.textContent.includes(label||'All'))c.classList.add('active');});
  showView('vJobs');loadJobs();
}
function debounceSearch(v){clearTimeout(srchT);srchT=setTimeout(()=>{srch=v;pg=1;loadJobs();},400);}
function goPage(p){pg=p;loadJobs();window.scrollTo(0,0);}

// ── INIT ──
async function init(){
  updateSavedCount();
  loadJobs();
  try{
    const r=await fetch('/api/debug');
    const d=await r.json();
    const n=d.jobs_in_db||0;
    ['st-total','cnt-all'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=n.toLocaleString();});
    ['tc1','tc2'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=n.toLocaleString();});
    const ss=document.getElementById('st-salary');if(ss)ss.textContent=Math.round(n*.65).toLocaleString();
    const sr=document.getElementById('st-remote');if(sr)sr.textContent=Math.round(n*.4).toLocaleString();
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

    // SITEMAP
    if (url.pathname === "/sitemap.xml") {
      const { results } = await env.DB.prepare("SELECT id FROM jobs ORDER BY id DESC LIMIT 500").all();
      const base = "https://app.jobnova.workers.dev";
      const urls = [
        `<url><loc>${base}/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>`,
        ...results.map(j=>`<url><loc>${base}/?job=${j.id}</loc><changefreq>daily</changefreq><priority>0.6</priority></url>`)
      ].join('');
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
        { headers: { "Content-Type": "application/xml" } });
    }

    // RSS
    if (url.pathname === "/feed.rss") {
      const { results } = await env.DB.prepare("SELECT * FROM jobs ORDER BY id DESC LIMIT 50").all();
      const base = "https://app.jobnova.workers.dev";
      const items = results.map(j=>`<item>
        <title><![CDATA[${j.title} at ${j.company}]]></title>
        <link>${j.url}</link>
        <guid>${base}/?job=${j.id}</guid>
        <description><![CDATA[${j.company} — ${j.location||'Remote'}${j.salary?' — '+j.salary:''}]]></description>
        <pubDate>${new Date(j.created_at||Date.now()).toUTCString()}</pubDate>
      </item>`).join('');
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>
        <title>JobNova — Remote Jobs</title><link>${base}</link>
        <description>Latest remote job listings from JobNova</description>
        ${items}</channel></rss>`,
        { headers: { "Content-Type": "application/rss+xml" } });
    }

    // SUBSCRIBE
    if (url.pathname === "/api/subscribe" && request.method === "POST") {
      try {
        const { email, keywords } = await request.json();
        if (!email || !keywords?.length) return new Response(JSON.stringify({ success:false, error:"Email and keywords required" }), { headers:{"Content-Type":"application/json"} });
        await env.DB.prepare("INSERT OR REPLACE INTO subscribers (email,keywords) VALUES (?,?)").bind(email, JSON.stringify(keywords)).run();
        return new Response(JSON.stringify({ success:true }), { headers:{"Content-Type":"application/json"} });
      } catch(e) {
        return new Response(JSON.stringify({ success:false, error:e.message }), { status:500, headers:{"Content-Type":"application/json"} });
      }
    }

    // JOB DETAIL
    if (url.pathname === "/api/job") {
      const id = url.searchParams.get("id");
      if (!id) return new Response(JSON.stringify({ error:"id required" }), { status:400, headers:{"Content-Type":"application/json"} });
      const { results } = await env.DB.prepare("SELECT * FROM jobs WHERE id = ?").bind(id).all();
      if (!results.length) return new Response(JSON.stringify({ error:"Not found" }), { status:404, headers:{"Content-Type":"application/json"} });
      let job = results[0];
      // جلب الوصف من API إذا كان فارغاً
      if ((!job.description || job.description.length < 20) && job.job_handle) {
        try {
          const r = await fetch(`https://api.jobdatalake.com/v1/jobs/${job.job_handle}`, {
            headers: { "X-API-Key": env.API_KEY }
          });
          if (r.ok) {
            const detail = await r.json();
            const desc = detail.description || detail.summary || detail.snippet || "";
            if (desc && desc.length > 20) {
              await env.DB.prepare("UPDATE jobs SET description = ? WHERE id = ?").bind(desc, job.id).run();
              job = { ...job, description: desc };
            }
          }
        } catch(e) {}
      }
      return new Response(JSON.stringify(job), { headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"} });
    }

    // JOBS LIST
    if (url.pathname === "/api/jobs") {
      const page = parseInt(url.searchParams.get("page")||"1");
      const limit = 20, offset = (page-1)*limit;
      const category = url.searchParams.get("category")||"";
      const search = url.searchParams.get("search")||"";
      const remoteType = url.searchParams.get("remote_type")||"";
      const employType = url.searchParams.get("employment_type")||"";
      const seniority = url.searchParams.get("seniority")||"";
      const salaryMin = url.searchParams.get("salary_min")||"";
      const days = url.searchParams.get("days")||"";
      const conditions=[], params=[];
      if(category){conditions.push("LOWER(title) LIKE ?");params.push(`%${category}%`);}
      if(search){conditions.push("(LOWER(title) LIKE ? OR LOWER(company) LIKE ?)");params.push(`%${search.toLowerCase()}%`,`%${search.toLowerCase()}%`);}
      if(remoteType){conditions.push("remote_type = ?");params.push(remoteType);}
      if(employType){conditions.push("employment_type = ?");params.push(employType);}
      if(seniority){conditions.push("LOWER(seniority) LIKE ?");params.push(`%${seniority.toLowerCase()}%`);}
      if(salaryMin){conditions.push("CAST(REPLACE(REPLACE(salary,'$',''),'k','') AS INTEGER) >= ?");params.push(parseInt(salaryMin));}
      if(days){conditions.push("created_at >= datetime('now', '-' || ? || ' days')");params.push(parseInt(days));}
      const where=conditions.length?" WHERE "+conditions.join(" AND "):"";
      const { results } = await env.DB.prepare(`SELECT * FROM jobs${where} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`).bind(...params).all();
      const { results:cr } = await env.DB.prepare(`SELECT COUNT(*) as total FROM jobs${where}`).bind(...params).all();
      return new Response(JSON.stringify({ jobs:results, total:cr[0]?.total||0, page }),
        { headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"} });
    }

    // SYNC
    if (url.pathname === "/api/sync") {
      try {
        const result = await syncJobs(env);
        return new Response(JSON.stringify({ success:true, ...result }), { headers:{"Content-Type":"application/json"} });
      } catch(e) {
        return new Response(JSON.stringify({ success:false, error:e.message }), { status:500, headers:{"Content-Type":"application/json"} });
      }
    }

    // DEBUG
    if (url.pathname === "/api/debug") {
      const { results } = await env.DB.prepare("SELECT COUNT(*) as count FROM jobs").all();
      return new Response(JSON.stringify({ jobs_in_db:results[0]?.count||0, api_key_set:!!env.API_KEY }),
        { headers:{"Content-Type":"application/json"} });
    }

    // MIGRATE
    if (url.pathname === "/api/migrate") {
      await env.DB.prepare("DROP TABLE IF EXISTS jobs").run();
      await env.DB.prepare("DROP TABLE IF EXISTS subscribers").run();
      await ensureTable(env);
      return new Response(JSON.stringify({ success:true, message:"Tables recreated" }),
        { headers:{"Content-Type":"application/json"} });
    }

    return new Response(HTML_PAGE, { headers:{"Content-Type":"text/html; charset=utf-8"} });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncJobs(env));
  }
};
