# JobNova v2 — إعادة بناء كاملة

## 1) هيكل الملفات

```
jobnova/
├── wrangler.toml              # إعدادات Cloudflare Worker (main يشير إلى src/index.js)
├── package.json
├── .github/workflows/deploy.yml   # نشر تلقائي عبر GitHub Actions
└── src/
    ├── index.js                # نقطة الدخول + التوجيه (Router) فقط
    ├── lib/
    │   ├── db.js                # إنشاء/تهيئة الجداول (لا يمس بيانات jobs/subscribers أبدًا)
    │   ├── sync.js              # مزامنة الوظائف من API (يدعم مصادر متعددة)
    │   └── auth.js              # مصادقة لوحة التحكم
    ├── routes/
    │   ├── jobs-api.js          # /api/jobs /api/subscribe /api/debug
    │   ├── feed.js               # /sitemap.xml /feed.rss
    │   ├── admin.js               # كل مسارات /admin و /api/admin/*
    │   └── assets.js              # تقديم /assets/app.js
    ├── templates/
    │   ├── styles.js              # كل CSS مقسّم إلى وحدات (Tokens/Nav/Ads/Page/Home)
    │   ├── layout.js              # القالب العام لصفحات SSR
    │   ├── components.js          # مكوّنات HTML مشتركة (الشعار، الوسوم، adSlot)
    │   ├── home.js                 # صفحة لوحة الوظائف (SPA)
    │   ├── job-page.js             # صفحة الوظيفة المفردة
    │   ├── blog.js                  # المدونة + الصفحات الثابتة
    │   └── admin.js                 # صفحات لوحة التحكم
    ├── data/
    │   ├── blog-posts.js           # محتوى المدونة (محفوظ كما كان)
    │   └── static-content.js       # الخصوصية/الشروط/الإخلاء
    └── client/
        └── app.js                  # جافاسكربت الواجهة الأمامية (يُقدَّم كملف مستقل)
```

Cloudflare Wrangler يجمّع (bundle) كل هذه الملفات تلقائيًا عند تشغيل `wrangler deploy`، فلا حاجة لأي أداة بناء إضافية في GitHub Actions — فقط استبدل الملفات القديمة بهذا الهيكل وارفعه كما كنت تفعل.

## 2) الحفاظ على البيانات (الأهم)

- جدولا `jobs` و `subscribers` **بنفس الاسم ونفس الأعمدة تمامًا** كما كانا — لن تُفقد أي وظيفة موجودة حاليًا في D1.
- تم **حذف** المسار القديم `/api/migrate` الذي كان ينفّذ `DROP TABLE` ويمسح كل شيء. الجداول الجديدة (`api_sources`, `settings`, `sync_logs`) تُضاف بجانب الجداول القديمة فقط.
- المزامنة تستخدم `INSERT OR IGNORE` على عمود `url` الفريد، فلا يحدث تكرار ولا فقد بيانات.

## 3) الإصلاحات

- تم إصلاح خطأ الصياغة القاتل (`function (url.pathname===...)`) في `/sitemap.xml` الذي كان يمنع نشر الملف كله.
- تمت إزالة `id` مكرر كان سيسبب تعارضًا في DOM بين قائمة الفلاتر في الجوال وسطح المكتب.

## 4) الإعلانات

كل مكان مخصص لإعلان الآن هو مكوّن موحّد `adSlot(id, note)` من `templates/components.js`، ويظهر في الصفحة كـ:

```html
<div class="ad-slot" data-ad-slot="job-page-mid">
  <div class="ad-slot-label">Advertisement · 320x50</div>
  <div class="ad-slot-inner" id="ad-job-page-mid">
    <!-- AD SLOT: job-page-mid — ضع هنا كود شبكة الإعلانات -->
  </div>
</div>
```

اماكن الإعلانات الحالية: `sidebar`, `jobs-list-top`, `job-page-mid`, `job-page-bottom`, `blog-index-top`, `blog-article-bottom`. أضف المزيد بنفس الطريقة أينما أردت.

## 5) لوحة التحكم `/admin`

1. فعّلها بتعيين كلمة مرور: `wrangler secret put ADMIN_PASSWORD`
2. سجّل الدخول من `/admin`.
3. تعرض اللوحة: إجمالي الوظائف، الوظائف براتب، الوظائف عن بُعد، المشتركين، وظائف آخر 24 ساعة، تفصيل حسب التصنيف، سجل عمليات المزامنة، إدارة مصادر API، وإدارة/حذف الوظائف.
4. زر "Run Sync Now" يشغّل المزامنة يدويًا فورًا.

## 6) إضافة مفاتيح API إضافية بدون كود

من `/admin` → قسم "API Sources" أدخل: الاسم، رابط الـAPI، المفتاح (اختياري)، وكلمات البحث كمصفوفة JSON مثل `["developer","sales"]`. تتم مزامنته تلقائيًا مع كل تشغيل (يدوي أو كل ساعة عبر Cron).

## 7) الجدولة التلقائية

أضفت `[triggers] crons = ["0 * * * *"]` في `wrangler.toml` لتشغيل `scheduled()` كل ساعة تلقائيًا (كانت الدالة موجودة بالكود سابقًا لكن بلا تشغيل مضمون بدون هذا الإعداد).

## 8) خطوات النشر

```bash
# أول مرة فقط
wrangler secret put API_KEY
wrangler secret put ADMIN_PASSWORD

git add -A
git commit -m "JobNova v2: full rebuild"
git push origin main   # GitHub Actions سيتولى wrangler deploy تلقائيًا
```

## 9) ما تم الحفاظ عليه من الميزات الحالية

جميع الوظائف والمزايا الأصلية موجودة: نفس واجهة برمجة `/api/jobs` بنفس المعاملات، الحفظ/المشاركة بـ localStorage، التنبيهات بالبريد، RSS/Sitemap، صفحات SEO (JobPosting/Article schema)، المدونة، الوضع الفاتح/الداكن، والإعلانات القديمة استُبدلت بأماكن جاهزة (Ad Slots) بدل تضمينها مباشرة.
