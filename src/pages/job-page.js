// src/pages/job-page.js

import { logoImgHtml, remoteTagHtml, catForTitleServer } from '../components/job-card.js';
import { CATEGORY_META } from '../config/constants.js';
import { baseLayout } from '../layout/base-layout.js';
import { slugify } from '../lib/entities.js';
import { adSlot } from '../components/ad-slot.js';

export function renderJobPage(job, related, base) {
  let skills = [];
  try { skills = JSON.parse(job.skills || '[]'); } catch (e) {}
  const isNew = job.created_at && Date.now() - new Date(job.created_at).getTime() < 86400000;
  const isHot = job.salary && parseInt(job.salary.replace(/\D/g, '').slice(0, 3)) >= 150;
  const canonical = `${base}/job/${job.id}`;
  const desc = job.description && job.description.length > 20
    ? job.description.slice(0, 160).replace(/\n/g, ' ') + '...'
    : `${job.title} at ${job.company}. ${job.location || 'Remote'}${job.salary ? ' — ' + job.salary : ''}. Apply on JobNova.`;
  const schema = JSON.stringify({
    "@context": "https://schema.org", "@type": "JobPosting",
    "title": job.title, "description": job.description || desc,
    "hiringOrganization": { "@type": "Organization", "name": job.company },
    "jobLocation": { "@type": "Place", "address": job.location || "Remote" },
    "employmentType": job.employment_type ? job.employment_type.toUpperCase().replace('_', ' ') : "FULL_TIME",
    "datePosted": job.created_at ? new Date(job.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    "validThrough": new Date(Date.now() + 1000 * 60 * 60 * 24 * 45).toISOString().split('T')[0],
    "url": canonical, "directApply": true,
    ...(job.salary ? { "baseSalary": { "@type": "MonetaryAmount", "currency": "USD", "value": { "@type": "QuantitativeValue", "value": job.salary } } } : {})
  });
  const breadcrumbSchema = JSON.stringify({
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "JobNova", "item": base },
      { "@type": "ListItem", "position": 2, "name": "Jobs", "item": base + "/" },
      { "@type": "ListItem", "position": 3, "name": job.title, "item": canonical }
    ]
  });
  const content = `
<div class="page">
  <div class="breadcrumb"><a href="/">JobNova</a><span>›</span><a href="/">Jobs</a><span>›</span><span>${job.title}</span></div>
  <div class="job-hero">
    <div class="job-hero-hdr">
      <div class="job-co-row">
        ${logoImgHtml(job.company, '64px', 'job-logo')}
        <div><div class="job-co-name"><a href="/companies/${slugify(job.company)}" style="color:inherit">${job.company}</a> <span class="verified-ico" title="Verified listing">✅</span></div><div class="job-co-loc">📍 ${job.location || 'Remote'}</div></div>
      </div>
      <h1 class="job-title-h1">${job.title}</h1>
      <div class="job-chips">
        ${remoteTagHtml(job.remote_type)}
        <a href="/categories/${catForTitleServer(job.title)}" class="tag tag-type" style="text-decoration:none">${CATEGORY_META[catForTitleServer(job.title)].emoji} ${CATEGORY_META[catForTitleServer(job.title)].label}</a>
        ${job.employment_type ? `<span class="tag tag-type">${job.employment_type.replace(/_/g, ' ')}</span>` : ''}
        ${job.seniority ? `<span class="tag tag-type">${job.seniority}</span>` : ''}
        ${isNew ? '<span class="tag tag-new">✦ NEW</span>' : ''}
        ${isHot ? '<span class="tag tag-hot">🔥 HOT</span>' : ''}
      </div>
      ${job.salary ? `<div class="job-salary-lg">💰 ${job.salary}</div>` : ''}
    </div>
    <div class="job-body">
      ${skills.length ? `<div class="sec-label">Required Skills</div><div class="skills-wrap">${skills.map(s => `<a href="/skills/${slugify(s)}" class="skill-tag" style="text-decoration:none">${s}</a>`).join('')}</div>` : ''}
      <div class="sec-label">About the Role</div>
      <div class="desc-wrap">${job.description && job.description.length > 20 ? job.description : 'Full description available on the company website.'}</div>
      ${adSlot('job-detail-inline')}
      <a href="${job.url}" target="_blank" rel="noopener noreferrer" class="apply-big">Apply Now →</a>
    </div>
  </div>
  ${related.length ? `
    <div class="related-title" style="margin-top:24px">Similar Jobs</div>
    <div class="related-grid">
      ${related.map(r => `
        <a href="/job/${r.id}" class="related-card">
          ${logoImgHtml(r.company, '38px', 'related-logo')}
          <div class="related-info"><div class="related-jt">${r.title}</div><div class="related-co"><a href="/companies/${slugify(r.company)}" style="color:inherit">${r.company}</a></div></div>
          ${r.salary ? `<div class="related-sal">${r.salary}</div>` : ''}
          <span style="color:var(--ink3)">›</span>
        </a>`).join('')}
    </div>` : ''}
  ${adSlot('job-detail-footer', 'margin-top:24px')}
</div>`;
  return baseLayout(`${job.title} at ${job.company} — JobNova`, desc, canonical, '', content, `<script type="application/ld+json">${schema}</script><script type="application/ld+json">${breadcrumbSchema}</script>`);
}
