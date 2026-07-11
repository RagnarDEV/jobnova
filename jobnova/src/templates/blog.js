// src/templates/blog.js
import { baseLayout } from './layout.js';
import { adSlot } from './components.js';
import { BLOG_POSTS } from '../data/blog-posts.js';

export function renderBlogIndex(baseUrl) {
  const content = `
<div class="page">
  <div class="breadcrumb"><a href="/">JobNova</a><span>›</span><span>Blog</span></div>
  <h1 style="font-size:27px;font-weight:900;margin-bottom:8px;color:var(--t1)">📝 Career Blog</h1>
  <p style="color:var(--t2);font-size:14px;margin-bottom:24px">Insights and career advice for remote job seekers.</p>
  ${adSlot('blog-index-top', '320x50')}
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-top:20px">
    ${BLOG_POSTS.map(p => `
      <a href="/blog/${p.id}" style="background:var(--card);border:1px solid var(--border2);border-radius:16px;padding:20px;display:block;transition:all .25s;text-decoration:none" onmouseover="this.style.borderColor='var(--accent3)';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--border2)';this.style.transform='none'">
        <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--accent2);margin-bottom:10px">${p.cat}</div>
        <div style="font-size:15px;font-weight:700;margin-bottom:8px;line-height:1.4;color:var(--t1)">${p.title}</div>
        <div style="font-size:13px;color:var(--t3);line-height:1.65;margin-bottom:14px">${p.excerpt}</div>
        <div style="font-size:11px;color:var(--t3);display:flex;gap:12px"><span>📅 ${p.date}</span><span>⏱ ${p.readTime}</span></div>
      </a>`).join('')}
  </div>
</div>`;
  return baseLayout({
    title: 'Career Blog — JobNova', description: 'Career insights for remote job seekers.',
    canonical: `${baseUrl}/blog`, content, baseUrl,
    extraHead: `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "Blog", "name": "JobNova Career Blog", "url": `${baseUrl}/blog` })}</script>`
  });
}

export function renderArticlePage(post, baseUrl) {
  const canonical = `${baseUrl}/blog/${post.id}`;
  const schema = JSON.stringify({ "@context": "https://schema.org", "@type": "Article", "headline": post.title, "description": post.excerpt, "datePublished": post.date, "author": { "@type": "Organization", "name": "JobNova" }, "url": canonical });
  const content = `
<div class="page-sm">
  <a href="/blog" class="back-link">← Back to Blog</a>
  <div class="article-cat">${post.cat}</div>
  <h1 class="article-title">${post.title}</h1>
  <div class="article-meta"><span>📅 ${post.date}</span><span>⏱ ${post.readTime}</span><span>✍️ JobNova Team</span></div>
  <div class="article-body">${post.body}</div>
  ${adSlot('blog-article-bottom', '320x50')}
  <div style="margin-top:28px;display:flex;gap:10px;flex-wrap:wrap">
    <a href="/blog" class="back-link" style="margin-bottom:0">← Back to Blog</a>
    <a href="/" style="display:inline-flex;align-items:center;gap:7px;background:linear-gradient(135deg,var(--accent3),var(--accent));color:#fff;padding:10px 18px;border-radius:11px;font-size:13px;font-weight:700;text-decoration:none">Browse Remote Jobs →</a>
  </div>
</div>`;
  return baseLayout({ title: `${post.title} — JobNova Blog`, description: post.excerpt, canonical, content, baseUrl, extraHead: `<script type="application/ld+json">${schema}</script>` });
}

export function renderStaticPage(page, key, baseUrl) {
  const content = `
<div class="page-sm">
  <a href="/" class="back-link">← Back to Jobs</a>
  <h1 class="static-title">${page.title}</h1>
  <div class="static-date">${page.date}</div>
  <div class="static-body">${page.body}</div>
  <div style="margin-top:32px"><a href="/" class="back-link" style="margin-bottom:0">← Back to Jobs</a></div>
</div>`;
  return baseLayout({ title: `${page.title} — JobNova`, description: page.description, canonical: `${baseUrl}/${key}`, content, baseUrl });
}
