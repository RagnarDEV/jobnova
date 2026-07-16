// src/db/sync.js
// Thin orchestrator ONLY. It does not know how to talk to any specific
// job-board API — that logic lives entirely in src/providers/*.js. This
// file's job is: read active sources -> pick the right provider module ->
// call it -> dedupe -> save -> log. Adding a new provider never requires
// touching this file (see src/providers/index.js).

import { ensureTable } from './schema.js';
import { logSync } from './analytics.js';
import { PROVIDERS } from '../providers/index.js';

const QUERIES = ["developer", "designer", "marketing", "data", "devops", "writer", "sales", "customer support", "product manager", "finance", "recruiter", "qa engineer", "manager"];
const RETRIES = 2;
const TIMEOUT_MS = 15000;
const DELAY_BETWEEN_QUERIES_MS = 350; // spaces out consecutive calls to the same provider to avoid per-second rate limits (e.g. RapidAPI HTTP 429)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ────────────────────────────────────────────────────────────────
// Sources (api_sources table + the primary env.API_KEY secret)
// ────────────────────────────────────────────────────────────────

// Always includes env.API_KEY (provider 'jobdatalake') even when extra rows
// exist in api_sources — adding a source must never silently drop the
// original working key.
export async function getActiveSources(env) {
  const sources = [];
  if (env.API_KEY) sources.push({ label: 'Primary', api_key: env.API_KEY, provider: 'jobdatalake' });
  try {
    const { results } = await env.DB.prepare(`SELECT label, api_key, provider FROM api_sources WHERE active = 1`).all();
    (results || []).forEach(r => {
      if (r.api_key) sources.push({ label: r.label, api_key: r.api_key, provider: r.provider || 'jobdatalake' });
    });
  } catch (e) {}
  const seen = new Set();
  return sources.filter(s => {
    const key = `${s.provider}:${s.api_key}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Legacy helper kept for backward compatibility with any older caller.
export async function getActiveApiKeys(env) {
  return (await getActiveSources(env)).map(s => s.api_key);
}

// Inserts a new API source without assuming a fixed column set — the live
// api_sources table predates the current schema and has accumulated NOT
// NULL columns (name, base_url, ...) that a fresh install won't have. This
// reads the table's real structure via PRAGMA table_info and fills in a
// sensible value for whatever it finds, instead of hardcoding columns.
export async function insertApiSource(env, label, apiKey, provider = 'jobdatalake') {
  const { results: cols } = await env.DB.prepare(`PRAGMA table_info(api_sources)`).all();
  const knownValues = { label, name: label, api_key: apiKey, provider, active: 1 };
  const insertCols = [];
  const values = [];
  for (const col of (cols || [])) {
    if (col.name === 'id') continue;
    if (col.name === 'created_at' && col.dflt_value != null) continue;
    if (col.name in knownValues) {
      insertCols.push(col.name);
      values.push(knownValues[col.name]);
    } else if (col.notnull && col.dflt_value == null) {
      insertCols.push(col.name);
      values.push('');
    }
  }
  const placeholders = insertCols.map(() => '?').join(',');
  await env.DB.prepare(
    `INSERT INTO api_sources (${insertCols.join(',')}) VALUES (${placeholders})`
  ).bind(...values).run();
}

// ────────────────────────────────────────────────────────────────
// Retry / dedupe / save
// ────────────────────────────────────────────────────────────────

async function withRetry(fn, retries) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

// Groups repeated identical failures (e.g. the same HTTP 402/429 firing for
// every one of the 13 search keywords) into a single counted line instead
// of 13 near-identical rows. This is what was crowding out every other
// provider's diagnostic info in the dashboard — one noisy provider could
// fill the entire error list before a quieter provider's real error ever
// got a turn.
function createErrorLog() {
  const counts = new Map();
  return {
    add(provider, message, sample) {
      const key = `${provider}::${message}`;
      const entry = counts.get(key) || { count: 0, sample };
      entry.count++;
      counts.set(key, entry);
    },
    toArray(limit = 30) {
      return Array.from(counts.entries())
        .slice(0, limit)
        .map(([key, entry]) => {
          const [provider, message] = key.split('::');
          const sampleTxt = entry.sample ? ` (e.g. "${entry.sample}")` : '';
          return entry.count > 1
            ? `[${provider}] ${message}${sampleTxt} — ×${entry.count}`
            : `[${provider}] ${message}${sampleTxt}`;
        });
    },
  };
}

// Dedup key is the unique `url` column — INSERT OR IGNORE never creates
// duplicates and never touches existing rows.
// Saves jobs in small batches via env.DB.batch() instead of one D1 call per
// job. This matters a lot: Cloudflare Workers caps the total number of
// subrequests (fetch calls + D1 queries combined) allowed within a single
// Worker invocation. A provider returning 200+ jobs used to mean 200+
// individual D1 round trips, which alone could blow through that limit
// before other providers even got a turn — that's what was silently
// starving arbeitnow/linkedin_rapidapi of subrequest budget. batch()
// executes many statements as ONE subrequest.
const DB_BATCH_SIZE = 25;

async function saveJobs(env, jobs, counters, errorLog, providerId) {
  const validJobs = (jobs || []).filter((j) => j && j.url);
  counters.skipped += (jobs || []).length - validJobs.length;

  for (let i = 0; i < validJobs.length; i += DB_BATCH_SIZE) {
    const chunk = validJobs.slice(i, i + DB_BATCH_SIZE);
    const stmts = chunk.map((j) =>
      env.DB.prepare(
        `INSERT OR IGNORE INTO jobs (title,company,location,url,description,salary,remote_type,skills,seniority,employment_type,job_handle)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(
        j.title || 'Unknown', j.company || 'Company', j.location || '', j.url,
        j.description || '', j.salary || '', j.remote_type || '',
        JSON.stringify(j.skills || []), j.seniority || '', j.employment_type || '', j.job_handle || ''
      )
    );
    try {
      const results = await env.DB.batch(stmts);
      for (const r of results) {
        if (r.meta?.changes > 0) counters.inserted++; else counters.skipped++;
      }
    } catch (e) {
      errorLog.add(providerId, `DB batch: ${e.message.slice(0, 60)}`);
      counters.skipped += chunk.length;
    }
  }
}

// ────────────────────────────────────────────────────────────────
// Main entry point
// ────────────────────────────────────────────────────────────────

export async function syncJobs(env) {
  await ensureTable(env);
  const sources = await getActiveSources(env);
  const counters = { inserted: 0, skipped: 0 };
  const errorLog = createErrorLog();
  const providerStats = [];

  if (!sources.length) {
    const result = { inserted: 0, skipped: 0, errors: ['No API key configured'] };
    await logSync(env, result);
    return result;
  }

  for (const source of sources) {
    const provider = PROVIDERS[source.provider];
    if (!provider) { errorLog.add(source.provider, 'Unknown provider'); continue; }

    const startedAt = Date.now();
    const startInserted = counters.inserted;
    // Keyless/per-company providers (Arbeitnow, Greenhouse, Lever, Ashby)
    // don't support keyword search — call once per sync instead of once
    // per keyword.
    const runQueries = provider.ignoresQuery ? [null] : QUERIES;

    for (const q of runQueries) {
      try {
        const jobs = await withRetry(
          () => provider.fetchJobs({ apiKey: source.api_key, query: q, timeoutMs: TIMEOUT_MS }),
          RETRIES
        );
        await saveJobs(env, jobs, counters, errorLog, source.provider);
      } catch (e) {
        errorLog.add(source.provider, e.message, q || undefined);
        // one failed keyword/provider never stops the rest of the sync
      }
      if (runQueries.length > 1) await sleep(DELAY_BETWEEN_QUERIES_MS);
    }

    providerStats.push({
      provider: source.provider,
      label: source.label,
      inserted: counters.inserted - startInserted,
      duration_ms: Date.now() - startedAt,
    });
  }

  const result = { inserted: counters.inserted, skipped: counters.skipped, errors: errorLog.toArray(), providerStats };
  await logSync(env, result);
  return result;
}
