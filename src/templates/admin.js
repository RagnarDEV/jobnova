// src/templates/admin.js
import { TOKENS_CSS, NAV_CSS } from './styles.js';
import { SITE_NAME } from './layout.js';

const ADMIN_CSS = `
.adm-wrap{max-width:1100px;margin:0 auto;padding:28px 20px 60px}
.adm-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;flex-wrap:wrap;gap:12px}
.adm-title{font-size:22px;font-weight:900}
.adm-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:22px;border-bottom:1px solid var(--border)}
.adm-tab{padding:10px 16px;font-size:13px;font-weight:700;color:var(--t3);border-bottom:2px solid transparent;cursor:pointer;background:none;border-top:none;border-left:none;border-right:none;font-family:inherit}
.adm-tab.active{color:var(--accent2);border-bottom-color:var(--accent)}
.adm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:24px}
.adm-card{background:var(--card);border:1px solid var(--border2);border-radius:16px;padding:18px}
.adm-card .num{font-size:26px;font-weight:900;color:var(--t1)}
.adm-card .lbl{font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:1px;margin-top:4px}
.adm-section{background:var(--card);border:1px solid var(--border2);border-radius:16px;padding:20px;margin-bottom:18px}
.adm-section h3{font-size:15px;font-weight:800;margin-bottom:14px}
table.adm-table{width:100%;border-collapse:collapse;font-size:13px}
table.adm-table th{text-align:left;color:var(--t3);font-weight:700;padding:8px 10px;border-bottom:1px solid var(--border);font-size:11px;text-transform:uppercase;letter-spacing:.5px}
table.adm-table td{padding:9px 10px;border-bottom:1px solid var(--border)}
.adm-btn{padding:8px 14px;border-radius:9px;border:1px solid var(--border2);background:var(--card2);color:var(--t2);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit}
.adm-btn.primary{background:linear-gradient(135deg,var(--accent3),var(--accent));color:#fff;border-color:transparent}
.adm-btn.danger{color:var(--red);border-color:rgba(255,107,129,.3)}
.adm-input{background:var(--bg2);border:1px solid var(--border2);border-radius:9px;padding:9px 12px;color:var(--t1);font-size:13px;font-family:inherit;width:100%}
.login-box{max-width:360px;margin:80px auto;background:var(--card);border:1px solid var(--border2);border-radius:18px;padding:30px;box-shadow:var(--shadow)}
`;

export function renderAdminLogin(error) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin Login — ${SITE_NAME}</title><meta name="robots" content="noindex">
<style>${TOKENS_CSS}${ADMIN_CSS}</style></head><body>
<div class="login-box">
  <div style="font-size:19px;font-weight:900;margin-bottom:4px" class="grad-text">${SITE_NAME} Admin</div>
  <div style="font-size:12px;color:var(--t3);margin-bottom:20px">Sign in to manage your job board</div>
  ${error ? `<div style="background:rgba(255,107,129,.1);border:1px solid rgba(255,107,129,.3);color:var(--red);padding:9px 12px;border-radius:9px;font-size:12px;margin-bottom:14px">${error}</div>` : ''}
  <form method="POST" action="/admin/login">
    <input class="adm-input" type="password" name="password" placeholder="Admin password" style="margin-bottom:12px" required autofocus>
    <button class="adm-btn primary" style="width:100%;padding:11px" type="submit">Sign In →</button>
  </form>
</div>
</body></html>`;
}

export function renderAdminDashboard(data) {
  const { stats, jobsByCategory, recentJobs, syncLogs, apiSources } = data;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dashboard — ${SITE_NAME} Admin</title><meta name="robots" content="noindex">
<style>${TOKENS_CSS}${NAV_CSS}${ADMIN_CSS}</style></head><body>
<nav class="nav">
  <a href="/admin" class="nav-logo grad-text">${SITE_NAME} Admin</a>
  <div class="nav-links">
    <a href="/" class="nav-link">View Site</a>
    <form method="POST" action="/admin/logout" style="display:inline"><button class="nav-link" style="background:none;border:none;cursor:pointer;font-family:inherit;font-size:13px">Logout</button></form>
  </div>
</nav>
<div class="adm-wrap">
  <div class="adm-hdr">
    <div class="adm-title">📊 Dashboard</div>
    <form method="POST" action="/api/admin/sync"><button class="adm-btn primary" type="submit">🔄 Run Sync Now</button></form>
  </div>

  <div class="adm-grid">
    <div class="adm-card"><div class="num">${(stats.total || 0).toLocaleString()}</div><div class="lbl">Total Jobs</div></div>
    <div class="adm-card"><div class="num">${(stats.withSalary || 0).toLocaleString()}</div><div class="lbl">With Salary</div></div>
    <div class="adm-card"><div class="num">${(stats.remote || 0).toLocaleString()}</div><div class="lbl">Fully Remote</div></div>
    <div class="adm-card"><div class="num">${(stats.subscribers || 0).toLocaleString()}</div><div class="lbl">Alert Subscribers</div></div>
    <div class="adm-card"><div class="num">${(stats.last24h || 0).toLocaleString()}</div><div class="lbl">New (24h)</div></div>
  </div>

  <div class="adm-section">
    <h3>Jobs by Category</h3>
    <table class="adm-table">
      <tr><th>Category</th><th>Count</th></tr>
      ${jobsByCategory.map(c => `<tr><td>${c.category}</td><td>${c.count.toLocaleString()}</td></tr>`).join('')}
    </table>
  </div>

  <div class="adm-section">
    <h3>Recent Sync Runs</h3>
    <table class="adm-table">
      <tr><th>Source</th><th>Inserted</th><th>Skipped</th><th>Errors</th><th>When</th></tr>
      ${syncLogs.map(l => `<tr><td>${l.source}</td><td>${l.inserted}</td><td>${l.skipped}</td><td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--red)">${(JSON.parse(l.errors || '[]')).join(', ')}</td><td>${new Date(l.ran_at).toLocaleString()}</td></tr>`).join('')}
    </table>
  </div>

  <div class="adm-section">
    <h3>API Sources <span style="font-weight:400;color:var(--t3);font-size:12px">— add more keys anytime, no redeploy needed</span></h3>
    <table class="adm-table">
      <tr><th>Name</th><th>Base URL</th><th>Enabled</th><th></th></tr>
      ${apiSources.map(s => `<tr><td>${s.name}</td><td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.base_url}</td><td>${s.enabled ? '✅' : '⛔'}</td>
      <td><form method="POST" action="/api/admin/sources/delete" style="display:inline"><input type="hidden" name="id" value="${s.id}"><button class="adm-btn danger" type="submit">Delete</button></form></td></tr>`).join('')}
    </table>
    <form method="POST" action="/api/admin/sources/add" style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
      <input class="adm-input" style="flex:1;min-width:120px" name="name" placeholder="Source name" required>
      <input class="adm-input" style="flex:2;min-width:200px" name="base_url" placeholder="https://api.example.com/v1/jobs" required>
      <input class="adm-input" style="flex:1;min-width:120px" name="api_key" placeholder="API key (optional)">
      <input class="adm-input" style="flex:1;min-width:140px" name="query_terms" placeholder='["developer","sales"]'>
      <button class="adm-btn primary" type="submit">+ Add Source</button>
    </form>
  </div>

  <div class="adm-section">
    <h3>Recent Jobs</h3>
    <table class="adm-table">
      <tr><th>Title</th><th>Company</th><th>Location</th><th>Salary</th><th></th></tr>
      ${recentJobs.map(j => `<tr><td>${j.title}</td><td>${j.company}</td><td>${j.location || '—'}</td><td>${j.salary || '—'}</td>
      <td><a href="/job/${j.id}" target="_blank" class="adm-btn">View</a>
      <form method="POST" action="/api/admin/jobs/delete" style="display:inline"><input type="hidden" name="id" value="${j.id}"><button class="adm-btn danger" type="submit">Delete</button></form></td></tr>`).join('')}
    </table>
  </div>
</div>
</body></html>`;
}
