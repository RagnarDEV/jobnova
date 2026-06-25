export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. مسار جلب الوظائف من قاعدة البيانات D1
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

    // 2. مسار تشغيل المزامنة عند الضغط على الزر (يمكنك ربطه بدالتك لاحقاً)
    if (url.pathname === "/api/sync") {
      try {
        // هنا يمكنك وضع كود المزامنة الفعلي مستقبلاً
        return new Response(JSON.stringify({ success: true, message: "تمت مزامنة الوظائف بنجاح!" }), {
          headers: { "Content-Type": "application/json;charset=UTF-8" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json;charset=UTF-8" }
        });
      }
    }

    // 3. الصفحة الرئيسية الافتراضية للمنصة (HTML + كود الـ JavaScript للزر)
    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>JobNova API</title>
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
    <h1>مرحباً بك في منصة JobNova! 🚀</h1>
    <p>يعملان معاً بنجاح Worker قاعدة البيانات والـ</p>
    
    <button id="syncBtn" class="btn">🔄 مزامنة الوظائف الآن</button>
    <div id="status"></div>

    <a href="/api/jobs">← تصفح واجهة الوظائف المحفوظة (API)</a>

    <script>
        const btn = document.getElementById('syncBtn');
        const statusDiv = document.getElementById('status');

        btn.addEventListener('click', async () => {
            btn.disabled = true;
            statusDiv.style.color = 'orange';
            statusDiv.innerText = 'جاري المزامنة الآن...';

            try {
                // استدعاء مسار المزامنة في الخلفية
                const response = await fetch('/api/sync');
                const data = await response.json();
                
                if (data.success) {
                    statusDiv.style.color = 'green';
                    statusDiv.innerText = '✅ ' + data.message;
                } else {
                    statusDiv.style.color = 'red';
                    statusDiv.innerText = '❌ خطأ: ' + data.error;
                }
            } catch (error) {
                statusDiv.style.color = 'red';
                statusDiv.innerText = '❌ حدث خطأ أثناء الاتصال بالخادم.';
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
