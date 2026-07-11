// src/index.js
// Main entry point. Wrangler bundles all the imported ES modules below
// into a single deployable Worker automatically — no extra build step
// needed in your GitHub Actions workflow.

import { ensureTables } from './lib/db.js';
import { syncJobs } from './lib/sync.js';
import { renderHome } from './templates/home.js';
import { renderJobPage } from './templates/job-page.js';
import { renderBlogIndex, renderArticlePage, renderStaticPage } from './templates/blog.js';
import { BLOG_POSTS } from './data/blog-posts.js';
import { STATIC_PAGES } from './data/static-content.js';
import { handleJobsApi, handleSubscribe, handleDebug } from './routes/jobs-api.js';
import { handleSitemap, handleRss } from './routes/feed.js';
import { handleAdminRoute } from './routes/admin.js';
import { handleAssets } from './routes/assets.js';

const HTML = { "Content-Type": "text/html; charset=utf-8" };
const JSON_H = { "Content-Type": "application/json" };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const base = `${url.protocol}//${url.host}`;

    await ensureTables(env);

    // ── Static assets ──
    const asset = handleAssets(path);
    if (asset) return asset;

    // ── Admin (dashboard + auth + management APIs) ──
    if (path === '/admin' || path.startsWith('/admin/') || path.startsWith('/api/admin/')) {
      const adminResp = await handleAdminRoute(request, url, env);
      if (adminResp) return adminResp;
    }

    // ── SEO feeds ──
    if (path === '/sitemap.xml') return handleSitemap(env, base);
    if (path === '/feed.rss') return handleRss(env, base);

    // ── Single job page ──
    const jobMatch = path.match(/^\/job\/(\d+)$/);
    if (jobMatch) {
      const job = await env.DB.prepare("SELECT * FROM jobs WHERE id = ?").bind(jobMatch[1]).first();
      if (!job) return new Response('Job not found', { status: 404 });
      let fullJob = job;
      if ((!job.description || job.description.length < 20) && job.job_handle && env.API_KEY) {
        try {
          const r = await fetch(`https://api.jobdatalake.com/v1/jobs/${job.job_handle}`, { headers: { "X-API-Key": env.API_KEY } });
          if (r.ok) {
            const d = await r.json();
            const desc = d.description || d.summary || "";
            if (desc && desc.length > 20) {
              await env.DB.prepare("UPDATE jobs SET description = ? WHERE id = ?").bind(desc, job.id).run();
              fullJob = { ...job, description: desc };
            }
          }
        } catch (e) { /* non-fatal */ }
      }
      const { results: related } = await env.DB.prepare(
        "SELECT id,title,company,salary,remote_type FROM jobs WHERE id != ? ORDER BY RANDOM() LIMIT 4"
      ).bind(jobMatch[1]).all();
      return new Response(renderJobPage(fullJob, related, base), { headers: HTML });
    }

    // ── Blog ──
    if (path === '/blog') return new Response(renderBlogIndex(base), { headers: HTML });
    const blogMatch = path.match(/^\/blog\/(\d+)$/);
    if (blogMatch) {
      const post = BLOG_POSTS.find(p => p.id === parseInt(blogMatch[1]));
      if (!post) return new Response('Not found', { status: 404 });
      return new Response(renderArticlePage(post, base), { headers: HTML });
    }

    // ── Static legal pages ──
    if (STATIC_PAGES[path.slice(1)]) {
      const key = path.slice(1);
      return new Response(renderStaticPage(STATIC_PAGES[key], key, base), { headers: HTML });
    }

    // ── JSON APIs ──
    if (path === '/api/jobs') return handleJobsApi(url, env);
    if (path === '/api/subscribe' && request.method === 'POST') return handleSubscribe(request, env);
    if (path === '/api/debug') return handleDebug(env);

    if (path === '/api/sync') {
      try {
        const result = await syncJobs(env);
        return new Response(JSON.stringify({ success: true, ...result }), { headers: JSON_H });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: JSON_H });
      }
    }

    // NOTE: the old destructive `/api/migrate` (DROP TABLE) has been
    // permanently removed to protect existing job data. Schema changes
    // now live in src/lib/db.js and are purely additive.

    // ── Home / job board SPA ──
    return new Response(renderHome(base), { headers: HTML });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncJobs(env));
  }
};
