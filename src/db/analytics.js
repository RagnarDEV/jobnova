// src/db/analytics.js
// Sync-run logging + best-effort visitor tracking (never blocks the response).

export async function logSync(env, result) {
  try {
    await env.DB.prepare(
      `INSERT INTO sync_logs (inserted, skipped, errors) VALUES (?,?,?)`
    ).bind(result.inserted, result.skipped, JSON.stringify(result.errors || [])).run();
  } catch (e) {}
}

export async function recordVisit(env, request, url) {
  try {
    const country = request.cf?.country || 'XX';
    const ua = (request.headers.get('User-Agent') || '').slice(0, 140);
    const ref = (request.headers.get('Referer') || '').slice(0, 200);
    await env.DB.prepare(
      `INSERT INTO visits (path, referrer, country, ua) VALUES (?,?,?,?)`
    ).bind(url.pathname, ref, country, ua).run();
  } catch (e) {}
}

