const KEYWORDS = ["developer", "frontend", "backend", "fullstack", "software", "python", "javascript", "react", "node", "ai", "machine learning", "data", "devops", "mobile", "ui/ux", "graphic", "product designer", "video", "motion", "writer", "seo", "marketing", "manager", "remote"];

async function syncJobs(env) {
    const response = await fetch("https://api.jobdatalake.com/v1/jobs", { headers: { "Authorization": `Bearer ${env.API_KEY}`, "Content-Type": "application/json" } });
    const data = await response.json();
    const jobs = Array.isArray(data) ? data : (data.jobs || data.results || []);
    let count = 0;
    for (const job of jobs) {
        const title = (job.title || job.job_title || "").toLowerCase();
        if (KEYWORDS.some(k => title.includes(k))) {
            const result = await env.DB.prepare("INSERT INTO jobs (title, company, location, url, description) SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM jobs WHERE url = ?)").bind(job.title, job.company || "Company", job.location || "Remote", job.url, job.description || "No description provided.", job.url).run();
            if (result.success) count++;
        }
    }
    return count;
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (url.pathname === "/api/jobs") {
            const { results } = await env.DB.prepare("SELECT * FROM jobs ORDER BY id DESC").all();
            return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        }
        if (url.pathname === "/api/sync") {
            const count = await syncJobs(env);
            return new Response(JSON.stringify({ success: true, count }), { headers: { "Content-Type": "application/json" } });
        }

        return new Response(`
<!DOCTYPE html>
<html class="dark">
<head>
    <script src="https://cdn.tailwindcss.com"></script>
    <title>JobNova - Pro Jobs</title>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">
    <div class="flex">
        <aside class="w-64 border-r border-slate-800 p-6 hidden md:block h-screen sticky top-0">
            <h1 class="text-2xl font-bold text-emerald-500 mb-8">JobNova</h1>
            <nav class="space-y-4 text-slate-400">
                <button onclick="filterJobs('all')" class="block w-full text-left hover:text-emerald-400">All Jobs</button>
                <button onclick="filterJobs('developer')" class="block w-full text-left hover:text-emerald-400">Development</button>
                <button onclick="filterJobs('design')" class="block w-full text-left hover:text-emerald-400">Design</button>
                <button onclick="filterJobs('marketing')" class="block w-full text-left hover:text-emerald-400">Marketing</button>
            </nav>
        </aside>
        
        <main class="flex-1 p-6">
            <div id="content-area" class="max-w-3xl mx-auto space-y-6">
                <div id="loader" class="text-center">Loading amazing jobs...</div>
            </div>
        </main>
    </div>

    <script>
        let allJobs = [];
        async function init() {
            const res = await fetch('/api/jobs');
            allJobs = await res.json();
            renderList(allJobs);
        }

        function renderList(jobs) {
            const container = document.getElementById('content-area');
            container.innerHTML = jobs.map(job => \`
                <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-emerald-500 transition cursor-pointer" onclick="showDetail(\${job.id})">
                    <h2 class="text-xl font-bold">\${job.title}</h2>
                    <p class="text-emerald-400">\${job.company}</p>
                </div>
            \`).join('');
        }

        function showDetail(id) {
            const job = allJobs.find(j => j.id === id);
            document.getElementById('content-area').innerHTML = \`
                <button onclick="init()" class="text-emerald-500 mb-4">← Back to List</button>
                <div class="bg-slate-900 p-8 rounded-2xl border border-slate-800">
                    <h1 class="text-3xl font-bold mb-4">\${job.title}</h1>
                    <p class="text-slate-400 mb-6 font-semibold">\${job.company} • \${job.location}</p>
                    <div class="prose prose-invert text-slate-300 mb-8">\${job.description || "No description available."}</div>
                    <a href="\${job.url}" target="_blank" class="bg-emerald-600 px-8 py-3 rounded-lg font-bold hover:bg-emerald-500">Apply Now</a>
                </div>
            \`;
        }

        function filterJobs(cat) {
            if(cat === 'all') return renderList(allJobs);
            const filtered = allJobs.filter(j => j.title.toLowerCase().includes(cat));
            renderList(filtered);
        }

        init();
    </script>
</body>
</html>
        `, { headers: { "Content-Type": "text/html" } });
    },
    async scheduled(event, env, ctx) { ctx.waitUntil(syncJobs(env)); }
};
