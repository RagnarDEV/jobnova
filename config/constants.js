// src/config/constants.js
// Site-wide constants: category taxonomy, featured companies, canonical base URL.

export const CATEGORY_META = {
  developer: { label: 'Development',  emoji: '💻', color: '#3556FF' },
  designer:  { label: 'Design',       emoji: '🎨', color: '#D6489B' },
  marketing: { label: 'Marketing',    emoji: '📣', color: '#F5A623' },
  data:      { label: 'Data & AI',    emoji: '📊', color: '#0EA5C4' },
  devops:    { label: 'DevOps',       emoji: '⚙️', color: '#0FAE79' },
  manager:   { label: 'Management',   emoji: '👔', color: '#FF5C7A' },
  writer:    { label: 'Writing',      emoji: '✍️', color: '#7C3AED' },
};
export const CATEGORY_ORDER = Object.keys(CATEGORY_META);
export const FEATURED_COMPANIES = ["Shopify", "GitLab", "Automattic", "Zapier", "Notion", "Stripe", "Doist", "Buffer"];

export const BASE_URL = 'https://jobnova.manasa.workers.dev';

