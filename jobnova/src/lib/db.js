// src/lib/db.js
// ⚠️ IMPORTANT: The `jobs` and `subscribers` tables below are IDENTICAL
// to the original schema. We NEVER DROP or rename them, so all existing
// job listings already stored in D1 remain 100% intact after this upgrade.

export async function ensureTables(env) {
  // Original tables — untouched schema (data preserved)
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT, company TEXT, location TEXT,
      url TEXT UNIQUE, description TEXT,
      salary TEXT, remote_type TEXT, skills TEXT,
      seniority TEXT, employment_type TEXT,
      job_handle TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE, keywords TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // NEW: additional API sources, manageable from /admin without redeploying.
  // This is how the site becomes extensible with more API keys over time.
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS api_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      base_url TEXT NOT NULL,
      api_key TEXT,
      query_terms TEXT DEFAULT '[]',
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // NEW: key/value settings store (site name, ads toggle, theme defaults, etc.)
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `).run();

  // NEW: sync run history for the admin dashboard
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT,
      inserted INTEGER,
      skipped INTEGER,
      errors TEXT,
      ran_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

export async function getSetting(env, key, fallback = null) {
  const r = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first();
  return r ? r.value : fallback;
}

export async function setSetting(env, key, value) {
  await env.DB.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).bind(key, value).run();
}
