async function ensureTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT, company TEXT, location TEXT,
      url TEXT UNIQUE, description TEXT,
      salary TEXT, remote_type TEXT, skills TEXT,
      seniority TEXT, employment_type TEXT,
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
    } catch(e) { errors.push(`Fetch "${q}": ${e.message}`); continue; }

    if (!response.ok) { errors.push(`API ${response.status} for "${q}"`); continue; }

    const data = await response.json();
    const jobs = data.jobs || data.hits || data.results || (Array.isArray(data) ? data : []);

    for (const job of jobs) {
      const jobUrl = job.url || "";
      if (!jobUrl) { skipped++; continue; }

      const salary = job.salary_min_usd && job.salary_max_usd
        ? `$${job.salary_min_usd}k - $${job.salary_max_usd}k`
        : "";
      const location = Array.isArray(job.locations) && job.locations.length
        ? job.locations[0]
        : (job.remote_type === "fully_remote" ? "Remote" : "");
      const skills = JSON.stringify(job.required_skills || []);

      try {
        const r = await env.DB.prepare(
          `INSERT OR IGNORE INTO jobs
           (title, company, location, url, description, salary, remote_type, skills, seniority, employment_type)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          job.title || "Unknown",
          job.company_name || "Company",
          location,
          jobUrl,
          job.description || "",
          salary,
          job.remote_type || "",
          skills,
          Array.isArray(job.seniority) ? job.seniority.join(", ") : "",
          job.employment_type || ""
        ).run();
        if (r.meta?.changes > 0) inserted++;
        else skipped++;
      } catch(e) {
        errors.push(`DB: ${e.message.slice(0, 80)}`);
      }
    }
  }
  return { inserted, skipped, errors: errors.slice(0, 3), queries: queries.length };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    await ensureTable(env);

    if (url.pathname === "/api/migrate") {
      await env.DB.prepare("DROP TABLE IF EXISTS jobs").run();
      await env.DB.prepare(`
        CREATE TABLE jobs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT, company TEXT, location TEXT,
          url TEXT UNIQUE, description TEXT,
          salary TEXT, remote_type TEXT, skills TEXT,
          seniority TEXT, employment_type TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      return new Response(JSON.stringify({ success: true, message: "Table recreated" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

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
    let cachedJobs = [];

    async function loadJobs() {
      document.getElementById('content-area').innerHTML = '<div class="text-center text-slate-500 py-12">Loading jobs...</div>';
      const params = new URLSearchParams({ page: currentPage });
      if (currentCat) params.set('category', currentCat);
      if (currentSearch) params.set('search', currentSearch);

      const res = await fetch('/api/jobs?' + params);
      const data = await res.json();
      cachedJobs = data.jobs || [];

      document.getElementById('stats').textContent = data.total + ' jobs found';

      if (!cachedJobs.length) {
        document.getElementById('content-area').innerHTML = '<div class="text-center text-slate-500 py-12">No jobs found.</div>';
        document.getElementById('pagination').innerHTML = '';
        return;
      }

      document.getElementById('content-area').innerHTML = cachedJobs.map(job => \`
        <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl hover:border-emerald-500 transition cursor-pointer"
             onclick="showDetail(\${job.id})">
          <div class="flex justify-between items-start gap-4">
            <div class="flex-1 min-w-0">
              <h2 class="text-lg font-bold text-slate-100 truncate">\${job.title}</h2>
              <p class="text-emerald-400 font-medium mt-1">\${job.company}</p>
              <div class="flex flex-wrap gap-2 mt-2">
                \${job.location ? '<span class="text-slate-500 text-xs">' + job.location + '</span>' : ''}
                \${job.remote_type ? '<span class="bg-emerald-900 text-emerald-300 text-xs px-2 py-0.5 rounded-full">' + job.remote_type.replace('_', ' ') + '</span>' : ''}
                \${job.employment_type ? '<span class="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full">' + job.employment_type.replace('_', ' ') + '</span>' : ''}
              </div>
            </div>
            \${job.salary ? '<span class="text-emerald-500 text-sm font-bold shrink-0">' + job.salary + '</span>' : ''}
          </div>
        </div>
      \`).join('');

      const totalPages = Math.ceil(data.total / 20);
      document.getElementById('pagination').innerHTML = totalPages > 1 ? \`
        \${currentPage > 1 ? '<button onclick="goPage(' + (currentPage-1) + ')" class="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-sm">Prev</button>' : ''}
        <span class="px-4 py-2 text-slate-400 text-sm">Page \${currentPage} of \${totalPages}</span>
        \${currentPage < totalPages ? '<button onclick="goPage(' + (currentPage+1) + ')" class="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-sm">Next</button>' : ''}
      \` : '';
    }

    function showDetail(id) {
      const job = cachedJobs.find(j => j.id === id);
      if (!job) return;

      let skillsArr = [];
      try { skillsArr = JSON.parse(job.skills || '[]'); } catch(e) {}

      document.getElementById('content-area').innerHTML = \`
        <button onclick="loadJobs()" class="text-emerald-500 mb-4 hover:underline text-sm">Back to Jobs</button>
        <div class="bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <h1 class="text-2xl font-bold mb-2">\${job.title}</h1>
          <p class="text-emerald-400 font-semibold text-lg mb-1">\${job.company}</p>
          <div class="flex flex-wrap gap-2 mb-4">
            \${job.location ? '<span class="text-slate-400 text-sm">' + job.location + '</span>' : ''}
            \${job.remote_type ? '<span class="bg-emerald-900 text-emerald-300 text-xs px-2 py-1 rounded-full">' + job.remote_type.replace('_',' ') + '</span>' : ''}
            \${job.employment_type ? '<span class="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded-full">' + job.employment_type.replace('_',' ') + '</span>' : ''}
            \${job.seniority ? '<span class="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded-full">' + job.seniority + '</span>' : ''}
          </div>
          \${job.salary ? '<p class="text-emerald-500 font-bold text-xl mb-4">' + job.salary + '</p>' : ''}
          \${skillsArr.length ? '<div class="flex flex-wrap gap-2 mb-4">' + skillsArr.map(s => '<span class="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded">' + s + '</span>').join('') + '</div>' : ''}
          \${job.description ? '<div class="text-slate-300 mb-6 leading-relaxed text-sm">' + job.description + '</div>' : '<p class="text-slate-500 mb-6">No description available.</p>'}
          <a href="\${job.url}" target="_blank" rel="noopener"
             class="inline-block bg-emerald-600 px-8 py-3 rounded-xl font-bold hover:bg-emerald-500 transition">
            Apply Now
          </a>
        </div>
      \`;
      document.getElementById('pagination').innerHTML = '';
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
