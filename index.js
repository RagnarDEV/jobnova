// قائمة الكلمات المفتاحية للفلترة (يمكنك تعديلها)
const KEYWORDS = [
    "developer", "frontend", "backend", "fullstack", "software", "python", "javascript", 
    "react", "node", "ai", "machine learning", "data", "devops", "mobile", 
    "ui/ux", "graphic", "product designer", "video", "motion", "writer", 
    "seo", "marketing", "manager", "remote"
];

// دالة المزامنة والفلترة
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
        // تجهيز البيانات
        const title = (job.title || job.job_title || "Remote Position").toLowerCase();
        const company = job.company || job.company_name || "Confidential Company";
        const location = job.location || "Remote";
        const urlLink = job.url || job.job_url || "#";
        const description = job.description || "No description provided.";

        // الفلترة: هل العنوان يحتوي على إحدى الكلمات المفتاحية؟
        const isRelevant = KEYWORDS.some(keyword => title.includes(keyword));

        if (isRelevant) {
            // حفظ في قاعدة البيانات (تجنب التكرار باستخدام الرابط)
            const result = await env.DB.prepare(`
                INSERT INTO jobs (title, company, location, url, description) 
                SELECT ?, ?, ?, ?, ?
                WHERE NOT EXISTS (SELECT 1 FROM jobs WHERE url = ?)
            `).bind(title, company, location, urlLink, description, urlLink).run();
            
            if (result.success) count++;
        }
    }
    return count;
}

export default {
    // 1. التعامل مع الطلبات عبر المتصفح (الزر اليدوي)
    async fetch(request, env) {
        const url = new URL(request.url);

        // API لجلب الوظائف المحفوظة
        if (url.pathname === "/api/jobs") {
            const { results } = await env.DB.prepare("SELECT * FROM jobs ORDER BY id DESC").all();
            return new Response(JSON.stringify(results), { 
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
            });
        }

        // API للمزامنة اليدوية
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

        // الصفحة الرئيسية
        return new Response(`<h1>JobNova is Running</h1><p>Automatic Sync: Hourly</p><p>Status: All systems go!</p>`, { 
            headers: { "Content-Type": "text/html" } 
        });
    },

    // 2. معالجة المزامنة التلقائية (Cron Trigger)
    async scheduled(event, env, ctx) {
        console.log("Cron triggered sync...");
        ctx.waitUntil(syncJobs(env));
    }
};
