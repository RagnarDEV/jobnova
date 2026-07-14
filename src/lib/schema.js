// src/lib/schema.js
// ════════════════════════════════════════════════════════════════
// JSON-LD structured data builders. Every function returns a plain
// object; callers wrap it in <script type="application/ld+json">.
// Keep these pure (no I/O) so they're trivially testable.
// ════════════════════════════════════════════════════════════════

export function ldJsonTag(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;
}

export function websiteSchema(base) {
  return {
    "@context": "https://schema.org", "@type": "WebSite",
    "name": "JobNova", "url": base,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${base}/search/{search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}

export function organizationSchema(base) {
  return {
    "@context": "https://schema.org", "@type": "Organization",
    "name": "JobNova", "url": base, "logo": `${base}/icon-512.png`
  };
}

export function jobPostingSchema(job, base) {
  const canonical = `${base}/job/${job.id}`;
  return {
    "@context": "https://schema.org", "@type": "JobPosting",
    "title": job.title,
    "description": job.description || `${job.title} at ${job.company}. ${job.location || 'Remote'}.`,
    "hiringOrganization": { "@type": "Organization", "name": job.company },
    "jobLocation": { "@type": "Place", "address": job.location || "Remote" },
    "employmentType": job.employment_type ? job.employment_type.toUpperCase().replace('_', ' ') : "FULL_TIME",
    "datePosted": job.created_at ? new Date(job.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    "validThrough": new Date(Date.now() + 1000 * 60 * 60 * 24 * 45).toISOString().split('T')[0],
    "url": canonical, "directApply": true,
    ...(job.salary ? { "baseSalary": { "@type": "MonetaryAmount", "currency": "USD", "value": { "@type": "QuantitativeValue", "value": job.salary } } } : {})
  };
}

export function articleSchema(post, base) {
  return {
    "@context": "https://schema.org", "@type": "Article",
    "headline": post.title, "description": post.excerpt,
    "datePublished": post.date, "author": { "@type": "Organization", "name": "JobNova" },
    "url": `${base}/blog/${post.id}`
  };
}

export function breadcrumbSchema(trail) {
  // trail: [{name, url}, ...] in order from home -> current
  return {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    "itemListElement": trail.map((t, i) => ({
      "@type": "ListItem", "position": i + 1, "name": t.name, "item": t.url
    }))
  };
}

export function itemListSchema(items) {
  // items: [{url}, ...]
  return {
    "@context": "https://schema.org", "@type": "ItemList",
    "itemListElement": items.map((it, i) => ({ "@type": "ListItem", "position": i + 1, "url": it.url }))
  };
}

export function collectionPageSchema(name, description, url) {
  return {
    "@context": "https://schema.org", "@type": "CollectionPage",
    "name": name, "description": description, "url": url
  };
}

export function faqSchema(qaPairs) {
  // qaPairs: [{question, answer}, ...]
  if (!qaPairs || !qaPairs.length) return null;
  return {
    "@context": "https://schema.org", "@type": "FAQPage",
    "mainEntity": qaPairs.map(qa => ({
      "@type": "Question", "name": qa.question,
      "acceptedAnswer": { "@type": "Answer", "text": qa.answer }
    }))
  };
}
