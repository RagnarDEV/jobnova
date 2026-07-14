// src/routes/pages.router.js
// Core content pages: single job, blog index/article, static legal pages,
// and the homepage SPA shell.

import { renderJobPage } from '../pages/job-page.js';
import { renderBlogIndex, renderArticlePage } from '../pages/blog.js';
import { renderStaticPage } from '../pages/static-pages.js';
import { renderMainHTML } from '../pages/home.js';
import { BLOG_POSTS } from '../data/blog-posts.js';
import { getActiveApiKeys } from '../db/sync.js';

export async function handlePagesRoute(url, request, env, base) {
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

  if (url.pathname === '/') {
    const html = await renderMainHTML(env, base);
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  return null;
}
