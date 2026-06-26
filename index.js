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

const SHARED_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#03060F;--bg2:#070D1A;--bg3:#0B1424;
  --card:#0D1829;--card2:#111F35;
  --border:#152236;--border2:#1E3352;
  --accent:#4F8EF7;--accent2:#6EA6FF;--accent3:#3D7BF0;
  --glow:rgba(79,142,247,.2);--glow2:rgba(79,142,247,.07);
  --green:#00D68F;--amber:#FFB547;--red:#FF5C7A;--purple:#8B5CF6;
  --salary:#00D68F;--t1:#E8F0FF;--t2:#8BA5CC;--t3:#4A6080;
  --r:14px;
}
html{scroll-behavior:smooth}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:var(--bg);color:var(--t1);min-height:100vh;line-height:1.6;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:var(--bg2)}::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px}
a{color:inherit;text-decoration:none}
@keyframes shimmer{0%{background-position:0%}100%{background-position:200%}}
@keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.6)}}
@keyframes pulse-green{0%,100%{box-shadow:0 0 0 0 rgba(0,214,143,.25)}60%{box-shadow:0 0 0 5px rgba(0,214,143,.04)}}
@keyframes fadeInUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes skeleton{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes toast-bar{from{width:100%}to{width:0%}}
`;

const NAV_CSS = `
.nav{
  background:rgba(3,6,15,.9);
  backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border-bottom:1px solid var(--border);
  padding:0 20px;height:58px;
  display:flex;align-items:center;justify-content:space-between;
  position:sticky;top:0;z-index:200;
}
.nav-logo{
  font-size:20px;font-weight:900;letter-spacing:-1px;
  background:linear-gradient(135deg,#4F8EF7 0%,#A78BFA 50%,#4F8EF7 100%);
  background-size:200% auto;
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  animation:shimmer 4s linear infinite;
}
.nav-links{display:flex;align-items:center;gap:4px}
.nav-link{padding:6px 12px;border-radius:8px;font-size:13px;font-weight:500;color:var(--t2);transition:all .2s}
.nav-link:hover{color:var(--t1);background:var(--card2)}
.nav-cta{
  background:linear-gradient(135deg,var(--accent3),var(--accent));
  color:#fff;border-radius:8px;padding:7px 14px;font-size:13px;font-weight:600;
  transition:all .2s;box-shadow:0 3px 12px rgba(79,142,247,.3);
}
.nav-cta:hover{transform:translateY(-1px);box-shadow:0 5px 20px rgba(79,142,247,.4)}
@media(max-width:640px){.nav-links .nav-link{display:none}}
@media(max-width:768px){
  .nav{display:none}
  .ticker-wrap{top:58px}
  .mob-hdr{top:0}
  .app{min-height:calc(100vh - 94px)}
}

function baseLayout(title, description, canonical, ogImage, content, extraHead='') {
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
${ogImage?`<meta property="og:image" content="${ogImage}">`:''}
<link rel="canonical" href="${canonical}">
<link rel="alternate" type="application/rss+xml" title="JobNova Jobs Feed" href="https://app.jobnova.workers.dev/feed.rss">
${extraHead}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
${SHARED_CSS}${NAV_CSS}
.page{max-width:860px;margin:0 auto;padding:36px 20px 72px}
.page-sm{max-width:680px;margin:0 auto;padding:36px 20px 72px}
.breadcrumb{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--t3);margin-bottom:28px;flex-wrap:wrap}
.breadcrumb a{color:var(--accent2)}.breadcrumb a:hover{color:var(--t1)}

.job-hero{background:var(--card);border:1px solid var(--border2);border-radius:18px;overflow:hidden;margin-bottom:20px;position:relative}
.job-hero::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent3),var(--purple),var(--accent2))}
.job-hero-hdr{padding:28px 24px}
.job-co-row{display:flex;align-items:center;gap:14px;margin-bottom:18px}
.job-logo{width:64px;height:64px;border-radius:14px;background:var(--bg2);border:1px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:var(--accent2);overflow:hidden;flex-shrink:0}
.job-logo img{width:100%;height:100%;object-fit:contain;padding:8px}
.job-co-name{font-size:16px;font-weight:700;color:var(--accent2);margin-bottom:3px}
.job-co-loc{font-size:12px;color:var(--t3)}
.job-title-h1{font-size:24px;font-weight:900;letter-spacing:-.5px;line-height:1.25;margin-bottom:14px;color:var(--t1)}
.job-chips{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:16px}
.job-salary-lg{font-size:22px;font-weight:800;color:var(--salary)}
.job-body{padding:24px;border-top:1px solid var(--border)}
.sec-label{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:12px}
.skills-wrap{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:24px}
.skill-tag{background:rgba(79,142,247,.1);border:1px solid rgba(79,142,247,.2);color:var(--accent2);font-size:12px;padding:4px 12px;border-radius:8px;font-weight:500}
.desc-wrap{font-size:14px;color:var(--t2);line-height:1.85;margin-bottom:24px;white-space:pre-line}
.apply-big{display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,var(--accent3),var(--accent));color:#fff;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:700;text-decoration:none;transition:all .25s;box-shadow:0 4px 20px rgba(79,142,247,.35)}
.apply-big:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(79,142,247,.5)}

.tag{display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:4px 10px;border-radius:20px;font-weight:600;white-space:nowrap}
.tag-remote{background:rgba(0,214,143,.1);color:var(--green);border:1px solid rgba(0,214,143,.2)}
.tag-hybrid{background:rgba(255,181,71,.1);color:var(--amber);border:1px solid rgba(255,181,71,.2)}
.tag-onsite{background:rgba(139,165,204,.06);color:var(--t2);border:1px solid var(--border2)}
.tag-type{background:rgba(139,165,204,.06);color:var(--t2);border:1px solid var(--border2)}
.tag-new{background:rgba(0,214,143,.12);color:var(--green);border:1px solid rgba(0,214,143,.25);font-size:10px;padding:3px 9px;font-weight:800;letter-spacing:.8px;border-radius:20px;animation:pulse-green 2.5s ease-in-out infinite}
.tag-hot{background:rgba(255,92,122,.12);color:var(--red);border:1px solid rgba(255,92,122,.25);font-size:10px;padding:3px 9px;font-weight:800;border-radius:20px}
.tag-featured{background:rgba(139,92,246,.12);color:var(--purple);border:1px solid rgba(139,92,246,.25);font-size:10px;padding:3px 9px;font-weight:800;border-radius:20px}

.related-title{font-size:17px;font-weight:800;margin-bottom:14px;color:var(--t1)}
.related-grid{display:flex;flex-direction:column;gap:8px}
.related-card{background:var(--card);border:1px solid var(--border2);border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:14px;transition:all .2s;text-decoration:none}
.related-card:hover{border-color:var(--accent3);transform:translateX(3px)}
.related-logo{width:38px;height:38px;border-radius:8px;background:var(--bg2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:var(--accent2);overflow:hidden;flex-shrink:0}
.related-logo img{width:100%;height:100%;object-fit:contain;padding:5px}
.related-info{flex:1;min-width:0}
.related-jt{font-size:13px;font-weight:700;color:var(--t1);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.related-co{font-size:12px;color:var(--accent2)}
.related-sal{font-size:12px;font-weight:700;color:var(--salary);white-space:nowrap}

.article-cat{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--accent2);margin-bottom:12px}
.article-title{font-size:28px;font-weight:900;letter-spacing:-.5px;line-height:1.25;margin-bottom:14px;color:var(--t1)}
.article-meta{font-size:12px;color:var(--t3);display:flex;gap:16px;margin-bottom:28px;flex-wrap:wrap}
.article-body{font-size:15px;color:var(--t2);line-height:1.85}
.article-body h2{font-size:19px;font-weight:700;margin:28px 0 12px;color:var(--t1);padding-left:14px;border-left:3px solid var(--accent)}
.article-body p{margin-bottom:14px}
.article-body ul{padding-left:20px;margin-bottom:14px}
.article-body ul li{margin-bottom:8px}
.article-body strong{color:var(--t1)}

.static-title{font-size:26px;font-weight:900;margin-bottom:8px;color:var(--t1)}
.static-date{font-size:12px;color:var(--t3);margin-bottom:28px}
.static-body h2{font-size:17px;font-weight:700;margin:24px 0 10px;color:var(--t1)}
.static-body p{font-size:14px;color:var(--t2);line-height:1.8;margin-bottom:10px}
.static-body ul{padding-left:18px;margin-bottom:10px}
.static-body ul li{font-size:14px;color:var(--t2);line-height:1.8;margin-bottom:6px}
.static-body a{color:var(--accent2)}

.back-link{display:inline-flex;align-items:center;gap:7px;color:var(--t3);font-size:13px;font-weight:500;transition:color .2s;margin-bottom:24px;text-decoration:none}
.back-link:hover{color:var(--accent2)}

.footer{border-top:1px solid var(--border);padding:32px 20px;margin-top:32px}
.footer-inner{max-width:860px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px}
.footer-logo{font-size:18px;font-weight:900;background:linear-gradient(135deg,#4F8EF7,#A78BFA);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.footer-links{display:flex;gap:16px;flex-wrap:wrap}
.footer-link{font-size:12px;color:var(--t3);transition:color .2s}.footer-link:hover{color:var(--t2)}
.footer-copy{font-size:11px;color:var(--t3);width:100%}

.ad-wrap{display:flex;justify-content:center;align-items:center;overflow:hidden;margin:12px 0;max-height:68px}
.ad-label{font-size:9px;color:var(--t3);text-align:center;margin-bottom:3px;letter-spacing:1.5px;text-transform:uppercase;opacity:.5}

@media(max-width:640px){
  .job-title-h1{font-size:20px}
  .article-title{font-size:22px}
  .job-hero-hdr,.job-body{padding:18px 16px}
  .apply-big{width:100%;justify-content:center}
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
<footer class="footer">
  <div class="footer-inner">
    <span class="footer-logo">JobNova</span>
    <div class="footer-links">
      <a href="/" class="footer-link">Home</a>
      <a href="/blog" class="footer-link">Blog</a>
      <a href="/privacy" class="footer-link">Privacy</a>
      <a href="/terms" class="footer-link">Terms</a>
      <a href="/disclaimer" class="footer-link">Disclaimer</a>
      <a href="/feed.rss" class="footer-link">RSS</a>
    </div>
    <div class="footer-copy">© 2026 JobNova. All rights reserved.</div>
  </div>
</footer>
</body>
</html>`;
}

function logoImgHtml(company, size='64px', cls='job-logo') {
  const slug = (company||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const domain = slug+'.com';
  const ini = (company||'?').split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
  const fs = Math.round(parseInt(size)*.34)+'px';
  return `<div class="${cls}" style="width:${size};height:${size}">
    <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=64" alt="${company}"
      style="width:100%;height:100%;object-fit:contain;padding:7px"
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

function renderJobPage(job, related, base) {
  let skills = [];
  try { skills = JSON.parse(job.skills||'[]'); } catch(e) {}
  const isNew = job.created_at && Date.now()-new Date(job.created_at).getTime()<86400000;
  const isHot = job.salary && parseInt(job.salary.replace(/\D/g,'').slice(0,3)) >= 150;
  const canonical = `${base}/job/${job.id}`;
  const desc = job.description && job.description.length > 20
    ? job.description.slice(0,160).replace(/\n/g,' ')+'...'
    : `${job.title} at ${job.company}. ${job.location||'Remote'}${job.salary?' — '+job.salary:''}. Apply on JobNova.`;

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
      <div class="job-co-row">
        ${logoImgHtml(job.company,'64px','job-logo')}
        <div>
          <div class="job-co-name">${job.company}</div>
          <div class="job-co-loc">📍 ${job.location||'Remote'}</div>
        </div>
      </div>
      <h1 class="job-title-h1">${job.title}</h1>
      <div class="job-chips">
        ${remoteTagHtml(job.remote_type)}
        ${job.employment_type?`<span class="tag tag-type">${job.employment_type.replace(/_/g,' ')}</span>`:''}
        ${job.seniority?`<span class="tag tag-type">${job.seniority}</span>`:''}
        ${isNew?'<span class="tag tag-new">✦ NEW</span>':''}
        ${isHot?'<span class="tag tag-hot">🔥 HOT</span>':''}
      </div>
      ${job.salary?`<div class="job-salary-lg">💰 ${job.salary}</div>`:''}
    </div>
    <div class="job-body">
      ${skills.length?`<div class="sec-label">Required Skills</div><div class="skills-wrap">${skills.map(s=>`<span class="skill-tag">${s}</span>`).join('')}</div>`:''}
      <div class="sec-label">About the Role</div>
      <div class="desc-wrap">${job.description&&job.description.length>20?job.description:'Full description available on the company website. Click Apply Now to view complete details.'}</div>
      <div class="ad-wrap"><div style="text-align:center"><div class="ad-label">Advertisement</div>
        <script>atOptions={'key':'f9df5bf8e15c630ee01718f64c6edfb3','format':'iframe','height':50,'width':320,'params':{}};</script>
        <script src="https://www.highperformanceformat.com/f9df5bf8e15c630ee01718f64c6edfb3/invoke.js"></script>
      </div></div>
      <a href="${job.url}" target="_blank" rel="noopener noreferrer" class="apply-big">Apply Now →</a>
    </div>
  </div>
  ${related.length?`
    <div class="related-title" style="margin-top:24px">Similar Jobs</div>
    <div class="related-grid">
      ${related.map(r=>`
        <a href="/job/${r.id}" class="related-card">
          ${logoImgHtml(r.company,'38px','related-logo')}
          <div class="related-info">
            <div class="related-jt">${r.title}</div>
            <div class="related-co">${r.company}</div>
          </div>
          ${r.salary?`<div class="related-sal">${r.salary}</div>`:''}
          <span style="color:var(--t3)">›</span>
        </a>`).join('')}
    </div>`:''}
  <div class="ad-wrap" style="margin-top:24px"><div style="text-align:center"><div class="ad-label">Advertisement</div>
    <script async="async" data-cfasync="false" src="https://pl29900952.effectivecpmnetwork.com/240c21d3732d67f320e55d7618105288/invoke.js"></script>
    <div id="container-240c21d3732d67f320e55d7618105288"></div>
  </div></div>
</div>`;

  return baseLayout(`${job.title} at ${job.company} — JobNova`, desc, canonical, '', content, `<script type="application/ld+json">${schema}</script>`);
}

const BLOG_POSTS = [
  {id:1,cat:"Career Advice",title:"10 Skills Every Remote Developer Must Have in 2026",excerpt:"Remote work has changed what employers look for. Beyond technical skills, these soft skills separate top candidates from the rest.",date:"June 20, 2026",readTime:"5 min read",
    body:`<p>The remote job market in 2026 is more competitive than ever.</p><h2>1. Asynchronous Communication</h2><p>Remote teams operate across time zones. Clear, concise messages are as important as coding ability.</p><h2>2. Self-Management</h2><p>Tools like Notion and Linear are your best friends.</p><h2>3. Deep Work Focus</h2><p>Top remote developers cultivate 2-4 hour blocks of uninterrupted work.</p><h2>4. Proactive Visibility</h2><p>Share progress proactively and flag blockers early.</p><h2>5. Cloud & DevOps Literacy</h2><p>Understanding Docker and CI/CD adds significant value.</p><h2>6. Strong Git Practices</h2><p>Clean commit history and descriptive PRs are critical.</p><h2>7. Time Zone Awareness</h2><p>Always specify time zones. Use UTC as your mental anchor.</p><h2>8. Written Documentation</h2><p>Remote teams live and die by their docs.</p><h2>9. Video Presence</h2><p>Good lighting and a decent mic matter more than you think.</p><h2>10. Continuous Learning</h2><p>Developers who embrace new tools stay ahead of the curve.</p>`},
  {id:2,cat:"Salary Guide",title:"Remote Developer Salaries in 2026: What You Should Be Earning",excerpt:"Salary data from 600+ remote job listings reveals what companies are actually paying.",date:"June 18, 2026",readTime:"7 min read",
    body:`<p>Based on analysis of 600+ active listings:</p><h2>Frontend Developer</h2><ul><li><strong>Junior:</strong> $55k–$85k</li><li><strong>Mid:</strong> $85k–$130k</li><li><strong>Senior:</strong> $130k–$200k</li></ul><h2>Backend Developer</h2><ul><li><strong>Junior:</strong> $60k–$90k</li><li><strong>Mid:</strong> $90k–$145k</li><li><strong>Senior:</strong> $145k–$220k</li></ul><h2>Data / ML Engineer</h2><ul><li><strong>Mid:</strong> $100k–$160k</li><li><strong>Senior:</strong> $160k–$240k</li></ul><h2>Negotiation Tips</h2><p>Always negotiate. The first offer is rarely the best offer.</p>`},
  {id:3,cat:"Job Search",title:"How to Land a Remote Job in 30 Days",excerpt:"A step-by-step system that has helped thousands of developers secure remote offers.",date:"June 15, 2026",readTime:"9 min read",
    body:`<p>Break the search into a focused 30-day system.</p><h2>Week 1: Foundation</h2><p>Define your target role. Polish your resume — one page, quantify everything.</p><h2>Week 2: Volume with Quality</h2><p>Apply to 5-10 jobs per day with personalized applications.</p><h2>Week 3: Portfolio</h2><p>One impressive deployed project beats five mediocre ones.</p><h2>Week 4: Interview Prep</h2><p>Prepare STAR method, system design, and live coding.</p><h2>The Numbers</h2><p>100 applications → 15 screens → 5 rounds → 2 offers. Stay consistent.</p>`},
  {id:4,cat:"Industry Trends",title:"The State of Remote Work in 2026",excerpt:"Remote work has matured. The hype is gone, but the opportunity is bigger than ever.",date:"June 10, 2026",readTime:"6 min read",
    body:`<p>Remote work has reached equilibrium in 2026.</p><h2>What's Changed</h2><p>Fully remote roles stabilized at 30-35% of white-collar postings.</p><h2>Who's Hiring</h2><p>Shopify, GitLab, Automattic, and hundreds of SaaS companies hire globally.</p><h2>AI's Impact</h2><p>"AI integration" and "LLM fine-tuning" appear in a growing percentage of job listings.</p>`},
  {id:5,cat:"Tools",title:"The Remote Developer's Essential Toolkit for 2026",excerpt:"The apps and workflows that top remote developers swear by.",date:"June 5, 2026",readTime:"5 min read",
    body:`<p>The right tools make remote work easier and more professional.</p><h2>Communication</h2><ul><li><strong>Slack/Discord:</strong> Async team chat</li><li><strong>Loom:</strong> Quick video explanations</li><li><strong>Notion:</strong> Documentation</li></ul><h2>Development</h2><ul><li><strong>Cursor/Copilot:</strong> AI pair programming</li><li><strong>Linear:</strong> Project management</li><li><strong>Cloudflare Workers:</strong> Zero-ops deployment</li></ul>`},
  {id:6,cat:"Interview Prep",title:"Remote Technical Interviews: How to Prepare",excerpt:"Remote interviews have unique challenges. Here's how to ace them.",date:"June 1, 2026",readTime:"6 min read",
    body:`<p>Companies screen for more than coding ability in remote interviews.</p><h2>Setup Check</h2><p>Test your camera, mic, internet, and coding environment the night before.</p><h2>Communicate While Coding</h2><p>Narrate your thinking — silence kills remote interviews.</p><h2>Remote-Specific Questions</h2><ul><li>"How do you handle blockers across time zones?"</li><li>"How do you stay productive working from home?"</li></ul>`}
];

function renderBlogIndex(base) {
  const content = `
<div class="page">
  <div class="breadcrumb"><a href="/">JobNova</a><span>›</span><span>Blog</span></div>
  <h1 style="font-size:26px;font-weight:900;margin-bottom:8px;color:var(--t1)">📝 Career Blog</h1>
  <p style="color:var(--t2);font-size:14px;margin-bottom:24px">Insights and career advice for remote job seekers.</p>
  <div class="ad-wrap"><div style="text-align:center"><div class="ad-label">Advertisement</div>
    <script>atOptions={'key':'0ffa7f357eb68570f215b35f87c4ff62','format':'iframe','height':50,'width':320,'params':{}};</script>
    <script src="https://www.highperformanceformat.com/0ffa7f357eb68570f215b35f87c4ff62/invoke.js"></script>
  </div></div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-top:20px">
    ${BLOG_POSTS.map(p=>`
      <a href="/blog/${p.id}" style="background:var(--card);border:1px solid var(--border2);border-radius:14px;padding:20px;display:block;transition:all .25s;text-decoration:none" onmouseover="this.style.borderColor='var(--accent3)';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--border2)';this.style.transform='none'">
        <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--accent2);margin-bottom:10px">${p.cat}</div>
        <div style="font-size:15px;font-weight:700;margin-bottom:8px;line-height:1.4;color:var(--t1)">${p.title}</div>
        <div style="font-size:13px;color:var(--t3);line-height:1.65;margin-bottom:14px">${p.excerpt}</div>
        <div style="font-size:11px;color:var(--t3);display:flex;gap:12px"><span>📅 ${p.date}</span><span>⏱ ${p.readTime}</span></div>
      </a>`).join('')}
  </div>
</div>`;
  return baseLayout('Career Blog — JobNova','Career insights for remote job seekers.',`${base}/blog`,'',content,
    `<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"Blog","name":"JobNova Career Blog","url":`${base}/blog`})}</script>`);
}

function renderArticlePage(post, base) {
  const canonical = `${base}/blog/${post.id}`;
  const schema = JSON.stringify({"@context":"https://schema.org","@type":"Article","headline":post.title,"description":post.excerpt,"datePublished":post.date,"author":{"@type":"Organization","name":"JobNova"},"url":canonical});
  const content = `
<div class="page-sm">
  <a href="/blog" class="back-link">← Back to Blog</a>
  <div class="article-cat">${post.cat}</div>
  <h1 class="article-title">${post.title}</h1>
  <div class="article-meta"><span>📅 ${post.date}</span><span>⏱ ${post.readTime}</span><span>✍️ JobNova Team</span></div>
  <div class="article-body">${post.body}</div>
  <div class="ad-wrap" style="margin-top:28px"><div style="text-align:center"><div class="ad-label">Advertisement</div>
    <script>atOptions={'key':'0ffa7f357eb68570f215b35f87c4ff62','format':'iframe','height':50,'width':320,'params':{}};</script>
    <script src="https://www.highperformanceformat.com/0ffa7f357eb68570f215b35f87c4ff62/invoke.js"></script>
  </div></div>
  <div style="margin-top:28px;display:flex;gap:10px;flex-wrap:wrap">
    <a href="/blog" class="back-link" style="margin-bottom:0">← Back to Blog</a>
    <a href="/" style="display:inline-flex;align-items:center;gap:7px;background:linear-gradient(135deg,var(--accent3),var(--accent));color:#fff;padding:9px 18px;border-radius:10px;font-size:13px;font-weight:600;text-decoration:none">Browse Remote Jobs →</a>
  </div>
</div>`;
  return baseLayout(`${post.title} — JobNova Blog`,post.excerpt,canonical,'',content,`<script type="application/ld+json">${schema}</script>`);
}

const STATIC_PAGES = {
  privacy:{title:'Privacy Policy',date:'Last updated: June 25, 2026',description:'JobNova Privacy Policy.',
    body:`<h2>1. Information We Collect</h2><p>JobNova does not collect personal information from visitors. No registration required.</p><h2>2. Job Alert Subscribers</h2><p>We store your email and keywords solely to send notifications. We never sell this data.</p><h2>3. Cookies & Storage</h2><p>We use browser localStorage only for saved jobs and theme preference. No tracking cookies.</p><h2>4. Third-Party Advertising</h2><p>This site displays third-party ads. Ad networks may use cookies to serve relevant ads.</p><h2>5. Contact</h2><p>For privacy questions: <a href="mailto:hello@jobnova.dev">hello@jobnova.dev</a></p>`},
  terms:{title:'Terms of Service',date:'Last updated: June 25, 2026',description:'JobNova Terms of Service.',
    body:`<h2>1. Acceptance</h2><p>By using JobNova, you agree to these Terms.</p><h2>2. Service</h2><p>JobNova is a job aggregation platform curating listings from third-party APIs.</p><h2>3. Prohibited Activities</h2><ul><li>Scraping or bulk downloading job data</li><li>Sending spam or unsolicited outreach</li><li>Interfering with site functionality</li></ul><h2>4. Accuracy</h2><p>We do not guarantee accuracy of any listing. Verify with employers directly.</p><h2>5. Liability</h2><p>JobNova is provided "as is" without warranties.</p>`},
  disclaimer:{title:'Disclaimer',date:'Last updated: June 25, 2026',description:'JobNova Disclaimer.',
    body:`<h2>Job Listing Accuracy</h2><p>JobNova aggregates listings from third-party sources. Accuracy and timeliness are not guaranteed.</p><h2>No Employment Relationship</h2><p>JobNova is a discovery platform, not an employer or recruiter.</p><h2>Salary Information</h2><p>Salary figures are estimates and may not reflect actual offers.</p><h2>Advertisement Disclaimer</h2><p>JobNova is not responsible for advertised products or services.</p>`}
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
  <div style="margin-top:32px"><a href="/" class="back-link" style="margin-bottom:0">← Back to Jobs</a></div>
</div>`;
  return baseLayout(`${page.title} — JobNova`,page.description,`${base}/${key}`,'',content);
}

// ── MAIN SPA ──
const MAIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="google-site-verification" content="7Q0EJk3kQKNLNzIhyzH4k5CsuHsQEa-U0Pwp_w_b0n0"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>JobNova — Find Your Next Remote Job</title>
<meta name="description" content="JobNova is a modern remote job board with 600+ curated positions in development, design, marketing, data, and more. Updated hourly.">
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
.ticker-wrap{background:var(--bg2);border-bottom:1px solid var(--border);padding:8px 0;overflow:hidden;position:sticky;top:58px;z-index:90}
.ticker-track{display:flex;gap:48px;animation:ticker 40s linear infinite;white-space:nowrap;width:max-content}
.ticker-track:hover{animation-play-state:paused}
@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.t-item{font-size:12px;color:var(--t2);display:flex;align-items:center;gap:6px;font-weight:500}
.t-dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse-dot 2s infinite;box-shadow:0 0 5px var(--green)}
.t-item strong{color:var(--accent2)}

/* LAYOUT */
.app{display:flex;min-height:calc(100vh - 94px)}

/* SIDEBAR */
.sidebar{
  width:250px;background:var(--bg2);border-right:1px solid var(--border);
  padding:20px 16px;position:sticky;top:94px;height:calc(100vh - 94px);
  overflow-y:auto;flex-shrink:0;display:flex;flex-direction:column;gap:18px;
}
.sidebar::-webkit-scrollbar{width:3px}
.sidebar::-webkit-scrollbar-thumb{background:var(--border2)}
.logo{font-size:22px;font-weight:900;letter-spacing:-1px;background:linear-gradient(135deg,#4F8EF7 0%,#A78BFA 50%,#4F8EF7 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;display:block;line-height:1.1;animation:shimmer 4s linear infinite}
.logo-sub{font-size:9px;color:var(--t3);letter-spacing:2.5px;text-transform:uppercase;font-weight:600;margin-top:3px}
.s-title{font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:var(--t3);margin-bottom:6px;display:flex;align-items:center;gap:7px}
.s-title::after{content:'';flex:1;height:1px;background:var(--border)}
.nav-btn{display:flex;align-items:center;gap:9px;width:100%;padding:8px 10px;border:1px solid transparent;background:transparent;color:var(--t2);border-radius:9px;cursor:pointer;font-size:13px;font-weight:500;font-family:inherit;transition:all .2s;text-align:left}
.nav-btn:hover{background:var(--glow2);color:var(--accent2);border-color:var(--border2)}
.nav-btn.active{background:rgba(79,142,247,.1);color:var(--accent2);border-color:rgba(79,142,247,.18)}
.nav-icon{font-size:14px;width:18px;text-align:center}
.nav-count{margin-left:auto;font-size:10px;font-weight:700;background:rgba(79,142,247,.15);color:var(--accent2);padding:1px 7px;border-radius:20px}
.nav-btn.active .nav-count{background:var(--accent3);color:#fff}
.stats-card{background:rgba(79,142,247,.05);border:1px solid rgba(79,142,247,.1);border-radius:12px;padding:12px}
.stat-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0}
.stat-row:not(:last-child){border-bottom:1px solid var(--border)}
.stat-label{font-size:11px;color:var(--t3)}
.stat-val{font-size:12px;font-weight:700;color:var(--accent2)}
.footer-link-s{font-size:11px;color:var(--t3);padding:3px 0;transition:color .2s;cursor:pointer;background:none;border:none;font-family:inherit;text-align:left;text-decoration:none;display:block}
.footer-link-s:hover{color:var(--t2)}

/* MAIN */
.main{flex:1;min-width:0}

/* HERO */
.hero{
  padding:36px 20px 28px;border-bottom:1px solid var(--border);
  background:radial-gradient(ellipse 80% 60% at 30% 50%,rgba(79,142,247,.07),transparent);
  position:relative;
}
.hero-eyebrow{
  display:inline-flex;align-items:center;gap:7px;
  background:rgba(79,142,247,.1);border:1px solid rgba(79,142,247,.18);
  border-radius:20px;padding:4px 12px;font-size:11px;
  color:var(--accent2);font-weight:600;margin-bottom:16px;
}
.hero-eyebrow-dot{width:5px;height:5px;border-radius:50%;background:var(--green);animation:pulse-dot 2s infinite}
.hero-title{font-size:28px;font-weight:900;letter-spacing:-1px;line-height:1.2;margin-bottom:10px;color:var(--t1)}
.hero-title .hl{background:linear-gradient(135deg,var(--accent),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero-sub{color:var(--t2);font-size:14px;margin-bottom:20px;line-height:1.65;max-width:480px}

/* HERO STATS — مصلحة للموبايل */
.hero-stats{display:flex;gap:0;margin-bottom:20px;background:var(--card);border:1px solid var(--border2);border-radius:12px;overflow:hidden}
.hero-stat{flex:1;padding:12px 10px;text-align:center;border-right:1px solid var(--border)}
.hero-stat:last-child{border-right:none}
.hero-stat-num{font-size:18px;font-weight:800;color:var(--t1);display:block;line-height:1.2}
.hero-stat-label{font-size:10px;color:var(--t3);font-weight:500;letter-spacing:.5px;text-transform:uppercase}

.search-wrap{position:relative;max-width:100%}
.search-icon{position:absolute;left:16px;top:50%;transform:translateY(-50%);color:var(--t3);pointer-events:none;font-size:15px}
.search-input{
  width:100%;background:var(--card);
  border:1.5px solid var(--border2);border-radius:12px;
  padding:13px 16px 13px 44px;
  color:var(--t1);font-size:14px;font-family:inherit;outline:none;transition:all .25s;
}
.search-input::placeholder{color:var(--t3)}
.search-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--glow)}

/* FILTER BAR */
.filters-bar{padding:12px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:7px;overflow-x:auto;background:var(--bg2)}
.filters-bar::-webkit-scrollbar{height:0}
.chip{display:inline-flex;align-items:center;gap:5px;padding:6px 14px;border-radius:20px;border:1.5px solid var(--border2);background:var(--card);color:var(--t2);font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;white-space:nowrap;transition:all .2s}
.chip:hover{border-color:var(--accent3);color:var(--accent2)}
.chip.active{background:linear-gradient(135deg,var(--accent3),var(--accent));border-color:transparent;color:#fff;box-shadow:0 3px 12px rgba(79,142,247,.3)}

/* ADV FILTERS */
.adv-filters{padding:12px 20px;border-bottom:1px solid var(--border);display:none;gap:10px;flex-wrap:wrap;background:var(--bg);align-items:flex-end}
.adv-filters.open{display:flex}
.filter-select{background:var(--card);border:1px solid var(--border2);border-radius:8px;padding:7px 12px;color:var(--t2);font-size:12px;font-family:inherit;cursor:pointer;outline:none}
.filter-select:focus{border-color:var(--accent);color:var(--t1)}
.filter-label{font-size:10px;font-weight:700;color:var(--t3);display:flex;flex-direction:column;gap:4px;letter-spacing:.5px;text-transform:uppercase}
.salary-input{width:90px;background:var(--card);border:1px solid var(--border2);border-radius:8px;padding:7px 10px;color:var(--t1);font-size:12px;font-family:inherit;outline:none}
.salary-input:focus{border-color:var(--accent)}
.clear-btn{padding:7px 14px;border-radius:8px;border:1px solid var(--border2);background:transparent;color:var(--t3);font-size:12px;cursor:pointer;font-family:inherit;transition:all .2s}
.clear-btn:hover{color:var(--red);border-color:var(--red)}

/* CONTENT */
.content-wrap{padding:20px}
.results-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;gap:10px;flex-wrap:wrap}
.results-count{font-size:13px;color:var(--t3)}
.results-count strong{color:var(--t1);font-weight:700}
.adv-toggle-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:9px;border:1px solid var(--border2);background:var(--card);color:var(--t2);font-size:12px;cursor:pointer;font-family:inherit;transition:all .2s;font-weight:500}
.adv-toggle-btn:hover,.adv-toggle-btn.active{background:var(--glow2);border-color:var(--accent3);color:var(--accent2)}

/* JOB CARDS — محسّنة للموبايل */
.jobs-list{display:flex;flex-direction:column;gap:8px}

.job-card{
  background:var(--card);border:1px solid var(--border2);
  border-radius:14px;display:block;text-decoration:none;
  color:inherit;transition:all .25s;position:relative;overflow:hidden;
}
.job-card::before{
  content:'';position:absolute;left:0;top:0;bottom:0;width:3px;
  background:linear-gradient(180deg,var(--accent3),var(--purple));
  opacity:0;transition:opacity .25s;border-radius:3px 0 0 3px;
}
.job-card:hover{border-color:rgba(79,142,247,.3);transform:translateY(-1px);box-shadow:0 6px 28px rgba(0,0,0,.35);background:var(--card2)}
.job-card:hover::before{opacity:1}

/* CARD INNER — layout مضبوط للموبايل */
.card-inner{padding:16px}
.card-row1{display:flex;align-items:flex-start;gap:12px}
.co-logo{
  width:46px;height:46px;border-radius:10px;
  background:var(--bg2);border:1px solid var(--border2);
  display:flex;align-items:center;justify-content:center;
  font-size:14px;font-weight:800;color:var(--accent2);
  overflow:hidden;flex-shrink:0;
}
.co-logo img{width:100%;height:100%;object-fit:contain;padding:6px}

.card-body{flex:1;min-width:0}
.card-badges{display:flex;align-items:center;gap:5px;margin-bottom:5px;flex-wrap:wrap}
.job-title-card{font-size:14px;font-weight:700;color:var(--t1);line-height:1.3;margin-bottom:4px;transition:color .2s}
.job-card:hover .job-title-card{color:var(--accent2)}
.job-co-card{font-size:12px;color:var(--accent2);font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:5px}
.job-meta-row{display:flex;flex-wrap:wrap;gap:5px;align-items:center}

/* RIGHT SIDE — يظهر على سطر منفصل على الموبايل */
.card-right{display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid var(--border)}
.salary-badge{font-size:12px;font-weight:700;color:var(--salary);background:rgba(0,214,143,.08);border:1px solid rgba(0,214,143,.18);padding:4px 12px;border-radius:8px;white-space:nowrap}
.card-actions{display:flex;align-items:center;gap:5px}
.act-btn{width:32px;height:32px;border-radius:8px;background:var(--bg2);border:1px solid var(--border2);color:var(--t3);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;transition:all .2s;position:relative;z-index:1}
.act-btn:hover{background:var(--card2);color:var(--t1);transform:scale(1.08)}
.act-btn.saved{background:rgba(255,181,71,.1);border-color:var(--amber);color:var(--amber)}
.arr-btn{width:32px;height:32px;border-radius:8px;background:rgba(79,142,247,.12);border:1px solid rgba(79,142,247,.18);color:var(--accent2);display:flex;align-items:center;justify-content:center;font-size:15px;transition:all .25s}
.job-card:hover .arr-btn{background:linear-gradient(135deg,var(--accent3),var(--accent));border-color:transparent;color:#fff}

/* CARD FOOTER */
.card-footer{padding:8px 16px;border-top:1px solid var(--border);background:rgba(0,0,0,.08);display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--t3)}

/* TAGS */
.tag{display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 9px;border-radius:20px;font-weight:600;white-space:nowrap}
.tag-loc{color:var(--t3);font-size:11px}
.tag-remote{background:rgba(0,214,143,.1);color:var(--green);border:1px solid rgba(0,214,143,.2)}
.tag-hybrid{background:rgba(255,181,71,.1);color:var(--amber);border:1px solid rgba(255,181,71,.2)}
.tag-onsite{background:rgba(139,165,204,.06);color:var(--t2);border:1px solid var(--border2)}
.tag-type{background:rgba(139,165,204,.06);color:var(--t2);border:1px solid var(--border2)}
.tag-new{background:rgba(0,214,143,.12);color:var(--green);border:1px solid rgba(0,214,143,.25);font-size:10px;padding:2px 8px;font-weight:800;letter-spacing:.8px;border-radius:20px;animation:pulse-green 2.5s ease-in-out infinite}
.tag-hot{background:rgba(255,92,122,.12);color:var(--red);border:1px solid rgba(255,92,122,.25);font-size:10px;padding:2px 8px;font-weight:800;border-radius:20px}
.tag-featured{background:rgba(139,92,246,.12);color:var(--purple);border:1px solid rgba(139,92,246,.25);font-size:10px;padding:2px 8px;font-weight:800;border-radius:20px}

/* TOAST */
.toast{position:fixed;bottom:20px;right:16px;background:var(--card2);border:1px solid var(--border2);border-radius:12px;padding:12px 18px;font-size:13px;color:var(--t1);display:flex;align-items:center;gap:10px;box-shadow:0 8px 32px rgba(0,0,0,.5);transform:translateY(100px);opacity:0;transition:all .3s;z-index:9999;max-width:300px}
.toast.show{transform:translateY(0);opacity:1}
.toast-bar{position:absolute;bottom:0;left:0;height:2px;background:var(--accent);border-radius:0 0 12px 12px;animation:toast-bar 3s linear forwards}

/* EMPTY / LOADER */
.empty{text-align:center;padding:60px 16px;color:var(--t3)}
.empty .e-icon{font-size:44px;margin-bottom:12px;opacity:.4}
.empty h3{font-size:17px;color:var(--t2);margin-bottom:6px;font-weight:700}
.empty p{font-size:13px}
.loader-wrap{padding:60px 16px;text-align:center}
.loader{display:inline-block;width:32px;height:32px;border:3px solid var(--border2);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite}

/* SKELETON */
.skel{background:linear-gradient(90deg,var(--card) 25%,var(--card2) 50%,var(--card) 75%);background-size:200% 100%;animation:skeleton 1.5s infinite;border-radius:8px}

/* PAGINATION */
.pagination{display:flex;align-items:center;justify-content:center;gap:7px;padding:24px 0 12px}
.page-btn{padding:8px 16px;border-radius:9px;border:1.5px solid var(--border2);background:var(--card);color:var(--t2);font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;transition:all .2s}
.page-btn:hover:not(:disabled){border-color:var(--accent3);color:var(--accent2)}
.page-btn:disabled{opacity:.3;cursor:default}
.page-info{font-size:13px;color:var(--t3);padding:0 8px}

/* AD */
.ad-wrap{display:flex;justify-content:center;align-items:center;overflow:hidden;margin:10px 0;max-height:68px}
.ad-label{font-size:9px;color:var(--t3);text-align:center;margin-bottom:3px;letter-spacing:1.5px;text-transform:uppercase;opacity:.5}

/* FORMS */
.form-card{background:var(--card);border:1px solid var(--border2);border-radius:16px;padding:28px 20px;max-width:540px}
.form-group{margin-bottom:18px}
.form-label{font-size:11px;font-weight:700;color:var(--t2);margin-bottom:7px;display:block;letter-spacing:.5px;text-transform:uppercase}
.form-input{width:100%;background:var(--bg2);border:1.5px solid var(--border2);border-radius:10px;padding:12px 14px;color:var(--t1);font-size:14px;font-family:inherit;outline:none;transition:all .25s}
.form-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--glow)}
.form-input::placeholder{color:var(--t3)}
.submit-btn{width:100%;background:linear-gradient(135deg,var(--accent3),var(--accent));color:#fff;padding:13px;border-radius:10px;font-size:15px;font-weight:700;font-family:inherit;border:none;cursor:pointer;box-shadow:0 4px 20px rgba(79,142,247,.3);transition:all .25s}
.submit-btn:hover{transform:translateY(-1px)}
.kw-chip{display:inline-flex;align-items:center;gap:6px;background:rgba(79,142,247,.1);border:1px solid rgba(79,142,247,.2);color:var(--accent2);padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;margin:3px}
.kw-chip button{background:none;border:none;color:var(--accent2);cursor:pointer;font-size:14px;line-height:1;padding:0;opacity:.7}

/* LIGHT MODE */
body.light{--bg:#F0F4FF;--bg2:#E8EFF9;--bg3:#E0E8F5;--card:#FFFFFF;--card2:#F5F8FF;--border:#D0DCF0;--border2:#C0CCEA;--t1:#0A1628;--t2:#3D5577;--t3:#8099B8}

/* MOBILE HEADER */
.mob-hdr{display:none;padding:12px 16px;background:rgba(3,6,15,.92);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);align-items:center;justify-content:space-between;position:sticky;top:58px;z-index:80;gap:10px}
.mob-logo{font-size:18px;font-weight:900;letter-spacing:-.5px;background:linear-gradient(135deg,#4F8EF7,#A78BFA);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.mob-btns{display:flex;gap:6px}
.mob-btn{width:34px;height:34px;border-radius:8px;border:1px solid var(--border2);background:var(--card);color:var(--t2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px;transition:all .2s}
.mob-btn:hover{border-color:var(--accent3);color:var(--accent2)}

/* DRAWER */
.drawer-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:300;backdrop-filter:blur(4px)}
.drawer-overlay.open{display:block}
.mob-drawer{position:fixed;top:0;left:-280px;width:264px;height:100vh;background:var(--bg2);border-right:1px solid var(--border2);z-index:301;transition:left .3s cubic-bezier(.4,0,.2,1);overflow-y:auto;padding:20px 14px;display:flex;flex-direction:column;gap:18px}
.mob-drawer.open{left:0}
.drawer-close{position:absolute;top:14px;right:14px;background:var(--card);border:1px solid var(--border2);color:var(--t2);width:30px;height:30px;border-radius:7px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center}

/* RESPONSIVE FIXES */
@media(max-width:768px){
  .sidebar{display:none}
  .nav{display:none}
  .mob-hdr{display:flex;top:0}
  .ticker-wrap{top:58px}
  .app{min-height:calc(100vh - 94px)}
  .hero{padding:22px 16px 20px}
  .hero-title{font-size:22px;letter-spacing:-.5px}
  .hero-sub{font-size:13px}
  .hero-eyebrow{font-size:10px;padding:3px 10px}
  /* Stats row صحيحة */
  .hero-stats{margin-bottom:16px}
  .hero-stat-num{font-size:16px}
  .hero-stat-label{font-size:9px}
  .search-input{font-size:14px;padding:12px 14px 12px 40px}
  .filters-bar{padding:10px 14px;gap:6px}
  .chip{padding:5px 11px;font-size:11px}
  .adv-filters{padding:12px 14px}
  .content-wrap{padding:14px 12px}
  /* Cards */
  .card-inner{padding:14px 12px}
  .co-logo{width:42px;height:42px;border-radius:9px}
  .job-title-card{font-size:13px}
  .job-co-card{font-size:11px}
  .card-footer{padding:7px 12px}
  .pagination{padding:20px 0 10px;gap:6px}
  .page-btn{padding:7px 12px;font-size:12px}
}

@media(max-width:380px){
  .hero-title{font-size:20px}
  .hero-stat-num{font-size:14px}
  .chip{padding:5px 9px;font-size:11px}
}
</style>
</head>
<body>

<div class="drawer-overlay" id="drawerOverlay" onclick="closeDrawer()"></div>
<div class="mob-drawer" id="mobDrawer">
  <button class="drawer-close" onclick="closeDrawer()">✕</button>
  <div><span class="logo">JobNova</span><span class="logo-sub">Career Platform</span></div>
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
    <div style="margin-top:12px;font-size:10px;color:var(--t3)">© 2026 JobNova. All rights reserved.</div>
  </div>
</div>

<!-- NAV -->
<nav class="nav">
  <a href="/" class="nav-logo">JobNova</a>
  <div class="nav-links">
    <a href="/" class="nav-link">Jobs</a>
    <a href="/blog" class="nav-link">Blog</a>
    <a href="/privacy" class="nav-link">Privacy</a>
    <a href="/" class="nav-cta">Browse →</a>
  </div>
</nav>

<!-- TICKER -->
<div class="ticker-wrap">
  <div class="ticker-track">
    <span class="t-item"><span class="t-dot"></span><strong id="tc1">669</strong> Active Jobs</span>
    <span class="t-item">💼 Updated hourly</span>
    <span class="t-item">🌍 Remote-first worldwide</span>
    <span class="t-item">⚡ Dev · Design · Marketing · Data</span>
    <span class="t-item">✅ Verified listings</span>
    <span class="t-item">🚀 New jobs every hour</span>
    <span class="t-item"><span class="t-dot"></span><strong id="tc2">669</strong> Active Jobs</span>
    <span class="t-item">💼 Updated hourly</span>
    <span class="t-item">🌍 Remote-first worldwide</span>
    <span class="t-item">⚡ Dev · Design · Marketing · Data</span>
    <span class="t-item">✅ Verified listings</span>
    <span class="t-item">🚀 New jobs every hour</span>
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
    <div><span class="logo">JobNova</span><span class="logo-sub">Career Platform</span></div>
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
      <div style="font-size:9px;color:var(--t3);text-align:center;margin-bottom:4px;letter-spacing:1.5px;text-transform:uppercase;opacity:.5">Advertisement</div>
      <div style="display:flex;justify-content:center;overflow:hidden;border-radius:8px;max-height:60px">
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
      <div style="margin-top:12px;font-size:10px;color:var(--t3)">© 2026 JobNova. All rights reserved.</div>
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
        <h1 class="hero-title">Find Your Next<br><span class="hl">Remote Career</span> Opportunity</h1>
        <p class="hero-sub">600+ curated jobs in tech, design, marketing & more.</p>
        <!-- HERO STATS — منتظمة -->
        <div class="hero-stats">
          <div class="hero-stat">
            <span class="hero-stat-num" id="stat-jobs">600+</span>
            <span class="hero-stat-label">Active Jobs</span>
          </div>
          <div class="hero-stat">
            <span class="hero-stat-num">50+</span>
            <span class="hero-stat-label">Companies</span>
          </div>
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

      <!-- ❌ تم حذف الإعلان الذي كان هنا تحت البحث -->

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
        <!-- AD BEFORE JOBS — صغير -->
        <div class="ad-wrap"><div style="text-align:center">
          <div class="ad-label">Advertisement</div>
          <script>atOptions={'key':'f9df5bf8e15c630ee01718f64c6edfb3','format':'iframe','height':50,'width':320,'params':{}};</script>
          <script src="https://www.highperformanceformat.com/f9df5bf8e15c630ee01718f64c6edfb3/invoke.js"></script>
        </div></div>
        <div class="jobs-list" id="jobsList"><div class="loader-wrap"><div class="loader"></div></div></div>
        <div class="pagination" id="pagination"></div>
      </div>
    </div>

    <!-- SAVED -->
    <div id="vSaved" style="display:none">
      <div class="content-wrap" style="max-width:800px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
          <h2 style="font-size:20px;font-weight:800;color:var(--t1)">🔖 Saved Jobs</h2>
          <button onclick="clearAllSaved()" style="padding:7px 14px;border-radius:8px;border:1px solid var(--border2);background:transparent;color:var(--t3);font-size:12px;cursor:pointer;font-family:inherit;transition:all .2s" onmouseover="this.style.borderColor='var(--red)';this.style.color='var(--red)'" onmouseout="this.style.borderColor='var(--border2)';this.style.color='var(--t3)'">Clear All</button>
        </div>
        <div class="jobs-list" id="savedList"></div>
      </div>
    </div>

    <!-- ALERTS -->
    <div id="vAlerts" style="display:none">
      <div class="content-wrap">
        <button onclick="goView('jobs')" style="display:inline-flex;align-items:center;gap:7px;color:var(--t3);font-size:13px;cursor:pointer;border:none;background:none;font-family:inherit;margin-bottom:22px;transition:color .2s" onmouseover="this.style.color='var(--accent2)'" onmouseout="this.style.color='var(--t3)'">← Back to Jobs</button>
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

<div class="toast" id="toast">
  <span id="toastIcon" style="font-size:16px">✓</span>
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
  ['themeBtn','themeNavIcon','drawerThemeIcon'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=ic;});
}
function toggleTheme(){isLight=!isLight;localStorage.setItem('jn_theme',isLight?'light':'dark');applyTheme();}
applyTheme();

function openDrawer(){document.getElementById('mobDrawer').classList.add('open');document.getElementById('drawerOverlay').classList.add('open');document.body.style.overflow='hidden';}
function closeDrawer(){document.getElementById('mobDrawer').classList.remove('open');document.getElementById('drawerOverlay').classList.remove('open');document.body.style.overflow='';}

function initials(n){return(n||'?').split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();}
function logoHtml(co,sz='46px'){
  const slug=(co||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const domain=slug+'.com';
  const ini=initials(co);
  const fs=Math.round(parseInt(sz)*.32)+'px';
  return \`<div class="co-logo" style="width:\${sz};height:\${sz}">
    <img src="https://www.google.com/s2/favicons?domain=\${domain}&sz=64" alt="\${co}"
      style="width:100%;height:100%;object-fit:contain;padding:6px;display:block"
      onerror="this.onerror=null;this.src='https://icons.duckduckgo.com/ip3/\${domain}.ico';this.onerror=function(){this.style.display='none';this.nextElementSibling.style.display='flex'}">
    <span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:\${fs};font-weight:800;color:#4F8EF7">\${ini}</span>
  </div>\`;
}
function remoteTag(t){
  if(!t)return'';
  const m={fully_remote:['tag-remote','🌐 Remote'],hybrid:['tag-hybrid','🏢 Hybrid'],on_site:['tag-onsite','📍 On-site'],onsite:['tag-onsite','📍 On-site']};
  const[cls,lbl]=m[t]||['tag-onsite',t.replace(/_/g,' ')];
  return\`<span class="tag \${cls}">\${lbl}</span>\`;
}
function isNew(ts){if(!ts)return false;return Date.now()-new Date(ts).getTime()<86400000;}
function isHot(sal){if(!sal)return false;return parseInt(sal.replace(/\\D/g,'').slice(0,3))>=150;}
function getTimeAgo(date){
  const diff=Date.now()-date.getTime();
  const h=Math.floor(diff/3600000);
  const d=Math.floor(diff/86400000);
  if(h<1)return'just now';
  if(h<24)return h+'h ago';
  return d+'d ago';
}

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
function showView(id){VIEWS.forEach(v=>{const el=document.getElementById(v);if(el)el.style.display=v===id?'block':'none';});window.scrollTo({top:0,behavior:'smooth'});}
function goView(v){
  if(v==='jobs'){showView('vJobs');return;}
  if(v==='saved'){showView('vSaved');renderSaved();return;}
  if(v==='alerts'){showView('vAlerts');return;}
}

function toggleAdv(){document.getElementById('advFilters').classList.toggle('open');document.getElementById('advToggleBtn').classList.toggle('active');}
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
  return Array(4).fill(0).map(()=>\`
    <div class="job-card" style="pointer-events:none">
      <div class="card-inner">
        <div class="card-row1">
          <div class="skel" style="width:46px;height:46px;border-radius:10px;flex-shrink:0"></div>
          <div class="card-body">
            <div class="skel" style="height:12px;width:55%;margin-bottom:8px;border-radius:5px"></div>
            <div class="skel" style="height:16px;width:80%;margin-bottom:8px;border-radius:5px"></div>
            <div class="skel" style="height:11px;width:40%;border-radius:5px"></div>
          </div>
        </div>
        <div class="card-right" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
          <div class="skel" style="height:28px;width:90px;border-radius:8px"></div>
          <div style="display:flex;gap:5px">
            <div class="skel" style="width:32px;height:32px;border-radius:8px"></div>
            <div class="skel" style="width:32px;height:32px;border-radius:8px"></div>
            <div class="skel" style="width:32px;height:32px;border-radius:8px"></div>
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
    document.getElementById('resultsCount').innerHTML=\`<strong>\${total.toLocaleString()}</strong> jobs found\${cat?' in <strong>'+cat+'</strong>':''}\${srch?' for "<strong>'+srch+'</strong>"':''}\`;
    if(!jobs.length){
      document.getElementById('jobsList').innerHTML=\`<div class="empty"><div class="e-icon">🔍</div><h3>No jobs found</h3><p>Try different keywords</p></div>\`;
      return;
    }
    document.getElementById('jobsList').innerHTML=jobs.map((j,idx)=>{
      const saved=savedIds.includes(j.id);
      const nw=isNew(j.created_at);
      const hot=isHot(j.salary);
      const featured=idx<3&&!nw&&!hot;
      const timeAgo=j.created_at?getTimeAgo(new Date(j.created_at)):'';
      return\`<a href="/job/\${j.id}" class="job-card" style="animation:fadeInUp .35s ease \${idx*.05}s both">
        <div class="card-inner">
          <div class="card-row1">
            \${logoHtml(j.company)}
            <div class="card-body">
              <div class="card-badges">
                \${nw?'<span class="tag-new">✦ NEW</span>':''}
                \${hot?'<span class="tag-hot">🔥 HOT</span>':''}
                \${featured?'<span class="tag-featured">⭐ FEATURED</span>':''}
              </div>
              <div class="job-title-card">\${j.title}</div>
              <div class="job-co-card">
                <span style="width:5px;height:5px;border-radius:50%;background:var(--green);display:inline-block;flex-shrink:0"></span>
                \${j.company}
              </div>
              <div class="job-meta-row">
                \${j.location?'<span class="tag tag-loc">📍 '+j.location+'</span>':''}
                \${remoteTag(j.remote_type)}
                \${j.employment_type?'<span class="tag tag-type">'+j.employment_type.replace(/_/g,' ')+'</span>':''}
                \${j.seniority?'<span class="tag tag-type">'+j.seniority+'</span>':''}
              </div>
            </div>
          </div>
          <div class="card-right">
            \${j.salary?'<div class="salary-badge">'+j.salary+'</div>':'<div></div>'}
            <div class="card-actions">
              <button class="act-btn\${saved?' saved':''}" onclick="event.preventDefault();event.stopPropagation();toggleSave(\${j.id})" id="sb-\${j.id}">🔖</button>
              <button class="act-btn" onclick="event.preventDefault();event.stopPropagation();shareJob(\${j.id})">🔗</button>
              <div class="arr-btn">→</div>
            </div>
          </div>
        </div>
        \${timeAgo?'<div class="card-footer"><span>⏰ '+timeAgo+'</span><span style="color:var(--accent2)">View →</span></div>':''}
      </a>\`;
    }).join('');
    const tp=Math.ceil(total/20);
    if(tp>1)document.getElementById('pagination').innerHTML=\`
      <button class="page-btn" onclick="goPage(\${pg-1})" \${pg===1?'disabled':''}>← Prev</button>
      <span class="page-info">Page \${pg} / \${tp}</span>
      <button class="page-btn" onclick="goPage(\${pg+1})" \${pg===tp?'disabled':''}>Next →</button>\`;
  }catch(e){
    document.getElementById('jobsList').innerHTML=\`<div class="empty"><div class="e-icon">⚠️</div><h3>Failed to load</h3><p>Refresh and try again</p></div>\`;
  }
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
    document.getElementById('savedList').innerHTML=\`<div class="empty"><div class="e-icon">🔖</div><h3>No saved jobs yet</h3><p>Tap the bookmark icon to save jobs</p></div>\`;
    return;
  }
  const saved=jobs.filter(j=>savedIds.includes(j.id));
  if(!saved.length){
    document.getElementById('savedList').innerHTML=\`<div class="empty"><div class="e-icon">🔖</div><h3>Browse jobs and save the ones you like</h3></div>\`;
    return;
  }
  document.getElementById('savedList').innerHTML=saved.map(j=>\`
    <a href="/job/\${j.id}" class="job-card">
      <div class="card-inner">
        <div class="card-row1">
          \${logoHtml(j.company)}
          <div class="card-body">
            <div class="job-title-card">\${j.title}</div>
            <div class="job-co-card">\${j.company}</div>
            <div class="job-meta-row">\${remoteTag(j.remote_type)}</div>
          </div>
        </div>
        <div class="card-right">
          \${j.salary?'<div class="salary-badge">'+j.salary+'</div>':'<div></div>'}
          <button class="act-btn saved" onclick="event.preventDefault();toggleSave(\${j.id});renderSaved()">🔖</button>
        </div>
      </div>
    </a>\`).join('');
}
function clearAllSaved(){savedIds=[];localStorage.removeItem('jn_saved');updateSavedCount();renderSaved();showToast('All cleared','info');}

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
  }catch(e){showToast('Failed. Try again.','info');}
}

function filterCat(c,label){
  cat=c;pg=1;
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>{if(b.textContent.trim().includes(label.split(' ')[0]))b.classList.add('active');});
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  document.querySelectorAll('.chip').forEach(c=>{if(c.textContent.trim()===label||c.textContent.includes(label.split(' ').slice(-1)[0]))c.classList.add('active');});
  showView('vJobs');loadJobs();
}
function debounceSearch(v){clearTimeout(srchT);srchT=setTimeout(()=>{srch=v;pg=1;loadJobs();},400);}
function goPage(p){pg=p;loadJobs();window.scrollTo({top:0,behavior:'smooth'});}

async function init(){
  updateSavedCount();
  loadJobs();
  try{
    const r=await fetch('/api/debug');
    const d=await r.json();
    const n=d.jobs_in_db||0;
    const fmt=n=>n.toLocaleString();
    ['st-total','cnt-all'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=fmt(n);});
    ['tc1','tc2'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=fmt(n);});
    const sj=document.getElementById('stat-jobs');if(sj)sj.textContent=fmt(n)+'+';
    const ss=document.getElementById('st-salary');if(ss)ss.textContent=fmt(Math.round(n*.65));
    const sr=document.getElementById('st-remote');if(sr)sr.textContent=fmt(Math.round(n*.4));
  }catch(e){}
}
init();
</script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const base = `${url.protocol}//${url.host}`;
    await ensureTable(env);

    if (url.pathname==='/sitemap.xml') {
      const {results}=await env.DB.prepare("SELECT id,created_at FROM jobs ORDER BY id DESC LIMIT 1000").all();
      const urls=[
        `<url><loc>${base}/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>`,
        `<url><loc>${base}/blog</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
        `<url><loc>${base}/privacy</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>`,
        `<url><loc>${base}/terms</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>`,
        `<url><loc>${base}/disclaimer</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>`,
        ...BLOG_POSTS.map(p=>`<url><loc>${base}/blog/${p.id}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`),
        ...results.map(j=>`<url><loc>${base}/job/${j.id}</loc><changefreq>weekly</changefreq><priority>0.6</priority><lastmod>${new Date(j.created_at||Date.now()).toISOString().split('T')[0]}</lastmod></url>`)
      ].join('');
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,{headers:{"Content-Type":"application/xml"}});
    }

    if (url.pathname==='/feed.rss') {
      const {results}=await env.DB.prepare("SELECT * FROM jobs ORDER BY id DESC LIMIT 50").all();
      const items=results.map(j=>`<item>
        <title><![CDATA[${j.title} at ${j.company}]]></title>
        <link>${base}/job/${j.id}</link>
        <guid>${base}/job/${j.id}</guid>
        <description><![CDATA[${j.company} — ${j.location||'Remote'}${j.salary?' — '+j.salary:''}]]></description>
        <pubDate>${new Date(j.created_at||Date.now()).toUTCString()}</pubDate>
      </item>`).join('');
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel><title>JobNova — Remote Jobs</title><link>${base}</link>
<description>Latest remote job listings from JobNova</description>
<atom:link href="${base}/feed.rss" rel="self" type="application/rss+xml"/>
${items}</channel></rss>`,{headers:{"Content-Type":"application/rss+xml"}});
    }

    const jobMatch=url.pathname.match(/^\/job\/(\d+)$/);
    if (jobMatch) {
      const {results}=await env.DB.prepare("SELECT * FROM jobs WHERE id = ?").bind(jobMatch[1]).all();
      if (!results.length) return new Response('Job not found',{status:404});
      let job=results[0];
      if ((!job.description||job.description.length<20)&&job.job_handle) {
        try {
          const r=await fetch(`https://api.jobdatalake.com/v1/jobs/${job.job_handle}`,{headers:{"X-API-Key":env.API_KEY}});
          if (r.ok) {
            const d=await r.json();
            const desc=d.description||d.summary||"";
            if (desc&&desc.length>20) {
              await env.DB.prepare("UPDATE jobs SET description = ? WHERE id = ?").bind(desc,job.id).run();
              job={...job,description:desc};
            }
          }
        } catch(e) {}
      }
      const {results:related}=await env.DB.prepare("SELECT id,title,company,salary,remote_type FROM jobs WHERE id != ? ORDER BY RANDOM() LIMIT 4").bind(jobMatch[1]).all();
      return new Response(renderJobPage(job,related,base),{headers:{"Content-Type":"text/html; charset=utf-8"}});
    }

    if (url.pathname==='/blog') return new Response(renderBlogIndex(base),{headers:{"Content-Type":"text/html; charset=utf-8"}});

    const blogMatch=url.pathname.match(/^\/blog\/(\d+)$/);
    if (blogMatch) {
      const post=BLOG_POSTS.find(p=>p.id===parseInt(blogMatch[1]));
      if (!post) return new Response('Not found',{status:404});
      return new Response(renderArticlePage(post,base),{headers:{"Content-Type":"text/html; charset=utf-8"}});
    }

    if (url.pathname==='/privacy') return new Response(renderStaticPage('privacy',base),{headers:{"Content-Type":"text/html; charset=utf-8"}});
    if (url.pathname==='/terms') return new Response(renderStaticPage('terms',base),{headers:{"Content-Type":"text/html; charset=utf-8"}});
    if (url.pathname==='/disclaimer') return new Response(renderStaticPage('disclaimer',base),{headers:{"Content-Type":"text/html; charset=utf-8"}});

    if (url.pathname==='/api/subscribe'&&request.method==='POST') {
      try {
        const {email,keywords}=await request.json();
        if (!email||!keywords?.length) return new Response(JSON.stringify({success:false,error:"Required"}),{headers:{"Content-Type":"application/json"}});
        await env.DB.prepare("INSERT OR REPLACE INTO subscribers (email,keywords) VALUES (?,?)").bind(email,JSON.stringify(keywords)).run();
        return new Response(JSON.stringify({success:true}),{headers:{"Content-Type":"application/json"}});
      } catch(e) { return new Response(JSON.stringify({success:false,error:e.message}),{status:500,headers:{"Content-Type":"application/json"}}); }
    }

    if (url.pathname==='/api/jobs') {
      const page=parseInt(url.searchParams.get("page")||"1");
      const limit=20,offset=(page-1)*limit;
      const category=url.searchParams.get("category")||"";
      const search=url.searchParams.get("search")||"";
      const remoteType=url.searchParams.get("remote_type")||"";
      const employType=url.searchParams.get("employment_type")||"";
      const seniority=url.searchParams.get("seniority")||"";
      const salaryMin=url.searchParams.get("salary_min")||"";
      const days=url.searchParams.get("days")||"";
      const conditions=[],params=[];
      if(category){conditions.push("LOWER(title) LIKE ?");params.push(`%${category}%`);}
      if(search){conditions.push("(LOWER(title) LIKE ? OR LOWER(company) LIKE ?)");params.push(`%${search.toLowerCase()}%`,`%${search.toLowerCase()}%`);}
      if(remoteType){conditions.push("remote_type = ?");params.push(remoteType);}
      if(employType){conditions.push("employment_type = ?");params.push(employType);}
      if(seniority){conditions.push("LOWER(seniority) LIKE ?");params.push(`%${seniority.toLowerCase()}%`);}
      if(salaryMin){conditions.push("CAST(REPLACE(REPLACE(salary,'$',''),'k','') AS INTEGER) >= ?");params.push(parseInt(salaryMin));}
      if(days){conditions.push("created_at >= datetime('now', '-' || ? || ' days')");params.push(parseInt(days));}
      const where=conditions.length?" WHERE "+conditions.join(" AND "):"";
      const {results}=await env.DB.prepare(`SELECT * FROM jobs${where} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`).bind(...params).all();
      const {results:cr}=await env.DB.prepare(`SELECT COUNT(*) as total FROM jobs${where}`).bind(...params).all();
      return new Response(JSON.stringify({jobs:results,total:cr[0]?.total||0,page}),{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
    }

    if (url.pathname==='/api/sync') {
      try {
        const result=await syncJobs(env);
        return new Response(JSON.stringify({success:true,...result}),{headers:{"Content-Type":"application/json"}});
      } catch(e) { return new Response(JSON.stringify({success:false,error:e.message}),{status:500,headers:{"Content-Type":"application/json"}}); }
    }

    if (url.pathname==='/api/debug') {
      const {results}=await env.DB.prepare("SELECT COUNT(*) as count FROM jobs").all();
      return new Response(JSON.stringify({jobs_in_db:results[0]?.count||0,api_key_set:!!env.API_KEY}),{headers:{"Content-Type":"application/json"}});
    }

    if (url.pathname==='/api/migrate') {
      await env.DB.prepare("DROP TABLE IF EXISTS jobs").run();
      await env.DB.prepare("DROP TABLE IF EXISTS subscribers").run();
      await ensureTable(env);
      return new Response(JSON.stringify({success:true}),{headers:{"Content-Type":"application/json"}});
    }

    return new Response(MAIN_HTML,{headers:{"Content-Type":"text/html; charset=utf-8"}});
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncJobs(env));
  }
};
