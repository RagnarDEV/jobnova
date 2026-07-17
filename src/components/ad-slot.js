// src/components/ad-slot.js
// Single source of truth for every advertisement placement on JobNova.
// Every page imports adSlot(id) and drops it wherever an ad belongs — the
// actual ad network embed code (Adsterra or any future network) is edited
// in ONE place, the ADS map below, instead of hunting through five
// different page files every time it changes.
//
// To activate a real ad: paste the network's exact embed code (script
// tags, etc.) as the value for that slot's id in ADS. Leave it as '' to
// keep showing the reserved placeholder box instead — nothing breaks
// either way, so slots can be turned on one at a time.
//
// Current slots in use (see each page for exact position):
//   'homepage-results-top'   — src/pages/home.js, above the job list
//   'job-detail-inline'      — src/pages/job-page.js, after the description (reserved 320×50)
//   'job-detail-footer'      — src/pages/job-page.js, after "Similar Jobs"
//   'blog-index-top'         — src/pages/blog.js, above the article grid
//   'blog-article-footer'    — src/pages/blog.js, after each article body

const ADS = {
  'homepage-results-top': '',
  'job-detail-inline': '',
  'job-detail-footer': '',
  'blog-index-top': '',
  'blog-article-footer': '',
};

export function adSlot(id, style = '') {
  const styleAttr = style ? ` style="${style}"` : '';
  const code = ADS[id];
  if (code) {
    return `<div class="ad-slot ad-slot-live"${styleAttr}>${code}</div>`;
  }
  return `<div class="ad-slot"${styleAttr}><div class="ad-slot-label">Advertisement Slot</div><div class="ad-slot-hint">Reserved space — insert your ad network snippet here</div><!-- AD SLOT: ${id} --></div>`;
}
