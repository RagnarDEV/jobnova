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
      email TEXT UNIQUE, keywords TEXT,
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
    try { response = await fetch(apiUrl, { headers: { "X-API-Key": env.API_KEY } }); }
    catch(e) { errors.push(`Fetch "${q}": ${e.message}`); continue; }
    if (!response.ok) { errors.push(`API ${response.status} for "${q}"`); continue; }
    const data = await response.json();
    const jobs = data.jobs || data.hits || data.results || (Array.isArray(data) ? data : []);
    for (const job of jobs) {
      const jobUrl = job.url || "";
      if (!jobUrl) { skipped++; continue; }
      const salary = job.salary_min_usd && job.salary_max_usd ? `$${job.salary_min_usd}k - $${job.salary_max_usd}k` : "";
      const location = Array.isArray(job.locations) && job.locations.length ? job.locations[0] : (job.remote_type === "fully_remote" ? "Remote" : "");
      try {
        const r = await env.DB.prepare(
          `INSERT OR IGNORE INTO jobs (title,company,location,url,description,salary,remote_type,skills,seniority,employment_type,job_handle)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`
        ).bind(
          job.title||"Unknown", job.company_name||"Company", location, jobUrl,
          job.description||"", salary, job.remote_type||"",
          JSON.stringify(job.required_skills||[]),
          Array.isArray(job.seniority)?job.seniority.join(", "):"",
          job.employment_type||"", job.job_handle||""
        ).run();
        if (r.meta?.changes > 0) inserted++; else skipped++;
      } catch(e) { errors.push(`DB: ${e.message.slice(0,60)}`); }
    }
  }
  return { inserted, skipped, errors: errors.slice(0,3) };
}

// ── SHARED CSS ──
const SHARED_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#03060F;
  --bg2:#070D1A;
  --bg3:#0B1424;
  --card:#0D1829;
  --card2:#111F35;
  --border:#152236;
  --border2:#1E3352;
  --accent:#4F8EF7;
  --accent2:#6EA6FF;
  --accent3:#3D7BF0;
  --glow:rgba(79,142,247,.2);
  --glow2:rgba(79,142,247,.08);
  --green:#00D68F;
  --green2:#00B87A;
  --amber:#FFB547;
  --red:#FF5C7A;
  --salary:#00D68F;
  --purple:#8B5CF6;
  --t1:#E8F0FF;
  --t2:#8BA5CC;
  --t3:#4A6080;
  --r:16px;
  --r2:12px;
  --shadow:0 4px 24px rgba(0,0,0,.4);
  --shadow2:0 8px 40px rgba(0,0,0,.6);
}
html{scroll-behavior:smooth}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:var(--bg);color:var(--t1);min-height:100vh;line-height:1.6;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:var(--bg2)}::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:var(--accent3)}
a{color:inherit;text-decoration:none}
`;

const NAV_CSS = `
.nav{
  background:rgba(3,6,15,.85);
  backdrop-filter:blur(20px);
  -webkit-backdrop-filter:blur(20px);
  border-bottom:1px solid var(--border);
  padding:0 28px;
  display:flex;align-items:center;justify-content:space-between;
  height:64px;position:sticky;top:0;z-index:200;
}
.nav::after{
  content:'';position:absolute;bottom:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,var(--accent3),transparent);
  opacity:.4;
}
.nav-logo{
  font-size:22px;font-weight:900;letter-spacing:-1px;
  background:linear-gradient(135deg,#4F8EF7 0%,#A78BFA 50%,#4F8EF7 100%);
  background-size:200% auto;
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  animation:shimmer 4s linear infinite;
}
@keyframes shimmer{0%{background-position:0%}100%{background-position:200%}}
.nav-links{display:flex;align-items:center;gap:6px}
.nav-link{
  padding:7px 14px;border-radius:8px;font-size:13px;font-weight:500;
  color:var(--t2);transition:all .2s;border:1px solid transparent;
}
.nav-link:hover{color:var(--t1);background:var(--card2);border-color:var(--border2)}
.nav-cta{
  background:linear-gradient(135deg,var(--accent3),var(--accent));
  color:#fff;border-radius:10px;padding:8px 18px;font-size:13px;font-weight:600;
  transition:all .25s;box-shadow:0 4px 16px rgba(79,142,247,.3);
  border:1px solid rgba(110,166,255,.2);
}
.nav-cta:hover{transform:translateY(-1px);box-shadow:0 6px 24px rgba(79,142,247,.45)}
`;

const FOOTER_HTML = (base) => `
<footer style="border-top:1px solid var(--border);padding:40px 28px;margin-top:40px">
  <div style="max-width:900px;margin:0 auto">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:32px;margin-bottom:32px">
      <div>
        <div style="font-size:22px;font-weight:900;background:linear-gradient(135deg,#4F8EF7,#A78BFA);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:8px">JobNova</div>
        <div style="font-size:13px;color:var(--t3);max-width:240px;line-height:1.6">The modern remote job board. 600+ curated positions updated every hour.</div>
      </div>
      <div style="display:flex;gap:48px;flex-wrap:wrap">
        <div>
          <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:14px">Platform</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <a href="/" style="font-size:13px;color:var(--t2);transition:color .2s" onmouseover="this.style.color='var(--accent2)'" onmouseout="this.style.color='var(--t2)'">Browse Jobs</a>
            <a href="/blog" style="font-size:13px;color:var(--t2);transition:color .2s" onmouseover="this.style.color='var(--accent2)'" onmouseout="this.style.color='var(--t2)'">Career Blog</a>
            <a href="/feed.rss" style="font-size:13px;color:var(--t2);transition:color .2s" onmouseover="this.style.color='var(--accent2)'" onmouseout="this.style.color='var(--t2)'">RSS Feed</a>
          </div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:14px">Legal</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <a href="/privacy" style="font-size:13px;color:var(--t2);transition:color .2s" onmouseover="this.style.color='var(--accent2)'" onmouseout="this.style.color='var(--t2)'">Privacy Policy</a>
            <a href="/terms" style="font-size:13px;color:var(--t2);transition:color .2s" onmouseover="this.style.color='var(--accent2)'" onmouseout="this.style.color='var(--t2)'">Terms of Service</a>
            <a href="/disclaimer" style="font-size:13px;color:var(--t2);transition:color .2s" onmouseover="this.style.color='var(--accent2)'" onmouseout="this.style.color='var(--t2)'">Disclaimer</a>
          </div>
        </div>
      </div>
    </div>
    <div style="border-top:1px solid var(--border);padding-top:24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <div style="font-size:12px;color:var(--t3)">© 2026 JobNova. All rights reserved.</div>
      <div style="font-size:12px;color:var(--t3)">Built with ❤️ for remote job seekers worldwide</div>
    </div>
  </div>
</footer>`;

// ── BASE LAYOUT ──
function baseLayout(title, description, canonical, ogImage, content, extraHead = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="google-site-verification" content="7Q0EJk3kQKNLNzIhyzH4k5CsuHsQEa-U0Pwp_w_b0n0"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${description}">
<meta name="robots" content="index, follow">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
${ogImage ? `<meta property="og:image" content="${ogImage}">` : ''}
<link rel="canonical" href="${canonical}">
<link rel="alternate" type="application/rss+xml" title="JobNova Jobs Feed" href="https://app.jobnova.workers.dev/feed.rss">
${extraHead}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
${SHARED_CSS}
${NAV_CSS}
.page{max-width:880px;margin:0 auto;padding:44px 24px 80px}
.page-sm{max-width:700px;margin:0 auto;padding:44px 24px 80px}
.breadcrumb{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--t3);margin-bottom:32px;flex-wrap:wrap}
.breadcrumb a{color:var(--accent2);transition:color .2s}.breadcrumb a:hover{color:var(--t1)}

/* JOB PAGE */
.job-hero{
  background:linear-gradient(135deg,var(--card) 0%,var(--bg3) 100%);
  border:1px solid var(--border2);border-radius:20px;overflow:hidden;
  margin-bottom:24px;position:relative;
}
.job-hero::before{
  content:'';position:absolute;top:0;left:0;right:0;height:3px;
  background:linear-gradient(90deg,var(--accent3),var(--purple),var(--accent));
}
.job-hero-hdr{padding:36px}
.job-hero-co-row{display:flex;align-items:center;gap:18px;margin-bottom:22px}
.job-logo-wrap{
  width:76px;height:76px;border-radius:16px;
  background:var(--bg2);border:1px solid var(--border2);
  display:flex;align-items:center;justify-content:center;
  font-size:28px;font-weight:800;color:var(--accent2);
  overflow:hidden;flex-shrink:0;
  box-shadow:0 4px 20px rgba(0,0,0,.3);
}
.job-logo-wrap img{width:100%;height:100%;object-fit:contain;padding:10px}
.job-co-name{font-size:18px;font-weight:700;color:var(--accent2);margin-bottom:4px}
.job-co-loc{font-size:13px;color:var(--t3);display:flex;align-items:center;gap:6px}
.job-title{font-size:32px;font-weight:900;letter-spacing:-.8px;line-height:1.2;margin-bottom:18px;color:var(--t1)}
.job-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px}
.job-salary{
  font-size:26px;font-weight:800;color:var(--salary);
  display:flex;align-items:center;gap:10px;
}
.job-salary-icon{font-size:20px}
.job-body{padding:36px;border-top:1px solid var(--border)}
.sec-label{
  font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;
  color:var(--t3);margin-bottom:14px;display:flex;align-items:center;gap:8px;
}
.sec-label::after{content:'';flex:1;height:1px;background:var(--border);margin-left:8px}
.skills-wrap{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:32px}
.skill-tag{
  background:rgba(79,142,247,.1);border:1px solid rgba(79,142,247,.2);
  color:var(--accent2);font-size:13px;padding:5px 14px;border-radius:8px;
  font-weight:500;transition:all .2s;
}
.skill-tag:hover{background:rgba(79,142,247,.2);border-color:var(--accent)}
.desc-wrap{
  font-size:15px;color:var(--t2);line-height:1.9;margin-bottom:32px;
  white-space:pre-line;
}
.apply-big{
  display:inline-flex;align-items:center;gap:12px;
  background:linear-gradient(135deg,var(--accent3),var(--accent));
  color:#fff;padding:16px 40px;border-radius:14px;font-size:17px;font-weight:700;
  text-decoration:none;transition:all .25s;
  box-shadow:0 4px 24px rgba(79,142,247,.4);
  border:1px solid rgba(110,166,255,.2);
}
.apply-big:hover{transform:translateY(-2px);box-shadow:0 8px 36px rgba(79,142,247,.55)}

/* TAGS */
.tag{display:inline-flex;align-items:center;gap:5px;font-size:12px;padding:5px 12px;border-radius:20px;font-weight:600}
.tag-remote{background:rgba(0,214,143,.1);color:var(--green);border:1px solid rgba(0,214,143,.25)}
.tag-hybrid{background:rgba(255,181,71,.1);color:var(--amber);border:1px solid rgba(255,181,71,.25)}
.tag-onsite{background:rgba(139,165,204,.08);color:var(--t2);border:1px solid var(--border2)}
.tag-type{background:rgba(139,165,204,.08);color:var(--t2);border:1px solid var(--border2)}
.tag-new{
  background:linear-gradient(135deg,rgba(0,214,143,.2),rgba(0,214,143,.1));
  color:var(--green);border:1px solid rgba(0,214,143,.3);
  font-size:10px;padding:3px 9px;border-radius:20px;font-weight:800;letter-spacing:1px;
  animation:pulse-green 2s ease-in-out infinite;
}
@keyframes pulse-green{0%,100%{box-shadow:0 0 0 0 rgba(0,214,143,.3)}50%{box-shadow:0 0 0 4px rgba(0,214,143,.1)}}
.tag-hot{background:linear-gradient(135deg,rgba(255,92,122,.2),rgba(255,92,122,.1));color:var(--red);border:1px solid rgba(255,92,122,.3);font-size:10px;padding:3px 9px;border-radius:20px;font-weight:800;letter-spacing:1px}
.tag-featured{background:linear-gradient(135deg,rgba(139,92,246,.2),rgba(139,92,246,.1));color:var(--purple);border:1px solid rgba(139,92,246,.3);font-size:10px;padding:3px 9px;border-radius:20px;font-weight:800;letter-spacing:1px}

/* RELATED */
.related-title{font-size:19px;font-weight:800;margin-bottom:16px;color:var(--t1)}
.related-grid{display:flex;flex-direction:column;gap:10px}
.related-card{
  background:var(--card);border:1px solid var(--border2);border-radius:14px;
  padding:16px 20px;display:flex;align-items:center;gap:16px;
  transition:all .25s;text-decoration:none;
}
.related-card:hover{border-color:var(--accent3);background:var(--card2);transform:translateX(4px)}
.related-logo{width:42px;height:42px;border-radius:10px;background:var(--bg2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:var(--accent2);overflow:hidden;flex-shrink:0}
.related-logo img{width:100%;height:100%;object-fit:contain;padding:6px}
.related-info{flex:1;min-width:0}
.related-jt{font-size:14px;font-weight:700;color:var(--t1);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.related-co{font-size:12px;color:var(--accent2)}
.related-sal{font-size:13px;font-weight:700;color:var(--salary);white-space:nowrap}

/* BLOG */
.article-cat{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--accent2);margin-bottom:14px}
.article-title{font-size:36px;font-weight:900;letter-spacing:-.8px;line-height:1.2;margin-bottom:16px;color:var(--t1)}
.article-meta{font-size:13px;color:var(--t3);display:flex;gap:18px;margin-bottom:36px;flex-wrap:wrap}
.article-body{font-size:16px;color:var(--t2);line-height:1.9}
.article-body h2{font-size:22px;font-weight:700;margin:36px 0 14px;color:var(--t1);padding-left:16px;border-left:3px solid var(--accent)}
.article-body p{margin-bottom:18px}
.article-body ul{padding-left:22px;margin-bottom:18px}
.article-body ul li{margin-bottom:10px}
.article-body strong{color:var(--t1)}

/* STATIC */
.static-title{font-size:32px;font-weight:900;margin-bottom:8px;color:var(--t1)}
.static-date{font-size:13px;color:var(--t3);margin-bottom:36px}
.static-body h2{font-size:20px;font-weight:700;margin:32px 0 14px;color:var(--t1)}
.static-body p{font-size:15px;color:var(--t2);line-height:1.8;margin-bottom:14px}
.static-body ul{padding-left:22px;margin-bottom:14px}
.static-body ul li{font-size:15px;color:var(--t2);line-height:1.8;margin-bottom:8px}
.static-body a{color:var(--accent2)}

.back-link{
  display:inline-flex;align-items:center;gap:8px;color:var(--t3);
  font-size:14px;font-weight:500;transition:color .2s;
  margin-bottom:32px;text-decoration:none;
}
.back-link:hover{color:var(--accent2)}

/* AD */
.ad-wrap{
  display:flex;justify-content:center;align-items:center;
  padding:10px;overflow:hidden;margin:20px 0;
  max-height:80px;
}
.ad-label{font-size:10px;color:var(--t3);text-align:center;margin-bottom:5px;letter-spacing:1.5px;text-transform:uppercase;opacity:.6}

@media(max-width:640px){
  .nav-links .nav-link{display:none}
  .job-title{font-size:24px}
  .article-title{font-size:26px}
  .page,.page-sm{padding:24px 16px 60px}
  .job-hero-hdr,.job-body{padding:20px}
}
</style>
</head>
<body>
<nav class="nav">
  <a href="/" class="nav-logo">JobNova</a>
  <div class="nav-links">
    <a href="/" class="nav-link">Jobs</a>
    <a href="/blog" class="nav-link">Blog</a>
    <a href="/privacy" class="nav-link">Privacy</a>
    <a href="/" class="nav-cta">Browse Jobs →</a>
  </div>
</nav>
${content}
${FOOTER_HTML('')}
</body>
</html>`;
}

// ── LOGO ──
function logoImgHtml(company, size='72px', cls='job-logo-wrap') {
  const slug = (company||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const domain = slug + '.com';
  const ini = (company||'?').split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
  const fs = Math.round(parseInt(size)*.35)+'px';
  return `<div class="${cls}" style="width:${size};height:${size}">
    <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=64" alt="${company}"
      style="width:100%;height:100%;object-fit:contain;padding:8px"
      onerror="this.onerror=null;this.src='https://icons.duckduckgo.com/ip3/${domain}.ico';this.onerror=function(){this.style.display='none';this.nextElementSibling.style.display='flex'}">
    <span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:${fs};font-weight:800;color:#4F8EF7">${ini}</span>
  </div>`;
}

function remoteTagHtml(t) {
  if (!t) return '';
  const m = {fully_remote:['tag-remote','🌐 Remote'],hybrid:['tag-hybrid','🏢 Hybrid'],on_site:['tag-onsite','📍 On-site'],onsite:['tag-onsite','📍 On-site']};
  const [cls,lbl] = m[t] || ['tag-onsite',t.replace(/_/g,' ')];
  return `<span class="tag ${cls}">${lbl}</span>`;
}

// ── JOB PAGE ──
function renderJobPage(job, related, base) {
  let skills = [];
  try { skills = JSON.parse(job.skills||'[]'); } catch(e) {}
  const isNew = job.created_at && Date.now()-new Date(job.created_at).getTime()<86400000;
  const isHot = job.salary && parseInt(job.salary.replace(/\D/g,'').slice(0,3)) >= 150;
  const canonical = `${base}/job/${job.id}`;
  const desc = job.description && job.description.length > 20
    ? job.description.slice(0,160).replace(/\n/g,' ')+'...'
    : `${job.title} at ${job.company}. ${job.location||'Remote'}${job.salary?' — '+job.salary:''}. Apply now on JobNova.`;

  const schema = JSON.stringify({
    "@context":"https://schema.org","@type":"JobPosting",
    "title":job.title,"description":job.description||desc,
    "hiringOrganization":{"@type":"Organization","name":job.company},
    "jobLocation":{"@type":"Place","address":job.location||"Remote"},
    "employmentType":job.employment_type?job.employment_type.toUpperCase().replace('_',' '):"FULL_TIME",
    "datePosted":job.created_at?new Date(job.created_at).toISOString().split('T')[0]:new Date().toISOString().split('T')[0],
    "url":canonical,"directApply":true,
    ...(job.salary?{"baseSalary":{"@type":"MonetaryAmount","currency":"USD","value":{"@type":"QuantitativeValue","value":job.salary}}}:{})
  });

  const content = `
<div class="page">
  <div class="breadcrumb">
    <a href="/">JobNova</a><span>›</span>
    <a href="/">Jobs</a><span>›</span>
    <span>${job.title}</span>
  </div>
  <div class="job-hero">
    <div class="job-hero-hdr">
      <div class="job-hero-co-row">
        ${logoImgHtml(job.company,'76px','job-logo-wrap')}
        <div>
          <div class="job-co-name">${job.company}</div>
          <div class="job-co-loc">📍 ${job.location||'Remote'}</div>
        </div>
      </div>
      <h1 class="job-title">${job.title}</h1>
      <div class="job-chips">
        ${remoteTagHtml(job.remote_type)}
        ${job.employment_type?`<span class="tag tag-type">${job.employment_type.replace(/_/g,' ')}</span>`:''}
        ${job.seniority?`<span class="tag tag-type">${job.seniority}</span>`:''}
        ${isNew?'<span class="tag tag-new">✦ NEW</span>':''}
        ${isHot?'<span class="tag tag-hot">🔥 HOT</span>':''}
      </div>
      ${job.salary?`<div class="job-salary"><span class="job-salary-icon">💰</span>${job.salary}<span style="font-size:14px;font-weight:500;color:var(--t3);margin-left:6px">/ year</span></div>`:''}
    </div>
    <div class="job-body">
      ${skills.length?`
        <div class="sec-label">Required Skills</div>
        <div class="skills-wrap">${skills.map(s=>`<span class="skill-tag">${s}</span>`).join('')}</div>
      `:''}
      <div class="sec-label">About the Role</div>
      <div class="desc-wrap">${job.description&&job.description.length>20?job.description:'Full description available on the company website. Click Apply Now to view complete details and submit your application.'}</div>
      <div class="ad-wrap" style="margin-bottom:28px">
        <div><div class="ad-label">Advertisement</div>
        <script>atOptions={'key':'f9df5bf8e15c630ee01718f64c6edfb3','format':'iframe','height':50,'width':320,'params':{}};</script>
        <script src="https://www.highperformanceformat.com/f9df5bf8e15c630ee01718f64c6edfb3/invoke.js"></script></div>
      </div>
      <a href="${job.url}" target="_blank" rel="noopener noreferrer" class="apply-big">Apply Now →</a>
    </div>
  </div>
  ${related.length?`
    <div class="related-title">You Might Also Like</div>
    <div class="related-grid">
      ${related.map(r=>`
        <a href="/job/${r.id}" class="related-card">
          ${logoImgHtml(r.company,'42px','related-logo')}
          <div class="related-info">
            <div class="related-jt">${r.title}</div>
            <div class="related-co">${r.company}</div>
          </div>
          ${r.salary?`<div class="related-sal">${r.salary}</div>`:''}
          <span style="color:var(--t3);font-size:18px">›</span>
        </a>`).join('')}
    </div>`:''}
  <div class="ad-wrap" style="margin-top:32px">
    <div><div class="ad-label">Advertisement</div>
    <script async="async" data-cfasync="false" src="https://pl29900952.effectivecpmnetwork.com/240c21d3732d67f320e55d7618105288/invoke.js"></script>
    <div id="container-240c21d3732d67f320e55d7618105288"></div></div>
  </div>
</div>`;
  return baseLayout(`${job.title} at ${job.company} — JobNova`, desc, canonical, '', content, `<script type="application/ld+json">${schema}</script>`);
}

// ── BLOG POSTS ──
const BLOG_POSTS = [
  {id:1,cat:"Career Advice",title:"10 Skills Every Remote Developer Must Have in 2026",excerpt:"Remote work has changed what employers look for. Beyond technical skills, these soft skills separate top candidates from the rest.",date:"June 20, 2026",readTime:"5 min read",
    body:`<p>The remote job market in 2026 is more competitive than ever.</p><h2>1. Asynchronous Communication</h2><p>Remote teams operate across time zones. The ability to write clear, concise messages is as important as coding ability.</p><h2>2. Self-Management & Discipline</h2><p>Tools like Notion and Linear are your best friends.</p><h2>3. Deep Work Focus</h2><p>Top remote developers cultivate 2-4 hour blocks of uninterrupted work.</p><h2>4. Proactive Visibility</h2><p>Share your progress proactively and flag blockers early.</p><h2>5. Cloud & DevOps Literacy</h2><p>Even frontend developers benefit from understanding Docker and CI/CD.</p><h2>6. Strong Git Practices</h2><p>Clean commit history and descriptive PRs are critical.</p><h2>7. Time Zone Awareness</h2><p>Always specify time zones when scheduling.</p><h2>8. Written Documentation</h2><p>Remote teams live and die by their docs.</p><h2>9. Video Communication Presence</h2><p>Good lighting and a decent microphone matter more than you think.</p><h2>10. Continuous Learning Mindset</h2><p>Developers who embrace new tools stay ahead of the curve.</p>`},
  {id:2,cat:"Salary Guide",title:"Remote Developer Salaries in 2026: What You Should Be Earning",excerpt:"Salary data from 600+ remote job listings reveals what companies are actually paying.",date:"June 18, 2026",readTime:"7 min read",
    body:`<p>Based on our analysis of 600+ active listings, here's the 2026 market:</p><h2>Frontend Developer</h2><ul><li><strong>Junior:</strong> $55k–$85k</li><li><strong>Mid:</strong> $85k–$130k</li><li><strong>Senior:</strong> $130k–$200k</li></ul><h2>Backend Developer</h2><ul><li><strong>Junior:</strong> $60k–$90k</li><li><strong>Mid:</strong> $90k–$145k</li><li><strong>Senior:</strong> $145k–$220k</li></ul><h2>Data Scientist / ML</h2><ul><li><strong>Mid:</strong> $100k–$160k</li><li><strong>Senior:</strong> $160k–$240k</li></ul><h2>Negotiation Tips</h2><p>Always negotiate. The first offer is rarely the best offer.</p>`},
  {id:3,cat:"Job Search",title:"How to Land a Remote Job in 30 Days",excerpt:"A step-by-step system that has helped thousands of developers secure remote offers.",date:"June 15, 2026",readTime:"9 min read",
    body:`<p>This playbook breaks the job search into a focused 30-day system.</p><h2>Week 1: Foundation</h2><p>Define your target role. Polish your resume — one page, quantify everything.</p><h2>Week 2: Volume with Quality</h2><p>Apply to 5-10 jobs per day with personalized applications.</p><h2>Week 3: Parallel Tracks</h2><p>Build your portfolio while applications process.</p><h2>Week 4: Interview Prep</h2><p>Prepare for STAR method, system design, and live coding.</p><h2>The Numbers Game</h2><p>100 applications → 15 screens → 5 rounds → 2 offers. Stay consistent.</p>`},
  {id:4,cat:"Industry Trends",title:"The State of Remote Work in 2026: What's Changed",excerpt:"Remote work has matured. The hype is gone, but the opportunity is bigger than ever.",date:"June 10, 2026",readTime:"6 min read",
    body:`<p>Remote work has reached a new equilibrium in 2026.</p><h2>What's Changed</h2><p>Fully remote roles stabilized at 30-35% of white-collar postings.</p><h2>Who's Hiring</h2><p>Shopify, GitLab, Automattic, and hundreds of SaaS companies continue to hire globally.</p><h2>AI's Impact</h2><p>"AI integration" and "LLM fine-tuning" appear in a growing percentage of listings.</p>`},
  {id:5,cat:"Tools & Productivity",title:"The Remote Developer's Essential Toolkit for 2026",excerpt:"The apps and workflows that top remote developers swear by.",date:"June 5, 2026",readTime:"5 min read",
    body:`<p>The right tools make remote work easier and make you look more professional.</p><h2>Communication</h2><ul><li><strong>Slack/Discord:</strong> Async team chat</li><li><strong>Loom:</strong> Video explanations</li><li><strong>Notion:</strong> Documentation</li></ul><h2>Development</h2><ul><li><strong>Cursor/Copilot:</strong> AI pair programming</li><li><strong>Linear:</strong> Project management</li></ul>`},
  {id:6,cat:"Interview Prep",title:"Remote Technical Interviews: What's Different and How to Prepare",excerpt:"Remote interviews have unique challenges. Here's how to ace them.",date:"June 1, 2026",readTime:"6 min read",
    body:`<p>Companies screen for more than coding ability in remote interviews.</p><h2>The Setup Check</h2><p>Test your camera, mic, internet backup, and coding environment the night before.</p><h2>Communicate While Coding</h2><p>Narrate your thinking — "I'm considering a hash map here because..." beats silence.</p><h2>Remote-Specific Questions</h2><ul><li>"How do you handle blockers across time zones?"</li><li>"How do you stay productive working from home?"</li></ul>`}
];

function renderBlogIndex(base) {
  const content = `
<div class="page">
  <div class="breadcrumb"><a href="/">JobNova</a><span>›</span><span>Blog</span></div>
  <h1 style="font-size:32px;font-weight:900;margin-bottom:8px;color:var(--t1)">📝 Career Blog</h1>
  <p style="color:var(--t2);font-size:15px;margin-bottom:32px">Insights, salary guides, and career advice for remote job seekers.</p>
  <div class="ad-wrap"><div><div class="ad-label">Advertisement</div>
    <script>atOptions={'key':'0ffa7f357eb68570f215b35f87c4ff62','format':'iframe','height':50,'width':320,'params':{}};</script>
    <script src="https://www.highperformanceformat.com/0ffa7f357eb68570f215b35f87c4ff62/invoke.js"></script>
  </div></div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;margin-top:28px">
    ${BLOG_POSTS.map(p=>`
      <a href="/blog/${p.id}" style="background:var(--card);border:1px solid var(--border2);border-radius:16px;padding:24px;display:block;transition:all .25s;text-decoration:none;position:relative;overflow:hidden" onmouseover="this.style.borderColor='var(--accent3)';this.style.transform='translateY(-3px)'" onmouseout="this.style.borderColor='var(--border2)';this.style.transform='translateY(0)'">
        <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--accent2);margin-bottom:12px">${p.cat}</div>
        <div style="font-size:16px;font-weight:700;margin-bottom:10px;line-height:1.4;color:var(--t1)">${p.title}</div>
        <div style="font-size:13px;color:var(--t3);line-height:1.7;margin-bottom:16px">${p.excerpt}</div>
        <div style="font-size:12px;color:var(--t3);display:flex;gap:14px"><span>📅 ${p.date}</span><span>⏱ ${p.readTime}</span></div>
      </a>`).join('')}
  </div>
</div>`;
  return baseLayout('Career Blog — JobNova','Insights and career advice for remote job seekers.',`${base}/blog`,'',content,
    `<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"Blog","name":"JobNova Career Blog","url":`${base}/blog`})}</script>`);
}

function renderArticlePage(post, base) {
  const canonical = `${base}/blog/${post.id}`;
  const schema = JSON.stringify({"@context":"https://schema.org","@type":"Article","headline":post.title,"description":post.excerpt,"datePublished":post.date,"author":{"@type":"Organization","name":"JobNova"},"publisher":{"@type":"Organization","name":"JobNova","url":base},"url":canonical});
  const content = `
<div class="page-sm">
  <a href="/blog" class="back-link">← Back to Blog</a>
  <div class="article-cat">${post.cat}</div>
  <h1 class="article-title">${post.title}</h1>
  <div class="article-meta"><span>📅 ${post.date}</span><span>⏱ ${post.readTime}</span><span>✍️ JobNova Team</span></div>
  <div class="article-body">${post.body}</div>
  <div class="ad-wrap" style="margin-top:36px"><div><div class="ad-label">Advertisement</div>
    <script>atOptions={'key':'0ffa7f357eb68570f215b35f87c4ff62','format':'iframe','height':50,'width':320,'params':{}};</script>
    <script src="https://www.highperformanceformat.com/0ffa7f357eb68570f215b35f87c4ff62/invoke.js"></script>
  </div></div>
  <div style="margin-top:32px;display:flex;gap:12px;flex-wrap:wrap">
    <a href="/blog" class="back-link" style="margin-bottom:0">← Back to Blog</a>
    <a href="/" style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,var(--accent3),var(--accent));color:#fff;padding:10px 22px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none">Browse Remote Jobs →</a>
  </div>
</div>`;
  return baseLayout(`${post.title} — JobNova Blog`,post.excerpt,canonical,'',content,`<script type="application/ld+json">${schema}</script>`);
}

const STATIC_PAGES = {
  privacy:{title:'Privacy Policy',date:'Last updated: June 25, 2026',description:'JobNova Privacy Policy.',
    body:`<h2>1. Information We Collect</h2><p>JobNova does not collect personal information from visitors browsing job listings.</p><h2>2. Job Alert Subscribers</h2><p>If you subscribe to job alerts, we store your email and keywords solely to send notifications. We do not sell this data.</p><h2>3. Cookies & Storage</h2><p>We use browser localStorage only to remember saved jobs and theme preference. No tracking cookies are used.</p><h2>4. Third-Party Advertising</h2><p>This site displays third-party advertisements. Ad networks may use cookies to serve relevant ads.</p><h2>5. Third-Party Links</h2><p>We are not responsible for the privacy practices of external job application websites.</p><h2>6. Contact</h2><p>For privacy questions: <a href="mailto:hello@jobnova.dev">hello@jobnova.dev</a></p>`},
  terms:{title:'Terms of Service',date:'Last updated: June 25, 2026',description:'JobNova Terms of Service.',
    body:`<h2>1. Acceptance</h2><p>By accessing JobNova, you agree to these Terms of Service.</p><h2>2. Service</h2><p>JobNova is a job aggregation and discovery platform.</p><h2>3. Prohibited Activities</h2><ul><li>Scraping or bulk downloading job data</li><li>Sending spam or unsolicited outreach</li><li>Interfering with site functionality</li></ul><h2>4. Accuracy</h2><p>We do not guarantee the accuracy of any listing. Verify details directly with employers.</p><h2>5. Liability</h2><p>JobNova is provided "as is" without warranties.</p>`},
  disclaimer:{title:'Disclaimer',date:'Last updated: June 25, 2026',description:'JobNova Disclaimer.',
    body:`<h2>Job Listing Accuracy</h2><p>JobNova aggregates listings from third-party sources. Accuracy and timeliness are not guaranteed.</p><h2>No Employment Relationship</h2><p>JobNova is a discovery platform, not an employer or recruiter.</p><h2>Salary Information</h2><p>Salary figures are estimates and may not reflect actual offers.</p><h2>No Guarantee of Employment</h2><p>All hiring decisions are made exclusively by respective employers.</p><h2>Advertisement Disclaimer</h2><p>JobNova is not responsible for advertised products or services.</p>`}
};

function renderStaticPage(key, base) {
  const page = STATIC_PAGES[key];
  if (!page) return null;
  const content = `
<div class="page-sm">
  <a href="/" class="back-link">← Back to Jobs</a>
  <h1 class="static-title">${page.title}</h1>
  <div class="static-date">${page.date}</div>
  <div class="static-body">${page.body}</div>
  <div style="margin-top:40px"><a href="/" class="back-link" style="margin-bottom:0">← Back to Jobs</a></div>
</div>`;
  return baseLayout(`${page.title} — JobNova`,page.description,`${base}/${key}`,'',content);
}

// ── MAIN SPA HTML ──
const MAIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="google-site-verification" content="7Q0EJk3kQKNLNzIhyzH4k5CsuHsQEa-U0Pwp_w_b0n0"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>JobNova — Find Your Next Remote Job</title>
<meta name="description" content="JobNova is a modern remote job board with 600+ curated positions in development, design, marketing, data, and more. Updated hourly.">
<meta name="keywords" content="remote jobs, developer jobs, designer jobs, work from home, tech jobs, job board, career">
<meta name="robots" content="index, follow">
<meta property="og:title" content="JobNova — Find Your Next Remote Job">
<meta property="og:description" content="600+ curated remote jobs updated hourly.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://app.jobnova.workers.dev">
<link rel="canonical" href="https://app.jobnova.workers.dev">
<link rel="alternate" type="application/rss+xml" title="JobNova Jobs Feed" href="https://app.jobnova.workers.dev/feed.rss">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"JobNova","url":"https://app.jobnova.workers.dev","potentialAction":{"@type":"SearchAction","target":"https://app.jobnova.workers.dev/?search={search_term_string}","query-input":"required name=search_term_string"}}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
${SHARED_CSS}
${NAV_CSS}

/* TICKER */
.ticker-wrap{
  background:linear-gradient(90deg,var(--bg2),var(--bg3),var(--bg2));
  border-bottom:1px solid var(--border);
  padding:9px 0;overflow:hidden;position:sticky;top:64px;z-index:90;
}
.ticker-track{display:flex;gap:52px;animation:ticker 40s linear infinite;white-space:nowrap;width:max-content}
.ticker-track:hover{animation-play-state:paused}
.t-item{font-size:12px;color:var(--t2);display:flex;align-items:center;gap:7px;font-weight:500}
.t-dot{width:7px;height:7px;border-radius:50%;background:var(--green);animation:pulse-dot 2s infinite;box-shadow:0 0 6px var(--green)}
.t-item strong{color:var(--accent2)}
@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.5)}}

/* LAYOUT */
.app{display:flex;min-height:calc(100vh - 101px)}

/* SIDEBAR */
.sidebar{
  width:268px;background:var(--bg2);
  border-right:1px solid var(--border);
  padding:24px 18px;
  position:sticky;top:101px;height:calc(100vh - 101px);
  overflow-y:auto;flex-shrink:0;
  display:flex;flex-direction:column;gap:20px;
}
.sidebar::-webkit-scrollbar{width:3px}
.sidebar::-webkit-scrollbar-thumb{background:var(--border2)}
.logo{
  font-size:24px;font-weight:900;letter-spacing:-1px;
  background:linear-gradient(135deg,#4F8EF7 0%,#A78BFA 50%,#4F8EF7 100%);
  background-size:200% auto;
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  display:block;line-height:1.1;animation:shimmer 4s linear infinite;
}
@keyframes shimmer{0%{background-position:0%}100%{background-position:200%}}
.logo-sub{font-size:10px;color:var(--t3);letter-spacing:2.5px;text-transform:uppercase;font-weight:600;margin-top:3px}

.s-title{
  font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;
  color:var(--t3);margin-bottom:8px;
  display:flex;align-items:center;gap:8px;
}
.s-title::after{content:'';flex:1;height:1px;background:var(--border)}

.nav-btn{
  display:flex;align-items:center;gap:10px;width:100%;
  padding:9px 12px;border:1px solid transparent;
  background:transparent;color:var(--t2);border-radius:10px;
  cursor:pointer;font-size:13px;font-weight:500;
  font-family:inherit;transition:all .2s;text-align:left;
}
.nav-btn:hover{background:var(--glow2);color:var(--accent2);border-color:var(--border2)}
.nav-btn.active{
  background:linear-gradient(135deg,rgba(79,142,247,.12),rgba(79,142,247,.06));
  color:var(--accent2);border-color:rgba(79,142,247,.2);
}
.nav-icon{font-size:15px;width:20px;text-align:center}
.nav-count{
  margin-left:auto;font-size:10px;font-weight:700;
  background:rgba(79,142,247,.15);color:var(--accent2);
  padding:2px 8px;border-radius:20px;
}
.nav-btn.active .nav-count{background:var(--accent3);color:#fff}

.stats-card{
  background:linear-gradient(135deg,rgba(79,142,247,.06),rgba(79,142,247,.02));
  border:1px solid rgba(79,142,247,.12);
  border-radius:14px;padding:14px;
}
.stat-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0}
.stat-row:not(:last-child){border-bottom:1px solid var(--border)}
.stat-label{font-size:12px;color:var(--t3)}
.stat-val{font-size:13px;font-weight:700;color:var(--accent2)}

.footer-link-s{font-size:11px;color:var(--t3);padding:3px 0;transition:color .2s;cursor:pointer;background:none;border:none;font-family:inherit;text-align:left;text-decoration:none;display:block}
.footer-link-s:hover{color:var(--t2)}

/* MAIN */
.main{flex:1;min-width:0}

/* HERO */
.hero{
  padding:52px 44px 40px;border-bottom:1px solid var(--border);
  background:
    radial-gradient(ellipse 70% 60% at 20% 50%,rgba(79,142,247,.08),transparent),
    radial-gradient(ellipse 50% 50% at 80% 20%,rgba(139,92,246,.06),transparent);
  position:relative;overflow:hidden;
}
.hero::before{
  content:'';position:absolute;top:-50%;right:-20%;
  width:600px;height:600px;border-radius:50%;
  background:radial-gradient(circle,rgba(79,142,247,.05) 0%,transparent 70%);
  pointer-events:none;
}
.hero-eyebrow{
  display:inline-flex;align-items:center;gap:8px;
  background:linear-gradient(135deg,rgba(79,142,247,.12),rgba(139,92,246,.08));
  border:1px solid rgba(79,142,247,.2);
  border-radius:20px;padding:5px 14px;font-size:12px;
  color:var(--accent2);font-weight:600;margin-bottom:22px;
  box-shadow:0 2px 12px rgba(79,142,247,.1);
}
.hero-eyebrow-dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse-dot 2s infinite}
.hero-title{
  font-size:38px;font-weight:900;letter-spacing:-1.5px;
  line-height:1.12;margin-bottom:14px;max-width:580px;color:var(--t1);
}
.hero-title .hl{
  background:linear-gradient(135deg,var(--accent) 0%,var(--purple) 50%,var(--accent2) 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.hero-sub{color:var(--t2);font-size:15px;margin-bottom:32px;max-width:500px;line-height:1.7}
.hero-stats{display:flex;gap:28px;margin-bottom:28px;flex-wrap:wrap}
.hero-stat{display:flex;align-items:center;gap:8px}
.hero-stat-num{font-size:20px;font-weight:800;color:var(--t1)}
.hero-stat-label{font-size:12px;color:var(--t3);font-weight:500}

.search-wrap{position:relative;max-width:580px}
.search-icon{position:absolute;left:18px;top:50%;transform:translateY(-50%);color:var(--t3);pointer-events:none;font-size:16px}
.search-input{
  width:100%;background:var(--card);
  border:1.5px solid var(--border2);
  border-radius:14px;padding:15px 18px 15px 48px;
  color:var(--t1);font-size:15px;font-family:inherit;
  outline:none;transition:all .25s;
  box-shadow:0 2px 16px rgba(0,0,0,.2);
}
.search-input::placeholder{color:var(--t3)}
.search-input:focus{
  border-color:var(--accent);
  box-shadow:0 0 0 3px var(--glow),0 4px 24px rgba(0,0,0,.3);
  background:var(--card2);
}

/* FILTER BAR */
.filters-bar{
  padding:14px 44px;border-bottom:1px solid var(--border);
  display:flex;align-items:center;gap:8px;overflow-x:auto;
  background:var(--bg2);
}
.filters-bar::-webkit-scrollbar{height:0}

.chip{
  display:inline-flex;align-items:center;gap:6px;
  padding:7px 16px;border-radius:20px;
  border:1.5px solid var(--border2);
  background:var(--card);color:var(--t2);
  font-size:12px;font-weight:600;font-family:inherit;
  cursor:pointer;white-space:nowrap;transition:all .2s;
}
.chip:hover{border-color:var(--accent3);color:var(--accent2);background:var(--glow2)}
.chip.active{
  background:linear-gradient(135deg,var(--accent3),var(--accent));
  border-color:transparent;color:#fff;
  box-shadow:0 4px 16px rgba(79,142,247,.3);
}

/* ADV FILTERS */
.adv-filters{
  padding:14px 44px;border-bottom:1px solid var(--border);
  display:none;gap:12px;flex-wrap:wrap;background:var(--bg);align-items:flex-end;
}
.adv-filters.open{display:flex}
.filter-select{
  background:var(--card);border:1px solid var(--border2);
  border-radius:10px;padding:8px 14px;color:var(--t2);
  font-size:13px;font-family:inherit;cursor:pointer;outline:none;transition:all .2s;
}
.filter-select:focus{border-color:var(--accent);color:var(--t1)}
.filter-label{font-size:11px;font-weight:600;color:var(--t3);display:flex;flex-direction:column;gap:5px;letter-spacing:.5px;text-transform:uppercase}
.salary-input{
  width:110px;background:var(--card);border:1px solid var(--border2);
  border-radius:10px;padding:8px 12px;color:var(--t1);font-size:13px;font-family:inherit;outline:none;
}
.salary-input:focus{border-color:var(--accent)}
.clear-btn{
  padding:8px 16px;border-radius:10px;border:1px solid var(--border2);
  background:transparent;color:var(--t3);font-size:13px;
  cursor:pointer;font-family:inherit;transition:all .2s;
}
.clear-btn:hover{color:var(--red);border-color:var(--red)}

/* CONTENT */
.content-wrap{padding:28px 44px}
.results-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;gap:12px;flex-wrap:wrap}
.results-count{font-size:14px;color:var(--t3)}
.results-count strong{color:var(--t1);font-weight:700}
.adv-toggle-btn{
  display:inline-flex;align-items:center;gap:7px;
  padding:8px 16px;border-radius:10px;border:1px solid var(--border2);
  background:var(--card);color:var(--t2);font-size:13px;
  cursor:pointer;font-family:inherit;transition:all .2s;font-weight:500;
}
.adv-toggle-btn:hover,.adv-toggle-btn.active{background:var(--glow2);border-color:var(--accent3);color:var(--accent2)}

/* JOB CARDS */
.jobs-list{display:flex;flex-direction:column;gap:10px}

.job-card{
  background:var(--card);
  border:1px solid var(--border2);
  border-radius:16px;padding:0;
  cursor:pointer;transition:all .3s cubic-bezier(.4,0,.2,1);
  position:relative;overflow:hidden;
  display:block;text-decoration:none;color:inherit;
}
.job-card::before{
  content:'';position:absolute;left:0;top:0;bottom:0;width:3px;
  background:linear-gradient(180deg,var(--accent3),var(--purple));
  opacity:0;transition:opacity .3s;
}
.job-card:hover{
  border-color:rgba(79,142,247,.3);
  transform:translateY(-2px) translateX(2px);
  box-shadow:0 8px 40px rgba(0,0,0,.4),0 0 0 1px rgba(79,142,247,.1);
  background:var(--card2);
}
.job-card:hover::before{opacity:1}

.card-inner{padding:20px 24px}
.card-top{display:flex;align-items:flex-start;gap:16px}
.co-logo{
  width:50px;height:50px;border-radius:12px;
  background:var(--bg2);border:1px solid var(--border2);
  display:flex;align-items:center;justify-content:center;
  font-size:16px;font-weight:800;color:var(--accent2);
  overflow:hidden;flex-shrink:0;transition:transform .3s;
}
.job-card:hover .co-logo{transform:scale(1.05)}
.co-logo img{width:100%;height:100%;object-fit:contain;padding:7px}

.job-info{flex:1;min-width:0}
.card-badges{display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap}

.job-title{
  font-size:15px;font-weight:700;color:var(--t1);
  margin-bottom:5px;line-height:1.35;
  transition:color .2s;
}
.job-card:hover .job-title{color:var(--accent2)}

.job-co{
  font-size:13px;color:var(--accent2);font-weight:600;
  margin-bottom:10px;display:inline-flex;align-items:center;gap:5px;
}
.job-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center}

.tag{display:inline-flex;align-items:center;gap:5px;font-size:11px;padding:4px 11px;border-radius:20px;font-weight:600}
.tag-loc{color:var(--t3);font-size:12px;padding-left:0}
.tag-remote{background:rgba(0,214,143,.1);color:var(--green);border:1px solid rgba(0,214,143,.2)}
.tag-hybrid{background:rgba(255,181,71,.1);color:var(--amber);border:1px solid rgba(255,181,71,.2)}
.tag-onsite{background:rgba(139,165,204,.06);color:var(--t2);border:1px solid var(--border2)}
.tag-type{background:rgba(139,165,204,.06);color:var(--t2);border:1px solid var(--border2)}
.tag-new{
  background:linear-gradient(135deg,rgba(0,214,143,.18),rgba(0,214,143,.08));
  color:var(--green);border:1px solid rgba(0,214,143,.3);
  font-size:10px;padding:3px 9px;border-radius:20px;font-weight:800;letter-spacing:.8px;
  animation:pulse-green 2.5s ease-in-out infinite;
}
@keyframes pulse-green{0%,100%{box-shadow:0 0 0 0 rgba(0,214,143,.25)}60%{box-shadow:0 0 0 5px rgba(0,214,143,.05)}}
.tag-hot{
  background:linear-gradient(135deg,rgba(255,92,122,.18),rgba(255,92,122,.08));
  color:var(--red);border:1px solid rgba(255,92,122,.3);
  font-size:10px;padding:3px 9px;border-radius:20px;font-weight:800;letter-spacing:.8px;
}
.tag-featured{
  background:linear-gradient(135deg,rgba(139,92,246,.18),rgba(139,92,246,.08));
  color:var(--purple);border:1px solid rgba(139,92,246,.3);
  font-size:10px;padding:3px 9px;border-radius:20px;font-weight:800;letter-spacing:.8px;
}

.job-right{display:flex;flex-direction:column;align-items:flex-end;gap:10px;flex-shrink:0}
.salary-badge{
  font-size:13px;font-weight:800;color:var(--salary);
  background:rgba(0,214,143,.08);border:1px solid rgba(0,214,143,.2);
  padding:5px 14px;border-radius:10px;white-space:nowrap;
  box-shadow:0 2px 8px rgba(0,214,143,.1);
}
.card-actions{display:flex;align-items:center;gap:6px}
.act-btn{
  width:34px;height:34px;border-radius:10px;
  background:var(--bg2);border:1px solid var(--border2);
  color:var(--t3);display:flex;align-items:center;justify-content:center;
  cursor:pointer;font-size:15px;transition:all .2s;position:relative;z-index:1;
}
.act-btn:hover{background:var(--card2);border-color:var(--border);color:var(--t1);transform:scale(1.1)}
.act-btn.saved{background:rgba(255,181,71,.1);border-color:var(--amber);color:var(--amber)}
.act-btn.saved:hover{background:rgba(255,181,71,.2)}
.arr-btn{
  width:34px;height:34px;border-radius:10px;
  background:linear-gradient(135deg,rgba(79,142,247,.15),rgba(79,142,247,.08));
  border:1px solid rgba(79,142,247,.2);
  color:var(--accent2);display:flex;align-items:center;justify-content:center;
  font-size:16px;transition:all .25s;
}
.job-card:hover .arr-btn{
  background:linear-gradient(135deg,var(--accent3),var(--accent));
  border-color:transparent;color:#fff;
  box-shadow:0 4px 166px rgba(79,142,247,.4);
}

/* CARD FOOTER */
.card-footer{
  padding:10px 24px;
  border-top:1px solid var(--border);
  background:rgba(0,0,0,.1);
  display:flex;align-items:center;justify-content:space-between;
  font-size:11px;color:var(--t3);
}
.card-footer-tag{display:flex;align-items:center;gap:5px}

/* TOAST */
.toast{
  position:fixed;bottom:28px;right:28px;
  background:var(--card2);border:1px solid var(--border2);
  border-radius:14px;padding:14px 22px;font-size:14px;
  color:var(--t1);display:flex;align-items:center;gap:12px;
  box-shadow:var(--shadow2);
  transform:translateY(120px);opacity:0;transition:all .35s cubic-bezier(.4,0,.2,1);
  z-index:9999;max-width:340px;
}
.toast.show{transform:translateY(0);opacity:1}
.toast-bar{position:absolute;bottom:0;left:0;height:3px;background:var(--accent);border-radius:0 0 14px 14px;animation:toast-bar 3s linear forwards}
@keyframes toast-bar{from{width:100%}to{width:0%}}

/* EMPTY / LOADER */
.empty{text-align:center;padding:80px 20px;color:var(--t3)}
.empty .e-icon{font-size:52px;margin-bottom:16px;opacity:.4}
.empty h3{font-size:19px;color:var(--t2);margin-bottom:8px;font-weight:700}
.empty p{font-size:14px}
.loader-wrap{padding:80px 20px;text-align:center}
.loader{
  display:inline-block;width:36px;height:36px;
  border:3px solid var(--border2);border-top-color:var(--accent);
  border-radius:50%;animation:spin .7s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg)}}

/* SKELETON */
.skeleton{
  background:linear-gradient(90deg,var(--card) 25%,var(--card2) 50%,var(--card) 75%);
  background-size:200% 100%;
  animation:skeleton 1.5s infinite;
  border-radius:8px;
}
@keyframes skeleton{0%{background-position:200%}100%{background-position:-200%}}

/* PAGINATION */
.pagination{display:flex;align-items:center;justify-content:center;gap:8px;padding:32px 0 16px}
.page-btn{
  padding:9px 18px;border-radius:10px;
  border:1.5px solid var(--border2);background:var(--card);
  color:var(--t2);font-size:13px;font-weight:500;
  font-family:inherit;cursor:pointer;transition:all .2s;
}
.page-btn:hover:not(:disabled){border-color:var(--accent3);color:var(--accent2);background:var(--glow2)}
.page-btn:disabled{opacity:.3;cursor:default}
.page-info{font-size:13px;color:var(--t3);padding:0 10px}

/* AD */
.ad-wrap{
  display:flex;justify-content:center;align-items:center;
  overflow:hidden;margin:14px 0;max-height:72px;
}
.ad-label{font-size:9px;color:var(--t3);text-align:center;margin-bottom:4px;letter-spacing:1.5px;text-transform:uppercase;opacity:.5}

/* FORMS */
.form-card{background:var(--card);border:1px solid var(--border2);border-radius:18px;padding:36px;max-width:560px}
.form-group{margin-bottom:22px}
.form-label{font-size:12px;font-weight:700;color:var(--t2);margin-bottom:8px;display:block;letter-spacing:.5px;text-transform:uppercase}
.form-input{
  width:100%;background:var(--bg2);
  border:1.5px solid var(--border2);border-radius:12px;
  padding:13px 18px;color:var(--t1);font-size:15px;
  font-family:inherit;outline:none;transition:all .25s;
}
.form-input:focus{border-color:var(--accent);background:var(--bg3);box-shadow:0 0 0 3px var(--glow)}
.form-input::placeholder{color:var(--t3)}
.submit-btn{
  width:100%;background:linear-gradient(135deg,var(--accent3),var(--accent));
  color:#fff;padding:15px;border-radius:12px;font-size:16px;font-weight:700;
  font-family:inherit;border:none;cursor:pointer;
  box-shadow:0 4px 24px rgba(79,142,247,.35);transition:all .25s;
}
.submit-btn:hover{transform:translateY(-1px);box-shadow:0 6px 32px rgba(79,142,247,.5)}
.kw-chip{
  display:inline-flex;align-items:center;gap:7px;
  background:rgba(79,142,247,.1);border:1px solid rgba(79,142,247,.2);
  color:var(--accent2);padding:5px 12px;border-radius:20px;
  font-size:12px;font-weight:600;margin:4px;
}
.kw-chip button{background:none;border:none;color:var(--accent2);cursor:pointer;font-size:15px;line-height:1;padding:0;opacity:.7}
.kw-chip button:hover{opacity:1}

/* LIGHT MODE */
body.light{
  --bg:#F0F4FF;--bg2:#E8EFF9;--bg3:#E0E8F5;
  --card:#FFFFFF;--card2:#F5F8FF;
  --border:#D0DCF0;--border2:#C0CCEA;
  --t1:#0A1628;--t2:#3D5577;--t3:#8099B8;
}

/* MOBILE */
.mob-hdr{
  display:none;padding:14px 20px;
  background:rgba(7,13,26,.9);
  backdrop-filter:blur(20px);
  border-bottom:1px solid var(--border);
  align-items:center;justify-content:space-between;
  position:sticky;top:64px;z-index:80;gap:12px;
}
.mob-logo{
  font-size:20px;font-weight:900;letter-spacing:-.5px;
  background:linear-gradient(135deg,#4F8EF7,#A78BFA);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.mob-btns{display:flex;gap:8px}
.mob-btn{
  width:36px;height:36px;border-radius:10px;
  border:1px solid var(--border2);background:var(--card);
  color:var(--t2);display:flex;align-items:center;justify-content:center;
  cursor:pointer;font-size:16px;transition:all .2s;
}
.mob-btn:hover{border-color:var(--accent3);color:var(--accent2)}

.drawer-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:300;backdrop-filter:blur(4px)}
.drawer-overlay.open{display:block}
.mob-drawer{
  position:fixed;top:0;left:-290px;width:280px;height:100vh;
  background:var(--bg2);border-right:1px solid var(--border2);
  z-index:301;transition:left .32s cubic-bezier(.4,0,.2,1);
  overflow-y:auto;padding:24px 18px;
  display:flex;flex-direction:column;gap:22px;
}
.mob-drawer.open{left:0}
.drawer-close{
  position:absolute;top:18px;right:18px;
  background:var(--card);border:1px solid var(--border2);
  color:var(--t2);width:32px;height:32px;border-radius:8px;
  cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;
  transition:all .2s;
}
.drawer-close:hover{color:var(--t1);border-color:var(--border)}

@media(max-width:768px){
  .sidebar{display:none}
  .mob-hdr{display:flex}
  .hero{padding:28px 20px 24px}
  .hero-title{font-size:26px}
  .hero-stats{gap:16px}
  .filters-bar{padding:12px 16px}
  .adv-filters{padding:14px 16px}
  .content-wrap{padding:20px 16px}
  .job-right{align-items:flex-start}
  .card-inner{padding:16px}
  /* تحسينات التناسق للهواتف الذكية */
  .card-top{flex-direction:column;gap:12px}
  .job-right{width:100%;flex-direction:row;justify-content:space-between;align-items:center;margin-top:8px;border-top:1px solid var(--border);padding-top:12px}
  .ticker-track{gap:24px}
  .form-card{padding:20px}
}
</style>
</head>
<body>

<div class="drawer-overlay" id="drawerOverlay" onclick="closeDrawer()"></div>
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
    <a href="/blog" class="nav-btn" style="text-decoration:none"><span class="nav-icon">📝</span>Career Blog</a>
    <button class="nav-btn" onclick="toggleTheme()"><span class="nav-icon" id="drawerThemeIcon">🌙</span>Dark / Light</button>
  </div>
  <div style="margin-top:auto">
    <div class="s-title">Legal</div>
    <a href="/privacy" class="footer-link-s">Privacy Policy</a>
    <a href="/terms" class="footer-link-s">Terms of Service</a>
    <a href="/disclaimer" class="footer-link-s">Disclaimer</a>
    <div style="margin-top:16px;font-size:10px;color:var(--t3);letter-spacing:.5px">© 2026 JobNova. All rights reserved.</div>
  </div>
</div>

<!-- NAV -->
<nav class="nav">
  <a href="/" class="nav-logo">JobNova</a>
  <div class="nav-links">
    <a href="/" class="nav-link">Jobs</a>
    <a href="/blog" class="nav-link">Blog</a>
    <a href="/privacy" class="nav-link">Privacy</a>
    <a href="/" class="nav-cta">Browse Jobs →</a>
  </div>
</nav>

<!-- TICKER -->
<div class="ticker-wrap">
  <div class="ticker-track">
    <span class="t-item"><span class="t-dot"></span><strong id="tc1">669</strong> Active Jobs</span>
    <span class="t-item">💼 Updated hourly via AI matching</span>
    <span class="t-item">🌍 Remote-first opportunities worldwide</span>
    <span class="t-item">⚡ Dev · Design · Marketing · Data · DevOps</span>
    <span class="t-item">✅ Verified company listings</span>
    <span class="t-item">🚀 New jobs added every hour</span>
    <span class="t-item">💰 Positions with salary data included</span>
    <span class="t-item"><span class="t-dot"></span><strong id="tc2">669</strong> Active Jobs</span>
    <span class="t-item">💼 Updated hourly via AI matching</span>
    <span class="t-item">🌍 Remote-first opportunities worldwide</span>
    <span class="t-item">⚡ Dev · Design · Marketing · Data · DevOps</span>
    <span class="t-item">✅ Verified company listings</span>
    <span class="t-item">🚀 New jobs added every hour</span>
    <span class="t-item">💰 Positions with salary data included</span>
  </div>
</div>

<!-- MOBILE HEADER -->
<div class="mob-hdr">
  <span class="mob-logo">JobNova</span>
  <div class="mob-btns">
    <button class="mob-btn" onclick="toggleTheme()" id="themeBtn">🌙</button>
    <button class="mob-btn" onclick="goView('saved')">🔖</button>
    <button class="mob-btn" onclick="openDrawer()">☰</button>
  </div>
</div>

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
      <a href="/blog" class="nav-btn" style="text-decoration:none"><span class="nav-icon">📝</span>Career Blog</a>
      <button class="nav-btn" onclick="toggleTheme()"><span class="nav-icon" id="themeNavIcon">🌙</span>Dark / Light</button>
    </div>
    <!-- AD SIDEBAR -->
    <div>
      <div style="font-size:9px;color:var(--t3);text-align:center;margin-bottom:5px;letter-spacing:1.5px;text-transform:uppercase;opacity:.5">Advertisement</div>
      <div style="display:flex;justify-content:center;overflow:hidden;border-radius:10px;max-height:62px">
        <script>atOptions={'key':'0ffa7f357eb68570f215b35f87c4ff62','format':'iframe','height':50,'width':320,'params':{}};</script>
        <script src="https://www.highperformanceformat.com/0ffa7f357eb68570f215b35f87c4ff62/invoke.js"></script>
      </div>
    </div>
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
      <div style="margin-top:14px;font-size:10px;color:var(--t3);letter-spacing:.5px">© 2026 JobNova. All rights reserved.</div>
    </div>
  </aside>

  <main class="main">
    <!-- JOBS VIEW -->
    <div id="vJobs">
      <div class="hero">
        <div class="hero-eyebrow">
          <span class="hero-eyebrow-dot"></span>
          AI-Powered Job Matching — Updated Every Hour
        </div>
        <h1 class="hero-title">
          Find Your Next<br><span class="hl">Remote Career</span> Opportunity
        </h1>
        <div class="hero-stats">
          <div class="hero-stat">
            <span class="hero-stat-num" id="stat-jobs">600+</span>
            <span class="hero-stat-label">Active Jobs</span>
          </div>
          <div style="width:1px;background:var(--border2);align-self:stretch"></div>
          <div class="hero-stat">
            <span class="hero-stat-num">50+</span>
            <span class="hero-stat-label">Companies</span>
          </div>
          <div style="width:1px;background:var(--border2);align-self:stretch"></div>
          <div class="hero-stat">
            <span class="hero-stat-num">Hourly</span>
            <span class="hero-stat-label">Updates</span>
          </div>
        </div>
        <div class="search-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" id="searchInput"
            placeholder="Search jobs, companies, or skills..."
            oninput="debounceSearch(this.value)">
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
        <label class="filter-label">Remote Type<select class="filter-select" id="fRemote" onchange="applyAdvFilters()"><option value="">All Types</option><option value="fully_remote">Fully Remote</option><option value="hybrid">Hybrid</option><option value="on_site">On-site</option></select></label>
        <label class="filter-label">Employment<select class="filter-select" id="fEmploy" onchange="applyAdvFilters()"><option value="">All Types</option><option value="full_time">Full Time</option><option value="part_time">Part Time</option><option value="contract">Contract</option></select></label>
        <label class="filter-label">Seniority<select class="filter-select" id="fSeniority" onchange="applyAdvFilters()"><option value="">All Levels</option><option value="Junior">Junior</option><option value="Mid">Mid-Level</option><option value="Senior">Senior</option><option value="Staff">Staff / Principal</option></select></label>
        <label class="filter-label">Min Salary ($k)<input type="number" class="salary-input" id="fSalaryMin" placeholder="e.g. 80" oninput="debounceAdv()"></label>
        <label class="filter-label">Posted Within<select class="filter-select" id="fDate" onchange="applyAdvFilters()"><option value="">Any time</option><option value="1">Today</option><option value="7">This week</option><option value="30">This month</option></select></label>
        <button class="clear-btn" onclick="clearAdvFilters()">✕ Clear</button>
      </div>

      <div class="content-wrap">
        <div class="results-hdr">
          <div class="results-count" id="resultsCount">Loading...</div>
          <button class="adv-toggle-btn" id="advToggleBtn" onclick="toggleAdv()">⚙️ Filters</button>
        </div>
        <!-- AD BEFORE JOBS -->
        <div class="ad-wrap">
          <div style="text-align:center">
            <div class="ad-label">Advertisement</div>
            <script>atOptions={'key':'f9df5bf8e15c630ee01718f64c6edfb3','format':'iframe','height':50,'width':320,'params':{}};</script>
            <script src="https://www.highperformanceformat.com/f9df5bf8e15c630ee01718f64c6edfb3/invoke.js"></script>
          </div>
        </div>
        <div class="jobs-list" id="jobsList"><div class="loader-wrap"><div class="loader"></div></div></div>
        <div class="pagination" id="pagination"></div>
      </div>
    </div>

    <!-- SAVED VIEW -->
    <div id="vSaved" style="display:none">
      <div class="content-wrap" style="max-width:820px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
          <h2 style="font-size:22px;font-weight:800;color:var(--t1)">🔖 Saved Jobs</h2>
          <button onclick="clearAllSaved()" style="padding:8px 16px;border-radius:10px;border:1px solid var(--border2);background:transparent;color:var(--t3);font-size:13px;cursor:pointer;font-family:inherit;transition:all .2s" onmouseover="this.style.borderColor='var(--red)';this.style.color='var(--red)'" onmouseout="this.style.borderColor='var(--border2)';this.style.color='var(--t3)'">Clear All</button>
        </div>
        <div class="jobs-list" id="savedList"></div>
      </div>
    </div>

    <!-- ALERTS VIEW -->
    <div id="vAlerts" style="display:none">
      <div class="content-wrap">
        <button onclick="goView('jobs')" style="display:inline-flex;align-items:center;gap:8px;color:var(--t3);font-size:14px;cursor:pointer;border:none;background:none;font-family:inherit;margin-bottom:28px;transition:color .2s" onmouseover="this.style.color='var(--accent2)'" onmouseout="this.style.color='var(--t3)'">← Back to Jobs</button>
        <div class="form-card">
          <div style="font-size:24px;font-weight:800;margin-bottom:8px;color:var(--t1)">🔔 Job Alerts</div>
          <div style="font-size:15px;color:var(--t2);margin-bottom:28px">Get notified by email when new matching jobs are posted.</div>
          <div class="form-group">
            <label class="form-label">Your Email Address</label>
            <input type="email" class="form-input" id="alertEmail" placeholder="you@example.com">
          </div>
          <div class="form-group">
            <label class="form-label">Keywords <span style="color:var(--t3);font-weight:400;text-transform:none;letter-spacing:0">(press Enter to add)</span></label>
            <input type="text" class="form-input" id="alertKwInput" placeholder="e.g. React, Python, Remote..." onkeydown="addKeyword(event)">
            <div style="margin-top:10px" id="kwWrap"></div>
          </div>
          <button class="submit-btn" onclick="submitAlert()">Subscribe to Alerts →</button>
        </div>
      </div>
    </div>
  </main>
</div>

<div class="toast" id="toast">
  <span id="toastIcon" style="font-size:18px">✓</span>
  <span id="toastMsg">Done</span>
  <div class="toast-bar" id="toastBar"></div>
</div>

<script>
let pg=1,cat='',srch='',advT,srchT;
let jobs=[],total=0;
let savedIds=JSON.parse(localStorage.getItem('jn_saved')||'[]');
let alertKws=[];
let adv={remote:'',employ:'',seniority:'',salaryMin:'',days:''};
let isLight=localStorage.getItem('jn_theme')==='light';

function applyTheme(){
  document.body.classList.toggle('light',isLight);
  const ic=isLight?'☀️':'🌙';
  ['themeBtn','themeNavIcon','drawerThemeIcon'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.textContent=ic;
  });
}
function toggleTheme(){isLight=!isLight;localStorage.setItem('jn_theme',isLight?'light':'dark');applyTheme();}
applyTheme();

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

function initials(n){return(n||'?').split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();}

function logoHtml(co,sz='50px'){
  const slug=(co||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const domain=slug+'.com';
  const ini=initials(co);
  const fs=Math.round(parseInt(sz)*.32)+'px';
  return \`<div class="co-logo" style="width:\${sz};height:\${sz}" title="\${co}">
    <img src="https://www.google.com/s2/favicons?domain=\${domain}&sz=64" alt="\${co}"
      style="width:100%;height:100%;object-fit:contain;padding:8px;display:block"
      onerror="this.onerror=null;this.src='https://icons.duckduckgo.com/ip3/\${domain}.ico';this.onerror=function(){this.style.display='none';this.nextElementSibling.style.display='flex'}">
    <span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:\${fs};font-weight:800;color:#4F8EF7">\${ini}</span>
  </div>\`;
}

function remoteTag(t){
  if(!t)return'';
  const m={
    fully_remote:['tag-remote','🌐 Remote'],
    hybrid:['tag-hybrid','🏢 Hybrid'],
    on_site:['tag-onsite','📍 On-site'],
    onsite:['tag-onsite','📍 On-site']
  };
  const[cls,lbl]=m[t]||['tag-onsite',t.replace(/_/g,' ')];
  return\`<span class="tag \${cls}">\${lbl}</span>\`;
}

function isNew(ts){if(!ts)return false;return Date.now()-new Date(ts).getTime()<86400000;}
function isHotSalary(sal){if(!sal)return false;const n=parseInt(sal.replace(/\\D/g,'').slice(0,3));return n>=150;}

let toastTimer;
function showToast(msg,type='success'){
  const el=document.getElementById('toast');
  const icon=document.getElementById('toastIcon');
  const bar=document.getElementById('toastBar');
  document.getElementById('toastMsg').textContent=msg;
  icon.textContent=type==='success'?'✓':'ℹ';
  icon.style.color=type==='success'?'var(--green)':'var(--accent2)';
  el.className='toast show';
  if(bar){bar.style.animation='none';bar.offsetHeight;bar.style.animation='toast-bar 3s linear forwards';}
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),3100);
}

function updateSavedCount(){document.getElementById('saved-cnt').textContent=savedIds.length||0;}

const VIEWS=['vJobs','vSaved','vAlerts'];
function showView(id){
  VIEWS.forEach(v=>{
    const el=document.getElementById(v);
    if(el)el.style.display=v===id?'block':'none';
  });
  window.scrollTo({top:0,behavior:'smooth'});
}
function goView(v){
  if(v==='jobs'){showView('vJobs');return;}
  if(v==='saved'){showView('vSaved');renderSaved();return;}
  if(v==='alerts'){showView('vAlerts');return;}
}

function toggleAdv(){
  document.getElementById('advFilters').classList.toggle('open');
  document.getElementById('advToggleBtn').classList.toggle('active');
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

function renderSkeletons(){
  return Array(5).fill(0).map(()=>\`
    <div class="job-card" style="pointer-events:none">
      <div class="card-inner">
        <div class="card-top">
          <div class="skeleton" style="width:50px;height:50px;border-radius:12px;flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div class="skeleton" style="height:14px;width:60%;margin-bottom:10px;border-radius:6px"></div>
            <div class="skeleton" style="height:18px;width:80%;margin-bottom:10px;border-radius:6px"></div>
            <div class="skeleton" style="height:12px;width:40%;border-radius:6px"></div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
            <div class="skeleton" style="height:30px;width:100px;border-radius:8px"></div>
            <div class="skeleton" style="height:34px;width:80px;border-radius:10px"></div>
          </div>
        </div>
      </div>
    </div>\`).join('');
}

async function loadJobs(){
  document.getElementById('jobsList').innerHTML=renderSkeletons();
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

    document.getElementById('resultsCount').innerHTML=
      \`<strong>\${total.toLocaleString()}</strong> jobs found\${cat?' in <strong>'+cat+'</strong>':''}\${srch?' for "<strong>'+srch+'</strong>"':''}\`;

    if(!jobs.length){
      document.getElementById('jobsList').innerHTML=\`
        <div class="empty">
          <div class="e-icon">🔍</div>
          <h3>No jobs found</h3>
          <p>Try different keywords or browse all categories</p>
        </div>\`;
      return;
    }

    document.getElementById('jobsList').innerHTML=jobs.map((j,idx)=>{
      const saved=savedIds.includes(j.id);
      const nw=isNew(j.created_at);
      const hot=isHotSalary(j.salary);
      const featured=idx<3;
      const timeAgo=j.created_at?getTimeAgo(new Date(j.created_at)):'';
      return\`<a href="/job/\${j.id}" class="job-card" style="animation:fadeIn .4s ease \${idx*.06}s both">
        <div class="card-inner">
          <div class="card-top">
            \${logoHtml(j.company)}
            <div class="job-info">
              <div class="card-badges">
                \${nw?'<span class="tag-new">✦ NEW</span>':''}
                \${hot?'<span class="tag-hot">🔥 HOT</span>':''}
                \${featured&&!nw&&!hot?'<span class="tag-featured">⭐ FEATURED</span>':''}
              </div>
              <div class="job-title">\${j.title}</div>
              <div class="job-co">
                <span style="width:6px;height:6px;border-radius:50%;background:var(--green);display:inline-block"></span>
                \${j.company}
              </div>
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
                <button class="act-btn\${saved?' saved':''}" onclick="event.preventDefault();event.stopPropagation();toggleSave(\${j.id})" id="sb-\${j.id}" title="\${saved?'Unsave':'Save'} job">\${saved?'🔖':'🔖'}</button>
                <button class="act-btn" onclick="event.preventDefault();event.stopPropagation();shareJob(\${j.id})" title="Copy link">🔗</button>
                <div class="arr-btn">→</div>
              </div>
            </div>
          </div>
        </div>
        \${timeAgo?'<div class="card-footer"><span class="card-footer-tag">⏰ Posted '+timeAgo+'</span><span style="color:var(--accent2);font-size:11px">View Details →</span></div>':''}
      </a>\`;
    }).join('');

    const tp=Math.ceil(total/20);
    if(tp>1)document.getElementById('pagination').innerHTML=\`
      <button class="page-btn" onclick="goPage(\${pg-1})" \${pg===1?'disabled':''}>← Prev</button>
      <span class="page-info">Page \${pg} of \${tp}</span>
      <button class="page-btn" onclick="goPage(\${pg+1})" \${pg===tp?'disabled':''}>Next →</button>\`;

  }catch(e){
    document.getElementById('jobsList').innerHTML=\`
      <div class="empty">
        <div class="e-icon">⚠️</div>
        <h3>Failed to load jobs</h3>
        <p>Please refresh and try again</p>
      </div>\`;
  }
}

function getTimeAgo(date){
  const diff=Date.now()-date.getTime();
  const h=Math.floor(diff/3600000);
  const d=Math.floor(diff/86400000);
  if(h<1)return'just now';
  if(h<24)return h+'h ago';
  if(d<7)return d+'d ago';
  return d+'d ago';
}

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
  const url=window.location.origin+'/job/'+id;
  navigator.clipboard.writeText(url).then(()=>showToast('Link copied! 🔗')).catch(()=>showToast('Copied!'));
}

function renderSaved(){
  if(!savedIds.length){
    document.getElementById('savedList').innerHTML=\`
      <div class="empty">
        <div class="e-icon">🔖</div>
        <h3>No saved jobs yet</h3>
        <p>Click the bookmark icon on any job to save it</p>
      </div>\`;
    return;
  }
  const saved=jobs.filter(j=>savedIds.includes(j.id));
  if(!saved.length){
    document.getElementById('savedList').innerHTML=\`
      <div class="empty">
        <div class="e-icon">🔖</div>
        <h3>No saved jobs found</h3>
        <p>Your saved positions are cached locally</p>
      </div>\`;
    return;
  }
}
</script>
</body>
</html>
