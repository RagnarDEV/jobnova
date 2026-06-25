export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. مسار الـ API لعرض الوظائف المخزنة بتنسيق JSON (للتأكد من عمل الـ DB)
    if (url.pathname === "/api/jobs") {
      try {
        const { results } = await env.DB.prepare("SELECT * FROM jobs ORDER BY id DESC").all();
        return new Response(JSON.stringify(results || []), {
          headers: {
            "Content-Type": "application/json;charset=UTF-8",
            "Access-Control-Allow-Origin": "*"
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // 2. مسار جلب ومزامنة الوظائف من مصدر خارجي وحفظها في قاعدة البيانات D1
    if (url.pathname === "/api/sync") {
      try {
        // جلب وظائف حقيقية من API مفتوح ومستقر
        const response = await fetch("https://workingnomads.com/api/v2/jobs?limit=15");
        const data = await response.json();
        
        if (Array.isArray(data)) {
          for (const job of data) {
            await env.DB.prepare(
              "INSERT OR IGNORE INTO jobs (title, company, location, url, source) VALUES (?, ?, ?, ?, ?)"
            ).bind(
              job.title || "Remote Role",
              job.company_name || "Remote Company",
              job.location || "Remote",
              job.url || "https://workingnomads.com",
              "Working Nomads"
            ).run();
          }
        }

        return new Response(JSON.stringify({ success: true, count: data.length }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
      }
    }

    // 3. الصفحة الرئيسية لعرض الموقع والوظائف
    let jobsHtml = "";
    try {
      const { results } = await env.DB.prepare("SELECT * FROM jobs ORDER BY id DESC LIMIT 30").all();
      
      if (!results || results.length === 0) {
        jobsHtml = `
          <div style="text-align: center; padding: 40px; color: #7f8c8d; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <p style="font-size: 18px; margin: 0;">قاعدة البيانات فارغة حالياً 📥</p>
            <p style="font-size: 14px; margin: 5px 0 0 0; color: #95a5a6;">اضغط على زر المزامنة بالأعلى لجلب الوظائف فوراً.</p>
          </div>`;
      } else {
        jobsHtml = results.map(job => `
          <div style="background: white; padding: 20px; margin-bottom: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; direction: rtl;">
            <div style="flex: 1; min-width: 250px; text-align: right;">
              <h3 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 18px;">${job.title}</h3>
              <p style="margin: 0 0 5px 0; color: #7f8c8d; font-size: 14px;">🏢 ${job.company} | 📍 ${job.location || 'عن بُعد'}</p>
              <small style="color: #bdc3c7; font-size: 12px;">المصدر: ${job.source} | تم الحفظ تلقائياً</small>
            </div>
            <div>
              <a href="${job.url}" target="_blank" style="background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px; display: inline-block; transition: background 0.2s;">تقديم الآن 🚀</a>
            </div>
          </div>
        `).join("");
      }
    } catch (e) {
      jobsHtml = `<div style="color: red; text-align:center;">خطأ في قراءة قاعدة البيانات: ${e.message}</div>`;
    }

    const html = `<!DOCTYPE html>
    <html lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>JobNova - منصة أتمتة الوظائف</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f7fa; margin: 0; padding: 20px; color: #2c3e50; }
        .container { max-width: 800px; margin: 0 auto; }
        header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); flex-wrap: wrap; gap: 20px; direction: rtl; }
        h1 { margin: 0; font-size: 26px; color: #2c3e50; }
        .btn { background: #2ecc71; color: white; border: none; padding: 12px 25px; font-size: 15px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: all 0.3s ease; box-shadow: 0 2px 4px rgba(46, 204, 113, 0.3); }
        .btn:hover { background: #27ae60; transform: translateY(-1px); }
        .btn:disabled { background: #95a5a6; cursor: not-allowed; transform: none; box-shadow: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <div style="text-align: right;">
            <h1>🚀 منصة JobNova</h1>
            <p style="margin: 5px 0 0 0; color: #7f8c8d; font-size: 14px;">نظام ذكي ومؤتمت لجلب وأرشفة وظائف العمل عن بُعد</p>
          </div>
          <button id="syncBtn" class="btn" onclick="syncJobs()">🔄 مزامنة الوظائف الآن</button>
        </header>

        <div id="jobsList">
          ${jobsHtml}
        </div>
      </div>

      <script>
        async function syncJobs() {
          const btn = document.getElementById('syncBtn');
          btn.disabled = true;
          btn.innerText = '⏳ جاري جلب الوظائف وحفظها...';
          try {
            const res = await fetch('/api/sync');
            const data = await res.json();
            if (data.success) {
              alert('🎉 ممتاز! تم جلب وظائف جديدة وحفظها في قاعدة البيانات D1 بنجاح.');
              location.reload();
            } else {
              alert('❌ فشلت المزامنة: ' + data.error);
            }
          } catch (err) {
            alert('❌ حدث خطأ أثناء الاتصال بالخادم.');
          } finally {
            btn.disabled = false;
            btn.innerText = '🔄 مزامنة الوظائف الآن';
          }
        }
      </script>
    </body>
    </html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8" }
    });
  }
};
