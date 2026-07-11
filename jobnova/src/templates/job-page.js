// src/templates/job-page.js
import { baseLayout } from './layout.js';
import { logoImgHtml, remoteTagHtml, isNew, isHot, adSlot } from './components.js';

export function renderJobPage(job, related, baseUrl) {
  let skills = [];
  try { skills = JSON.parse(job.skills || '[]'); } catch (e) {}
  const nw = isNew(job.created_at);
  const hot = isHot(job.salary);
  const canonical = `${baseUrl}/job/${job.id}`;
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
    "url": canonical, "directApply": true,
    ...(job.salary ? { "baseSalary": { "@type": "MonetaryAmount", "currency": "USD", "value": { "@type": "QuantitativeValue", "value": job.salary } } } : {})
  });

  const content = `
<div class="page">
  <div class="breadcrumb"><a href="/">JobNova</a><span>›</span><a href="/">Jobs</a><span>›</span><span>${job.title}</span></div>
  <div class="job-hero">
    <div class="job-hero-hdr">
      <div class="job-co-row">
        ${logoImgHtml(job.company, '64px', 'job-logo')}
        <div><div class="job-co-name">${job.company}</div><div class="job-co-loc">📍 ${job.location || 'Remote'}</div></div>
      </div>
      <h1 class="job-title-h1">${job.title}</h1>
      <div class="job-chips">
        ${remoteTagHtml(job.remote_type)}
        ${job.employment_type ? `<span class="tag tag-type">${job.employment_type.replace(/_/g, ' ')}</span>` : ''}
        ${job.seniority ? `<span class="tag tag-type">${job.seniority}</span>` : ''}
        ${nw ? '<span class="tag tag-new">✦ NEW</span>' : ''}
        ${hot ? '<span class="tag tag-hot">🔥 HOT</span>' : ''}
      </div>
      ${job.salary ? `<div class="job-salary-lg">💰 ${job.salary}</div>` : ''}
    </div>
    <div class="job-body">
      ${skills.length ? `<div class="sec-label">Required Skills</div><div class="skills-wrap">${skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}</div>` : ''}
      <div class="sec-label">About the Role</div>
      <div class="desc-wrap">${job.description && job.description.length > 20 ? job.description : 'Full description available on the company website.'}</div>
      ${adSlot('job-page-mid', '320x50')}
      <a href="${job.url}" target="_blank" rel="noopener noreferrer" class="apply-big">Apply Now →</a>
    </div>
  </div>
  ${related.length ? `
    <div class="related-title" style="margin-top:24px">Similar Jobs</div>
    <div class="related-grid">
      ${related.map(r => `
        <a href="/job/${r.id}" class="related-card">
          ${logoImgHtml(r.company, '38px', 'related-logo')}
          <div class="related-info"><div class="related-jt">${r.title}</div><div class="related-co">${r.company}</div></div>
          ${r.salary ? `<div class="related-sal">${r.salary}</div>` : ''}
          <span style="color:var(--t3)">›</span>
        </a>`).join('')}
    </div>` : ''}
  ${adSlot('job-page-bottom', 'responsive')}
</div>`;

  return baseLayout({
    title: `${job.title} at ${job.company} — JobNova`,
    description: desc,
    canonical, content, baseUrl,
    extraHead: `<script type="application/ld+json">${schema}</script>`
  });
}
