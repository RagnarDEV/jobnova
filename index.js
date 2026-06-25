const KEYWORDS = ["developer","frontend","backend","fullstack","software",
  "python","javascript","react","node","ai","machine learning","data",
  "devops","mobile","ui/ux","graphic","product designer","video",
  "motion","writer","seo","marketing","manager","remote"];

async function ensureTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT, company TEXT, location TEXT,
      url TEXT UNIQUE, description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

async function syncJobs(env) {
  await ensureTable(env);

  // jobdatalake correct endpoint
  const url = "https://jobdatalake.com/api/v1/jobs?per_page=100&remoteType=fully_remote";
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${env.API_KEY}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API Error ${response.status}: ${text}`);
  }

  const data = await response.json();
  // jobdatalake returns { jobs: [...] } or { results: [...] } or array
  const jobs = Array.isArray(data) ? data : (data.jobs || data.results || data.data || []);

  let count = 0;
  for (const job of jobs) {
    const title = (job.title || job.job_title || "").toLowerCase();
    if (KEYWORDS.some(k => title.includes(k))) {
      try {
        await env.DB.prepare(
          `INSERT OR IGNORE INTO jobs (title, company, location, url, description)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(
          job.title || "Unknown",
          job.company || job.company_name || "Company",
          job.location || job.city || "Remote",
          job.url || job.apply_url || job.link || "",
          job.description || job.summary || "No description."
        ).run();
        count++;
      } catch(e) {}
    }
  }
  return { count, total: jobs.length };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Create table on every cold start (safe, IF NOT EXISTS)
    await ensureTable(env);

    if (url.pathname === "/api/jobs") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM jobs ORDER BY id DESC LIMIT 100"
      ).all();
      return new Response(JSON.stringify(results), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    if (url.pathname === "/api/sync") {
      try {
        const result = await syncJobs(env);
        return new Response(JSON.stringify({ success: true, ...result }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch(e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // Debug endpoint - check DB status
    if (url.pathname === "/api/debug") {
      const { results } = await env.DB.prepare("SELECT COUNT(*) as count FROM jobs").all();
      return new Response(JSON.stringify({ 
        jobs_in_db: results[0]?.count || 0,
        api_key_set: !!env.API_KEY 
      }), { headers: { "Content-Type": "application/json" }});
    }

    // HTML (unchanged for now)
    return new Response(/* ... HTML كما هو ... */ ``, {
      headers: { "Content-Type": "text/html" }
    });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncJobs(env));
  }
};
