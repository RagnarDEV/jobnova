// ════════════════════════════════════════════════════════════════
// JobNova — Cloudflare Worker
// Remote.io-inspired redesign · favicon · Post a Job · SEO · analytics
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
const FEATURED_COMPANIES = ["Shopify", "GitLab", "Automattic", "Zapier", "Notion", "Stripe", "Doist", "Buffer"];

// ── FAVICON / BRAND ASSETS (self-hosted, no external deps) ───────
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3556FF"/><stop offset="1" stop-color="#7C3AED"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#g)"/><rect x="15" y="33" width="7" height="13" rx="2.4" fill="#fff" fill-opacity=".92"/><rect x="26" y="26" width="7" height="20" rx="2.4" fill="#fff" fill-opacity=".92"/><rect x="37" y="17" width="7" height="29" rx="2.4" fill="#fff" fill-opacity=".92"/><circle cx="50" cy="17" r="5" fill="#fff"/><circle cx="50" cy="17" r="2.6" fill="#3556FF"/></svg>`;
const FAVICON_ICO_B64 = "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";
const FAVICON_32_B64 = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAE80lEQVR4nLWXS4hcRRSGv3Pq9r23ZxJnzMsHJo7gwheKKx8YQReiGCImjkEhghqIIkYwC1EQN24ECRJ3LnSlSDSCIUt1YwiJUdGoC8FHTHzkbSZJJ909Vee4uN2ZsafNJJmxoODec6vqP+c/f52qKwCjox4++EDSTQ+cHinLcp07y3AbAc3AhRk1cbCI6B4RtjabzY3fflzf08WU7sOtK+PDmsmborrIErgB+MywJ5xAFDSAmx206M/u2JxtGh31IAC3r/CVIedDS2ApJREUZIaR9zZ3d0xDCBogtXlo+0eyWZau8sUe024VGbLkhkqYtcCZCMMdEMA8aRA19zHJwo0Z7bg+r2XD4+2Ygkpwnx10AVSh3a7e8xzMACFYtJTn2fB4O67PgrOciGe4zmbkAI0TcNklghkcOOQMDlR2xZWIB2d5pu5LxJIIMmPNqVZUq8LpJqx7UnnwfsUd3v/IePs9Y7AOhgiWUPclWYDQkfyMW7MhhADHT8DddwoPr1DWvgIDJbzxkvL9D8aX31RMmDlAyHQWaFeBZguW30vzvnukdeAQLLlc6rt/JN/yGWQB1j8B11wt7NjpZAMQO7hZmKnoBFKE4bnuz6wtGvU6dj14jFhM5BtfhiKHS+fBtm3G3LpDgtB14IIYkGp7dQuFGxShUnxRRxT45RfjnXcSqx8NpAQvvZjY/6czUK92Q3dupufLgAAGrVal7qJwAiDmqIJ2hg3U4etdxhc7DHfIazCnDpYmxlQOnK/0O3q94Xri4KDYvt88279fNMi/13GvACdoAkuO9tTX80qBKjQawiOP6anVj9caAEePWHjuqfawjSOTFxcA88n4VeQ9eNOKULqnglc9ANddq+MA7TYyb76mSxdhv+8loye6cxH4tAw0T0KKggZncE6l3la7OqK1k0zvyWu3nQu7ZxWhJbjtDm1fcaXGgwc8fLU9FWpTwRRH3emRAeci8L4MqMLpU3DzLdp+4dVyrGP2tza0Lvr4XSuz0As0NVrhHBnolycFPAoLFooBnD5lWh9QW7QIE5uItJtydZ+ab+tj6+dAXwYcMsBj9R46Eac4UcF6x18wA/3qgHYmS8+3yu6d20WPAzjuRlch3rFN70C/FDioQVaF2x3gtczR5BRFlYTObceDVCIsyomYi7q4mtO7Nadgdemb3CVBmTs/7061I/stC0G9cYLww85UKwvY9dl4kWK19E/fxfzwHymMN2DXp+2is67s/GS8SM0qlf0wzmA9fddYf54EYhvKQfyii8VOHndtHEfyvDp0huaJ5aUzdhiNceIyMrwQc4Njh1AN019t/7sQORQ1SE3k8D4PGqCsVSdfWYPG364nDbIa1EInUQLH/kJFqsPHnWlvWZmaJURC368OmVQgUIFLx54HIHTWn3ShKnrHnq25p0yRvUFqI8na9CVsUgTSxz5lwn/Ze5CD5iQf36vqaUsupaiZBari8b92HDWzXEpRT1vk+aVHFquH3UGzoWgtE9EwbeIuuAnuljItNFkcM0k36obP5+/D4ppcSsklD2IpibmfbetcSBdzF0splzzkUgoW12z4fP4+3TTq4fXtCza34tFVAT04EIZCLjWpJvosdcilJgNhKAT0YCseXfX69gWbN3V/Trt/yC/c8utIni1cB7bMPI6AZ9PXsulIx0GiSrYHdGs7Htr42s6rzvye/wNVOdE6xvskwQAAAABJRU5ErkJggg==";
const FAVICON_16_B64 = "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACW0lEQVR4nHWSz4vVZRjFP8/74/v9juYMiKKDggRhyzYJFVq2DkJwW+QmEHRtu1m09p9I3YgEIRQExmxsY5sWgauMEuaihjnj3Lk/vu/7nBb33lGG8YUDz+I9POc85xjAmYvlq5TimstPIQKYse+TLOBG+LuU+u1v36fv7KOL5YsY400J5BXYn2uAgGkvui4CUGv90j650G+EmFa9lmpm8U3s2QJx4rjxeEM1Nyl6LYOUxSqlJ2IRaV+yV5hM4PPPAifeDmz85fHuTz0Hlmw1JXdh2EzgwursCinB9rbx6XmbXP46bT/f9OU76+TTJ0WuIrmUsmTsWWwGpTfGQ5juwDunrBw9Qn/v51qbZ57vrjtLSSTHQnKxQJZoTTCFk8dU19bi1gfvq3/5wgNg/z4VP9yp7LxwuiBiFSm7Xnkt0PfGaAjvnqOc/TgOnw08Phl4BGiTOLIs2iC8zGgpSRhQC6ys4Fe+aV7+ul7azecKQJiOtBtNcIhlpnaxN2QXGcFEHDuKv3cmjj88G6dxnkiUCPPfwUXeg5R8piA7hDoPwSHP+uRdYxpHAXgbIdW5Al9YcJfJLCT477HHH29M3vrzj5L/eVjzvdth+ff1vh2PsF9uTw89fFDywVbEAlEgJLt6flOSMDPkYjQ0UoaUYTSEtgMLMN6BbglSFlpU04wU3QcptKu1jquZxW5Z89rC0gq7Ug/MZzkgrzF2sfhkELLrWuNGRxOTO6HX7qVDr5nn+mrO7nQ0sXEju66F6/cP36p161ImPGo81OTS6+XaAzUeaiY8qnXr0vX7h2/9D+ezaRmCh4kSAAAAAElFTkSuQmCC";
const APPLE_TOUCH_B64 = "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";
const ICON512_B64 = "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";

function b64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

const ICON_HEAD = `
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="/favicon-16.png" sizes="16x16" type="image/png">
<link rel="shortcut icon" href="/favicon.ico">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#3556FF">`;

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
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS job_postings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT, company TEXT, email TEXT, url TEXT,
      location TEXT, category TEXT, employment_type TEXT,
      remote_type TEXT, salary TEXT, description TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

async function logSync(env, result) {
  try {
    await env.DB.prepare(
      `INSERT INTO sync_logs (inserted, skipped, errors) VALUES (?,?,?)`
    ).bind(result.inserted, result.skipped, JSON.stringify(result.errors || [])).run();
  } catch (e) {}
}

async function recordVisit(env, request, url) {
  try {
    const country = request.cf?.country || 'XX';
    const ua = (request.headers.get('User-Agent') || '').slice(0, 140);
    const ref = (request.headers.get('Referer') || '').slice(0, 200);
    await env.DB.prepare(
      `INSERT INTO visits (path, referrer, country, ua) VALUES (?,?,?,?)`
    ).bind(url.pathname, ref, country, ua).run();
  } catch (e) {}
}

// ── SYNC (multi API-key aware) ───────────────────────────────────
async function getActiveApiKeys(env) {
  try {
    const { results } = await env.DB.prepare(`SELECT api_key FROM api_sources WHERE active = 1`).all();
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
  const expiry = Date.now() + 1000 * 60 * 60 * 24;
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

// ── SHARED DESIGN TOKENS ─────────────────────────────────────────
const SHARED_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#F6F7FB;--bg2:#F0F2F8;--surface:#FFFFFF;--surface2:#FAFBFD;
  --border:#E6E9F0;--border2:#D8DEEA;
  --ink:#12162B;--ink2:#525A72;--ink3:#8890A4;
  --brand:#3556FF;--brand2:#7C3AED;--brand-soft:#EEF1FF;
  --navy:#0B1220;--navy2:#141D34;--navy-border:#22304F;--navy-ink2:#9AA6C4;
  --green:#0FAE79;--amber:#F5A623;--coral:#FF5C7A;--cyan:#0EA5C4;--pink:#D6489B;
  --pastel-blue:#E9F1FF;--pastel-yellow:#FFF6DC;--pastel-pink:#FDEBF4;--pastel-green:#E8F9F1;
  --salary:#0FAE79;
  --r:14px;--shadow:0 2px 10px rgba(18,22,43,.05);--shadow-lg:0 16px 40px rgba(18,22,43,.12);
}
html{scroll-behavior:smooth}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:var(--bg);color:var(--ink);min-height:100vh;line-height:1.6;-webkit-font-smoothing:antialiased}
h1,h2,h3,.font-display{font-family:'Space Grotesk','Inter',sans-serif}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:var(--bg2)}::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px}
a{color:inherit;text-decoration:none}
button{font-family:inherit}
@keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.6)}}
@keyframes fadeInUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes skeleton{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes toast-bar{from{width:100%}to{width:0%}}
@keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}

/* ── NAV (dark navy, site-wide) ── */
.nav{background:var(--navy);border-bottom:1px solid var(--navy-border);padding:0 24px;height:66px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:200}
.nav-logo{font-family:'Space Grotesk',sans-serif;font-size:21px;font-weight:800;letter-spacing:-.5px;color:#fff;display:flex;align-items:center;gap:7px}
.nav-logo img{width:26px;height:26px;border-radius:7px}
.nav-logo .dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 0 3px rgba(15,174,121,.25)}
.nav-links{display:flex;align-items:center;gap:2px}
.nav-link{padding:9px 14px;border-radius:9px;font-size:14px;font-weight:600;color:var(--navy-ink2);transition:all .2s;border:none;background:none;cursor:pointer;font-family:inherit}
.nav-link:hover{color:#fff;background:rgba(255,255,255,.06)}
.nav-cta{background:var(--coral);color:#fff;border:none;border-radius:24px;padding:10px 20px;font-size:14px;font-weight:700;transition:all .2s;cursor:pointer;margin-left:10px;box-shadow:0 4px 14px rgba(255,92,122,.35)}
.nav-cta:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(255,92,122,.45)}
@media(max-width:860px){.nav-links .nav-link{display:none}}

/* ── MOBILE HEADER + MENU (shared, replaces old bottom tab bar) ── */
.mob-hdr{display:none;padding:0 16px;height:60px;background:var(--navy);align-items:center;justify-content:space-between;position:sticky;top:0;z-index:200;gap:10px}
.mob-logo{font-family:'Space Grotesk',sans-serif;font-size:18px;font-weight:800;color:#fff;display:flex;align-items:center;gap:6px}
.mob-logo img{width:24px;height:24px;border-radius:6px}
.mob-btns{display:flex;gap:8px;align-items:center}
.mob-cta{background:var(--coral);color:#fff;border:none;border-radius:20px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer}
.mob-burger{width:36px;height:36px;border-radius:9px;border:1px solid var(--navy-border);background:rgba(255,255,255,.06);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px}
.mob-menu{display:none;position:sticky;top:60px;z-index:199;background:var(--navy2);border-bottom:1px solid var(--navy-border);padding:8px;animation:slideDown .2s ease}
.mob-menu.open{display:block}
.mob-menu a,.mob-menu button{display:block;width:100%;text-align:left;padding:12px 14px;border-radius:9px;color:#fff;font-size:14px;font-weight:600;border:none;background:none;cursor:pointer;font-family:inherit}
.mob-menu a:active,.mob-menu button:active{background:rgba(255,255,255,.08)}
@media(max-width:860px){.mob-hdr{display:flex}.nav{display:none !important}}

/* ── FOOTER (dark navy, multi-column, site-wide) ── */
.site-footer{background:var(--navy);color:var(--navy-ink2);padding:52px 24px 28px;margin-top:40px}
.sf-inner{max-width:1180px;margin:0 auto}
.sf-top{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:32px;padding-bottom:36px;border-bottom:1px solid var(--navy-border)}
.sf-brand{display:flex;align-items:center;gap:8px;font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:800;color:#fff;margin-bottom:14px}
.sf-brand img{width:26px;height:26px;border-radius:7px}
.sf-desc{font-size:13px;line-height:1.75;max-width:280px;margin-bottom:18px}
.sf-social{display:flex;gap:10px}
.sf-social a{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid var(--navy-border);display:flex;align-items:center;justify-content:center;transition:all .2s}
.sf-social a:hover{background:var(--brand);border-color:var(--brand)}
.sf-social svg{width:15px;height:15px;fill:#fff}
.sf-col-title{font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#fff;margin-bottom:16px}
.sf-col a{display:block;font-size:13px;color:var(--navy-ink2);margin-bottom:12px;transition:color .2s}
.sf-col a:hover{color:#fff}
.sf-bottom{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding-top:22px;font-size:12px}
@media(max-width:768px){.sf-top{grid-template-columns:1fr 1fr;gap:26px}.sf-brand{margin-top:0}}
@media(max-width:480px){.sf-top{grid-template-columns:1fr}}

/* ── AD PLACEHOLDER SLOTS (no live ad code — instructions only) ── */
.ad-slot{border:1.5px dashed var(--border2);border-radius:12px;padding:14px;text-align:center;margin:16px 0;background:var(--surface2)}
.ad-slot-label{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink3);margin-bottom:4px}
.ad-slot-hint{font-size:11px;color:var(--ink3)}

/* ── POST A JOB MODAL (shared, works on every page) ── */
.pj-overlay{display:none;position:fixed;inset:0;background:rgba(11,18,32,.6);backdrop-filter:blur(3px);z-index:500;align-items:flex-start;justify-content:center;padding:32px 16px;overflow-y:auto}
.pj-overlay.open{display:flex;animation:fadeIn .2s ease}
.pj-modal{background:var(--surface);border-radius:18px;max-width:560px;width:100%;padding:28px 26px 26px;box-shadow:var(--shadow-lg);position:relative;margin:auto}
.pj-close{position:absolute;top:16px;right:16px;width:32px;height:32px;border-radius:9px;border:1px solid var(--border2);background:var(--surface2);color:var(--ink2);cursor:pointer;font-size:15px}
.pj-title{font-family:'Space Grotesk',sans-serif;font-size:21px;font-weight:700;color:var(--ink);margin-bottom:4px}
.pj-sub{font-size:13px;color:var(--ink3);margin-bottom:20px}
.pj-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.pj-group{margin-bottom:14px}
.pj-label{font-size:11px;font-weight:700;color:var(--ink2);margin-bottom:6px;display:block;letter-spacing:.4px;text-transform:uppercase}
.pj-input,.pj-select,.pj-textarea{width:100%;background:var(--surface2);border:1.5px solid var(--border2);border-radius:10px;padding:11px 13px;color:var(--ink);font-size:13.5px;font-family:inherit;outline:none;transition:all .2s}
.pj-input:focus,.pj-select:focus,.pj-textarea:focus{border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-soft)}
.pj-textarea{resize:vertical;min-height:80px}
.pj-submit{width:100%;background:var(--brand);color:#fff;padding:13px;border-radius:10px;font-size:14.5px;font-weight:700;border:none;cursor:pointer;margin-top:6px;transition:all .2s}
.pj-submit:hover{background:#2842e0}
.pj-submit:disabled{opacity:.6;cursor:default}
.pj-success{text-align:center;padding:20px 0}
.pj-success .ico{font-size:44px;margin-bottom:10px}
@media(max-width:480px){.pj-row{grid-template-columns:1fr}}
`;

const BASE_URL = 'https://jobnova.manasa.workers.dev';

// ── SHARED COMPONENTS: nav / mobile menu / footer / post-job modal ─
function navHtml() {
  return `
<nav class="nav">
  <a href="/" class="nav-logo"><img src="/favicon.svg" alt="JobNova"><span>JobNova</span><span class="dot"></span></a>
  <div class="nav-links">
    <a href="/" class="nav-link">Browse Jobs</a>
    <a href="/blog" class="nav-link">Blog</a>
    <button class="nav-link" onclick="if(window.goView){goView('saved')}else{location='/'}">Saved</button>
    <button class="nav-cta" onclick="openPostJobModal()">+ Post a Job</button>
  </div>
</nav>`;
}

function mobileHeaderHtml() {
  return `
<div class="mob-hdr">
  <a href="/" class="mob-logo"><img src="/favicon.svg" alt="JobNova">JobNova</a>
  <div class="mob-btns">
    <button class="mob-cta" onclick="openPostJobModal()">+ Post</button>
    <button class="mob-burger" onclick="toggleMobMenu()" id="mobBurgerBtn">☰</button>
  </div>
</div>
<div class="mob-menu" id="mobMenu">
  <a href="/">🔍 Browse Jobs</a>
  <button onclick="if(window.goView){goView('saved');closeMobMenu();}else{location='/'}">🔖 Saved Jobs</button>
  <a href="/blog">📝 Career Blog</a>
  <button onclick="openPostJobModal();closeMobMenu();">➕ Post a Job</button>
  <a href="/privacy">🔒 Privacy</a>
</div>
<script>
function toggleMobMenu(){document.getElementById('mobMenu').classList.toggle('open');}
function closeMobMenu(){document.getElementById('mobMenu').classList.remove('open');}
</script>`;
}

function footerHtml(base) {
  return `
<footer class="site-footer">
  <div class="sf-inner">
    <div class="sf-top">
      <div>
        <div class="sf-brand"><img src="/favicon.svg" alt="JobNova">JobNova</div>
        <p class="sf-desc">The curated platform for finding verified remote jobs and hiring remote talent — in development, design, marketing, data and more.</p>
        <div class="sf-social">
          <a href="#" aria-label="LinkedIn"><svg viewBox="0 0 24 24"><path d="M20.4 20.4h-3.5v-5.6c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9v5.7H9.4V9h3.4v1.6h.1c.5-.9 1.6-1.9 3.4-1.9 3.6 0 4.3 2.4 4.3 5.5v6.2zM5.3 7.4a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM7 20.4H3.6V9H7v11.4z"/></svg></a>
          <a href="#" aria-label="X"><svg viewBox="0 0 24 24"><path d="M18.9 3H22l-7.2 8.3L23 21h-6.9l-5.4-6.6L4.6 21H1.4l7.7-8.9L1 3h7l4.9 6.1L18.9 3zm-1.2 16h1.7L7.4 4.9H5.6L17.7 19z"/></svg></a>
          <a href="#" aria-label="Facebook"><svg viewBox="0 0 24 24"><path d="M13.5 21v-7.7h2.6l.4-3h-3v-1.9c0-.9.2-1.5 1.5-1.5H16.6V3.9C16.3 3.9 15.3 3.8 14.2 3.8c-2.4 0-4 1.5-4 4.1v2.3H7.6v3h2.6V21h3.3z"/></svg></a>
        </div>
      </div>
      <div class="sf-col">
        <div class="sf-col-title">For Job Seekers</div>
        <a href="/">Browse remote jobs</a>
        <a href="#" onclick="openPostJobModal();return false;">Post a job</a>
        <a href="/" onclick="setTimeout(()=>window.goView&&goView('alerts'),50)">Job alerts</a>
      </div>
      <div class="sf-col">
        <div class="sf-col-title">Resources</div>
        <a href="/blog">Career blog</a>
        <a href="/feed.rss">RSS feed</a>
        <a href="/sitemap.xml">Sitemap</a>
      </div>
      <div class="sf-col">
        <div class="sf-col-title">Company</div>
        <a href="/privacy">Privacy policy</a>
        <a href="/terms">Terms of service</a>
        <a href="/disclaimer">Disclaimer</a>
      </div>
    </div>
    <div class="sf-bottom">
      <span>© 2026 JobNova. All rights reserved.</span>
      <span>Made for the remote-first workforce 🌍</span>
    </div>
  </div>
</footer>`;
}

function postJobModalHtml() {
  return `
<div class="pj-overlay" id="pjOverlay" onclick="if(event.target===this)closePostJobModal()">
  <div class="pj-modal">
    <button class="pj-close" onclick="closePostJobModal()">✕</button>
    <div id="pjFormWrap">
      <div class="pj-title">📮 Post a Remote Job</div>
      <div class="pj-sub">Reach thousands of remote job seekers. We review every listing before it goes live.</div>
      <form id="pjForm" onsubmit="return submitPostJob(event)">
        <div class="pj-row">
          <div class="pj-group"><label class="pj-label">Job Title</label><input class="pj-input" name="title" required placeholder="Senior Backend Engineer"></div>
          <div class="pj-group"><label class="pj-label">Company</label><input class="pj-input" name="company" required placeholder="Acme Inc."></div>
        </div>
        <div class="pj-row">
          <div class="pj-group"><label class="pj-label">Contact Email</label><input class="pj-input" type="email" name="email" required placeholder="hiring@acme.com"></div>
          <div class="pj-group"><label class="pj-label">Apply URL</label><input class="pj-input" type="url" name="url" required placeholder="https://acme.com/careers/123"></div>
        </div>
        <div class="pj-row">
          <div class="pj-group"><label class="pj-label">Location</label><input class="pj-input" name="location" placeholder="Remote / Anywhere"></div>
          <div class="pj-group"><label class="pj-label">Salary Range</label><input class="pj-input" name="salary" placeholder="$90k - $130k"></div>
        </div>
        <div class="pj-row">
          <div class="pj-group"><label class="pj-label">Category</label>
            <select class="pj-select" name="category">
              ${CATEGORY_ORDER.map(k => `<option value="${k}">${CATEGORY_META[k].label}</option>`).join('')}
            </select>
          </div>
          <div class="pj-group"><label class="pj-label">Remote Type</label>
            <select class="pj-select" name="remote_type">
              <option value="fully_remote">Fully Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="on_site">On-site</option>
            </select>
          </div>
        </div>
        <div class="pj-group"><label class="pj-label">Description</label><textarea class="pj-textarea" name="description" placeholder="Role responsibilities, requirements, benefits..."></textarea></div>
        <button class="pj-submit" type="submit" id="pjSubmitBtn">Submit for Review →</button>
      </form>
    </div>
  </div>
</div>
<script>
function openPostJobModal(){document.getElementById('pjOverlay').classList.add('open');document.body.style.overflow='hidden';}
function closePostJobModal(){document.getElementById('pjOverlay').classList.remove('open');document.body.style.overflow='';}
async function submitPostJob(e){
  e.preventDefault();
  const form=e.target;
  const btn=document.getElementById('pjSubmitBtn');
  btn.disabled=true;btn.textContent='Submitting...';
  const data=Object.fromEntries(new FormData(form).entries());
  try{
    const res=await fetch('/api/post-job',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const d=await res.json();
    if(d.success){
      document.getElementById('pjFormWrap').innerHTML='<div class="pj-success"><div class="ico">🎉</div><div class="pj-title">Thanks — received!</div><div class="pj-sub">Our team will review your listing and publish it within 24 hours.</div><button class="pj-submit" onclick="closePostJobModal()">Done</button></div>';
    }else{
      btn.disabled=false;btn.textContent='Submit for Review →';
      alert(d.error||'Something went wrong. Please try again.');
    }
  }catch(err){
    btn.disabled=false;btn.textContent='Submit for Review →';
    alert('Network error. Please try again.');
  }
  return false;
}
</script>`;
}

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
${ICON_HEAD}
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="JobNova">
${ogImage ? `<meta property="og:image" content="${ogImage}">` : `<meta property="og:image" content="${BASE_URL}/icon-512.png">`}
<meta name="twitter:card" content="summary">
<link rel="canonical" href="${canonical}">
<link rel="alternate" type="application/rss+xml" title="JobNova Jobs Feed" href="${BASE_URL}/feed.rss">
${extraHead}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
${SHARED_CSS}
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
.job-co-name{font-size:16px;font-weight:700;color:var(--brand);margin-bottom:3px;display:flex;align-items:center;gap:5px}
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
.verified-ico{color:var(--brand);font-size:13px}
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
@media(max-width:640px){
  .job-title-h1{font-size:20px}
  .article-title{font-size:22px}
  .job-hero-hdr,.job-body{padding:18px 16px}
  .apply-big{width:100%;justify-content:center}
}
</style>
</head>
<body>
${navHtml()}
${mobileHeaderHtml()}
${content}
${footerHtml(BASE_URL)}
${postJobModalHtml()}
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
    "validThrough": new Date(Date.now() + 1000 * 60 * 60 * 24 * 45).toISOString().split('T')[0],
    "url": canonical, "directApply": true,
    ...(job.salary ? { "baseSalary": { "@type": "MonetaryAmount", "currency": "USD", "value": { "@type": "QuantitativeValue", "value": job.salary } } } : {})
  });
  const breadcrumbSchema = JSON.stringify({
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "JobNova", "item": base },
      { "@type": "ListItem", "position": 2, "name": "Jobs", "item": base + "/" },
      { "@type": "ListItem", "position": 3, "name": job.title, "item": canonical }
    ]
  });
  const content = `
<div class="page">
  <div class="breadcrumb"><a href="/">JobNova</a><span>›</span><a href="/">Jobs</a><span>›</span><span>${job.title}</span></div>
  <div class="job-hero">
    <div class="job-hero-hdr">
      <div class="job-co-row">
        ${logoImgHtml(job.company, '64px', 'job-logo')}
        <div><div class="job-co-name">${job.company} <span class="verified-ico" title="Verified listing">✅</span></div><div class="job-co-loc">📍 ${job.location || 'Remote'}</div></div>
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
      <div class="ad-slot"><div class="ad-slot-label">Advertisement Slot</div><div class="ad-slot-hint">Reserved 320×50 space — insert your ad network snippet here</div><!-- AD SLOT: job-detail-inline — paste your ad network embed code in this container --></div>
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
  <div class="ad-slot" style="margin-top:24px"><div class="ad-slot-label">Advertisement Slot</div><div class="ad-slot-hint">Reserved space — insert your ad network snippet here</div><!-- AD SLOT: job-detail-footer — paste your ad network embed code in this container --></div>
</div>`;
  return baseLayout(`${job.title} at ${job.company} — JobNova`, desc, canonical, '', content, `<script type="application/ld+json">${schema}</script><script type="application/ld+json">${breadcrumbSchema}</script>`);
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
  <div class="ad-slot"><div class="ad-slot-label">Advertisement Slot</div><div class="ad-slot-hint">Reserved space — insert your ad network snippet here</div><!-- AD SLOT: blog-index-top --></div>
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
  <div class="ad-slot" style="margin-top:28px"><div class="ad-slot-label">Advertisement Slot</div><div class="ad-slot-hint">Reserved space — insert your ad network snippet here</div><!-- AD SLOT: blog-article-footer --></div>
  <div style="margin-top:28px;display:flex;gap:10px;flex-wrap:wrap">
    <a href="/blog" class="back-link" style="margin-bottom:0">← Back to Blog</a>
    <a href="/" style="display:inline-flex;align-items:center;gap:7px;background:var(--ink);color:#fff;padding:9px 18px;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none">Browse Remote Jobs →</a>
  </div>
</div>`;
  return baseLayout(`${post.title} — JobNova Blog`, post.excerpt, canonical, '', content, `<script type="application/ld+json">${schema}</script>`);
}

const STATIC_PAGES = {
  privacy: { title: 'Privacy Policy', date: 'Last updated: July 12, 2026', description: 'JobNova Privacy Policy.',
    body: `<h2>1. Information We Collect</h2><p>JobNova collects minimal, aggregated visit data (page, country, referrer) to understand site usage. No personal profiles are built from this data.</p><h2>2. Job Alert Subscribers</h2><p>We store your email and keywords solely to send notifications. We never sell this data.</p><h2>3. Cookies & Storage</h2><p>We use browser localStorage only for saved jobs. Admin tools use a single secure session cookie.</p><h2>4. Employer Submissions</h2><p>Job postings submitted via "Post a Job" are stored with your contact email for review purposes only.</p><h2>5. Contact</h2><p>For privacy questions: <a href="mailto:hello@jobnova.dev">hello@jobnova.dev</a></p>` },
  terms: { title: 'Terms of Service', date: 'Last updated: July 12, 2026', description: 'JobNova Terms of Service.',
    body: `<h2>1. Acceptance</h2><p>By using JobNova, you agree to these Terms.</p><h2>2. Service</h2><p>JobNova is a job aggregation and posting platform curating listings from third-party APIs and direct employer submissions.</p><h2>3. Prohibited Activities</h2><ul><li>Scraping or bulk downloading job data</li><li>Sending spam or unsolicited outreach</li><li>Interfering with site functionality</li><li>Posting fraudulent or misleading job listings</li></ul><h2>4. Accuracy</h2><p>We do not guarantee accuracy of any listing. Verify with employers directly.</p><h2>5. Liability</h2><p>JobNova is provided "as is" without warranties.</p>` },
  disclaimer: { title: 'Disclaimer', date: 'Last updated: July 12, 2026', description: 'JobNova Disclaimer.',
    body: `<h2>Job Listing Accuracy</h2><p>JobNova aggregates listings from third-party sources and direct employer submissions. Accuracy and timeliness are not guaranteed.</p><h2>No Employment Relationship</h2><p>JobNova is a discovery platform, not an employer or recruiter.</p><h2>Salary Information</h2><p>Salary figures are estimates and may not reflect actual offers.</p><h2>Advertisement Disclaimer</h2><p>JobNova is not responsible for third-party advertisements displayed on this site.</p>` }
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

// ── job card SSR renderer (shared shape with client renderer, for SEO) ─
function catForTitleServer(title) {
  const t = (title || '').toLowerCase();
  for (const k of CATEGORY_ORDER) { if (t.includes(k)) return k; }
  return 'developer';
}
function pastelForJob(job, idx) {
  const isHot = job.salary && parseInt(job.salary.replace(/\D/g, '').slice(0, 3)) >= 150;
  const isNew = job.created_at && Date.now() - new Date(job.created_at).getTime() < 86400000;
  if (isHot) return 'var(--pastel-yellow)';
  if (isNew) return 'var(--pastel-blue)';
  if (idx % 7 === 3) return 'var(--pastel-pink)';
  return 'var(--surface)';
}
function timeAgoServer(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (h < 1) return 'just now';
  if (h < 24) return h + 'h ago';
  return d + 'd ago';
}
function jobCardSSR(job, idx) {
  const meta = CATEGORY_META[catForTitleServer(job.title)];
  const isNew = job.created_at && Date.now() - new Date(job.created_at).getTime() < 86400000;
  const isHot = job.salary && parseInt(job.salary.replace(/\D/g, '').slice(0, 3)) >= 150;
  const bg = pastelForJob(job, idx);
  const timeAgo = timeAgoServer(job.created_at);
  return `<a href="/job/${job.id}" class="job-card" style="--cat-color:${meta.color};background:${bg};animation:fadeInUp .3s ease ${Math.min(idx, 6) * .04}s both">
    <div class="card-inner">
      <div class="card-row1">
        ${logoImgHtml(job.company, '46px', 'co-logo')}
        <div class="card-body">
          <div class="card-badges">
            <span class="cat-dot"><span class="dot"></span>${meta.emoji} ${meta.label}</span>
            ${isNew ? '<span class="tag-new">✦ NEW</span>' : ''}
            ${isHot ? '<span class="tag-hot">🔥 HOT</span>' : ''}
          </div>
          <div class="job-title-card">${job.title}</div>
          <div class="job-co-card">${job.company} <span class="verified-ico" title="Verified">✅</span></div>
          <div class="job-meta-row">
            ${job.location ? '<span class="tag tag-loc">📍 ' + job.location + '</span>' : ''}
            ${remoteTagHtml(job.remote_type)}
            ${job.employment_type ? '<span class="tag tag-type">' + job.employment_type.replace(/_/g, ' ') + '</span>' : ''}
          </div>
        </div>
      </div>
      <div class="card-right">
        ${job.salary ? '<div class="salary-badge">' + job.salary + '</div>' : '<div></div>'}
        <div class="card-actions">
          <button class="act-btn" onclick="event.preventDefault();event.stopPropagation();toggleSave(${job.id})" id="sb-${job.id}">🔖</button>
          <button class="act-btn" onclick="event.preventDefault();event.stopPropagation();shareJob(${job.id})">🔗</button>
          <div class="arr-btn">→</div>
        </div>
      </div>
    </div>
    ${timeAgo ? '<div class="card-footer"><span>⏰ ' + timeAgo + '</span><span style="color:' + meta.color + '">View →</span></div>' : ''}
  </a>`;
}

// ══════════════════════════════════════════════════════════════════
// MAIN SPA (Remote.io-inspired: navy hero, pastel job cards, SSR)
// ══════════════════════════════════════════════════════════════════

function categoryChipsServer() {
  return CATEGORY_ORDER.map(k => `<button class="chip" data-cat="${k}" onclick="filterCat('${k}','${CATEGORY_META[k].label}')">${CATEGORY_META[k].emoji} ${CATEGORY_META[k].label}</button>`).join('');
}

async function renderMainHTML(env, base) {
  await ensureTable(env);
  let initialJobs = [], initialTotal = 0, totalJobsCount = 0;
  try {
    const { results } = await env.DB.prepare("SELECT * FROM jobs ORDER BY id DESC LIMIT 20").all();
    initialJobs = results || [];
    const { results: cr } = await env.DB.prepare("SELECT COUNT(*) as total FROM jobs").all();
    initialTotal = cr[0]?.total || 0;
    totalJobsCount = initialTotal;
  } catch (e) {}

  const itemListSchema = JSON.stringify({
    "@context": "https://schema.org", "@type": "ItemList",
    "itemListElement": initialJobs.slice(0, 10).map((j, i) => ({
      "@type": "ListItem", "position": i + 1, "url": `${base}/job/${j.id}`
    }))
  });
  const orgSchema = JSON.stringify({
    "@context": "https://schema.org", "@type": "Organization",
    "name": "JobNova", "url": base, "logo": `${base}/icon-512.png`
  });

  const ssrJobsHtml = initialJobs.length
    ? initialJobs.map((j, i) => jobCardSSR(j, i)).join('')
    : `<div class="loader-wrap"><div class="loader"></div></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="google-site-verification" content="7Q0EJk3kQKNLNzIhyzH4k5CsuHsQEa-U0Pwp_w_b0n0"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>JobNova — Find Your Next Remote Job</title>
<meta name="description" content="JobNova is a curated remote job board with ${totalJobsCount ? totalJobsCount.toLocaleString() + '+' : ''} verified positions in development, design, marketing, data and more. Updated hourly.">
<meta name="robots" content="index, follow">
${ICON_HEAD}
<meta property="og:title" content="JobNova — Find Your Next Remote Job">
<meta property="og:description" content="Curated remote jobs updated hourly. Browse, save, and get alerted — or post your own opening.">
<meta property="og:type" content="website">
<meta property="og:url" content="${base}">
<meta property="og:site_name" content="JobNova">
<meta property="og:image" content="${base}/icon-512.png">
<meta name="twitter:card" content="summary">
<link rel="canonical" href="${base}">
<link rel="alternate" type="application/rss+xml" title="JobNova Jobs Feed" href="${base}/feed.rss">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"JobNova","url":"${base}","potentialAction":{"@type":"SearchAction","target":"${base}/?search={search_term_string}","query-input":"required name=search_term_string"}}</script>
<script type="application/ld+json">${orgSchema}</script>
<script type="application/ld+json">${itemListSchema}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
${SHARED_CSS}

/* ── HERO (navy → indigo gradient, bold headline, red CTA search) ── */
.hero{padding:64px 24px 40px;background:linear-gradient(135deg,#1830C4 0%,#3556FF 55%,#6C3FE0 100%);position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 60% 50% at 80% 0%,rgba(255,255,255,.12),transparent 60%)}
.hero-inner{max-width:1180px;margin:0 auto;position:relative}
.hero-eyebrow{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);border-radius:20px;padding:5px 13px;font-size:12px;color:#fff;font-weight:700;margin-bottom:20px}
.hero-eyebrow-dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse-dot 2s infinite}
.hero-title{font-family:'Space Grotesk',sans-serif;font-size:44px;font-weight:800;letter-spacing:-1.4px;line-height:1.08;margin-bottom:16px;color:#fff;max-width:680px}
.hero-title .hl{position:relative;display:inline-block}
.hero-title .hl::after{content:'';position:absolute;left:0;right:0;bottom:2px;height:5px;background:var(--coral);border-radius:3px;opacity:.85;z-index:-1}
.hero-sub{color:rgba(255,255,255,.85);font-size:16px;margin-bottom:28px;line-height:1.65;max-width:540px}
.search-row{display:flex;gap:0;max-width:640px;margin-bottom:26px;background:#fff;border-radius:14px;padding:6px;box-shadow:0 20px 44px -12px rgba(11,18,32,.45)}
.search-wrap{position:relative;flex:1}
.search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--ink3);pointer-events:none;font-size:15px}
.search-input{width:100%;background:transparent;border:none;padding:12px 12px 12px 40px;color:var(--ink);font-size:15px;font-family:inherit;outline:none}
.search-input::placeholder{color:var(--ink3)}
.search-btn{background:var(--coral);color:#fff;border:none;border-radius:9px;padding:0 26px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s;white-space:nowrap}
.search-btn:hover{background:#e64d68;transform:translateY(-1px)}
.hero-stats{display:flex;gap:30px;flex-wrap:wrap}
.hero-stat{display:flex;flex-direction:column}
.hero-stat-num{font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;color:#fff;line-height:1.2}
.hero-stat-label{font-size:11px;color:rgba(255,255,255,.65);font-weight:600;letter-spacing:.4px;text-transform:uppercase}

/* ── FEATURED COMPANIES STRIP ── */
.fc-strip{border-bottom:1px solid var(--border);padding:22px 24px;background:var(--surface)}
.fc-inner{max-width:1180px;margin:0 auto}
.fc-label{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--ink3);margin-bottom:16px;text-align:center}
.fc-logos{display:flex;align-items:center;justify-content:center;gap:40px;flex-wrap:wrap}
.fc-logos span{font-family:'Space Grotesk',sans-serif;font-size:19px;font-weight:700;color:var(--ink3);opacity:.55;transition:all .25s;cursor:default}
.fc-logos span:hover{opacity:1;color:var(--brand)}

/* ── FILTER BAR ── */
.filters-bar{position:sticky;top:66px;z-index:150;padding:12px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;overflow-x:auto;background:rgba(255,255,255,.92);backdrop-filter:blur(10px)}
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

/* ── JOB LIST (pastel-tinted cards, remote.io rhythm) ── */
.jobs-list{display:flex;flex-direction:column;gap:10px}
.job-card{border:1px solid var(--border);border-radius:14px;display:block;text-decoration:none;color:inherit;transition:all .2s;position:relative;overflow:hidden}
.job-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--cat-color,var(--brand));opacity:0;transition:opacity .2s}
.job-card:hover{border-color:var(--cat-color,var(--brand));box-shadow:var(--shadow-lg);transform:translateY(-2px)}
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
.verified-ico{font-size:11px}
.job-meta-row{display:flex;flex-wrap:wrap;gap:5px;align-items:center}
.card-right{display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid rgba(18,22,43,.06)}
.salary-badge{font-size:12px;font-weight:800;color:var(--salary);background:rgba(15,174,121,.08);border:1px solid rgba(15,174,121,.18);padding:4px 12px;border-radius:8px;white-space:nowrap}
.card-actions{display:flex;align-items:center;gap:5px}
.act-btn{width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.6);border:1px solid var(--border2);color:var(--ink3);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;transition:all .2s;position:relative;z-index:1}
.act-btn:hover{background:var(--brand-soft);color:var(--brand);transform:scale(1.08)}
.act-btn.saved{background:rgba(245,166,35,.12);border-color:var(--amber);color:var(--amber)}
.arr-btn{width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.6);border:1px solid var(--border2);color:var(--ink2);display:flex;align-items:center;justify-content:center;font-size:15px;transition:all .25s}
.job-card:hover .arr-btn{background:var(--cat-color,var(--brand));border-color:transparent;color:#fff}
.card-footer{padding:8px 16px;border-top:1px solid rgba(18,22,43,.06);display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--ink3)}

/* ── TAGS ── */
.tag{display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 9px;border-radius:20px;font-weight:700;white-space:nowrap}
.tag-loc{color:var(--ink3);font-size:11px;font-weight:600}
.tag-remote{background:rgba(15,174,121,.1);color:var(--green);border:1px solid rgba(15,174,121,.2)}
.tag-hybrid{background:rgba(245,166,35,.1);color:var(--amber);border:1px solid rgba(245,166,35,.2)}
.tag-onsite{background:rgba(255,255,255,.6);color:var(--ink2);border:1px solid var(--border2)}
.tag-type{background:rgba(255,255,255,.6);color:var(--ink2);border:1px solid var(--border2)}
.tag-new{background:rgba(15,174,121,.14);color:var(--green);border:1px solid rgba(15,174,121,.3);font-size:10px;padding:2px 8px;font-weight:800;letter-spacing:.8px;border-radius:20px}
.tag-hot{background:rgba(255,92,122,.14);color:var(--coral);border:1px solid rgba(255,92,122,.3);font-size:10px;padding:2px 8px;font-weight:800;border-radius:20px}

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

/* ── FORMS (alerts) ── */
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

.ad-slot{border:1.5px dashed var(--border2);border-radius:12px;padding:14px;text-align:center;margin:16px 0;background:var(--surface2)}
.ad-slot-label{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink3);margin-bottom:4px}
.ad-slot-hint{font-size:11px;color:var(--ink3)}

@media(max-width:860px){
  .filters-bar{top:60px}
}
@media(max-width:768px){
  .hero{padding:30px 16px 26px}
  .hero-title{font-size:26px;letter-spacing:-.7px}
  .hero-sub{font-size:13px;margin-bottom:20px}
  .search-row{flex-direction:column;padding:8px;gap:8px}
  .search-btn{padding:12px}
  .hero-stats{gap:18px}
  .hero-stat-num{font-size:17px}
  .fc-logos{gap:22px}
  .fc-logos span{font-size:15px}
  .content-wrap{padding:14px}
  .card-inner{padding:14px 12px}
  .co-logo{width:42px;height:42px;border-radius:9px}
  .job-title-card{font-size:13px}
  .pagination{padding:20px 0 10px;gap:6px}
  .page-btn{padding:8px 13px;font-size:12px}
}
@media(max-width:380px){
  .hero-title{font-size:22px}
  .chip{padding:6px 12px;font-size:12px}
}
</style>
</head>
<body>
${navHtml()}
${mobileHeaderHtml()}

<main>
  <!-- JOBS VIEW -->
  <div id="vJobs">
    <div class="hero">
      <div class="hero-inner">
        <div class="hero-eyebrow"><span class="hero-eyebrow-dot"></span>Updated hourly · ${totalJobsCount ? totalJobsCount.toLocaleString() + '+ verified listings' : 'AI-matched listings'}</div>
        <h1 class="hero-title">Find your next <span class="hl">remote job</span></h1>
        <p class="hero-sub">Browse curated remote positions from top companies worldwide. Filter by category, salary, and seniority — or post your own opening in minutes.</p>
        <div class="search-row">
          <div class="search-wrap">
            <span class="search-icon">🔍</span>
            <input type="text" class="search-input" id="searchInput" placeholder="Job title, skill, or company..." oninput="debounceSearch(this.value)">
          </div>
          <button class="search-btn" onclick="document.getElementById('searchInput').focus()">Search</button>
        </div>
        <div class="hero-stats">
          <div class="hero-stat"><span class="hero-stat-num" id="stat-jobs">${totalJobsCount ? totalJobsCount.toLocaleString() + '+' : '—'}</span><span class="hero-stat-label">Active Jobs</span></div>
          <div class="hero-stat"><span class="hero-stat-num">${FEATURED_COMPANIES.length}+</span><span class="hero-stat-label">Companies</span></div>
          <div class="hero-stat"><span class="hero-stat-num">Hourly</span><span class="hero-stat-label">Updates</span></div>
        </div>
      </div>
    </div>

    <div class="fc-strip">
      <div class="fc-inner">
        <div class="fc-label">Featured Remote Employers</div>
        <div class="fc-logos">${FEATURED_COMPANIES.map(c => `<span>${c}</span>`).join('')}</div>
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
        <div class="results-count" id="resultsCount"><strong>${initialTotal.toLocaleString()}</strong> jobs found</div>
        <button class="adv-toggle-btn" id="advToggleBtn" onclick="toggleAdv()">⚙️ Filters</button>
      </div>
      <div class="ad-slot"><div class="ad-slot-label">Advertisement Slot</div><div class="ad-slot-hint">Reserved space above listings — insert your ad network snippet here</div><!-- AD SLOT: homepage-results-top --></div>
      <div class="jobs-list" id="jobsList">${ssrJobsHtml}</div>
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

${footerHtml(base)}
${postJobModalHtml()}

<div class="toast" id="toast">
  <span id="toastIcon" style="font-size:16px">✓</span>
  <span id="toastMsg">Done</span>
  <div class="toast-bar" id="toastBar"></div>
</div>

<script>
const CAT_META={developer:{label:'Development',emoji:'💻',color:'#3556FF'},designer:{label:'Design',emoji:'🎨',color:'#D6489B'},marketing:{label:'Marketing',emoji:'📣',color:'#F5A623'},data:{label:'Data & AI',emoji:'📊',color:'#0EA5C4'},devops:{label:'DevOps',emoji:'⚙️',color:'#0FAE79'},manager:{label:'Management',emoji:'👔',color:'#FF5C7A'},writer:{label:'Writing',emoji:'✍️',color:'#7C3AED'}};
let pg=1,cat='',srch='',advT,srchT;
let jobs=${JSON.stringify(initialJobs)},total=${initialTotal};
let savedIds=JSON.parse(localStorage.getItem('jn_saved')||'[]');
let alertKws=[];
let adv={remote:'',employ:'',seniority:'',salaryMin:'',days:''};
let hasLoadedOnce=true;

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
function pastelFor(j,idx){
  if(isHot(j.salary))return'var(--pastel-yellow)';
  if(isNew(j.created_at))return'var(--pastel-blue)';
  if(idx%7===3)return'var(--pastel-pink)';
  return'var(--surface)';
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
  window.scrollTo({top:0,behavior:'smooth'});
}
function goView(v){
  if(v==='jobs'){showView('vJobs');return;}
  if(v==='saved'){showView('vSaved');renderSaved();return;}
  if(v==='alerts'){showView('vAlerts');return;}
}
window.goView=goView;

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
      </div>
    </div>\`).join('');
}

function renderJobsList(){
  document.getElementById('jobsList').innerHTML=jobs.map((j,idx)=>{
    const saved=savedIds.includes(j.id);
    const nw=isNew(j.created_at);
    const hot=isHot(j.salary);
    const timeAgo=j.created_at?getTimeAgo(new Date(j.created_at)):'';
    const k=catForTitle(j.title);
    const meta=CAT_META[k];
    const bg=pastelFor(j,idx);
    return\`<a href="/job/\${j.id}" class="job-card" style="--cat-color:\${meta.color};background:\${bg};animation:fadeInUp .3s ease \${Math.min(idx,6)*.04}s both">
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
            <div class="job-co-card">\${j.company} <span class="verified-ico">✅</span></div>
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
    document.getElementById('resultsCount').innerHTML=\`<strong>\${total.toLocaleString()}</strong> jobs found\${cat?' in <strong>'+(CAT_META[cat]?CAT_META[cat].label:cat)+'</strong>':''}\${srch?' for "<strong>'+srch+'</strong>"':''}\`;
    if(!jobs.length){
      document.getElementById('jobsList').innerHTML=\`<div class="empty"><div class="e-icon">🔍</div><h3>No jobs found</h3><p>Try different keywords or clear filters</p></div>\`;
      return;
    }
    renderJobsList();
    renderPagination();
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
window.toggleSave=toggleSave;
function shareJob(id){
  const url=window.location.origin+'/job/'+id;
  navigator.clipboard.writeText(url).then(()=>showToast('Link copied! 🔗')).catch(()=>showToast('Copied!'));
}
window.shareJob=shareJob;

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

function renderPagination(){
  const el=document.getElementById('pagination');
  if(!el)return;
  const tp=Math.ceil(total/20);
  el.innerHTML=tp>1?\`
    <button class="page-btn" onclick="goPage(\${pg-1})" \${pg===1?'disabled':''}>← Prev</button>
    <span class="page-info">Page \${pg} / \${tp}</span>
    <button class="page-btn" onclick="goPage(\${pg+1})" \${pg===tp?'disabled':''}>Next →</button>\`:'';
}

// bind actions on the server-rendered initial cards too, and fill in
// what only client JS can compute (relative time-ago is already SSR'd,
// but pagination needs the live "total" count known only after render)
document.addEventListener('DOMContentLoaded',()=>{
  savedIds.forEach(id=>{const b=document.getElementById('sb-'+id);if(b)b.classList.add('saved');});
  renderPagination();
});
</script>
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════════

function renderAdminLogin(error) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin Login — JobNova</title><meta name="robots" content="noindex, nofollow">${ICON_HEAD}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>${SHARED_CSS}
body{display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;background:var(--bg)}
.box{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:36px 30px;max-width:380px;width:100%;box-shadow:var(--shadow-lg)}
.logo{font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:800;color:var(--ink);margin-bottom:4px;display:flex;align-items:center;gap:8px}
.logo img{width:28px;height:28px;border-radius:8px}
.sub{font-size:13px;color:var(--ink3);margin-bottom:24px}
.form-input{width:100%;background:var(--surface2);border:1.5px solid var(--border2);border-radius:10px;padding:12px 14px;color:var(--ink);font-size:14px;font-family:inherit;outline:none;margin-bottom:14px}
.form-input:focus{border-color:var(--brand)}
.submit-btn{width:100%;background:var(--brand);color:#fff;padding:13px;border-radius:10px;font-size:14px;font-weight:700;font-family:inherit;border:none;cursor:pointer}
.err{background:rgba(255,92,122,.1);border:1px solid rgba(255,92,122,.25);color:var(--coral);font-size:13px;padding:10px 12px;border-radius:9px;margin-bottom:14px}
</style></head><body>
<div class="box">
  <div class="logo"><img src="/favicon.svg" alt="JobNova">JobNova</div>
  <div class="sub">Admin Dashboard</div>
  ${error ? `<div class="err">Incorrect password. Try again.</div>` : ''}
  <form method="POST" action="/admin/login">
    <input class="form-input" type="password" name="password" placeholder="Admin password" autofocus required>
    <button class="submit-btn" type="submit">Sign In →</button>
  </form>
</div>
</body></html>`;
}

function barChart(rows) {
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

  const { results: pendingR } = await q("SELECT COUNT(*) c FROM job_postings WHERE status='pending'");

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
    return { label: CATEGORY_META[k].label, count: results[0]?.c || 0 };
  }));

  const { results: syncLogs } = await q("SELECT * FROM sync_logs ORDER BY id DESC LIMIT 10");
  const { results: apiSources } = await q("SELECT * FROM api_sources ORDER BY id DESC");
  const { results: pendingPostings } = await q("SELECT * FROM job_postings WHERE status='pending' ORDER BY id DESC LIMIT 20");

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
      ${kpi('Pending Postings', (pendingR[0]?.c || 0).toLocaleString(), 'Awaiting review', 'var(--coral)')}
      ${kpi('Subscribers', (subsR[0]?.c || 0).toLocaleString(), 'Job alert emails', 'var(--pink)')}
      ${kpi('Total Visits', (totalVisitsR[0]?.c || 0).toLocaleString(), `${visitsTodayR[0]?.c || 0} today`, 'var(--cyan)')}
      ${kpi('Visits (7d)', (visits7dR[0]?.c || 0).toLocaleString(), `${uniqCountriesR[0]?.c || 0} countries reached`, 'var(--green)')}
    </div>

    ${(pendingPostings || []).length ? `
    <div class="adm-card" style="margin-bottom:16px">
      <div class="adm-card-title">📮 Pending Job Postings <span style="font-weight:400;color:var(--ink3);font-size:12px">— submitted via "Post a Job"</span></div>
      ${pendingPostings.map(p => `<div class="pp-row">
        <div class="pp-info">
          <div class="pp-title">${p.title} <span style="color:var(--ink3);font-weight:500">at ${p.company}</span></div>
          <div class="pp-meta">${p.email} · ${p.location || 'Remote'} · ${p.salary || 'No salary listed'} · ${new Date(p.created_at).toLocaleString()}</div>
          <a href="${p.url}" target="_blank" style="font-size:11px;color:var(--brand)">${p.url}</a>
        </div>
        <div class="pp-actions">
          <form method="POST" action="/admin/postings/approve"><input type="hidden" name="id" value="${p.id}"><button class="adm-btn-sm adm-btn-approve" type="submit">✓ Approve</button></form>
          <form method="POST" action="/admin/postings/reject"><input type="hidden" name="id" value="${p.id}"><button class="adm-btn-sm" type="submit" onclick="return confirm('Reject this posting?')">✕ Reject</button></form>
        </div>
      </div>`).join('')}
    </div>` : ''}

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
<title>Admin — JobNova</title><meta name="robots" content="noindex, nofollow">${ICON_HEAD}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${SHARED_CSS}
body{background:var(--bg)}
.adm-wrap{max-width:1180px;margin:0 auto;padding:28px 20px 60px}
.adm-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;flex-wrap:wrap;gap:12px}
.adm-title{font-family:'Space Grotesk',sans-serif;font-size:24px;font-weight:700;color:var(--ink)}
.adm-sub{font-size:13px;color:var(--ink3)}
.adm-btn{padding:9px 16px;border-radius:9px;border:1px solid var(--border2);background:var(--surface);color:var(--ink2);font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
.adm-btn-primary{background:var(--brand);border-color:var(--brand);color:#fff}
.adm-btn-sm{padding:6px 12px;border-radius:7px;border:1px solid var(--border2);background:var(--surface);color:var(--coral);font-size:11px;font-weight:700;cursor:pointer;font-family:inherit}
.adm-btn-approve{color:var(--green);border-color:rgba(15,174,121,.3)}
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:16px}
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
.pp-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);flex-wrap:wrap}
.pp-row:last-child{border-bottom:none}
.pp-title{font-size:13px;font-weight:700;color:var(--ink)}
.pp-meta{font-size:11px;color:var(--ink3);margin:3px 0}
.pp-actions{display:flex;gap:8px;flex-shrink:0}
@media(max-width:768px){.adm-grid{grid-template-columns:1fr}}
</style></head><body>${content}</body></html>`;
}

// ══════════════════════════════════════════════════════════════════
// FETCH HANDLER
// ══════════════════════════════════════════════════════════════════

function manifestJson(base) {
  return JSON.stringify({
    name: "JobNova — Remote Jobs",
    short_name: "JobNova",
    description: "Curated remote job board updated hourly.",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F7FB",
    theme_color: "#3556FF",
    icons: [
      { src: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
    ]
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const base = `${url.protocol}//${url.host}`;
    await ensureTable(env);

    // ── static brand assets (no network dependency) ──
    if (url.pathname === '/favicon.svg') {
      return new Response(FAVICON_SVG, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=604800" } });
    }
    if (url.pathname === '/favicon.ico') {
      return new Response(b64ToBytes(FAVICON_ICO_B64), { headers: { "Content-Type": "image/x-icon", "Cache-Control": "public, max-age=604800" } });
    }
    if (url.pathname === '/favicon-32.png') {
      return new Response(b64ToBytes(FAVICON_32_B64), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=604800" } });
    }
    if (url.pathname === '/favicon-16.png') {
      return new Response(b64ToBytes(FAVICON_16_B64), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=604800" } });
    }
    if (url.pathname === '/apple-touch-icon.png') {
      return new Response(b64ToBytes(APPLE_TOUCH_B64), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=604800" } });
    }
    if (url.pathname === '/icon-512.png') {
      return new Response(b64ToBytes(ICON512_B64), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=604800" } });
    }
    if (url.pathname === '/manifest.json') {
      return new Response(manifestJson(base), { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=86400" } });
    }
    if (url.pathname === '/robots.txt') {
      const robots = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${base}/sitemap.xml`;
      return new Response(robots, { headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=86400" } });
    }

    // ── visitor analytics (best-effort, non-blocking) ──
    const trackable = ['GET'].includes(request.method) &&
      !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/admin') &&
      !['/sitemap.xml', '/feed.rss', '/robots.txt', '/manifest.json', '/favicon.svg', '/favicon.ico', '/favicon-32.png', '/favicon-16.png', '/apple-touch-icon.png', '/icon-512.png'].includes(url.pathname);
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
    if (url.pathname === '/admin/postings/approve' && request.method === 'POST') {
      const ok = await verifyAdminCookie(env, request.headers.get('Cookie'));
      if (!ok) return new Response('Unauthorized', { status: 401 });
      const form = await request.formData();
      const id = form.get('id');
      if (id) {
        const { results } = await env.DB.prepare("SELECT * FROM job_postings WHERE id = ?").bind(id).all();
        const p = results[0];
        if (p) {
          try {
            await env.DB.prepare(
              `INSERT OR IGNORE INTO jobs (title,company,location,url,description,salary,remote_type,skills,seniority,employment_type,job_handle)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)`
            ).bind(p.title, p.company, p.location || 'Remote', p.url, p.description || '', p.salary || '', p.remote_type || 'fully_remote', '[]', '', p.employment_type || 'full_time', '').run();
            await env.DB.prepare("UPDATE job_postings SET status='approved' WHERE id = ?").bind(id).run();
          } catch (e) {}
        }
      }
      return new Response(null, { status: 302, headers: { 'Location': '/admin' } });
    }
    if (url.pathname === '/admin/postings/reject' && request.method === 'POST') {
      const ok = await verifyAdminCookie(env, request.headers.get('Cookie'));
      if (!ok) return new Response('Unauthorized', { status: 401 });
      const form = await request.formData();
      const id = form.get('id');
      if (id) await env.DB.prepare("UPDATE job_postings SET status='rejected' WHERE id = ?").bind(id).run();
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

    if (url.pathname === '/api/post-job' && request.method === 'POST') {
      try {
        const b = await request.json();
        const title = (b.title || '').toString().slice(0, 150);
        const company = (b.company || '').toString().slice(0, 100);
        const email = (b.email || '').toString().slice(0, 150);
        const jobUrl = (b.url || '').toString().slice(0, 400);
        if (!title || !company || !email || !jobUrl) {
          return new Response(JSON.stringify({ success: false, error: "Please fill in all required fields." }), { headers: { "Content-Type": "application/json" } });
        }
        await env.DB.prepare(
          `INSERT INTO job_postings (title,company,email,url,location,category,employment_type,remote_type,salary,description,status)
           VALUES (?,?,?,?,?,?,?,?,?,?,'pending')`
        ).bind(
          title, company, email, jobUrl,
          (b.location || '').toString().slice(0, 100),
          (b.category || '').toString().slice(0, 40),
          (b.employment_type || 'full_time').toString().slice(0, 40),
          (b.remote_type || 'fully_remote').toString().slice(0, 40),
          (b.salary || '').toString().slice(0, 60),
          (b.description || '').toString().slice(0, 4000)
        ).run();
        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
      } catch (e) { return new Response(JSON.stringify({ success: false, error: "Something went wrong. Please try again." }), { status: 500, headers: { "Content-Type": "application/json" } }); }
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
        if (request.method === 'POST') return new Response(null, { status: 302, headers: { 'Location': '/admin' } });
        return new Response(JSON.stringify({ success: true, ...result }), { headers: { "Content-Type": "application/json" } });
      } catch (e) { return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } }); }
    }

    if (url.pathname === '/api/debug') {
      const { results } = await env.DB.prepare("SELECT COUNT(*) as count FROM jobs").all();
      return new Response(JSON.stringify({ jobs_in_db: results[0]?.count || 0 }), { headers: { "Content-Type": "application/json" } });
    }

    if (url.pathname === '/') {
      const html = await renderMainHTML(env, base);
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    return new Response('Not found', { status: 404 });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncJobs(env));
  }
};
