// src/routes/feed.js
import { BLOG_POSTS } from '../data/blog-posts.js';

export async function handleSitemap(env, baseUrl) {
  const { results } = await env.DB.prepare("SELECT id,created_at FROM jobs ORDER BY id DESC LIMIT 1000").all();
  const urls = [
    `<url><loc>${baseUrl}/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>`,
    `<url><loc>${baseUrl}/blog</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
    `<url><loc>${baseUrl}/privacy</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>`,
    `<url><loc>${baseUrl}/terms</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>`,
    `<url><loc>${baseUrl}/disclaimer</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>`,
    ...BLOG_POSTS.map(p => `<url><loc>${baseUrl}/blog/${p.id}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`),
    ...results.map(j => `<url><loc>${baseUrl}/job/${j.id}</loc><changefreq>weekly</changefreq><priority>0.6</priority><lastmod>${new Date(j.created_at || Date.now()).toISOString().split('T')[0]}</lastmod></url>`)
  ].join('');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } }
  );
}

export async function handleRss(env, baseUrl) {
  const { results } = await env.DB.prepare("SELECT * FROM jobs ORDER BY id DESC LIMIT 50").all();
  const items = results.map(j => `<item>
    <title><![CDATA[${j.title} at ${j.company}]]></title>
    <link>${baseUrl}/job/${j.id}</link>
    <guid>${baseUrl}/job/${j.id}</guid>
    <description><![CDATA[${j.company} — ${j.location || 'Remote'}${j.salary ? ' — ' + j.salary : ''}]]></description>
    <pubDate>${new Date(j.created_at || Date.now()).toUTCString()}</pubDate>
  </item>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel><title>JobNova — Remote Jobs</title><link>${baseUrl}</link>
<description>Latest remote job listings from JobNova</description>
<atom:link href="${baseUrl}/feed.rss" rel="self" type="application/rss+xml"/>
${items}</channel></rss>`, { headers: { "Content-Type": "application/rss+xml" } });
}
