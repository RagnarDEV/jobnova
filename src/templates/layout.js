// src/templates/layout.js
import { TOKENS_CSS, NAV_CSS, AD_CSS, PAGE_CSS } from './styles.js';

export const SITE_NAME = 'JobNova';

export function baseLayout({ title, description, canonical, ogImage = '', content, extraHead = '', baseUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="google-site-verification" content="7Q0EJk3kQKNLNzIhyzH4k5CsuHsQEa-U0Pwp_w_b0n0"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="${description}">
<meta name="robots" content="index, follow">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
${ogImage ? `<meta property="og:image" content="${ogImage}">` : ''}
<link rel="canonical" href="${canonical}">
<link rel="alternate" type="application/rss+xml" title="${SITE_NAME} Jobs Feed" href="${baseUrl}/feed.rss">
${extraHead}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
${TOKENS_CSS}${NAV_CSS}${AD_CSS}${PAGE_CSS}
</style>
</head>
<body>
<nav class="nav">
  <a href="/" class="nav-logo grad-text">${SITE_NAME}</a>
  <div class="nav-links">
    <a href="/" class="nav-link">Jobs</a>
    <a href="/blog" class="nav-link">Blog</a>
    <a href="/privacy" class="nav-link">Privacy</a>
    <a href="/" class="nav-cta">Browse Jobs →</a>
  </div>
</nav>
${content}
<footer class="footer">
  <div class="footer-inner">
    <span class="footer-logo grad-text">${SITE_NAME}</span>
    <div class="footer-links">
      <a href="/" class="footer-link">Home</a>
      <a href="/blog" class="footer-link">Blog</a>
      <a href="/privacy" class="footer-link">Privacy</a>
      <a href="/terms" class="footer-link">Terms</a>
      <a href="/disclaimer" class="footer-link">Disclaimer</a>
      <a href="/feed.rss" class="footer-link">RSS</a>
    </div>
    <div class="footer-copy">© ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.</div>
  </div>
</footer>
</body>
</html>`;
}
