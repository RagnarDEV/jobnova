// src/routes/feed.router.js
// sitemap.xml (built from live D1 data via src/lib/sitemap.js) + feed.rss
// (jobs + blog articles combined).

import { buildSitemapXml } from '../lib/sitemap.js';
import { BLOG_POSTS } from '../data/blog-posts.js';
import { CATEGORY_ORDER } from '../config/constants.js';

export async function handleFeedRoute(url, env, base) {
  if (url.pathname === '/sitemap.xml') {
    let xml = await buildSitemapXml(env, base, { blogPosts: BLOG_POSTS, categoryOrder: CATEGORY_ORDER });
    // Defensive: some SEO validators reject the XML declaration unless it
    // is the literal first character of the response body. A stray BOM or
    // whitespace character (easy to pick up invisibly through copy/paste
    // across many edits) breaks that even when the source looks clean —
    // strip it here so the served bytes are guaranteed correct regardless.
    xml = xml.replace(/^\uFEFF/, '').trim();
    return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  }

  if (url.pathname === '/feed.rss') {
    const { results } = await env.DB.prepare("SELECT * FROM jobs ORDER BY id DESC LIMIT 50").all();
    const jobItems = results.map(j => `<item>
        <title><![CDATA[${j.title} at ${j.company}]]></title>
        <link>${base}/job/${j.id}</link>
        <guid>${base}/job/${j.id}</guid>
        <description><![CDATA[${j.company} — ${j.location || 'Remote'}${j.salary ? ' — ' + j.salary : ''}]]></description>
        <pubDate>${new Date(j.created_at || Date.now()).toUTCString()}</pubDate>
        <category>Job</category>
      </item>`).join('');
    const articleItems = BLOG_POSTS.map(p => `<item>
        <title><![CDATA[${p.title}]]></title>
        <link>${base}/blog/${p.id}</link>
        <guid>${base}/blog/${p.id}</guid>
        <description><![CDATA[${p.excerpt}]]></description>
        <pubDate>${new Date(p.date).toUTCString()}</pubDate>
        <category>Article</category>
      </item>`).join('');
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel><title>JobNova — Remote Jobs &amp; Career Advice</title><link>${base}</link>
<description>Latest remote job listings and career articles from JobNova</description>
<atom:link href="${base}/feed.rss" rel="self" type="application/rss+xml"/>
${jobItems}${articleItems}</channel></rss>`, { headers: { "Content-Type": "application/rss+xml" } });
  }

  return null;
}
