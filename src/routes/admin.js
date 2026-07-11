// src/routes/admin.js
import { isAuthed, makeSessionToken, loginCookie, logoutCookie } from '../lib/auth.js';
import { renderAdminLogin, renderAdminDashboard } from '../templates/admin.js';
import { syncJobs } from '../lib/sync.js';

async function gatherDashboardData(env) {
  const total = (await env.DB.prepare("SELECT COUNT(*) as c FROM jobs").first())?.c || 0;
  const withSalary = (await env.DB.prepare("SELECT COUNT(*) as c FROM jobs WHERE salary != '' AND salary IS NOT NULL").first())?.c || 0;
  const remote = (await env.DB.prepare("SELECT COUNT(*) as c FROM jobs WHERE remote_type = 'fully_remote'").first())?.c || 0;
  const subscribers = (await env.DB.prepare("SELECT COUNT(*) as c FROM subscribers").first())?.c || 0;
  const last24h = (await env.DB.prepare("SELECT COUNT(*) as c FROM jobs WHERE created_at >= datetime('now','-1 day')").first())?.c || 0;

  const categories = ["developer", "designer", "marketing", "data", "devops", "writer", "manager"];
  const jobsByCategory = [];
  for (const c of categories) {
    const r = await env.DB.prepare("SELECT COUNT(*) as c FROM jobs WHERE LOWER(title) LIKE ?").bind(`%${c}%`).first();
    jobsByCategory.push({ category: c, count: r?.c || 0 });
  }

  const { results: recentJobs } = await env.DB.prepare("SELECT id,title,company,location,salary FROM jobs ORDER BY id DESC LIMIT 15").all();
  const { results: syncLogs } = await env.DB.prepare("SELECT * FROM sync_logs ORDER BY id DESC LIMIT 10").all();
  const { results: apiSources } = await env.DB.prepare("SELECT * FROM api_sources ORDER BY id DESC").all();

  return {
    stats: { total, withSalary, remote, subscribers, last24h },
    jobsByCategory, recentJobs, syncLogs, apiSources
  };
}

export async function handleAdminRoute(request, url, env) {
  const path = url.pathname;

  if (path === '/admin/login' && request.method === 'POST') {
    const form = await request.formData();
    const password = form.get('password') || '';
    if (env.ADMIN_PASSWORD && password === env.ADMIN_PASSWORD) {
      const token = await makeSessionToken(env);
      return new Response(null, { status: 302, headers: { Location: '/admin', 'Set-Cookie': loginCookie(token) } });
    }
    return new Response(renderAdminLogin('Incorrect password.'), { status: 401, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  if (path === '/admin/logout' && request.method === 'POST') {
    return new Response(null, { status: 302, headers: { Location: '/admin', 'Set-Cookie': logoutCookie() } });
  }

  if (!(await isAuthed(request, env))) {
    if (!env.ADMIN_PASSWORD) {
      return new Response(renderAdminLogin('Admin is not configured yet. Set the ADMIN_PASSWORD secret: wrangler secret put ADMIN_PASSWORD'), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    return new Response(renderAdminLogin(''), { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  if (path === '/admin') {
    const data = await gatherDashboardData(env);
    return new Response(renderAdminDashboard(data), { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  if (path === '/api/admin/sync' && request.method === 'POST') {
    const result = await syncJobs(env);
    return new Response(null, { status: 302, headers: { Location: '/admin' } });
  }

  if (path === '/api/admin/sources/add' && request.method === 'POST') {
    const form = await request.formData();
    await env.DB.prepare(
      "INSERT INTO api_sources (name, base_url, api_key, query_terms, enabled) VALUES (?,?,?,?,1)"
    ).bind(
      form.get('name') || 'Untitled',
      form.get('base_url') || '',
      form.get('api_key') || '',
      form.get('query_terms') || '[]'
    ).run();
    return new Response(null, { status: 302, headers: { Location: '/admin' } });
  }

  if (path === '/api/admin/sources/delete' && request.method === 'POST') {
    const form = await request.formData();
    await env.DB.prepare("DELETE FROM api_sources WHERE id = ?").bind(form.get('id')).run();
    return new Response(null, { status: 302, headers: { Location: '/admin' } });
  }

  if (path === '/api/admin/jobs/delete' && request.method === 'POST') {
    const form = await request.formData();
    await env.DB.prepare("DELETE FROM jobs WHERE id = ?").bind(form.get('id')).run();
    return new Response(null, { status: 302, headers: { Location: '/admin' } });
  }

  return null; // not an admin route
}
