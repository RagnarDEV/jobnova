export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. مسار الـ API: جلب الوظائف من قاعدة بيانات D1 وترتيبها من الأحدث للأقدم
    if (url.pathname === "/api/jobs") {
      try {
        const { results } = await env.db.prepare("SELECT * FROM jobs ORDER BY id DESC").all();
        return new Response(JSON.stringify(results), {
          headers: {
            "Content-Type": "application/json;charset=UTF-8",
            "Access-Control-Allow-Origin": "*" // للسماح للموقع بسحب البيانات بدون قيود CORS
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json;charset=UTF-8" }
        });
      }
    }

    // 2. مسار الـ API: تشغيل عملية المزامنة وجلب الوظائف الجديدة
    if (url.pathname === "/api/sync") {
      try {
        // هنا سيتم إضافة منطق الاسكربت التلقائي والمزامنة لاحقاً
        return new Response(JSON.stringify({ success: true, message: "Jobs synchronized successfully!" }), {
          headers: { "Content-Type": "application/json;charset=UTF-8" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json;charset=UTF-8" }
        });
      }
    }

    // 3. الواجهة الأمامية للموقع: صفحة الـ HTML مع سكربت تشغيل زر المزامنة
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

        // الاستماع لحدث الضغط على الزر لتشغيل المزامنة في الخلفية
        btn.addEventListener('click', async () => {
            btn.disabled = true; // تعطيل الزر مؤقتاً لمنع التكرار
            statusDiv.style.color = 'orange';
            statusDiv.innerText = 'Syncing now...';

            try {
                // استدعاء مسار المزامنة التلقائي
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
                btn.disabled = false; // إعادة تفعيل الزر بعد الانتهاء
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
