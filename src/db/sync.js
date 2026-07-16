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

// Dedup key is the unique `url` column — INSERT OR IGNORE never creates
// duplicates and never touches existing rows.
async function saveJobs(env, jobs, counters, errors, providerId) {
  for (const j of jobs) {
    if (!j || !j.url) { counters.skipped++; continue; }
    try {
      const r = await env.DB.prepare(
        `INSERT OR IGNORE INTO jobs (title,company,location,url,description,salary,remote_type,skills,seniority,employment_type,job_handle)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(
        j.title || 'Unknown', j.company || 'Company', j.location || '', j.url,
        j.description || '', j.salary || '', j.remote_type || '',
        JSON.stringify(j.skills || []), j.seniority || '', j.employment_type || '', j.job_handle || ''
      ).run();
      if (r.meta?.changes > 0) counters.inserted++; else counters.skipped++;
    } catch (e) {
      errors.push(`[${providerId}] DB: ${e.message.slice(0, 60)}`);
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
  const errors = [];
  const providerStats = [];

  if (!sources.length) {
    const result = { inserted: 0, skipped: 0, errors: ['No API key configured'] };
    await logSync(env, result);
    return result;
  }

  for (const source of sources) {
    const provider = PROVIDERS[source.provider];
    if (!provider) { errors.push(`Unknown provider "${source.provider}"`); continue; }

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
        await saveJobs(env, jobs, counters, errors, source.provider);
      } catch (e) {
        errors.push(`[${source.provider}]${q ? ` "${q}":` : ''} ${e.message}`);
        // one failed keyword/provider never stops the rest of the sync
      }
    }

    providerStats.push({
      provider: source.provider,
      label: source.label,
      inserted: counters.inserted - startInserted,
      duration_ms: Date.now() - startedAt,
    });
  }

  const result = { inserted: counters.inserted, skipped: counters.skipped, errors: errors.slice(0, 15), providerStats };
  await logSync(env, result);
  return result;
}
