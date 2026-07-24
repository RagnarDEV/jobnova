// src/pages/seo-pages.js
// Programmatic SEO directory + detail pages: categories, companies, skills, search.
// All data is derived live from D1 (see src/lib/entities.js) — no hardcoded lists.

import { baseLayout } from '../layout/base-layout.js';
import { logoImgHtml, jobRowMini, directoryGridHtml, catForTitleServer } from '../components/job-card.js';
import { CATEGORY_META, CATEGORY_ORDER } from '../config/constants.js';
import { listCompanies, findCompanyBySlug, jobsByCompany, listSkills, findSkillBySlug, jobsBySkill } from '../lib/entities.js';
import { collectionPageSchema, itemListSchema, ldJsonTag } from '../lib/schema.js';
import { buildBreadcrumb } from '../lib/breadcrumbs.js';
import { truncateDescription } from '../lib/seo.js';

export function renderCategoriesIndex(base) {
  const items = CATEGORY_ORDER.map(k => ({ name: CATEGORY_META[k].label, slug: k, count: '' }));
  const { html: bc, jsonLd: bcSchema } = buildBreadcrumb(base, [{ name: 'Categories', path: '/categories' }]);
  const content = `<div class="page">${bc}
    <h1 style="font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:700;margin-bottom:8px;color:var(--ink)">Browse Jobs by Category</h1>
    <p style="color:var(--ink2);font-size:14px;margin-bottom:24px">Explore remote roles grouped by discipline.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
      ${CATEGORY_ORDER.map(k => `<a href="/categories/${k}" style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px;text-decoration:none;display:flex;align-items:center;gap:10px;transition:all .2s" onmouseover="this.style.borderColor='var(--brand)'" onmouseout="this.style.borderColor='var(--border)'">
        <span style="font-size:22px">${CATEGORY_META[k].emoji}</span><span style="font-size:14px;font-weight:700;color:var(--ink)">${CATEGORY_META[k].label}</span>
      </a>`).join('')}
    </div>
  </div>`;
  const schema = ldJsonTag(collectionPageSchema('Job Categories — JobForion', 'Browse remote jobs by category.', `${base}/categories`));
  return baseLayout('Browse Remote Jobs by Category — JobForion', 'Explore curated remote job listings grouped by discipline: development, design, marketing, data, DevOps, management and writing.', `${base}/categories`, '', content, schema + bcSchema);
}

export async function renderCategoryDetail(env, base, key) {
  const meta = CATEGORY_META[key];
  if (!meta) return null;
  const { results } = await env.DB.prepare("SELECT * FROM jobs WHERE LOWER(title) LIKE ? ORDER BY id DESC LIMIT 60").bind(`%${key}%`).all();
  const { html: bc, jsonLd: bcSchema } = buildBreadcrumb(base, [{ name: 'Categories', path: '/categories' }, { name: meta.label, path: `/categories/${key}` }]);
  const content = `<div class="page">${bc}
    <h1 style="font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:700;margin-bottom:8px;color:var(--ink)">${meta.emoji} ${meta.label} Remote Jobs</h1>
    <p style="color:var(--ink2);font-size:14px;margin-bottom:24px">${(results || []).length} open remote ${meta.label.toLowerCase()} positions, updated hourly.</p>
    <div class="related-grid">${(results || []).map(jobRowMini).join('') || '<div class="empty"><div class="e-icon">📭</div><h3>No jobs in this category yet</h3></div>'}</div>
  </div>`;
  const desc = truncateDescription(`Browse ${(results || []).length} remote ${meta.label.toLowerCase()} jobs updated hourly. Filter by seniority, salary, and location on JobForion.`);
  const schema = ldJsonTag(itemListSchema((results || []).slice(0, 20).map(j => ({ url: `${base}/job/${j.id}` }))));
  return baseLayout(`${meta.label} Remote Jobs — JobForion`, desc, `${base}/categories/${key}`, '', content, schema + bcSchema);
}

// ── /companies ──
export async function renderCompaniesIndex(env, base) {
  const companies = await listCompanies(env, { limit: 200 });
  const { html: bc, jsonLd: bcSchema } = buildBreadcrumb(base, [{ name: 'Companies', path: '/companies' }]);
  const content = `<div class="page">${bc}
    <h1 style="font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:700;margin-bottom:8px;color:var(--ink)">Companies Hiring Remotely</h1>
    <p style="color:var(--ink2);font-size:14px;margin-bottom:24px">${companies.length} companies with active remote listings on JobForion.</p>
    ${directoryGridHtml(companies, '/companies')}
  </div>`;
  const schema = ldJsonTag(collectionPageSchema('Companies Hiring Remotely — JobForion', 'Directory of companies with active remote job listings.', `${base}/companies`));
  return baseLayout('Companies Hiring Remotely — JobForion', `Browse ${companies.length} companies with active remote job openings, updated hourly on JobForion.`, `${base}/companies`, '', content, schema + bcSchema);
}

export async function renderCompanyDetail(env, base, slug) {
  const company = await findCompanyBySlug(env, slug);
  if (!company) return null;
  const jobs = await jobsByCompany(env, company.name, { limit: 60 });
  const { html: bc, jsonLd: bcSchema } = buildBreadcrumb(base, [{ name: 'Companies', path: '/companies' }, { name: company.name, path: `/companies/${slug}` }]);
  const content = `<div class="page">${bc}
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:8px">
      ${logoImgHtml(company.name, '56px', 'job-logo')}
      <h1 style="font-family:'Space Grotesk',sans-serif;font-size:24px;font-weight:700;color:var(--ink)">${company.name}</h1>
    </div>
    <p style="color:var(--ink2);font-size:14px;margin-bottom:24px">${jobs.length} open remote position${jobs.length === 1 ? '' : 's'} at ${company.name}, sourced from verified listings.</p>
    <div class="related-grid">${jobs.map(jobRowMini).join('') || '<div class="empty"><div class="e-icon">📭</div><h3>No open jobs right now</h3></div>'}</div>
  </div>`;
  const desc = truncateDescription(`${company.name} has ${jobs.length} open remote job${jobs.length === 1 ? '' : 's'} on JobForion. Browse roles and apply directly with the employer.`);
  const schema = ldJsonTag({ "@context": "https://schema.org", "@type": "Organization", "name": company.name, "url": `${base}/companies/${slug}` });
  return baseLayout(`Remote Jobs at ${company.name} — JobForion`, desc, `${base}/companies/${slug}`, '', content, schema + bcSchema);
}

// ── /skills ──
export async function renderSkillsIndex(env, base) {
  const skills = await listSkills(env, { limit: 200 });
  const { html: bc, jsonLd: bcSchema } = buildBreadcrumb(base, [{ name: 'Skills', path: '/skills' }]);
  const content = `<div class="page">${bc}
    <h1 style="font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:700;margin-bottom:8px;color:var(--ink)">Browse Remote Jobs by Skill</h1>
    <p style="color:var(--ink2);font-size:14px;margin-bottom:24px">${skills.length} in-demand skills across current listings.</p>
    ${directoryGridHtml(skills, '/skills')}
  </div>`;
  const schema = ldJsonTag(collectionPageSchema('Skills — JobForion', 'Browse remote jobs by required skill.', `${base}/skills`));
  return baseLayout('Browse Remote Jobs by Skill — JobForion', `Explore ${skills.length} in-demand skills across current remote job listings on JobForion.`, `${base}/skills`, '', content, schema + bcSchema);
}

export async function renderSkillDetail(env, base, slug) {
  const skill = await findSkillBySlug(env, slug);
  if (!skill) return null;
  const jobs = await jobsBySkill(env, skill.name, { limit: 60 });
  const { html: bc, jsonLd: bcSchema } = buildBreadcrumb(base, [{ name: 'Skills', path: '/skills' }, { name: skill.name, path: `/skills/${slug}` }]);
  const content = `<div class="page">${bc}
    <h1 style="font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:700;margin-bottom:8px;color:var(--ink)">Remote Jobs Requiring ${skill.name}</h1>
    <p style="color:var(--ink2);font-size:14px;margin-bottom:24px">${jobs.length} open remote positions listing ${skill.name} as a required skill.</p>
    <div class="related-grid">${jobs.map(jobRowMini).join('') || '<div class="empty"><div class="e-icon">📭</div><h3>No jobs currently require this skill</h3></div>'}</div>
  </div>`;
  const desc = truncateDescription(`Browse ${jobs.length} remote jobs requiring ${skill.name}. Updated hourly on JobForion.`);
  const schema = ldJsonTag(itemListSchema(jobs.slice(0, 20).map(j => ({ url: `${base}/job/${j.id}` }))));
  return baseLayout(`Remote ${skill.name} Jobs — JobForion`, desc, `${base}/skills/${slug}`, '', content, schema + bcSchema);
}

// ── /search/:query — indexable only when it returns real content ──
export async function renderSearchPage(env, base, query) {
  const q = decodeURIComponent(query || '').trim();
  const { results } = await env.DB.prepare(
    "SELECT * FROM jobs WHERE LOWER(title) LIKE ? OR LOWER(company) LIKE ? OR LOWER(location) LIKE ? ORDER BY id DESC LIMIT 50"
  ).bind(`%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`).all();
  const hasResults = (results || []).length > 0;
  const { html: bc, jsonLd: bcSchema } = buildBreadcrumb(base, [{ name: `Search: ${q}`, path: `/search/${query}` }]);
  const content = `<div class="page">${bc}
    <h1 style="font-family:'Space Grotesk',sans-serif;font-size:24px;font-weight:700;margin-bottom:8px;color:var(--ink)">Remote "${q}" Jobs</h1>
    <p style="color:var(--ink2);font-size:14px;margin-bottom:24px">${(results || []).length} results for "${q}"</p>
    <div class="related-grid">${(results || []).map(jobRowMini).join('') || `<div class="empty"><div class="e-icon">🔍</div><h3>No matches for "${q}"</h3><p>Try browsing <a href="/categories" style="color:var(--brand)">categories</a> instead.</p></div>`}</div>
  </div>`;
  const desc = hasResults
    ? truncateDescription(`${results.length} remote "${q}" jobs available now. Browse and apply directly on JobForion.`)
    : `No current openings match "${q}" — browse all remote job categories on JobForion.`;
  const schema = hasResults ? ldJsonTag(itemListSchema(results.slice(0, 20).map(j => ({ url: `${base}/job/${j.id}` })))) : '';
  // thin/empty search pages are noindexed to avoid low-quality-page SEO penalties
  const robots = hasResults ? 'index, follow' : 'noindex, follow';
  return baseLayout(`Remote "${q}" Jobs — JobForion`, desc, `${base}/search/${encodeURIComponent(q)}`, '', content, schema + bcSchema, robots);
}

