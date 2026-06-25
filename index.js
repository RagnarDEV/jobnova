// index.js
const KEYWORDS = ["developer", "frontend", "backend", "fullstack", "software", "python", "javascript", "react", "node", "ai", "machine learning", "data", "devops", "mobile", "ui/ux", "graphic", "product designer", "video", "motion", "writer", "seo", "marketing", "manager", "remote"];

async function syncJobs(env) {
    const response = await fetch("https://api.jobdatalake.com/v1/jobs", {
        headers: { "Authorization": `Bearer ${env.API_KEY}`, "Content-Type": "application/json" }
    });
    const data = await response.json();
    const jobs = Array.isArray(data) ? data : (data.jobs || data.results || []);
    let count = 0;
    for (const job of jobs) {
        const title = (job.title || job.job_title || "").toLowerCase();
        if (KEYWORDS.some(k => title.includes(k))) {
            const result = await env.DB.prepare("INSERT INTO jobs (title, company, location, url, description) SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM jobs WHERE url = ?)").bind(job.title, job.company || "Company", job.location || "Remote", job.url, job.description || "", job.url).run();
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

        // الصفحة الرئيسية (الواجهة الاحترافية)
        return new Response(`
<!DOCTYPE html>
<html class="dark">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <title>JobNova - Latest Remote Jobs</title>
</head>
<body class="bg-gray-900 text-gray-100 min-h-screen p-4">
    <div class="max-w-2xl mx-auto">
        <h1 class="text-3xl font-bold mb-6 text-center">🚀 JobNova</h1>
        <div id="jobs-container" class="space-y-4">
            <p class="text-center">Loading jobs...</p>
        </div>
    </div>
    <script>
        fetch('/api/jobs').then(res => res.json()).then(jobs => {
            const container = document.getElementById('jobs-container');
            container.innerHTML = jobs.map(job => \`
                <div class="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-yellow-500 transition">
                    <h2 class="text-xl font-bold text-white">\${job.title}</h2>
                    <p class="text-gray-400 mb-2">\${job.company} • \${job.location}</p>
                    <div class="flex gap-2 mb-4">
                        <span class="bg-gray-700 px-2 py-1 rounded text-xs">Remote</span>
                        <span class="bg-blue-900 text-blue-200 px-2 py-1 rounded text-xs">Full-time</span>
                    </div>
                    <a href="\${job.url}" target="_blank" class="block w-full text-center bg-yellow-500 text-black font-bold py-2 rounded-lg hover:bg-yellow-400">View Details →</a>
                </div>
            \`).join('');
        });
    </script>
</body>
</html>
        `, { headers: { "Content-Type": "text/html" } });
    },
    async scheduled(event, env, ctx) { ctx.waitUntil(syncJobs(env)); }
};
