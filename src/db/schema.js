// src/db/schema.js
// Table creation only — never drops or mutates existing jobs/subscribers data.
//
// UPDATE: added a safe column-migration helper. `CREATE TABLE IF NOT EXISTS`
// only helps on a brand-new database — if a table already exists with an
// older/different set of columns (as happened with api_sources missing
// `label`), it silently does nothing and later INSERTs fail with
// "D1_ERROR: table X has no column named Y". ensureColumn() checks the
// live schema via PRAGMA table_info and adds only what's missing, via
// ALTER TABLE ADD COLUMN — existing rows and data are never touched.

async function ensureColumn(env, table, column, definition) {
  try {
    const { results } = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
    const exists = (results || []).some(r => r.name === column);
    if (!exists) {
      await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
    }
  } catch (e) {
    // If the table itself doesn't exist yet, CREATE TABLE IF NOT EXISTS
    // below handles it — safe to ignore here.
  }
}

export async function ensureTable(env) {
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
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inserted INTEGER, skipped INTEGER, errors TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT, referrer TEXT, country TEXT, ua TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS api_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT, api_key TEXT, active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  // Migration safety net: if api_sources already existed with an older
  // schema (missing one or more of these columns), add whatever is missing
  // without touching existing rows.
  await ensureColumn(env, 'api_sources', 'label', 'TEXT');
  await ensureColumn(env, 'api_sources', 'api_key', 'TEXT');
  await ensureColumn(env, 'api_sources', 'active', 'INTEGER DEFAULT 1');
  await ensureColumn(env, 'api_sources', 'created_at', 'DATETIME');
  // Some earlier deployments created this table with a `name` column
  // (NOT NULL, no default) instead of `label`. We can't drop a NOT NULL
  // constraint in SQLite without recreating the table, so instead we keep
  // `name` around and always write the same value into both columns —
  // see the INSERT in admin.router.js.
  await ensureColumn(env, 'api_sources', 'name', 'TEXT');

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS job_postings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT, company TEXT, email TEXT, url TEXT,
      location TEXT, category TEXT, employment_type TEXT,
      remote_type TEXT, salary TEXT, description TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}
