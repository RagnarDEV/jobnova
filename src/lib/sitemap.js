// src/lib/sitemap.js
import { listCompanies, listSkills } from './entities.js';

/**
 * Escapes special XML characters in a string.
 */
function xmlEscape(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// `blogPosts` / `categoryOrder` are passed in from index.js since they're
// still defined as in-code constants there (static content stays static).
export async function buildSitemapXml(env, base, { blogPosts = [], categoryOrder = [] } = {}) {
  const urls = [];
  const add = (loc, opts = {}) => {
    // Ensure the location is properly escaped just in case
    const escapedLoc = xmlEscape(loc);
    urls.push(
      `<url><loc>${escapedLoc}</loc>${opts.changefreq ? `<changefreq>${opts.changefreq}</changefreq>` : ''}${opts.priority ? `<priority>${opts.priority}</priority>` : ''}${opts.lastmod ? `<lastmod>${opts.lastmod}</lastmod>` : ''}</url>`
    );
  };

  // core pages
  add(`${base}/`, { changefreq: 'hourly', priority: '1.0' });
  add(`${base}/blog`, { changefreq: 'weekly', priority: '0.8' });
  add(`${base}/privacy`, { changefreq: 'yearly', priority: '0.3' });
  add(`${base}/terms`, { changefreq: 'yearly', priority: '0.3' });
  add(`${base}/disclaimer`, { changefreq: 'yearly', priority: '0.3' });

  // directory index pages
  add(`${base}/companies`, { changefreq: 'daily', priority: '0.7' });
  add(`${base}/categories`, { changefreq: 'daily', priority: '0.7' });
  add(`${base}/skills`, { changefreq: 'daily', priority: '0.6' });

  // blog
  for (const p of blogPosts) add(`${base}/blog/${p.id}`, { changefreq: 'monthly', priority: '0.7' });

  // categories (static list, cheap)
  for (const key of categoryOrder) add(`${base}/categories/${key}`, { changefreq: 'daily', priority: '0.65' });

  // jobs (bounded to most recent 1000 to keep the sitemap fast/small —
  // additional jobs are still reachable via the paginated /companies,
  // /categories etc. pages, satisfying crawl-discoverability)
  try {
    const { results } = await env.DB.prepare("SELECT id,created_at FROM jobs ORDER BY id DESC LIMIT 1000").all();
    for (const j of results || []) {
      add(`${base}/job/${j.id}`, { changefreq: 'weekly', priority: '0.6', lastmod: new Date(j.created_at || Date.now()).toISOString().split('T')[0] });
    }
  } catch (e) {}

  // companies / skills (bounded — same rationale as jobs above)
  try {
    const companies = await listCompanies(env, { limit: 500 });
    for (const c of companies) add(`${base}/companies/${c.slug}`, { changefreq: 'weekly', priority: '0.55' });
  } catch (e) {}
  try {
    const skills = await listSkills(env, { limit: 300 });
    for (const s of skills) add(`${base}/skills/${s.slug}`, { changefreq: 'weekly', priority: '0.5' });
  } catch (e) {}

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`.trim();
}
