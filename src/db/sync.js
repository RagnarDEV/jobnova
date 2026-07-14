// src/db/sync.js
// Multi-source job sync. Uses INSERT OR IGNORE on the unique url column — never duplicates, never drops.

import { ensureTable } from './schema.js';
import { logSync } from './analytics.js';

export async function getActiveApiKeys(env) {
  try {
    const { results } = await env.DB.prepare(`SELECT api_key FROM api_sources WHERE active = 1`).all();
    if (results && results.length) return results.map(r => r.api_key).filter(Boolean);
  } catch (e) {}
  return env.API_KEY ? [env.API_KEY] : [];
}

export async function syncJobs(env) {
  await ensureTable(env);
  const queries = ["developer", "designer", "marketing", "data", "devops", "writer", "manager"];
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

