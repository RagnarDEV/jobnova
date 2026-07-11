// ════════════════════════════════════════════════════════════════
// JobNova — Cloudflare Worker
// Light-only, Remote.io-inspired redesign + Admin analytics dashboard
// ════════════════════════════════════════════════════════════════

const CATEGORY_META = {
  developer: { label: 'Development',  emoji: '💻', color: '#3556FF' },
  designer:  { label: 'Design',       emoji: '🎨', color: '#D6489B' },
  marketing: { label: 'Marketing',    emoji: '📣', color: '#F5A623' },
  data:      { label: 'Data & AI',    emoji: '📊', color: '#0EA5C4' },
  devops:    { label: 'DevOps',       emoji: '⚙️', color: '#0FAE79' },
  manager:   { label: 'Management',   emoji: '👔', color: '#FF5C7A' },
  writer:    { label: 'Writing',      emoji: '✍️', color: '#7C3AED' },
};
const CATEGORY_ORDER = Object.keys(CATEGORY_META);

// ── DB SETUP ──────────────────────────────────────────────────────
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
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inserted INTEGER, skipped INTEGER, errors TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT, referrer TEXT, country TEXT, ua TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS api_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT, api_key TEXT, active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

async function logSync(env, result) {
  try {
    await env.DB.prepare(
      `INSERT INTO sync_logs (inserted, skipped, errors) VALUES (?,?,?)`
    ).bind(result.inserted, result.skipped, JSON.stringify(result.errors || [])).run();
  } catch (e) { /* never let logging break sync */ }
}

async function recordVisit(env, request, url) {
  try {
    const country = request.cf?.country || 'XX';
    const ua = (request.headers.get('User-Agent') || '').slice(0, 140);
    const ref = (request.headers.get('Referer') || '').slice(0, 200);
    await env.DB.prepare(
      `INSERT INTO visits (path, referrer, country, ua) VALUES (?,?,?,?)`
    ).bind(url.pathname, ref, country, ua).run();
  } catch (e) { /* best-effort only */ }
}

// ── SYNC (multi API-key aware) ───────────────────────────────────
async function getActiveApiKeys(env) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT api_key FROM api_sources WHERE active = 1`
    ).all();
    if (results && results.length) return results.map(r => r.api_key).filter(Boolean);
  } catch (e) {}
  return env.API_KEY ? [env.API_KEY] : [];
}

async function syncJobs(env) {
  await ensureTable(env);
  const queries = ["developer", "designer", "marketing", "data", "devops", "writer", "manager"];
  const keys = await getActiveApiKeys(env);
  let inserted = 0, skipped = 0, errors = [];
  if (!keys.length) {
    const result = { inserted: 0, skipped: 0, errors: ["No API key configured"] };
    await logSync(env, result);
    return result;
  }
  for (const apiKey of keys) {
    for (const q of queries) {
      const apiUrl = `https://api.jobdatalake.com/v1/jobs?q=${q}&per_page=100`;
      let response;
      try { response = await fetch(apiUrl, { headers: { "X-API-Key": apiKey } }); }
      catch (e) { errors.push(`Fetch "${q}": ${e.message}`); continue; }
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
            job.title || "Unknown", job.company_name || "Company", location, jobUrl,
            job.description || "", salary, job.remote_type || "",
            JSON.stringify(job.required_skills || []),
            Array.isArray(job.seniority) ? job.seniority.join(", ") : "",
            job.employment_type || "", job.job_handle || ""
          ).run();
          if (r.meta?.changes > 0) inserted++; else skipped++;
        } catch (e) { errors.push(`DB: ${e.message.slice(0, 60)}`); }
      }
    }
  }
  const result = { inserted, skipped, errors: errors.slice(0, 5) };
  await logSync(env, result);
  return result;
}

// ── ADMIN AUTH (stateless HMAC cookie) ───────────────────────────
async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function makeAdminCookie(env) {
  const expiry = Date.now() + 1000 * 60 * 60 * 24; // 24h
  const sig = await hmacHex(env.ADMIN_PASSWORD || '', `admin:${expiry}`);
  return `${expiry}.${sig}`;
}
async function verifyAdminCookie(env, cookieHeader) {
  if (!cookieHeader) return false;
  const match = cookieHeader.split(';').map(s => s.trim()).find(s => s.startsWith('jn_admin='));
  if (!match) return false;
  const val = match.slice('jn_admin='.length);
  const [expiryStr, sig] = val.split('.');
  const expiry = parseInt(expiryStr, 10);
  if (!expiry || expiry < Date.now()) return false;
  const expected = await hmacHex(env.ADMIN_PASSWORD || '', `admin:${expiry}`);
  return expected === sig;
}

// ── SHARED DESIGN TOKENS (light-only) ────────────────────────────
const SHARED_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#F6F7FB;--bg2:#F0F2F8;--surface:#FFFFFF;--surface2:#FAFBFD;
  --border:#E6E9F0;--border2:#D8DEEA;
  --ink:#12162B;--ink2:#525A72;--ink3:#8890A4;
  --brand:#3556FF;--brand2:#7C3AED;--brand-soft:#EEF1FF;
  --green:#0FAE79;--amber:#F5A623;--coral:#FF5C7A;--cyan:#0EA5C4;--pink:#D6489B;
  --salary:#0FAE79;
  --r:14px;--shadow:0 2px 10px rgba(18,22,43,.05);--shadow-lg:0 16px 40px rgba(18,22,43,.12);
}
html{scroll-behavior:smooth}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:var(--bg);color:var(--ink);min-height:100vh;line-height:1.6;-webkit-font-smoothing:antialiased}
h1,h2,h3,.font-display{font-family:'Space Grotesk','Inter',sans-serif}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:var(--bg2)}::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px}
a{color:inherit;text-decoration:none}
@keyframes shimmer{0%{background-position:0%}100%{background-position:200%}}
@keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.6)}}
@keyframes fadeInUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes skeleton{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes toast-bar{from{width:100%}to{width:0%}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 0 0 rgba(53,86,255,.18)}50%{box-shadow:0 0 0 8px rgba(53,86,255,0)}}
`;

const NAV_CSS = `
.nav{background:rgba(255,255,255,.9);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--border);padding:0 24px;height:64px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:200}
.nav-logo{font-family:'Space Grotesk',sans-serif;font-size:21px;font-weight:800;letter-spacing:-.5px;color:var(--ink);display:flex;align-items:center;gap:6px}
.nav-logo .dot{width:8px;height:8px;border-radius:50%;background:var(--brand);box-shadow:0 0 0 4px var(--brand-soft)}
.nav-links{display:flex;align-items:center;gap:4px}
.nav-link{padding:8px 14px;border-radius:9px;font-size:14px;font-weight:600;color:var(--ink2);transition:all .2s}
.nav-link:hover{color:var(--brand);background:var(--brand-soft)}
.nav-cta{background:var(--ink);color:#fff;border-radius:9px;padding:9px 16px;font-size:14px;font-weight:700;transition:all .2s}
.nav-cta:hover{background:var(--brand);transform:translateY(-1px)}
@media(max-width:768px){.nav{display:none !important}}
`;

const BASE_URL = 'https://jobnova.manasa.workers.dev';

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
<meta name="theme-color" content="#F6F7FB">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
${ogImage ? `<meta property="og:image" content="${ogImage}">` : ''}
<link rel="canonical" href="${canonical}">
<link rel="alternate" type="application/rss+xml" title="JobNova Jobs Feed" href="${BASE_URL}/feed.rss">
${extraHead}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
${SHARED_CSS}${NAV_CSS}
.page{max-width:860px;margin:0 auto;padding:36px 20px 72px}
.page-sm{max-width:680px;margin:0 auto;padding:36px 20px 72px}
.breadcrumb{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink3);margin-bottom:28px;flex-wrap:wrap}
.breadcrumb a{color:var(--brand)}.breadcrumb a:hover{color:var(--ink)}
.job-hero{background:var(--surface);border:1px solid var(--border);border-radius:18px;overflow:hidden;margin-bottom:20px;position:relative;box-shadow:var(--shadow)}
.job-hero::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--brand),var(--brand2),var(--cyan))}
.job-hero-hdr{padding:28px 24px}
.job-co-row{display:flex;align-items:center;gap:14px;margin-bottom:18px}
.job-logo{width:64px;height:64px;border-radius:14px;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:var(--brand);overflow:hidden;flex-shrink:0}
.job-logo img{width:100%;height:100%;object-fit:contain;padding:8px}
.job-co-name{font-size:16px;font-weight:700;color:var(--brand);margin-bottom:3px}
.job-co-loc{font-size:12px;color:var(--ink3)}
.job-title-h1{font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:700;letter-spacing:-.5px;line-height:1.25;margin-bottom:14px;color:var(--ink)}
.job-chips{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:16px}
.job-salary-lg{font-size:22px;font-weight:800;color:var(--salary)}
.job-body{padding:24px;border-top:1px solid var(--border)}
.sec-label{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--ink3);margin-bottom:12px}
.skills-wrap{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:24px}
.skill-tag{background:var(--brand-soft);border:1px solid rgba(53,86,255,.15);color:var(--brand);font-size:12px;padding:4px 12px;border-radius:8px;font-weight:600}
.desc-wrap{font-size:14px;color:var(--ink2);line-height:1.85;margin-bottom:24px;white-space:pre-line}
.apply-big{display:inline-flex;align-items:center;gap:10px;background:var(--ink);color:#fff;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:700;text-decoration:none;transition:all .25s}
.apply-big:hover{background:var(--brand);transform:translateY(-2px);box-shadow:0 8px 28px rgba(53,86,255,.35)}
.tag{display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:4px 10px;border-radius:20px;font-weight:700;white-space:nowrap}
.tag-remote{background:rgba(15,174,121,.1);color:var(--green);border:1px solid rgba(15,174,121,.2)}
.tag-hybrid{background:rgba(245,166,35,.1);color:var(--amber);border:1px solid rgba(245,166,35,.2)}
.tag-onsite{background:var(--surface2);color:var(--ink2);border:1px solid var(--border2)}
.tag-type{background:var(--surface2);color:var(--ink2);border:1px solid var(--border2)}
.tag-new{background:rgba(15,174,121,.12);color:var(--green);border:1px solid rgba(15,174,121,.25);font-size:10px;padding:3px 9px;font-weight:800;letter-spacing:.8px;border-radius:20px}
.tag-hot{background:rgba(255,92,122,.12);color:var(--coral);border:1px solid rgba(255,92,122,.25);font-size:10px;padding:3px 9px;font-weight:800;border-radius:20px}
.tag-featured{background:rgba(124,58,237,.1);color:var(--brand2);border:1px solid rgba(124,58,237,.22);font-size:10px;padding:3px 9px;font-weight:800;border-radius:20px}
.related-title{font-size:17px;font-weight:800;margin-bottom:14px;color:var(--ink);font-family:'Space Grotesk',sans-serif}
.related-grid{display:flex;flex-direction:column;gap:8px}
.related-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:14px;transition:all .2s;text-decoration:none}
.related-card:hover{border-color:var(--brand);transform:translateX(3px);box-shadow:var(--shadow)}
.related-logo{width:38px;height:38px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:var(--brand);overflow:hidden;flex-shrink:0}
.related-logo img{width:100%;height:100%;object-fit:contain;padding:5px}
.related-info{flex:1;min-width:0}
.related-jt{font-size:13px;font-weight:700;color:var(--ink);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.related-co{font-size:12px;color:var(--brand)}
.related-sal{font-size:12px;font-weight:700;color:var(--salary);white-space:nowrap}
.article-cat{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--brand);margin-bottom:12px}
.article-title{font-family:'Space Grotesk',sans-serif;font-size:28px;font-weight:700;letter-spacing:-.5px;line-height:1.25;margin-bottom:14px;color:var(--ink)}
.article-meta{font-size:12px;color:var(--ink3);display:flex;gap:16px;margin-bottom:28px;flex-wrap:wrap}
.article-body{font-size:15px;color:var(--ink2);line-height:1.85}
.article-body h2{font-size:19px;font-weight:700;margin:28px 0 12px;color:var(--ink);padding-left:14px;border-left:3px solid var(--brand)}
.article-body p{margin-bottom:14px}
.article-body ul{padding-left:20px;margin-bottom:14px}
.article-body ul li{margin-bottom:8px}
.article-body strong{color:var(--ink)}
.static-title{font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:700;margin-bottom:8px;color:var(--ink)}
.static-date{font-size:12px;color:var(--ink3);margin-bottom:28px}
.static-body h2{font-size:17px;font-weight:700;margin:24px 0 10px;color:var(--ink)}
.static-body p{font-size:14px;color:var(--ink2);line-height:1.8;margin-bottom:10px}
.static-body ul{padding-left:18px;margin-bottom:10px}
.static-body ul li{font-size:14px;color:var(--ink2);line-height:1.8;margin-bottom:6px}
.static-body a{color:var(--brand)}
.back-link{display:inline-flex;align-items:center;gap:7px;color:var(--ink3);font-size:13px;font-weight:600;transition:color .2s;margin-bottom:24px;text-decoration:none}
.back-link:hover{color:var(--brand)}
.footer{border-top:1px solid var(--border);padding:32px 20px;margin-top:32px;background:var(--surface)}
.footer-inner{max-width:860px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px}
.footer-logo{font-family:'Space Grotesk',sans-serif;font-size:18px;font-weight:800;color:var(--ink)}
.footer-links{display:flex;gap:16px;flex-wrap:wrap}
.footer-link{font-size:12px;color:var(--ink3);transition:color .2s}.footer-link:hover{color:var(--brand)}
.footer-copy{font-size:11px;color:var(--ink3);width:100%}
.ad-wrap{display:flex;justify-content:center;align-items:center;overflow:hidden;margin:12px 0;max-height:68px}
.ad-label{font-size:9px;color:var(--ink3);text-align:center;margin-bottom:3px;letter-spacing:1.5px;text-transform:uppercase;opacity:.6}
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
  <a href="/" class="nav-logo"><span class="dot"></span>JobNova</a>
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

function logoImgHtml(company, size = '64px', cls = 'job-logo') {
  const slug = (company || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const domain = slug + '.com';
  const ini = (company || '?').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
  const fs = Math.round(parseInt(size) * .34) + 'px';
  return `<div class="${cls}" style="width:${size};height:${size}">
    <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=64" alt="${company}"
      style="width:100%;height:100%;object-fit:contain;padding:7px"
      onerror="this.onerror=null;this.src='https://icons.duckduckgo.com/ip3/${domain}.ico';this.onerror=function(){this.style.display='none';this.nextElementSibling.style.display='flex'}">
    <span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:${fs};font-weight:800;color:var(--brand)">${ini}</span>
  </div>`;
}

function remoteTagHtml(t) {
  if (!t) return '';
  const m = { fully_remote: ['tag-remote', '🌐 Remote'], hybrid: ['tag-hybrid', '🏢 Hybrid'], on_site: ['tag-onsite', '📍 On-site'], onsite: ['tag-onsite', '📍 On-site'] };
  const [cls, lbl] = m[t] || ['tag-onsite', t.replace(/_/g, ' ')];
  return `<span class="tag ${cls}">${lbl}</span>`;
}

function renderJobPage(job, related, base) {
  let skills = [];
  try { skills = JSON.parse(job.skills || '[]'); } catch (e) {}
  const isNew = job.created_at && Date.now() - new Date(job.created_at).getTime() < 86400000;
  const isHot = job.salary && parseInt(job.salary.replace(/\D/g, '').slice(0, 3)) >= 150;
  const canonical = `${base}/job/${job.id}`;
  const desc = job.description && job.description.length > 20
    ? job.description.slice(0, 160).replace(/\n/g, ' ') + '...'
    : `${job.title} at ${job.company}. ${job.location || 'Remote'}${job.salary ? ' — ' + job.salary : ''}. Apply on JobNova.`;
  const schema = JSON.stringify({
    "@context": "https://schema.org", "@type": "JobPosting",
    "title": job.title, "description": job.description || desc,
    "hiringOrganization": { "@type": "Organization", "name": job.company },
    "jobLocation": { "@type": "Place", "address": job.location || "Remote" },
    "employmentType": job.employment_type ? job.employment_type.toUpperCase().replace('_', ' ') : "FULL_TIME",
    "datePosted": job.created_at ? new Date(job.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    "url": canonical, "directApply": true,
    ...(job.salary ? { "baseSalary": { "@type": "MonetaryAmount", "currency": "USD", "value": { "@type": "QuantitativeValue", "value": job.salary } } } : {})
  });
  const content = `
<div class="page">
  <div class="breadcrumb"><a href="/">JobNova</a><span>›</span><a href="/">Jobs</a><span>›</span><span>${job.title}</span></div>
  <div class="job-hero">
    <div class="job-hero-hdr">
      <div class="job-co-row">
        ${logoImgHtml(job.company, '64px', 'job-logo')}
        <div><div class="job-co-name">${job.company}</div><div class="job-co-loc">📍 ${job.location || 'Remote'}</div></div>
      </div>
      <h1 class="job-title-h1">${job.title}</h1>
      <div class="job-chips">
        ${remoteTagHtml(job.remote_type)}
        ${job.employment_type ? `<span class="tag tag-type">${job.employment_type.replace(/_/g, ' ')}</span>` : ''}
        ${job.seniority ? `<span class="tag tag-type">${job.seniority}</span>` : ''}
        ${isNew ? '<span class="tag tag-new">✦ NEW</span>' : ''}
        ${isHot ? '<span class="tag tag-hot">🔥 HOT</span>' : ''}
      </div>
      ${job.salary ? `<div class="job-salary-lg">💰 ${job.salary}</div>` : ''}
    </div>
    <div class="job-body">
      ${skills.length ? `<div class="sec-label">Required Skills</div><div class="skills-wrap">${skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}</div>` : ''}
      <div class="sec-label">About the Role</div>
      <div class="desc-wrap">${job.description && job.description.length > 20 ? job.description : 'Full description available on the company website.'}</div>
      <div class="ad-wrap"><div style="text-align:center"><div class="ad-label">Advertisement</div>
        <script>atOptions={'key':'f9df5bf8e15c630ee01718f64c6edfb3','format':'iframe','height':50,'width':320,'params':{}};</script>
        <script src="https://www.highperformanceformat.com/f9df5bf8e15c630ee01718f64c6edfb3/invoke.js"></script>
      </div></div>
      <a href="${job.url}" target="_blank" rel="noopener noreferrer" class="apply-big">Apply Now →</a>
    </div>
  </div>
  ${related.length ? `
    <div class="related-title" style="margin-top:24px">Similar Jobs</div>
    <div class="related-grid">
      ${related.map(r => `
        <a href="/job/${r.id}" class="related-card">
          ${logoImgHtml(r.company, '38px', 'related-logo')}
          <div class="related-info"><div class="related-jt">${r.title}</div><div class="related-co">${r.company}</div></div>
          ${r.salary ? `<div class="related-sal">${r.salary}</div>` : ''}
          <span style="color:var(--ink3)">›</span>
        </a>`).join('')}
    </div>` : ''}
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
  <h1 style="font-family:'Space Grotesk',sans-serif;font-size:28px;font-weight:700;margin-bottom:8px;color:var(--ink)">📝 Career Blog</h1>
  <p style="color:var(--ink2);font-size:14px;margin-bottom:24px">Insights and career advice for remote job seekers.</p>
  <div class="ad-wrap"><div style="text-align:center"><div class="ad-label">Advertisement</div>
    <script>atOptions={'key':'0ffa7f357eb68570f215b35f87c4ff62','format':'iframe','height':50,'width':320,'params':{}};</script>
    <script src="https://www.highperformanceformat.com/0ffa7f357eb68570f215b35f87c4ff62/invoke.js"></script>
  </div></div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-top:20px">
    ${BLOG_POSTS.map(p => `
      <a href="/blog/${p.id}" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;display:block;transition:all .25s;text-decoration:none;box-shadow:var(--shadow)" onmouseover="this.style.borderColor='var(--brand)';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--border)';this.style.transform='none'">
        <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--brand);margin-bottom:10px">${p.cat}</div>
        <div style="font-size:15px;font-weight:700;margin-bottom:8px;line-height:1.4;color:var(--ink)">${p.title}</div>
        <div style="font-size:13px;color:var(--ink3);line-height:1.65;margin-bottom:14px">${p.excerpt}</div>
        <div style="font-size:11px;color:var(--ink3);display:flex;gap:12px"><span>📅 ${p.date}</span><span>⏱ ${p.readTime}</span></div>
      </a>`).join('')}
  </div>
</div>`;
  return baseLayout('Career Blog — JobNova', 'Career insights for remote job seekers.', `${base}/blog`, '', content,
    `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "Blog", "name": "JobNova Career Blog", "url": `${base}/blog` })}</script>`);
}

function renderArticlePage(post, base) {
  const canonical = `${base}/blog/${post.id}`;
  const schema = JSON.stringify({ "@context": "https://schema.org", "@type": "Article", "headline": post.title, "description": post.excerpt, "datePublished": post.date, "author": { "@type": "Organization", "name": "JobNova" }, "url": canonical });
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
    <a href="/" style="display:inline-flex;align-items:center;gap:7px;background:var(--ink);color:#fff;padding:9px 18px;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none">Browse Remote Jobs →</a>
  </div>
</div>`;
  return baseLayout(`${post.title} — JobNova Blog`, post.excerpt, canonical, '', content, `<script type="application/ld+json">${schema}</script>`);
}

const STATIC_PAGES = {
  privacy: { title: 'Privacy Policy', date: 'Last updated: July 12, 2026', description: 'JobNova Privacy Policy.',
    body: `<h2>1. Information We Collect</h2><p>JobNova collects minimal, aggregated visit data (page, country, referrer) to understand site usage. No personal profiles are built from this data.</p><h2>2. Job Alert Subscribers</h2><p>We store your email and keywords solely to send notifications. We never sell this data.</p><h2>3. Cookies & Storage</h2><p>We use browser localStorage only for saved jobs. Admin tools use a single secure session cookie.</p><h2>4. Third-Party Advertising</h2><p>This site displays third-party ads. Ad networks may use cookies to serve relevant ads.</p><h2>5. Contact</h2><p>For privacy questions: <a href="mailto:hello@jobnova.dev">hello@jobnova.dev</a></p>` },
  terms: { title: 'Terms of Service', date: 'Last updated: July 12, 2026', description: 'JobNova Terms of Service.',
    body: `<h2>1. Acceptance</h2><p>By using JobNova, you agree to these Terms.</p><h2>2. Service</h2><p>JobNova is a job aggregation platform curating listings from third-party APIs.</p><h2>3. Prohibited Activities</h2><ul><li>Scraping or bulk downloading job data</li><li>Sending spam or unsolicited outreach</li><li>Interfering with site functionality</li></ul><h2>4. Accuracy</h2><p>We do not guarantee accuracy of any listing. Verify with employers directly.</p><h2>5. Liability</h2><p>JobNova is provided "as is" without warranties.</p>` },
  disclaimer: { title: 'Disclaimer', date: 'Last updated: July 12, 2026', description: 'JobNova Disclaimer.',
    body: `<h2>Job Listing Accuracy</h2><p>JobNova aggregates listings from third-party sources. Accuracy and timeliness are not guaranteed.</p><h2>No Employment Relationship</h2><p>JobNova is a discovery platform, not an employer or recruiter.</p><h2>Salary Information</h2><p>Salary figures are estimates and may not reflect actual offers.</p><h2>Advertisement Disclaimer</h2><p>JobNova is not responsible for advertised products or services.</p>` }
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
  return baseLayout(`${page.title} — JobNova`, page.description, `${base}/${key}`, '', content);
}

// ── MAIN SPA (Remote.io-inspired light UI) ───────────────────────
function categoryChipsServer() {
  return CATEGORY_ORDER.map(k => `<button class="chip" data-cat="${k}" onclick="filterCat('${k}','${CATEGORY_META[k].label}')">${CATEGORY_META[k].emoji} ${CATEGORY_META[k].label}</button>`).join('');
}

const MAIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="google-site-verification" content="7Q0EJk3kQKNLNzIhyzH4k5CsuHsQEa-U0Pwp_w_b0n0"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>JobNova — Find Your Next Remote Job</title>
<meta name="description" content="JobNova is a modern remote job board with 1000+ curated positions in development, design, marketing, data, and more. Updated hourly.">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="#F6F7FB">
<meta property="og:title" content="JobNova — Find Your Next Remote Job">
<meta property="og:description" content="1000+ curated remote jobs updated hourly.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://jobnova.manasa.workers.dev">
<link rel="canonical" href="https://jobnova.manasa.workers.dev">
<link rel="alternate" type="application/rss+xml" title="JobNova Jobs Feed" href="https://jobnova.manasa.workers.dev/feed.rss">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"JobNova","url":"https://jobnova.manasa.workers.dev","potentialAction":{"@type":"SearchAction","target":"https://jobnova.manasa.workers.dev/?search={search_term_string}","query-input":"required name=search_term_string"}}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
${SHARED_CSS}
${NAV_CSS}

/* ── HERO (Remote.io-style: left-aligned headline + big search) ── */
.hero{padding:56px 24px 32px;border-bottom:1px solid var(--border);background:linear-gradient(180deg,#FFFFFF 0%,var(--bg) 100%)}
.hero-inner{max-width:1180px;margin:0 auto}
.hero-eyebrow{display:inline-flex;align-items:center;gap:7px;background:var(--brand-soft);border:1px solid rgba(53,86,255,.15);border-radius:20px;padding:5px 13px;font-size:12px;color:var(--brand);font-weight:700;margin-bottom:18px}
.hero-eyebrow-dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse-dot 2s infinite}
.hero-title{font-family:'Space Grotesk',sans-serif;font-size:40px;font-weight:700;letter-spacing:-1.2px;line-height:1.12;margin-bottom:14px;color:var(--ink);max-width:640px}
.hero-title .hl{color:var(--brand)}
.hero-sub{color:var(--ink2);font-size:16px;margin-bottom:26px;line-height:1.6;max-width:520px}
.search-row{display:flex;gap:10px;max-width:640px;margin-bottom:22px}
.search-wrap{position:relative;flex:1}
.search-icon{position:absolute;left:16px;top:50%;transform:translateY(-50%);color:var(--ink3);pointer-events:none;font-size:15px}
.search-input{width:100%;background:var(--surface);border:1.5px solid var(--border2);border-radius:12px;padding:15px 16px 15px 44px;color:var(--ink);font-size:15px;font-family:inherit;outline:none;transition:all .25s;box-shadow:var(--shadow)}
.search-input::placeholder{color:var(--ink3)}
.search-input:focus{border-color:var(--brand);box-shadow:0 0 0 4px var(--brand-soft)}
.search-btn{background:var(--brand);color:#fff;border:none;border-radius:12px;padding:0 24px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s}
.search-btn:hover{background:#2842e0}
.hero-stats{display:flex;gap:28px;flex-wrap:wrap}
.hero-stat{display:flex;flex-direction:column}
.hero-stat-num{font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;color:var(--ink);line-height:1.2}
.hero-stat-label{font-size:11px;color:var(--ink3);font-weight:600;letter-spacing:.4px;text-transform:uppercase}

/* ── FILTER BAR ── */
.filters-bar{position:sticky;top:64px;z-index:150;padding:12px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;overflow-x:auto;background:rgba(255,255,255,.92);backdrop-filter:blur(10px)}
.filters-bar::-webkit-scrollbar{height:0}
.chip{display:inline-flex;align-items:center;gap:5px;padding:8px 15px;border-radius:20px;border:1.5px solid var(--border2);background:var(--surface);color:var(--ink2);font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;white-space:nowrap;transition:all .2s}
.chip:hover{border-color:var(--brand);color:var(--brand)}
.chip.active{background:var(--ink);border-color:var(--ink);color:#fff}

/* ── ADV FILTERS ── */
.adv-filters{max-width:1180px;margin:0 auto;padding:12px 24px;border-bottom:1px solid var(--border);display:none;gap:10px;flex-wrap:wrap;background:var(--bg);align-items:flex-end}
.adv-filters.open{display:flex}
.filter-select{background:var(--surface);border:1px solid var(--border2);border-radius:8px;padding:8px 12px;color:var(--ink2);font-size:12px;font-family:inherit;cursor:pointer;outline:none}
.filter-select:focus{border-color:var(--brand);color:var(--ink)}
.filter-label{font-size:10px;font-weight:700;color:var(--ink3);display:flex;flex-direction:column;gap:4px;letter-spacing:.5px;text-transform:uppercase}
.salary-input{width:90px;background:var(--surface);border:1px solid var(--border2);border-radius:8px;padding:8px 10px;color:var(--ink);font-size:12px;font-family:inherit;outline:none}
.salary-input:focus{border-color:var(--brand)}
.clear-btn{padding:8px 14px;border-radius:8px;border:1px solid var(--border2);background:transparent;color:var(--ink3);font-size:12px;cursor:pointer;font-family:inherit;transition:all .2s;font-weight:600}
.clear-btn:hover{color:var(--coral);border-color:var(--coral)}

/* ── CONTENT ── */
.content-wrap{max-width:1180px;margin:0 auto;padding:24px}
.results-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:10px;flex-wrap:wrap}
.results-count{font-size:14px;color:var(--ink3)}
.results-count strong{color:var(--ink);font-weight:700}
.adv-toggle-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 15px;border-radius:9px;border:1px solid var(--border2);background:var(--surface);color:var(--ink2);font-size:13px;cursor:pointer;font-family:inherit;transition:all .2s;font-weight:600}
.adv-toggle-btn:hover,.adv-toggle-btn.active{background:var(--brand-soft);border-color:var(--brand);color:var(--brand)}

/* ── FEATURED STRIP (colorful, eye-catching) ── */
.featured-strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin-bottom:22px}
.feat-card{position:relative;border-radius:16px;padding:18px;overflow:hidden;text-decoration:none;color:#fff;transition:all .3s cubic-bezier(.4,0,.2,1);box-shadow:0 8px 20px -6px var(--fc-shadow,rgba(53,86,255,.35));animation:fadeInUp .4s ease both}
.feat-card:hover{transform:translateY(-5px) scale(1.015);box-shadow:0 16px 32px -8px var(--fc-shadow,rgba(53,86,255,.45))}
.feat-card::after{content:'';position:absolute;top:-40%;right:-20%;width:70%;height:140%;background:rgba(255,255,255,.13);transform:rotate(20deg);transition:transform .5s}
.feat-card:hover::after{transform:rotate(20deg) translateX(-18px)}
.feat-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.22);backdrop-filter:blur(6px);border-radius:20px;padding:3px 10px;font-size:10px;font-weight:800;letter-spacing:.6px;margin-bottom:12px}
.feat-title{font-family:'Space Grotesk',sans-serif;font-size:16px;font-weight:700;margin-bottom:5px;line-height:1.3;position:relative;z-index:1}
.feat-co{font-size:12px;opacity:.9;font-weight:600;margin-bottom:14px;position:relative;z-index:1}
.feat-foot{display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1}
.feat-sal{font-size:13px;font-weight:800}
.feat-arrow{width:28px;height:28px;border-radius:8px;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;font-size:14px;transition:all .25s}
.feat-card:hover .feat-arrow{background:#fff;color:var(--ink)}

/* ── JOB LIST (clean rows, Remote.io style) ── */
.jobs-list{display:flex;flex-direction:column;gap:10px}
.job-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;display:block;text-decoration:none;color:inherit;transition:all .2s;position:relative;overflow:hidden}
.job-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--cat-color,var(--brand));opacity:0;transition:opacity .2s}
.job-card:hover{border-color:var(--cat-color,var(--brand));box-shadow:var(--shadow-lg);transform:translateY(-1px)}
.job-card:hover::before{opacity:1}
.card-inner{padding:16px}
.card-row1{display:flex;align-items:flex-start;gap:12px}
.co-logo{width:46px;height:46px;border-radius:10px;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:var(--brand);overflow:hidden;flex-shrink:0}
.co-logo img{width:100%;height:100%;object-fit:contain;padding:6px}
.card-body{flex:1;min-width:0}
.card-badges{display:flex;align-items:center;gap:5px;margin-bottom:5px;flex-wrap:wrap}
.cat-dot{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:var(--cat-color,var(--brand))}
.cat-dot .dot{width:6px;height:6px;border-radius:50%;background:var(--cat-color,var(--brand))}
.job-title-card{font-size:15px;font-weight:700;color:var(--ink);line-height:1.3;margin-bottom:4px;transition:color .2s}
.job-card:hover .job-title-card{color:var(--cat-color,var(--brand))}
.job-co-card{font-size:12px;color:var(--ink2);font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:5px}
.job-meta-row{display:flex;flex-wrap:wrap;gap:5px;align-items:center}
.card-right{display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid var(--border)}
.salary-badge{font-size:12px;font-weight:800;color:var(--salary);background:rgba(15,174,121,.08);border:1px solid rgba(15,174,121,.18);padding:4px 12px;border-radius:8px;white-space:nowrap}
.card-actions{display:flex;align-items:center;gap:5px}
.act-btn{width:32px;height:32px;border-radius:8px;background:var(--surface2);border:1px solid var(--border2);color:var(--ink3);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;transition:all .2s;position:relative;z-index:1}
.act-btn:hover{background:var(--brand-soft);color:var(--brand);transform:scale(1.08)}
.act-btn.saved{background:rgba(245,166,35,.12);border-color:var(--amber);color:var(--amber)}
.arr-btn{width:32px;height:32px;border-radius:8px;background:var(--surface2);border:1px solid var(--border2);color:var(--ink2);display:flex;align-items:center;justify-content:center;font-size:15px;transition:all .25s}
.job-card:hover .arr-btn{background:var(--cat-color,var(--brand));border-color:transparent;color:#fff}
.card-footer{padding:8px 16px;border-top:1px solid var(--border);background:var(--surface2);display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--ink3)}

/* ── TAGS ── */
.tag{display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 9px;border-radius:20px;font-weight:700;white-space:nowrap}
.tag-loc{color:var(--ink3);font-size:11px;font-weight:600}
.tag-remote{background:rgba(15,174,121,.1);color:var(--green);border:1px solid rgba(15,174,121,.2)}
.tag-hybrid{background:rgba(245,166,35,.1);color:var(--amber);border:1px solid rgba(245,166,35,.2)}
.tag-onsite{background:var(--surface2);color:var(--ink2);border:1px solid var(--border2)}
.tag-type{background:var(--surface2);color:var(--ink2);border:1px solid var(--border2)}
.tag-new{background:rgba(15,174,121,.12);color:var(--green);border:1px solid rgba(15,174,121,.25);font-size:10px;padding:2px 8px;font-weight:800;letter-spacing:.8px;border-radius:20px}
.tag-hot{background:rgba(255,92,122,.12);color:var(--coral);border:1px solid rgba(255,92,122,.25);font-size:10px;padding:2px 8px;font-weight:800;border-radius:20px}

/* ── TOAST ── */
.toast{position:fixed;bottom:20px;right:16px;background:var(--ink);border:1px solid var(--ink);border-radius:12px;padding:12px 18px;font-size:13px;color:#fff;display:flex;align-items:center;gap:10px;box-shadow:0 12px 32px rgba(18,22,43,.25);transform:translateY(100px);opacity:0;transition:all .3s;z-index:9999;max-width:300px}
.toast.show{transform:translateY(0);opacity:1}
.toast-bar{position:absolute;bottom:0;left:0;height:2px;background:var(--brand);border-radius:0 0 12px 12px;animation:toast-bar 3s linear forwards}

/* ── EMPTY / LOADER ── */
.empty{text-align:center;padding:60px 16px;color:var(--ink3)}
.empty .e-icon{font-size:44px;margin-bottom:12px;opacity:.5}
.empty h3{font-size:17px;color:var(--ink2);margin-bottom:6px;font-weight:700}
.empty p{font-size:13px}
.loader-wrap{padding:60px 16px;text-align:center}
.loader{display:inline-block;width:32px;height:32px;border:3px solid var(--border2);border-top-color:var(--brand);border-radius:50%;animation:spin .7s linear infinite}
.skel{background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);background-size:200% 100%;animation:skeleton 1.5s infinite;border-radius:8px}

/* ── PAGINATION ── */
.pagination{display:flex;align-items:center;justify-content:center;gap:7px;padding:24px 0 12px}
.page-btn{padding:9px 17px;border-radius:9px;border:1.5px solid var(--border2);background:var(--surface);color:var(--ink2);font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;transition:all .2s}
.page-btn:hover:not(:disabled){border-color:var(--brand);color:var(--brand)}
.page-btn:disabled{opacity:.35;cursor:default}
.page-info{font-size:13px;color:var(--ink3);padding:0 8px}

/* ── AD ── */
.ad-wrap{display:flex;justify-content:center;align-items:center;overflow:hidden;margin:14px 0;max-height:68px}
.ad-label{font-size:9px;color:var(--ink3);text-align:center;margin-bottom:3px;letter-spacing:1.5px;text-transform:uppercase;opacity:.6}

/* ── FORMS ── */
.form-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px 20px;max-width:540px;box-shadow:var(--shadow)}
.form-group{margin-bottom:18px}
.form-label{font-size:11px;font-weight:700;color:var(--ink2);margin-bottom:7px;display:block;letter-spacing:.5px;text-transform:uppercase}
.form-input{width:100%;background:var(--surface2);border:1.5px solid var(--border2);border-radius:10px;padding:12px 14px;color:var(--ink);font-size:14px;font-family:inherit;outline:none;transition:all .25s}
.form-input:focus{border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-soft)}
.form-input::placeholder{color:var(--ink3)}
.submit-btn{width:100%;background:var(--brand);color:#fff;padding:13px;border-radius:10px;font-size:15px;font-weight:700;font-family:inherit;border:none;cursor:pointer;transition:all .25s}
.submit-btn:hover{background:#2842e0;transform:translateY(-1px)}
.kw-chip{display:inline-flex;align-items:center;gap:6px;background:var(--brand-soft);border:1px solid rgba(53,86,255,.2);color:var(--brand);padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;margin:3px}
.kw-chip button{background:none;border:none;color:var(--brand);cursor:pointer;font-size:14px;line-height:1;padding:0;opacity:.7}

/* ── MOBILE HEADER + BOTTOM TAB BAR (genuine mobile UX) ── */
.mob-hdr{display:none;padding:0 16px;height:58px;background:rgba(255,255,255,.97);backdrop-filter:blur(14px);border-bottom:1px solid var(--border);align-items:center;justify-content:space-between;position:sticky;top:0;z-index:200;gap:10px}
.mob-logo{font-family:'Space Grotesk',sans-serif;font-size:19px;font-weight:800;color:var(--ink);display:flex;align-items:center;gap:5px}
.mob-logo .dot{width:7px;height:7px;border-radius:50%;background:var(--brand)}
.mob-btn{width:36px;height:36px;border-radius:9px;border:1px solid var(--border2);background:var(--surface2);color:var(--ink2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px}
.bottom-tabs{display:none}
@media(max-width:768px){
  .nav{display:none !important}
  .mob-hdr{display:flex}
  .filters-bar{top:58px}
  .hero{padding:26px 16px 20px}
  .hero-title{font-size:24px;letter-spacing:-.6px}
  .hero-sub{font-size:13px;margin-bottom:18px}
  .search-row{flex-direction:column}
  .search-btn{padding:13px}
  .hero-stats{gap:18px}
  .hero-stat-num{font-size:17px}
  .featured-strip{grid-template-columns:1fr 1fr;gap:10px}
  .content-wrap{padding:14px 14px 90px}
  .card-inner{padding:14px 12px}
  .co-logo{width:42px;height:42px;border-radius:9px}
  .job-title-card{font-size:13px}
  .pagination{padding:20px 0 10px;gap:6px}
  .page-btn{padding:8px 13px;font-size:12px}
  .bottom-tabs{display:flex;position:fixed;bottom:0;left:0;right:0;background:rgba(255,255,255,.97);backdrop-filter:blur(14px);border-top:1px solid var(--border);z-index:200;padding:6px 4px calc(env(safe-area-inset-bottom) + 4px)}
  .bt-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;border:none;background:none;color:var(--ink3);font-size:9px;font-weight:700;font-family:inherit;cursor:pointer;border-radius:10px}
  .bt-btn.active{color:var(--brand);background:var(--brand-soft)}
  .bt-icon{font-size:18px}
}
@media(max-width:380px){
  .hero-title{font-size:21px}
  .featured-strip{grid-template-columns:1fr}
  .chip{padding:6px 12px;font-size:12px}
}
</style>
</head>
<body>

<!-- MOBILE HEADER -->
<div class="mob-hdr">
  <span class="mob-logo"><span class="dot"></span>JobNova</span>
  <div style="display:flex;gap:6px">
    <button class="mob-btn" onclick="goView('saved')">🔖</button>
    <a href="/blog" class="mob-btn" style="text-decoration:none">📝</a>
  </div>
</div>

<!-- DESKTOP NAV -->
<nav class="nav">
  <a href="/" class="nav-logo"><span class="dot"></span>JobNova</a>
  <div class="nav-links">
    <a href="/" class="nav-link">Jobs</a>
    <a href="/blog" class="nav-link">Blog</a>
    <a href="/privacy" class="nav-link">Privacy</a>
    <button class="nav-link" onclick="goView('saved')" style="border:none;background:none;font-family:inherit;cursor:pointer">🔖 Saved</button>
    <button class="nav-link" onclick="goView('alerts')" style="border:none;background:none;font-family:inherit;cursor:pointer">🔔 Alerts</button>
    <a href="/" class="nav-cta">Browse →</a>
  </div>
</nav>

<main>
  <!-- JOBS VIEW -->
  <div id="vJobs">
    <div class="hero">
      <div class="hero-inner">
        <div class="hero-eyebrow"><span class="hero-eyebrow-dot"></span>Updated hourly · AI-matched listings</div>
        <h1 class="hero-title">Find your next <span class="hl">remote job</span></h1>
        <p class="hero-sub">Browse curated remote positions from top companies worldwide. Filter by category, salary, and seniority.</p>
        <div class="search-row">
          <div class="search-wrap">
            <span class="search-icon">🔍</span>
            <input type="text" class="search-input" id="searchInput" placeholder="Search jobs, companies, or skills..." oninput="debounceSearch(this.value)">
          </div>
          <button class="search-btn" onclick="document.getElementById('searchInput').focus()">Search</button>
        </div>
        <div class="hero-stats">
          <div class="hero-stat"><span class="hero-stat-num" id="stat-jobs">1000+</span><span class="hero-stat-label">Active Jobs</span></div>
          <div class="hero-stat"><span class="hero-stat-num">50+</span><span class="hero-stat-label">Companies</span></div>
          <div class="hero-stat"><span class="hero-stat-num">Hourly</span><span class="hero-stat-label">Updates</span></div>
        </div>
      </div>
    </div>

    <div class="filters-bar">
      <button class="chip active" onclick="filterCat('','All Jobs')">All Jobs</button>
      ${categoryChipsServer()}
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
      <div class="ad-wrap"><div style="text-align:center">
        <div class="ad-label">Advertisement</div>
        <script>atOptions={'key':'f9df5bf8e15c630ee01718f64c6edfb3','format':'iframe','height':50,'width':320,'params':{}};</script>
        <script src="https://www.highperformanceformat.com/f9df5bf8e15c630ee01718f64c6edfb3/invoke.js"></script>
      </div></div>
      <div id="featuredStrip"></div>
      <div class="jobs-list" id="jobsList"><div class="loader-wrap"><div class="loader"></div></div></div>
      <div class="pagination" id="pagination"></div>
    </div>
  </div>

  <!-- SAVED -->
  <div id="vSaved" style="display:none">
    <div class="content-wrap" style="max-width:800px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
        <h2 style="font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;color:var(--ink)">🔖 Saved Jobs</h2>
        <button onclick="clearAllSaved()" style="padding:7px 14px;border-radius:8px;border:1px solid var(--border2);background:transparent;color:var(--ink3);font-size:12px;cursor:pointer;font-family:inherit;font-weight:600">Clear All</button>
      </div>
      <div class="jobs-list" id="savedList"></div>
    </div>
  </div>

  <!-- ALERTS -->
  <div id="vAlerts" style="display:none">
    <div class="content-wrap">
      <button onclick="goView('jobs')" style="display:inline-flex;align-items:center;gap:7px;color:var(--ink3);font-size:13px;cursor:pointer;border:none;background:none;font-family:inherit;margin-bottom:22px;font-weight:600">← Back to Jobs</button>
      <div class="form-card">
        <div style="font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;margin-bottom:6px;color:var(--ink)">🔔 Job Alerts</div>
        <div style="font-size:13px;color:var(--ink2);margin-bottom:22px">Get notified by email when new matching jobs are posted.</div>
        <div class="form-group">
          <label class="form-label">Your Email</label>
          <input type="email" class="form-input" id="alertEmail" placeholder="you@example.com">
        </div>
        <div class="form-group">
          <label class="form-label">Keywords <span style="color:var(--ink3);font-weight:400;text-transform:none;letter-spacing:0;font-size:11px">(press Enter)</span></label>
          <input type="text" class="form-input" id="alertKwInput" placeholder="e.g. React, Python..." onkeydown="addKeyword(event)">
          <div style="margin-top:8px" id="kwWrap"></div>
        </div>
        <button class="submit-btn" onclick="submitAlert()">Subscribe to Alerts →</button>
      </div>
    </div>
  </div>
</main>

<div class="bottom-tabs">
  <button class="bt-btn active" id="bt-jobs" onclick="goView('jobs')"><span class="bt-icon">🔍</span>Jobs</button>
  <button class="bt-btn" id="bt-saved" onclick="goView('saved')"><span class="bt-icon">🔖</span>Saved</button>
  <button class="bt-btn" id="bt-alerts" onclick="goView('alerts')"><span class="bt-icon">🔔</span>Alerts</button>
  <a href="/blog" class="bt-btn" style="text-decoration:none"><span class="bt-icon">📝</span>Blog</a>
</div>

<footer class="footer" style="margin-bottom:56px">
  <div class="footer-inner" style="max-width:1180px">
    <span class="footer-logo">JobNova</span>
    <div class="footer-links">
      <a href="/blog" class="footer-link">Blog</a>
      <a href="/privacy" class="footer-link">Privacy</a>
      <a href="/terms" class="footer-link">Terms</a>
      <a href="/disclaimer" class="footer-link">Disclaimer</a>
      <a href="/feed.rss" class="footer-link">RSS</a>
    </div>
    <div class="footer-copy">© 2026 JobNova. All rights reserved.</div>
  </div>
</footer>

<div class="toast" id="toast">
  <span id="toastIcon" style="font-size:16px">✓</span>
  <span id="toastMsg">Done</span>
  <div class="toast-bar" id="toastBar"></div>
</div>

<script>
const CAT_META={developer:{label:'Development',emoji:'💻',color:'#3556FF'},designer:{label:'Design',emoji:'🎨',color:'#D6489B'},marketing:{label:'Marketing',emoji:'📣',color:'#F5A623'},data:{label:'Data & AI',emoji:'📊',color:'#0EA5C4'},devops:{label:'DevOps',emoji:'⚙️',color:'#0FAE79'},manager:{label:'Management',emoji:'👔',color:'#FF5C7A'},writer:{label:'Writing',emoji:'✍️',color:'#7C3AED'}};
let pg=1,cat='',srch='',advT,srchT;
let jobs=[],total=0;
let savedIds=JSON.parse(localStorage.getItem('jn_saved')||'[]');
let alertKws=[];
let adv={remote:'',employ:'',seniority:'',salaryMin:'',days:''};

function openDrawer(){}
function closeDrawer(){}

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
    <span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:\${fs};font-weight:800;color:#3556FF">\${ini}</span>
  </div>\`;
}
function remoteTag(t){
  if(!t)return'';
  const m={fully_remote:['tag-remote','🌐 Remote'],hybrid:['tag-hybrid','🏢 Hybrid'],on_site:['tag-onsite','📍 On-site'],onsite:['tag-onsite','📍 On-site']};
  const[cls,lbl]=m[t]||['tag-onsite',t.replace(/_/g,' ')];
  return\`<span class="tag \${cls}">\${lbl}</span>\`;
}
function catForTitle(title){
  const t=(title||'').toLowerCase();
  const order=['developer','designer','marketing','data','devops','manager','writer'];
  for(const k of order){if(t.includes(k))return k;}
  return 'developer';
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
  icon.style.color=type==='success'?'#0FAE79':'#3556FF';
  el.className='toast show';
  if(bar){bar.style.animation='none';bar.offsetHeight;bar.style.animation='toast-bar 3s linear forwards';}
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),3100);
}

const VIEWS=['vJobs','vSaved','vAlerts'];
function showView(id){
  VIEWS.forEach(v=>{const el=document.getElementById(v);if(el)el.style.display=v===id?'block':'none';});
  ['bt-jobs','bt-saved','bt-alerts'].forEach(id2=>{const b=document.getElementById(id2);if(b)b.classList.remove('active');});
  const map={vJobs:'bt-jobs',vSaved:'bt-saved',vAlerts:'bt-alerts'};
  const bb=document.getElementById(map[id]);if(bb)bb.classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
}
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
        <div class="card-right">
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

function renderFeatured(list){
  const wrap=document.getElementById('featuredStrip');
  if(pg!==1||!list.length){wrap.innerHTML='';return;}
  const feats=list.slice(0,4);
  wrap.innerHTML=\`<div class="featured-strip">\${feats.map(j=>{
    const k=catForTitle(j.title);
    const meta=CAT_META[k];
    return\`<a href="/job/\${j.id}" class="feat-card" style="background:linear-gradient(135deg,\${meta.color},\${shade(meta.color)});--fc-shadow:\${meta.color}59">
      <div class="feat-badge">\${meta.emoji} \${meta.label}</div>
      <div class="feat-title">\${j.title}</div>
      <div class="feat-co">\${j.company}</div>
      <div class="feat-foot">
        <span class="feat-sal">\${j.salary||'Competitive'}</span>
        <span class="feat-arrow">→</span>
      </div>
    </a>\`;
  }).join('')}</div>\`;
}
function shade(hex){
  const n=parseInt(hex.slice(1),16);
  let r=(n>>16)+22,g=(n>>8&255)+22,b=(n&255)+22;
  r=Math.min(255,r);g=Math.min(255,g);b=Math.min(255,b);
  return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}

async function loadJobs(){
  document.getElementById('jobsList').innerHTML=renderSkeletons();
  document.getElementById('pagination').innerHTML='';
  document.getElementById('featuredStrip').innerHTML='';
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
    document.getElementById('resultsCount').innerHTML=\`<strong>\${total.toLocaleString()}</strong> jobs found\${cat?' in <strong>'+(CAT_META[cat]?CAT_META[cat].label:cat)+'</strong>':''}\${srch?' for "<strong>'+srch+'</strong>"':''}\`;
    if(!jobs.length){
      document.getElementById('jobsList').innerHTML=\`<div class="empty"><div class="e-icon">🔍</div><h3>No jobs found</h3><p>Try different keywords or clear filters</p></div>\`;
      return;
    }
    renderFeatured(jobs);
    document.getElementById('jobsList').innerHTML=jobs.map((j,idx)=>{
      const saved=savedIds.includes(j.id);
      const nw=isNew(j.created_at);
      const hot=isHot(j.salary);
      const timeAgo=j.created_at?getTimeAgo(new Date(j.created_at)):'';
      const k=catForTitle(j.title);
      const meta=CAT_META[k];
      return\`<a href="/job/\${j.id}" class="job-card" style="--cat-color:\${meta.color};animation:fadeInUp .3s ease \${Math.min(idx,6)*.04}s both">
        <div class="card-inner">
          <div class="card-row1">
            \${logoHtml(j.company)}
            <div class="card-body">
              <div class="card-badges">
                <span class="cat-dot"><span class="dot"></span>\${meta.emoji} \${meta.label}</span>
                \${nw?'<span class="tag-new">✦ NEW</span>':''}
                \${hot?'<span class="tag-hot">🔥 HOT</span>':''}
              </div>
              <div class="job-title-card">\${j.title}</div>
              <div class="job-co-card">\${j.company}</div>
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
        \${timeAgo?'<div class="card-footer"><span>⏰ '+timeAgo+'</span><span style="color:var(--cat-color)">View →</span></div>':''}
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
function clearAllSaved(){savedIds=[];localStorage.removeItem('jn_saved');renderSaved();showToast('All cleared','info');}

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
  document.querySelectorAll('.chip').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.chip').forEach(el=>{if(el.dataset.cat===c||(c===''&&!el.dataset.cat))el.classList.add('active');});
  showView('vJobs');loadJobs();
}
function debounceSearch(v){clearTimeout(srchT);srchT=setTimeout(()=>{srch=v;pg=1;loadJobs();},400);}
function goPage(p){pg=p;loadJobs();window.scrollTo({top:0,behavior:'smooth'});}

async function init(){
  loadJobs();
  try{
    const r=await fetch('/api/debug');
    const d=await r.json();
    const n=d.jobs_in_db||0;
    const fmt=n=>n.toLocaleString();
    const sj=document.getElementById('stat-jobs');if(sj)sj.textContent=fmt(n)+'+';
  }catch(e){}
}
init();
</script>
</body>
</html>`;

// ══════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════════

function renderAdminLogin(error) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin Login — JobNova</title><meta name="robots" content="noindex, nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>${SHARED_CSS}
body{display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
.box{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:36px 30px;max-width:380px;width:100%;box-shadow:var(--shadow-lg)}
.logo{font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:800;color:var(--ink);margin-bottom:4px;display:flex;align-items:center;gap:6px}
.logo .dot{width:8px;height:8px;border-radius:50%;background:var(--brand)}
.sub{font-size:13px;color:var(--ink3);margin-bottom:24px}
.form-input{width:100%;background:var(--surface2);border:1.5px solid var(--border2);border-radius:10px;padding:12px 14px;color:var(--ink);font-size:14px;font-family:inherit;outline:none;margin-bottom:14px}
.form-input:focus{border-color:var(--brand)}
.submit-btn{width:100%;background:var(--brand);color:#fff;padding:13px;border-radius:10px;font-size:14px;font-weight:700;font-family:inherit;border:none;cursor:pointer}
.err{background:rgba(255,92,122,.1);border:1px solid rgba(255,92,122,.25);color:var(--coral);font-size:13px;padding:10px 12px;border-radius:9px;margin-bottom:14px}
</style></head><body>
<div class="box">
  <div class="logo"><span class="dot"></span>JobNova</div>
  <div class="sub">Admin Dashboard</div>
  ${error ? `<div class="err">Incorrect password. Try again.</div>` : ''}
  <form method="POST" action="/admin/login">
    <input class="form-input" type="password" name="password" placeholder="Admin password" autofocus required>
    <button class="submit-btn" type="submit">Sign In →</button>
  </form>
</div>
</body></html>`;
}

function barChart(rows, maxW = 100) {
  const max = Math.max(1, ...rows.map(r => r.count));
  return rows.map(r => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:7px">
      <span style="width:76px;flex-shrink:0;font-size:11px;color:var(--ink3);font-weight:600">${r.label}</span>
      <div style="flex:1;background:var(--surface2);border-radius:6px;height:16px;overflow:hidden">
        <div style="width:${Math.round((r.count / max) * 100)}%;height:100%;background:linear-gradient(90deg,var(--brand),var(--brand2));border-radius:6px"></div>
      </div>
      <span style="width:42px;text-align:right;flex-shrink:0;font-size:12px;font-weight:700;color:var(--ink)">${r.count}</span>
    </div>`).join('');
}

async function renderAdminDashboard(env, base) {
  await ensureTable(env);
  const q = (sql, ...params) => env.DB.prepare(sql).bind(...params).all();

  const [{ results: totalJobsR }, { results: jobsTodayR }, { results: jobsWeekR }, { results: subsR }] = await Promise.all([
    q("SELECT COUNT(*) c FROM jobs"),
    q("SELECT COUNT(*) c FROM jobs WHERE created_at >= datetime('now','-1 day')"),
    q("SELECT COUNT(*) c FROM jobs WHERE created_at >= datetime('now','-7 day')"),
    q("SELECT COUNT(*) c FROM subscribers"),
  ]);

  const [{ results: totalVisitsR }, { results: visitsTodayR }, { results: visits7dR }, { results: uniqCountriesR }] = await Promise.all([
    q("SELECT COUNT(*) c FROM visits"),
    q("SELECT COUNT(*) c FROM visits WHERE created_at >= datetime('now','-1 day')"),
    q("SELECT COUNT(*) c FROM visits WHERE created_at >= datetime('now','-7 day')"),
    q("SELECT COUNT(DISTINCT country) c FROM visits WHERE created_at >= datetime('now','-7 day')"),
  ]);

  const { results: dailyVisits } = await q(
    "SELECT date(created_at) d, COUNT(*) c FROM visits WHERE created_at >= datetime('now','-14 day') GROUP BY d ORDER BY d ASC"
  );
  const dailyMap = Object.fromEntries((dailyVisits || []).map(r => [r.d, r.c]));
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    days.push({ label: d.slice(5), count: dailyMap[d] || 0 });
  }
  const maxDaily = Math.max(1, ...days.map(d => d.count));

  const { results: topPages } = await q(
    "SELECT path, COUNT(*) c FROM visits WHERE created_at >= datetime('now','-7 day') GROUP BY path ORDER BY c DESC LIMIT 8"
  );
  const { results: topCountries } = await q(
    "SELECT country, COUNT(*) c FROM visits WHERE created_at >= datetime('now','-7 day') GROUP BY country ORDER BY c DESC LIMIT 8"
  );

  const catCounts = await Promise.all(CATEGORY_ORDER.map(async k => {
    const { results } = await q("SELECT COUNT(*) c FROM jobs WHERE LOWER(title) LIKE ?", `%${k}%`);
    return { label: CATEGORY_META[k].label, count: results[0]?.c || 0, key: k };
  }));

  const { results: syncLogs } = await q("SELECT * FROM sync_logs ORDER BY id DESC LIMIT 10");
  const { results: apiSources } = await q("SELECT * FROM api_sources ORDER BY id DESC");

  const kpi = (label, val, sub, color = 'var(--brand)') => `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px;box-shadow:var(--shadow)">
      <div style="font-size:11px;font-weight:700;color:var(--ink3);letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px">${label}</div>
      <div style="font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:700;color:${color}">${val}</div>
      ${sub ? `<div style="font-size:11px;color:var(--ink3);margin-top:4px">${sub}</div>` : ''}
    </div>`;

  const content = `
  <div class="adm-wrap">
    <div class="adm-hdr">
      <div>
        <div class="adm-title">📊 Dashboard</div>
        <div class="adm-sub">Live overview of JobNova performance</div>
      </div>
      <div style="display:flex;gap:8px">
        <form method="POST" action="/api/sync" onsubmit="return confirm('Run job sync now?')" style="display:inline">
          <button class="adm-btn adm-btn-primary" type="submit">↻ Sync Jobs Now</button>
        </form>
        <a href="/admin/logout" class="adm-btn">Logout</a>
      </div>
    </div>

    <div class="kpi-grid">
      ${kpi('Total Jobs', (totalJobsR[0]?.c || 0).toLocaleString(), `+${jobsTodayR[0]?.c || 0} today · +${jobsWeekR[0]?.c || 0} this week`)}
      ${kpi('Subscribers', (subsR[0]?.c || 0).toLocaleString(), 'Job alert emails', 'var(--pink)')}
      ${kpi('Total Visits', (totalVisitsR[0]?.c || 0).toLocaleString(), `${visitsTodayR[0]?.c || 0} today`, 'var(--cyan)')}
      ${kpi('Visits (7d)', (visits7dR[0]?.c || 0).toLocaleString(), `${uniqCountriesR[0]?.c || 0} countries reached`, 'var(--green)')}
    </div>

    <div class="adm-grid">
      <div class="adm-card" style="grid-column:span 2">
        <div class="adm-card-title">Visitor Traffic — Last 14 Days</div>
        <div style="display:flex;align-items:flex-end;gap:5px;height:140px;padding-top:10px">
          ${days.map(d => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px">
            <div style="width:100%;background:linear-gradient(180deg,var(--brand),var(--brand2));border-radius:5px 5px 0 0;height:${Math.max(4, Math.round((d.count / maxDaily) * 110))}px" title="${d.label}: ${d.count}"></div>
            <span style="font-size:9px;color:var(--ink3)">${d.label}</span>
          </div>`).join('')}
        </div>
      </div>
      <div class="adm-card">
        <div class="adm-card-title">Jobs by Category</div>
        ${barChart(catCounts)}
      </div>
      <div class="adm-card">
        <div class="adm-card-title">Top Pages (7d)</div>
        ${(topPages || []).length ? (topPages.map(p => `<div class="adm-row"><span class="adm-row-label">${p.path}</span><span class="adm-row-val">${p.c}</span></div>`).join('')) : '<div class="adm-empty">No traffic yet</div>'}
      </div>
      <div class="adm-card">
        <div class="adm-card-title">Top Countries (7d)</div>
        ${(topCountries || []).length ? (topCountries.map(c => `<div class="adm-row"><span class="adm-row-label">${c.country}</span><span class="adm-row-val">${c.c}</span></div>`).join('')) : '<div class="adm-empty">No traffic yet</div>'}
      </div>
      <div class="adm-card">
        <div class="adm-card-title">Recent Sync History</div>
        ${(syncLogs || []).length ? syncLogs.map(s => `<div class="adm-row" style="align-items:flex-start">
          <span class="adm-row-label" style="font-size:11px">${new Date(s.created_at).toLocaleString()}</span>
          <span class="adm-row-val" style="color:var(--green)">+${s.inserted}<span style="color:var(--ink3);font-weight:500"> / ${s.skipped} skip</span></span>
        </div>`).join('') : '<div class="adm-empty">No sync runs yet</div>'}
      </div>
    </div>

    <div class="adm-card" style="margin-top:16px">
      <div class="adm-card-title">API Sources <span style="font-weight:400;color:var(--ink3);font-size:12px">— add keys without redeploying</span></div>
      <form method="POST" action="/admin/api-sources" style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
        <input class="adm-input" name="label" placeholder="Label (e.g. Primary)" required>
        <input class="adm-input" name="api_key" placeholder="API Key" required style="flex:1;min-width:200px">
        <button class="adm-btn adm-btn-primary" type="submit">+ Add Source</button>
      </form>
      ${(apiSources || []).length ? apiSources.map(s => `<div class="adm-row">
        <span class="adm-row-label">${s.label} <span style="color:var(--ink3);font-weight:400">····${(s.api_key || '').slice(-4)}</span> ${s.active ? '<span style="color:var(--green);font-size:10px;font-weight:700">● ACTIVE</span>' : '<span style="color:var(--ink3);font-size:10px">○ off</span>'}</span>
        <form method="POST" action="/admin/api-sources/delete" style="display:inline">
          <input type="hidden" name="id" value="${s.id}">
          <button class="adm-btn-sm" type="submit" onclick="return confirm('Remove this key?')">Remove</button>
        </form>
      </div>`).join('') : '<div class="adm-empty">No extra keys added — using default API_KEY secret.</div>'}
    </div>
  </div>`;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin — JobNova</title><meta name="robots" content="noindex, nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${SHARED_CSS}
.adm-wrap{max-width:1180px;margin:0 auto;padding:28px 20px 60px}
.adm-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;flex-wrap:wrap;gap:12px}
.adm-title{font-family:'Space Grotesk',sans-serif;font-size:24px;font-weight:700;color:var(--ink)}
.adm-sub{font-size:13px;color:var(--ink3)}
.adm-btn{padding:9px 16px;border-radius:9px;border:1px solid var(--border2);background:var(--surface);color:var(--ink2);font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
.adm-btn-primary{background:var(--brand);border-color:var(--brand);color:#fff}
.adm-btn-sm{padding:5px 10px;border-radius:7px;border:1px solid var(--border2);background:var(--surface);color:var(--coral);font-size:11px;font-weight:700;cursor:pointer;font-family:inherit}
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:16px}
.adm-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
.adm-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px;box-shadow:var(--shadow)}
.adm-card-title{font-size:13px;font-weight:700;color:var(--ink);margin-bottom:14px}
.adm-row{display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)}
.adm-row:last-child{border-bottom:none}
.adm-row-label{font-size:12px;color:var(--ink2);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70%}
.adm-row-val{font-size:12px;font-weight:700;color:var(--ink)}
.adm-empty{font-size:12px;color:var(--ink3);padding:8px 0}
.adm-input{background:var(--surface2);border:1.5px solid var(--border2);border-radius:9px;padding:9px 12px;font-size:13px;font-family:inherit;outline:none}
.adm-input:focus{border-color:var(--brand)}
@media(max-width:768px){.adm-grid{grid-template-columns:1fr}}
</style></head><body>${content}</body></html>`;
}

// ══════════════════════════════════════════════════════════════════
// FETCH HANDLER
// ══════════════════════════════════════════════════════════════════

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const base = `${url.protocol}//${url.host}`;
    await ensureTable(env);

    // ── visitor analytics (best-effort, non-blocking) ──
    const trackable = ['GET'].includes(request.method) &&
      !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/admin') &&
      !url.pathname.startsWith('/assets/') && url.pathname !== '/sitemap.xml' && url.pathname !== '/feed.rss';
    if (trackable && ctx?.waitUntil) ctx.waitUntil(recordVisit(env, request, url));

    // ── sitemap ──
    if (url.pathname === '/sitemap.xml') {
      const { results } = await env.DB.prepare("SELECT id,created_at FROM jobs ORDER BY id DESC LIMIT 1000").all();
      const urls = [
        `<url><loc>${base}/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>`,
        `<url><loc>${base}/blog</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
        `<url><loc>${base}/privacy</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>`,
        `<url><loc>${base}/terms</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>`,
        `<url><loc>${base}/disclaimer</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>`,
        ...BLOG_POSTS.map(p => `<url><loc>${base}/blog/${p.id}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`),
        ...results.map(j => `<url><loc>${base}/job/${j.id}</loc><changefreq>weekly</changefreq><priority>0.6</priority><lastmod>${new Date(j.created_at || Date.now()).toISOString().split('T')[0]}</lastmod></url>`)
      ].join('');
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
        { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } }
      );
    }

    if (url.pathname === '/feed.rss') {
      const { results } = await env.DB.prepare("SELECT * FROM jobs ORDER BY id DESC LIMIT 50").all();
      const items = results.map(j => `<item>
        <title><![CDATA[${j.title} at ${j.company}]]></title>
        <link>${base}/job/${j.id}</link>
        <guid>${base}/job/${j.id}</guid>
        <description><![CDATA[${j.company} — ${j.location || 'Remote'}${j.salary ? ' — ' + j.salary : ''}]]></description>
        <pubDate>${new Date(j.created_at || Date.now()).toUTCString()}</pubDate>
      </item>`).join('');
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel><title>JobNova — Remote Jobs</title><link>${base}</link>
<description>Latest remote job listings from JobNova</description>
<atom:link href="${base}/feed.rss" rel="self" type="application/rss+xml"/>
${items}</channel></rss>`, { headers: { "Content-Type": "application/rss+xml" } });
    }

    // ── ADMIN ──
    if (url.pathname === '/admin/login' && request.method === 'POST') {
      const form = await request.formData();
      const pw = form.get('password') || '';
      if (env.ADMIN_PASSWORD && pw === env.ADMIN_PASSWORD) {
        const cookie = await makeAdminCookie(env);
        return new Response(null, { status: 302, headers: { 'Location': '/admin', 'Set-Cookie': `jn_admin=${cookie}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400` } });
      }
      return new Response(renderAdminLogin(true), { status: 401, headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    if (url.pathname === '/admin/logout') {
      return new Response(null, { status: 302, headers: { 'Location': '/admin', 'Set-Cookie': 'jn_admin=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0' } });
    }
    if (url.pathname === '/admin/api-sources' && request.method === 'POST') {
      const ok = await verifyAdminCookie(env, request.headers.get('Cookie'));
      if (!ok) return new Response('Unauthorized', { status: 401 });
      const form = await request.formData();
      const label = (form.get('label') || 'Source').toString().slice(0, 60);
      const apiKey = (form.get('api_key') || '').toString().slice(0, 200);
      if (apiKey) await env.DB.prepare("INSERT INTO api_sources (label, api_key, active) VALUES (?,?,1)").bind(label, apiKey).run();
      return new Response(null, { status: 302, headers: { 'Location': '/admin' } });
    }
    if (url.pathname === '/admin/api-sources/delete' && request.method === 'POST') {
      const ok = await verifyAdminCookie(env, request.headers.get('Cookie'));
      if (!ok) return new Response('Unauthorized', { status: 401 });
      const form = await request.formData();
      const id = form.get('id');
      if (id) await env.DB.prepare("DELETE FROM api_sources WHERE id = ?").bind(id).run();
      return new Response(null, { status: 302, headers: { 'Location': '/admin' } });
    }
    if (url.pathname === '/admin') {
      const ok = await verifyAdminCookie(env, request.headers.get('Cookie'));
      if (!ok) return new Response(renderAdminLogin(false), { headers: { "Content-Type": "text/html; charset=utf-8" } });
      const html = await renderAdminDashboard(env, base);
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    // ── job page ──
    const jobMatch = url.pathname.match(/^\/job\/(\d+)$/);
    if (jobMatch) {
      const { results } = await env.DB.prepare("SELECT * FROM jobs WHERE id = ?").bind(jobMatch[1]).all();
      if (!results.length) return new Response('Job not found', { status: 404 });
      let job = results[0];
      if ((!job.description || job.description.length < 20) && job.job_handle) {
        try {
          const keys = await getActiveApiKeys(env);
          const r = await fetch(`https://api.jobdatalake.com/v1/jobs/${job.job_handle}`, { headers: { "X-API-Key": keys[0] || '' } });
          if (r.ok) {
            const d = await r.json();
            const desc = d.description || d.summary || "";
            if (desc && desc.length > 20) {
              await env.DB.prepare("UPDATE jobs SET description = ? WHERE id = ?").bind(desc, job.id).run();
              job = { ...job, description: desc };
            }
          }
        } catch (e) {}
      }
      const { results: related } = await env.DB.prepare("SELECT id,title,company,salary,remote_type FROM jobs WHERE id != ? ORDER BY RANDOM() LIMIT 4").bind(jobMatch[1]).all();
      return new Response(renderJobPage(job, related, base), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    if (url.pathname === '/blog') return new Response(renderBlogIndex(base), { headers: { "Content-Type": "text/html; charset=utf-8" } });

    const blogMatch = url.pathname.match(/^\/blog\/(\d+)$/);
    if (blogMatch) {
      const post = BLOG_POSTS.find(p => p.id === parseInt(blogMatch[1]));
      if (!post) return new Response('Not found', { status: 404 });
      return new Response(renderArticlePage(post, base), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    if (url.pathname === '/privacy') return new Response(renderStaticPage('privacy', base), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    if (url.pathname === '/terms') return new Response(renderStaticPage('terms', base), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    if (url.pathname === '/disclaimer') return new Response(renderStaticPage('disclaimer', base), { headers: { "Content-Type": "text/html; charset=utf-8" } });

    if (url.pathname === '/api/subscribe' && request.method === 'POST') {
      try {
        const { email, keywords } = await request.json();
        if (!email || !keywords?.length) return new Response(JSON.stringify({ success: false, error: "Required" }), { headers: { "Content-Type": "application/json" } });
        await env.DB.prepare("INSERT OR REPLACE INTO subscribers (email,keywords) VALUES (?,?)").bind(email, JSON.stringify(keywords)).run();
        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
      } catch (e) { return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } }); }
    }

    if (url.pathname === '/api/jobs') {
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
      return new Response(JSON.stringify({ jobs: results, total: cr[0]?.total || 0, page }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    if (url.pathname === '/api/sync') {
      try {
        const result = await syncJobs(env);
        if (url.pathname === '/api/sync' && request.method === 'POST') return new Response(null, { status: 302, headers: { 'Location': '/admin' } });
        return new Response(JSON.stringify({ success: true, ...result }), { headers: { "Content-Type": "application/json" } });
      } catch (e) { return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } }); }
    }

    if (url.pathname === '/api/debug') {
      const { results } = await env.DB.prepare("SELECT COUNT(*) as count FROM jobs").all();
      return new Response(JSON.stringify({ jobs_in_db: results[0]?.count || 0 }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response(MAIN_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncJobs(env));
  }
};
