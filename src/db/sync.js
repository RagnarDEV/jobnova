// src/db/sync.js
// Multi-source job sync. Uses INSERT OR IGNORE on the unique url column — never duplicates, never drops.

import { ensureTable } from './schema.js';
import { logSync } from './analytics.js';

export async function getActiveApiKeys(env) {
  // Union, not replace: env.API_KEY (the original working secret) must
  // always be included, even when extra sources exist in api_sources.
  // Previously, adding any row there silently dropped the primary key.
  const keys = new Set();
  if (env.API_KEY) keys.add(env.API_KEY);
  try {
    const { results } = await env.DB.prepare(`SELECT api_key FROM api_sources WHERE active = 1`).all();
    (results || []).forEach(r => { if (r.api_key) keys.add(r.api_key); });
  } catch (e) {}
  return [...keys];
}

// Inserts a new API source without assuming a fixed column set. The live
// api_sources table on this project predates the current schema.js and has
// accumulated NOT NULL columns (name, base_url, and possibly others) that
// don't exist in a fresh install. Rather than hardcoding every column and
// chasing each "NOT NULL constraint failed" error one at a time, this reads
// the table's real structure via PRAGMA table_info and fills in a sensible
// value for whatever NOT NULL column it finds — known ones get a real
// value, unknown ones fall back to an empty string so the insert never
// fails on a missing column again.
export async function insertApiSource(env, label, apiKey) {
  const { results: cols } = await env.DB.prepare(`PRAGMA table_info(api_sources)`).all();
  const knownValues = {
    label,
    name: label,
    api_key: apiKey,
    base_url: 'https://api.jobdatalake.com/v1/jobs',
    active: 1,
  };
  const insertCols = [];
  const values = [];
  for (const col of (cols || [])) {
    if (col.name === 'id') continue;                          // autoincrement PK
    if (col.name === 'created_at' && col.dflt_value != null) continue; // has DB default
    if (col.name in knownValues) {
      insertCols.push(col.name);
      values.push(knownValues[col.name]);
    } else if (col.notnull && col.dflt_value == null) {
      // unknown required column — safe empty fallback instead of crashing
      insertCols.push(col.name);
      values.push('');
    }
  }
  const placeholders = insertCols.map(() => '?').join(',');
  await env.DB.prepare(
    `INSERT INTO api_sources (${insertCols.join(',')}) VALUES (${placeholders})`
  ).bind(...values).run();
}

export async function syncJobs(env) {
  await ensureTable(env);
  const queries = ["developer", "designer", "marketing", "data", "devops", "writer", "sales", "customer support", "product manager", "finance", "recruiter", "qa engineer", "manager"];
  const keys = await getActiveApiKeys(env);
  let inserted = 0, skipped = 0, errors = [];
  if (!keys.length) {
    const result = { inserted: 0, skipped: 0, errors: ["No API key configured"] };
    await logSync(env, result);
    return result;
  }
  for (const apiKey of keys) {
    for (const q of queries) {
      const apiUrl = `https://api.jobdatalake.com/v1/jobs?q=${q}&per_page=100`;
      let response;
      try { response = await fetch(apiUrl, { headers: { "X-API-Key": apiKey } }); }
      catch (e) { errors.push(`Fetch "${q}": ${e.message}`); continue; }
      if (!response.ok) { errors.push(`API ${response.status} for "${q}"`); continue; }
      const data = await response.json();
      const jobs = data.jobs || data.hits || data.results || (Array.isArray(data) ? data : []);
      for (const job of jobs) {
        const jobUrl = job.url || "";
        if (!jobUrl) { skipped++; continue; }
        const salary = job.salary_min_usd && job.salary_max_usd ? `$${job.salary_min_usd}k - $${job.salary_max_usd}k` : "";
        const location = Array.isArray(job.locations) && job.locations.length ? job.locations[0] : (job.remote_type === "fully_remote" ? "Remote" : "");
        try {
          const r = await env.DB.prepare(
            `INSERT OR IGNORE INTO jobs (title,company,location,url,description,salary,remote_type,skills,seniority,employment_type,job_handle)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)`
          ).bind(
            job.title || "Unknown", job.company_name || "Company", location, jobUrl,
            job.description || "", salary, job.remote_type || "",
            JSON.stringify(job.required_skills || []),
            Array.isArray(job.seniority) ? job.seniority.join(", ") : "",
            job.employment_type || "", job.job_handle || ""
          ).run();
          if (r.meta?.changes > 0) inserted++; else skipped++;
        } catch (e) { errors.push(`DB: ${e.message.slice(0, 60)}`); }
      }
    }
  }
  const result = { inserted, skipped, errors: errors.slice(0, 5) };
  await logSync(env, result);
  return result;
}

