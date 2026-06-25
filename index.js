// دالة المزامنة (تستخدم في اليدوي والآلي)
async function syncJobs(env) {
    const apiKey = env.API_KEY;
    if (!apiKey) throw new Error("API_KEY is missing");

    const response = await fetch("https://api.jobdatalake.com/v1/jobs", {
        method: "GET",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" }
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    
    const data = await response.json();
    const jobs = Array.isArray(data) ? data : (data.jobs || data.results || []);
    
    let count = 0;
    for (const job of jobs) {
        const title = job.title || job.job_title || "Remote Position";
        const company = job.company || job.company_name || "Confidential Company";
        const location = job.location || "Remote";
        const urlLink = job.url || job.job_url || "#";
        const description = job.description || "";

        // استخدام env.DB كما هو مضبوط في إعداداتك
        const result = await env.DB.prepare(`
            INSERT INTO jobs (title, company, location, url, description) 
            SELECT ?, ?, ?, ?, ?
            WHERE NOT EXISTS (SELECT 1 FROM jobs WHERE url = ?)
        `).bind(title, company, location, urlLink, description, urlLink).run();
        
        if (result.success) count++;
    }
    return count;
}

export default {
    // 1. معالجة الطلبات عبر المتصفح (للزر اليدوي)
    async fetch(request, env) {
        const url = new URL(request.url);

        // جلب قائمة الوظائف
        if (url.pathname === "/api/jobs") {
            const { results } = await env.DB.prepare("SELECT * FROM jobs ORDER BY id DESC").all();
            return new Response(JSON.stringify(results), { 
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
            });
        }

        // المزامنة اليدوية
        if (url.pathname === "/api/sync") {
            try {
                const count = await syncJobs(env);
                return new Response(JSON.stringify({ success: true, message: `Synced ${count} new jobs.` }), { 
                    headers: { "Content-Type": "application/json" } 
                });
            } catch (error) {
                return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
            }
        }

        // واجهة بسيطة
        return new Response(`<h1>JobNova is Running</h1><p>Automatic Sync: Hourly</p>`, { 
            headers: { "Content-Type": "text/html" } 
        });
    },

    // 2. معالجة المزامنة التلقائية (تنفذ كل ساعة بفضل الـ Cron Trigger)
    async scheduled(event, env, ctx) {
        console.log("Cron triggered sync...");
        ctx.waitUntil(syncJobs(env));
    }
};
