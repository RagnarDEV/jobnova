// src/routes/assets.router.js
// Self-hosted brand assets — favicons, web manifest, robots.txt.
// No D1 access, no auth, purely static/derived responses.

import { FAVICON_SVG, FAVICON_ICO_B64, FAVICON_32_B64, FAVICON_16_B64, APPLE_TOUCH_B64, ICON512_B64, b64ToBytes } from '../assets/favicon.js';
import { manifestJson } from '../assets/manifest.js';

export const ASSET_PATHS = ['/favicon.svg', '/favicon.ico', '/favicon-32.png', '/favicon-16.png', '/apple-touch-icon.png', '/icon-512.png', '/manifest.json', '/robots.txt'];

// Returns a Response if this router owns the path, otherwise null (caller tries the next router).
export function handleAssetsRoute(url, base) {
  if (url.pathname === '/favicon.svg') {
    return new Response(FAVICON_SVG, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=604800" } });
  }
  if (url.pathname === '/favicon.ico') {
    return new Response(b64ToBytes(FAVICON_ICO_B64), { headers: { "Content-Type": "image/x-icon", "Cache-Control": "public, max-age=604800" } });
  }
  if (url.pathname === '/favicon-32.png') {
    return new Response(b64ToBytes(FAVICON_32_B64), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=604800" } });
  }
  if (url.pathname === '/favicon-16.png') {
    return new Response(b64ToBytes(FAVICON_16_B64), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=604800" } });
  }
  if (url.pathname === '/apple-touch-icon.png') {
    return new Response(b64ToBytes(APPLE_TOUCH_B64), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=604800" } });
  }
  if (url.pathname === '/icon-512.png') {
    return new Response(b64ToBytes(ICON512_B64), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=604800" } });
  }
  if (url.pathname === '/manifest.json') {
    return new Response(manifestJson(base), { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=86400" } });
  }
  if (url.pathname === '/robots.txt') {
    // Use BASE_URL for sitemap location to ensure consistency
    const robots = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: https://jobforion.manasa.workers.dev/sitemap.xml`;
    return new Response(robots, { headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=86400" } });
  }
  return null;
}
