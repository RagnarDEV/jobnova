// src/routes/admin.router.js
// Everything under /admin — cookie-gated dashboard, API-source management,
// job-posting moderation. Data-mutating endpoints (POST) verify the signed
// admin cookie before touching D1.

import { makeAdminCookie, verifyAdminCookie } from '../auth/admin-auth.js';
import { renderAdminLogin, renderAdminDashboard } from '../pages/admin.js';

export async function handleAdminRoute(url, request, env, base) {
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

  return null;
}
