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
      salary TEXT, remote_type TEXT, skills TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

async function syncJobs(env) {
  await ensureTable(env);

  const queries = ["developer","designer","marketing","data","devops","writer","manager"];
  let inserted = 0, skipped = 0, errors = [];

  for (const q of queries) {
    const apiUrl = `https://api.jobdatalake.com/v1/jobs?q=${q}&per_page=100`;

    let response;
    try {
      response = await fetch(apiUrl, { headers: { "X-API-Key": env.API_KEY } });
    } catch(e) {
      errors.push(`Fetch error for "${q}": ${e.message}`);
      continue;
    }

    if (!response.ok) {
      errors.push(`API ${response.status} for "${q}"`);
      continue;
    }

    const data = await response.json();
    const jobs = Array.isArray(data)
      ? data
      : (data.hits || data.jobs || data.results || data.data || []);

    for (const job of jobs) {
      const jobUrl = job.url || job.apply_url || job.job_url
                   || job.application_url || job.link || job.applyUrl || "";

      if (!jobUrl) { skipped++; continue; }

      const title = job.title || job.job_title || "Unknown";
      const company = job.company || job.company_name || job.employer || "Company";
      const location = job.location || job.city || job.country || "Remote";
      const description = job.description || job.summary || job.snippet || "";
      const salary = job.salary || job.salary_range ||
                     (job.salary_min ? `$${job.salary_min}-${job.salary_max}` : "");
      const remoteType = job.remote_type || job.remoteType || job.work_type || "";
      const skills = JSON.stringify(job.skills || job.required_skills || job.tags || []);

      try {
        const r = await env.DB.prepare(
          `INSERT OR IGNORE INTO jobs
           (title, company, location, url, description, salary, remote_type, skills)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(title, company, location, jobUrl, description, salary, remoteType, skills).run();

        if (r.meta?.changes > 0) inserted++;
        else skipped++;
      } catch(e) {
        errors.push(`DB error: ${e.message}`);
      }
    }
  }

  return { inserted, skipped, errors: errors.slice(0, 5), queries: queries.length };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    await ensureTable(env);

    if (url.pathname === "/api/jobs") {
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = 20;
      const offset = (page - 1) * limit;
      const category = url.searchParams.get("category") || "";
      const search = url.searchParams.get("search") || "";

      let baseQuery = "FROM jobs";
      const conditions = [];
      const params = [];

      if (category) {
        conditions.push("LOWER(title) LIKE ?");
        params.push(`%${category}%`);
      }
      if (search) {
        conditions.push("(LOWER(title) LIKE ? OR LOWER(company) LIKE ?)");
        params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
      }

      const where = conditions.length ? " WHERE " + conditions.join(" AND ") : "";
      const { results } = await env.DB.prepare(
        `SELECT * ${baseQuery}${where} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`
      ).bind(...params).all();

      const { results: countRes } = await env.DB.prepare(
        `SELECT COUNT(*) as total ${baseQuery}${where}`
      ).bind(...params).all();

      return new Response(JSON.stringify({
        jobs: results,
        total: countRes[0]?.total || 0,
        page
      }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    if (url.pathname === "/api/sync") {
      try {
        const result = await syncJobs(env);
        return new Response(JSON.stringify({ success: true, ...result }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch(e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
          status: 500, headers: { "Content-Type": "application/json" }
        });
      }
    }

    if (url.pathname === "/api/debug") {
      const { results } = await env.DB.prepare("SELECT COUNT(*) as count FROM jobs").all();
      return new Response(JSON.stringify({
        jobs_in_db: results[0]?.count || 0,
        api_key_set: !!env.API_KEY
      }), { headers: { "Content-Type": "application/json" } });
    }

    if (url.pathname === "/api/raw") {
      const r = await fetch("https://api.jobdatalake.com/v1/jobs?q=developer&per_page=2", {
        headers: { "X-API-Key": env.API_KEY }
      });
      const json = await r.json();
      const sample = Array.isArray(json) ? json[0]
        : (json.hits?.[0] || json.jobs?.[0] || json.results?.[0] || json);
      return new Response(JSON.stringify({
        status: r.status,
        top_level_keys: Object.keys(json),
        sample_job_keys: sample ? Object.keys(sample) : [],
        sample_job: sample
      }, null, 2), { headers: { "Content-Type": "application/json" } });
    }

    return new Response(`
<!DOCTYPE html>
<html class="dark">
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <title>JobNova - Pro Jobs</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">
  <div class="flex">
    <aside class="w-64 border-r border-slate-800 p-6 hidden md:block h-screen sticky top-0">
      <h1 class="text-2xl font-bold text-emerald-500 mb-2">JobNova</h1>
      <p class="text-slate-500 text-xs mb-8">Remote Jobs Board</p>
      <nav class="space-y-2 text-slate-400">
        <button onclick="filterCat('')" class="block w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-emerald-400 transition">All Jobs</button>
        <button onclick="filterCat('developer')" class="block w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-emerald-400 transition">Development</button>
        <button onclick="filterCat('designer')" class="block w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-emerald-400 transition">Design</button>
        <button onclick="filterCat('marketing')" class="block w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-emerald-400 transition">Marketing</button>
        <button onclick="filterCat('data')" class="block w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-emerald-400 transition">Data</button>
        <button onclick="filterCat('manager')" class="block w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-emerald-400 transition">Management</button>
      </nav>
    </aside>

    <main class="flex-1 p-4 md:p-6">
      <div class="max-w-3xl mx-auto">
        <div class="mb-6">
          <input id="searchInput" type="text" placeholder="Search jobs or companies..."
            class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            oninput="debounceSearch(this.value)">
        </div>
        <div id="stats" class="text-slate-500 text-sm mb-4"></div>
        <div id="content-area" class="space-y-4"></div>
        <div id="pagination" class="mt-6 flex justify-center gap-3"></div>
      </div>
    </main>
  </div>

  <script>
    let currentPage = 1, currentCat = '', currentSearch = '', searchTimeout;

    async function loadJobs() {
      document.getElementById('content-area').innerHTML = '<div class="text-center text-slate-500 py-12">Loading jobs...</div>';
      const params = new URLSearchParams({ page: currentPage });
      if (currentCat) params.set('category', currentCat);
      if (currentSearch) params.set('search', currentSearch);

      const res = await fetch('/api/jobs?' + params);
      const data = await res.json();

      document.getElementById('stats').textContent = data.total + ' jobs found';

      if (!data.jobs?.length) {
        document.getElementById('content-area').innerHTML = '<div class="text-center text-slate-500 py-12">No jobs found.</div>';
        return;
      }

      document.getElementById('content-area').innerHTML = data.jobs.map(job => \`
        <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl hover:border-emerald-500 transition cursor-pointer"
             onclick="showDetail(\${job.id})">
          <div class="flex justify-between items-start gap-4">
            <div>
              <h2 class="text-lg font-bold text-slate-100">\${job.title}</h2>
              <p class="text-emerald-400 font-medium mt-1">\${job.company}</p>
              <p class="text-slate-500 text-sm mt-1">\${job.location}\${job.remote_type ? ' · ' + job.remote_type : ''}</p>
            </div>
            \${job.salary ? '<span class="text-emerald-500 text-sm font-semibold shrink-0">' + job.salary + '</span>' : ''}
          </div>
        </div>
      \`).join('');

      const totalPages = Math.ceil(data.total / 20);
      document.getElementById('pagination').innerHTML = totalPages > 1 ? \`
        \${currentPage > 1 ? '<button onclick="goPage(' + (currentPage-1) + ')" class="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700">Prev</button>' : ''}
        <span class="px-4 py-2 text-slate-400">Page \${currentPage} of \${totalPages}</span>
        \${currentPage < totalPages ? '<button onclick="goPage(' + (currentPage+1) + ')" class="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700">Next</button>' : ''}
      \` : '';
    }

    async function showDetail(id) {
      const res = await fetch('/api/jobs?page=1&limit=1000');
      const data = await res.json();
      const job = data.jobs?.find(j => j.id === id);
      if (!job) return;

      document.getElementById('content-area').innerHTML = \`
        <button onclick="loadJobs()" class="text-emerald-500 mb-4 hover:underline">Back to Jobs</button>
        <div class="bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <h1 class="text-2xl font-bold mb-2">\${job.title}</h1>
          <p class="text-emerald-400 font-semibold mb-1">\${job.company}</p>
          <p class="text-slate-400 mb-4">\${job.location}</p>
          \${job.salary ? '<p class="text-emerald-500 font-bold mb-4">' + job.salary + '</p>' : ''}
          <div class="text-slate-300 mb-6 leading-relaxed">\${job.description || 'No description available.'}</div>
          <a href="\${job.url}" target="_blank" class="inline-block bg-emerald-600 px-8 py-3 rounded-xl font-bold hover:bg-emerald-500 transition">Apply Now</a>
        </div>
      \`;
    }

    function filterCat(cat) { currentCat = cat; currentPage = 1; loadJobs(); }
    function debounceSearch(val) {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => { currentSearch = val; currentPage = 1; loadJobs(); }, 400);
    }
    function goPage(p) { currentPage = p; loadJobs(); window.scrollTo(0,0); }

    loadJobs();
  </script>
</body>
</html>
    `, { headers: { "Content-Type": "text/html" } });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncJobs(env));
  }
};
