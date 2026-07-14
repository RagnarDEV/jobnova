// src/index.js
// ════════════════════════════════════════════════════════════════
// JobNova — Cloudflare Worker entry point
//
// This file is intentionally thin: it owns request-level concerns only
// (table bootstrap, visitor tracking, router dispatch order) and delegates
// everything else to src/routes/*.js, which in turn delegate rendering to
// src/pages/*.js, src/components/*.js, and src/lib/*.js (programmatic SEO).
//
// Router dispatch order matters only in that more specific/cheaper routes
// run first; each router returns `null` if the path isn't its concern, so
// this composes safely — see src/routes/*.router.js for details.
// ════════════════════════════════════════════════════════════════

import { ensureTable } from './db/schema.js';
import { recordVisit } from './db/analytics.js';
import { syncJobs } from './db/sync.js';

import { handleAssetsRoute, ASSET_PATHS } from './routes/assets.router.js';
import { handleFeedRoute } from './routes/feed.router.js';
import { handleAdminRoute } from './routes/admin.router.js';
import { handleSeoPagesRoute } from './routes/seo-pages.router.js';
import { handlePagesRoute } from './routes/pages.router.js';
import { handleApiRoute } from './routes/api.router.js';

const NON_TRACKED_STATIC_PATHS = new Set([...ASSET_PATHS, '/sitemap.xml', '/feed.rss']);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const base = `${url.protocol}//${url.host}`;
    await ensureTable(env);

    // ── static brand assets (favicons, manifest, robots.txt) ──
    const assetResponse = handleAssetsRoute(url, base);
    if (assetResponse) return assetResponse;

    // ── visitor analytics (best-effort, non-blocking) ──
    const trackable = ['GET'].includes(request.method) &&
      !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/admin') &&
      !NON_TRACKED_STATIC_PATHS.has(url.pathname);
    if (trackable && ctx?.waitUntil) ctx.waitUntil(recordVisit(env, request, url));

    // ── sitemap.xml / feed.rss ──
    const feedResponse = await handleFeedRoute(url, env, base);
    if (feedResponse) return feedResponse;

    // ── /admin/* ──
    const adminResponse = await handleAdminRoute(url, request, env, base);
    if (adminResponse) return adminResponse;

    // ── core content: job / blog / static / home ──
    const pageResponse = await handlePagesRoute(url, request, env, base);
    if (pageResponse) return pageResponse;

    // ── programmatic SEO: categories / companies / skills / search ──
    const seoResponse = await handleSeoPagesRoute(url, request, env, ctx, base);
    if (seoResponse) return seoResponse;

    // ── JSON API ──
    const apiResponse = await handleApiRoute(url, request, env);
    if (apiResponse) return apiResponse;

    return new Response('Not found', { status: 404 });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncJobs(env));
  }
};
