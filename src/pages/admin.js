// src/pages/admin.js
// Admin dashboard: KPIs, visitor analytics, sync history, API sources, pending
// job-posting moderation. barChart() is a small internal helper (not exported).

import { ICON_HEAD } from '../assets/favicon.js';
import { SHARED_CSS } from '../styles/shared-css.js';
import { CATEGORY_META, CATEGORY_ORDER } from '../config/constants.js';
import { ensureTable } from '../db/schema.js';

export function renderAdminLogin(error) {
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

export async function renderAdminDashboard(env, base) {
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
