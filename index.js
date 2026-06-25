export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. مسار الـ API: جلب الوظائف المحفوظة من قاعدة بيانات D1 وترتيبها من الأحدث للأقدم
    if (url.pathname === "/api/jobs") {
      try {
        const { results } = await env.db.prepare("SELECT * FROM jobs ORDER BY id DESC").all();
        return new Response(JSON.stringify(results), {
          headers: {
            "Content-Type": "application/json;charset=UTF-8",
            "Access-Control-Allow-Origin": "*"
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json;charset=UTF-8" }
        });
      }
    }

    // 2. مسار الـ API: الاتصال بـ JobDataLake ومزامنة وتعدين الوظائف الجديدة
    if (url.pathname === "/api/sync") {
      try {
        // جلب المفتاح السري المحفوظ في إعدادات كلاود فلير الآمنة
        const apiKey = env.API_KEY;
        if (!apiKey) {
          throw new Error("API_KEY is missing in Cloudflare environment variables.");
        }

        // إرسال طلب لجلب الوظائف عن بعد من JobDataLake
        const response = await fetch("https://api.jobdatalake.com/v1/jobs", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }
        });

        if (!response.ok) {
          throw new Error(`JobDataLake API responded with status: ${response.status}`);
        }

        const data = await response.json();
        
        // استخراج مصفوفة الوظائف (تتعامل المنصة عادة مع مصفوفة مباشرة أو داخل كائن data.jobs)
        const jobs = Array.isArray(data) ? data : (data.jobs || data.results || []);
        
        let savedCount = 0;

        // الدوران حول الوظائف القادمة وحفظها في قاعدة البيانات D1
        for (const job of jobs) {
          // استخراج الحقول الأساسية وتجهيز قيم افتراضية في حال غياب بعضها
          const title = job.title || job.job_title || "Remote Position";
          const company = job.company || job.company_name || "Confidential Company";
          const location = job.location || "Remote";
          const urlLink = job.url || job.job_url || "#";
          const description = job.description || "";

          // إدخال البيانات في قاعدة البيانات (مع منع التكرار بناءً على رابط الوظيفة أو العنوان والشركة)
          await env.db.prepare(`
            INSERT INTO jobs (title, company, location, url, description) 
            SELECT ?, ?, ?, ?, ?
            WHERE NOT EXISTS (SELECT 1 FROM jobs WHERE url = ? OR (title = ? AND company = ?))
          `).bind(title, company, location, urlLink, description, urlLink, title, company).run();
          
          savedCount++;
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: `Successfully synced! Processed ${jobs.length} jobs and updated database.` 
        }), {
          headers: { "Content-Type": "application/json;charset=UTF-8" }
        });

      } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json;charset=UTF-8" }
        });
      }
    }

    // 3. الواجهة الأمامية للموقع (HTML + JS)
    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>JobNova API Portal</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding-top: 50px; background-color: #f9f9f9; color: #333; }
        h1 { color: #222; }
        .btn { background-color: #0070f3; color: white; border: none; padding: 12px 24px; font-size: 16px; border-radius: 5px; cursor: pointer; margin-top: 20px; transition: opacity 0.2s; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        a { display: block; margin-top: 20px; color: #0070f3; text-decoration: none; font-weight: bold; }
        #status { margin-top: 15px; font-weight: bold; font-size: 15px; }
    </style>
</head>
<body>
    <h1>Welcome to JobNova! 🚀</h1>
    <p>The Worker and D1 Database are connected and running successfully.</p>
    
    <button id="syncBtn" class="btn">🔄 Sync Jobs Now</button>
    <div id="status"></div>

    <a href="/api/jobs">← Browse Saved Jobs (API)</a>

    <script>
        const btn = document.getElementById('syncBtn');
        const statusDiv = document.getElementById('status');

        btn.addEventListener('click', async () => {
            btn.disabled = true;
            statusDiv.style.color = 'orange';
            statusDiv.innerText = 'Mining and syncing jobs from JobDataLake...';

            try {
                const response = await fetch('/api/sync');
                const data = await response.json();
                
                if (data.success) {
                    statusDiv.style.color = 'green';
                    statusDiv.innerText = '✅ ' + data.message;
                } else {
                    statusDiv.style.color = 'red';
                    statusDiv.innerText = '❌ Error: ' + data.error;
                }
            } catch (error) {
                statusDiv.style.color = 'red';
                statusDiv.innerText = '❌ Connection error occurred.';
            } finally {
                btn.disabled = false;
            }
        });
    </script>
</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8" }
    });
  }
};
