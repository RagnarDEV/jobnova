# JobNova — Cloudflare Worker (Remote Job Board)
.......... 
## هيكل المشروع (احترافي، مفصول بالكامل، قابل للتوسع)

```
jobnova/
├── wrangler.toml                    # main = "src/index.js"
├── package.json
├── .github/workflows/deploy.yml     # نشر تلقائي عند push إلى main
└── src/
    ├── index.js                     # نقطة الدخول الوحيدة — راوتر رفيع فقط (لا منطق عرض بداخله)
    │
    ├── config/
    │   └── constants.js             # CATEGORY_META, CATEGORY_ORDER, FEATURED_COMPANIES, BASE_URL
    │
    ├── assets/
    │   ├── favicon.js               # SVG + PNG/ICO (base64) + روابط <head> الخاصة بالأيقونات
    │   └── manifest.js              # manifest.json الديناميكي
    │
    ├── db/
    │   ├── schema.js                # ensureTable — إنشاء فقط، لا يحذف بيانات أبداً
    │   ├── sync.js                  # مزامنة الوظائف (يدعم مصادر API متعددة)
    │   └── analytics.js             # سجلّ المزامنة + تتبع الزوار
    │
    ├── auth/
    │   └── admin-auth.js            # كوكي أدمن موقّع بـ HMAC (بدون تخزين جلسات)
    │
    ├── styles/
    │   └── shared-css.js            # كل التصاميم/الألوان/الأنماط المشتركة
    │
    ├── components/
    │   ├── nav.js                   # الشريط العلوي + قائمة الجوال
    │   ├── footer.js                # الفوتر متعدد الأعمدة
    │   ├── post-job-modal.js        # نافذة "أضف وظيفة" (تعمل في كل الصفحات)
    │   └── job-card.js              # كل ما يخص عرض بطاقة الوظيفة (شعار، وسوم، تصنيف تلقائي)
    │
    ├── layout/
    │   └── base-layout.js           # القالب العام (HTML shell) لكل صفحات SSR
    │
    ├── pages/
    │   ├── home.js                  # الصفحة الرئيسية (SPA) + SSR لأول صفحة وظائف
    │   ├── job-page.js               # صفحة الوظيفة المفردة
    │   ├── blog.js                   # فهرس + مقالة المدونة
    │   ├── static-pages.js           # الخصوصية / الشروط / الإخلاء
    │   ├── seo-pages.js              # categories / companies / skills / search
    │   └── admin.js                  # صفحة تسجيل الدخول + لوحة التحكم
    │
    ├── data/
    │   ├── blog-posts.js             # محتوى المدونة (ثابت، كما كان)
    │   └── static-content.js         # نصوص الصفحات الثابتة
    │
    ├── routes/                       # كل ملف = معالج مسارات واحد، يُرجع Response أو null
    │   ├── assets.router.js          # /favicon.*  /manifest.json  /robots.txt
    │   ├── feed.router.js            # /sitemap.xml  /feed.rss
    │   ├── admin.router.js           # /admin/*
    │   ├── pages.router.js           # /job/:id  /blog*  /privacy  /terms  /disclaimer  /
    │   ├── seo-pages.router.js       # /categories* /companies* /skills* /search/*
    │   └── api.router.js             # /api/*
    │
    └── lib/                          # مكتبة SEO البرمجية (بدون تغيير منطقي عن الإصدار السابق)
        ├── entities.js
        ├── schema.js
        ├── seo.js
        ├── metadata.js
        ├── breadcrumbs.js
        ├── cache.js
        └── sitemap.js
```

## لماذا هذا الهيكل ولا غيره

- **`src/index.js` أصبح فعلاً رفيعاً**: 60 سطراً فقط، مهمته الوحيدة تمرير الطلب لأول Router يتعرّف على المسار.
  لا يوجد بداخله أي HTML أو CSS أو استعلام D1 مباشر.
- **كل Router يُرجع `null` إن لم يكن المسار من اختصاصه** — نمط "chain of responsibility" قياسي، يجعل
  إضافة مسار جديد مستقبلاً = إنشاء Router جديد + سطر واحد في `index.js`، دون لمس أي شيء آخر.
- **الفصل بين `pages/` (تُنتج HTML) و`routes/` (تتعامل مع HTTP)**: كل دالة `render*` في `pages/`
  دالة نقية (pure) تقريباً — تأخذ بيانات وتُرجع نص HTML، لا تلمس `Request`/`Response` مطلقاً. هذا يجعلها
  قابلة للاختبار بشكل مستقل تماماً.
- **لا يوجد كود ميت هذه المرة**: كل ملف مُستورَد فعلياً ومُختبَر فعلياً (راجع قسم الاختبار أدناه).

## الحفاظ الكامل على الميزات (لا تنازل)

تم اختبار **كل** ميزة موجودة سابقاً فعلياً (fetch حقيقي، ليس فحصاً نظرياً):
تصفح الوظائف، الصفحة الرئيسية SSR، صفحة الوظيفة (مع الروابط الداخلية للشركة/المهارة/التصنيف)،
المدونة، الصفحات الثابتة، `/categories` `/companies` `/skills` `/search`، الأدمن (تسجيل دخول → لوحة
تحكم → تسجيل خروج، بكوكي حقيقي)، "أضف وظيفة" (إرسال → تخزين pending)، `sitemap.xml`، `feed.rss`
(يشمل المدونة الآن)، `robots.txt`، `manifest.json`، وكل صيغ الفافيكون.

## قاعدة البيانات — بدون أي تغيير

نفس الجداول بالضبط: `jobs`, `subscribers`, `sync_logs`, `visits`, `api_sources`, `job_postings`.
`ensureTable()` في `src/db/schema.js` لا يحتوي أي `DROP TABLE`. المزامنة تستخدم
`INSERT OR IGNORE` على عمود `url` الفريد كما كانت دائماً.

## النشر

### أ) أسرار الـ Worker (مرة واحدة، من جهازك):
```bash
wrangler secret put API_KEY
wrangler secret put ADMIN_PASSWORD
```

### ب) أسرار GitHub Actions (Settings → Secrets and variables → Actions):
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

### ج) النشر:
```bash
git add -A
git commit -m "JobNova: professional modular architecture + SEO expansion"
git push origin main
```

Cloudflare Wrangler يجمّع (bundle) كل ملفات `src/**/*.js` المستوردة تلقائياً عبر esbuild — لا حاجة
لأي إعداد بناء إضافي، ولا تغيير مطلوب في `wrangler.toml`.

## التحقق بعد النشر

- `/sitemap.xml` → يحتوي `/companies/...`, `/skills/...`, `/categories/...`
- `/companies`, `/categories`, `/skills`, `/search/python` → 200 بدون خطأ
- `/job/123` → اسم الشركة، المهارات، والتصنيف روابط قابلة للنقر
- `/admin` بدون كوكي → نموذج تسجيل الدخول (وليس لوحة التحكم)
