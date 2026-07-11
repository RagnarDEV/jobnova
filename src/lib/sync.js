// src/lib/sync.js
// Pulls jobs from jobdatalake (primary, via env.API_KEY) AND from any
// extra sources the admin has added in the `api_sources` table.
// Existing rows are never overwritten/removed — INSERT OR IGNORE on
// the UNIQUE `url` column guarantees no duplicates and no data loss.

const DEFAULT_QUERIES = ["developer", "designer", "marketing", "data", "devops", "writer", "manager"];

async function insertJobs(env, jobs) {
  let inserted = 0, skipped = 0, errors = [];
  for (const job of jobs) {
    const jobUrl = job.url || "";
    if (!jobUrl) { skipped++; continue; }
    const salary = job.salary_min_usd && job.salary_max_usd
      ? `$${job.salary_min_usd}k - $${job.salary_max_usd}k` : "";
    const location = Array.isArray(job.locations) && job.locations.length
      ? job.locations[0]
      : (job.remote_type === "fully_remote" ? "Remote" : "");
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
    } catch (e) { errors.push(`DB: ${e.message.slice(0, 80)}`); }
  }
  return { inserted, skipped, errors };
}

async function syncPrimarySource(env) {
  let inserted = 0, skipped = 0, errors = [];
  if (!env.API_KEY) return { inserted, skipped, errors: ["No primary API_KEY set"] };
  for (const q of DEFAULT_QUERIES) {
    const apiUrl = `https://api.jobdatalake.com/v1/jobs?q=${q}&per_page=100`;
    let response;
    try { response = await fetch(apiUrl, { headers: { "X-API-Key": env.API_KEY } }); }
    catch (e) { errors.push(`Fetch "${q}": ${e.message}`); continue; }
    if (!response.ok) { errors.push(`API ${response.status} for "${q}"`); continue; }
    const data = await response.json();
    const jobs = data.jobs || data.hits || data.results || (Array.isArray(data) ? data : []);
    const r = await insertJobs(env, jobs);
    inserted += r.inserted; skipped += r.skipped; errors.push(...r.errors);
  }
  return { inserted, skipped, errors: errors.slice(0, 5) };
}

async function syncCustomSource(env, source) {
  let inserted = 0, skipped = 0, errors = [];
  let queries = [];
  try { queries = JSON.parse(source.query_terms || "[]"); } catch (e) {}
  if (!queries.length) queries = [""];
  for (const q of queries) {
    const sep = source.base_url.includes("?") ? "&" : "?";
    const apiUrl = `${source.base_url}${sep}q=${encodeURIComponent(q)}`;
    let response;
    try {
      response = await fetch(apiUrl, source.api_key ? { headers: { "X-API-Key": source.api_key } } : {});
    } catch (e) { errors.push(`Fetch "${q}": ${e.message}`); continue; }
    if (!response.ok) { errors.push(`API ${response.status} for "${q}"`); continue; }
    let data;
    try { data = await response.json(); } catch (e) { errors.push("Invalid JSON response"); continue; }
    const jobs = data.jobs || data.hits || data.results || (Array.isArray(data) ? data : []);
    const r = await insertJobs(env, jobs);
    inserted += r.inserted; skipped += r.skipped; errors.push(...r.errors);
  }
  return { inserted, skipped, errors: errors.slice(0, 5) };
}

export async function syncJobs(env) {
  const summary = { sources: [], totalInserted: 0, totalSkipped: 0 };

  const primary = await syncPrimarySource(env);
  summary.sources.push({ name: "primary (jobdatalake)", ...primary });
  summary.totalInserted += primary.inserted;
  summary.totalSkipped += primary.skipped;
  await env.DB.prepare(
    "INSERT INTO sync_logs (source, inserted, skipped, errors) VALUES (?,?,?,?)"
  ).bind("primary", primary.inserted, primary.skipped, JSON.stringify(primary.errors)).run();

  const { results: customSources } = await env.DB.prepare(
    "SELECT * FROM api_sources WHERE enabled = 1"
  ).all();

  for (const source of customSources) {
    const r = await syncCustomSource(env, source);
    summary.sources.push({ name: source.name, ...r });
    summary.totalInserted += r.inserted;
    summary.totalSkipped += r.skipped;
    await env.DB.prepare(
      "INSERT INTO sync_logs (source, inserted, skipped, errors) VALUES (?,?,?,?)"
    ).bind(source.name, r.inserted, r.skipped, JSON.stringify(r.errors)).run();
  }

  return summary;
}
