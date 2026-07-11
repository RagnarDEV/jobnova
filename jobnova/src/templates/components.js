// src/templates/components.js

export function logoImgHtml(company, size = '64px', cls = 'job-logo') {
  const slug = (company || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const domain = slug + '.com';
  const ini = (company || '?').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
  const fs = Math.round(parseInt(size) * .34) + 'px';
  return `<div class="${cls}" style="width:${size};height:${size}">
    <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=64" alt="${company}"
      style="width:100%;height:100%;object-fit:contain;padding:7px"
      onerror="this.onerror=null;this.src='https://icons.duckduckgo.com/ip3/${domain}.ico';this.onerror=function(){this.style.display='none';this.nextElementSibling.style.display='flex'}">
    <span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:${fs};font-weight:800;color:#6C8CFF">${ini}</span>
  </div>`;
}

export function remoteTagHtml(t) {
  if (!t) return '';
  const m = {
    fully_remote: ['tag-remote', '🌐 Remote'],
    hybrid: ['tag-hybrid', '🏢 Hybrid'],
    on_site: ['tag-onsite', '📍 On-site'],
    onsite: ['tag-onsite', '📍 On-site']
  };
  const [cls, lbl] = m[t] || ['tag-onsite', t.replace(/_/g, ' ')];
  return `<span class="tag ${cls}">${lbl}</span>`;
}

// ── AD SLOT helper ─────────────────────────────────────────────
// Usage: adSlot('leaderboard-top') renders a labeled, dashed placeholder.
// TO ADD A REAL AD: replace the empty ad-slot-inner div's content with
// your ad network's <script>/<ins> embed for that specific slot id.
export function adSlot(id, note = '') {
  return `<div class="ad-slot" data-ad-slot="${id}">
    <div class="ad-slot-label">Advertisement${note ? ' · ' + note : ''}</div>
    <div class="ad-slot-inner" id="ad-${id}">
      <!-- AD SLOT: ${id} — place your ad network embed code here -->
    </div>
  </div>`;
}

export function isNew(createdAt) {
  return createdAt && Date.now() - new Date(createdAt).getTime() < 86400000;
}

export function isHot(salary) {
  if (!salary) return false;
  return parseInt(salary.replace(/\D/g, '').slice(0, 3)) >= 150;
}
