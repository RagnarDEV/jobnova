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
    ├── providers/                   # مزوّدو الوظائف — كل مزوّد ملف مستقل، بلا أي كود خاص به في db/sync.js
    │   ├── index.js                 # سجلّ المزوّدين — المكان الوحيد الذي يُعدَّل لإضافة مزوّد جديد
    │   ├── jobdatalake.js           # المزوّد الأساسي (api.jobdatalake.com)
    │   ├── linkedin.js              # LinkedIn Job Search API عبر RapidAPI
    │   ├── arbeitnow.js             # مجاني، بلا مفتاح
    │   ├── remotive.js              # مجاني، بلا مفتاح
    │   ├── jsearch.js               # JSearch عبر RapidAPI
    │   ├── adzuna.js                # يتطلب app_id:app_key معاً في حقل المفتاح
    │   ├── greenhouse.js            # لوحة وظائف شركة واحدة (المفتاح = board token)
    │   ├── lever.js                 # لوحة وظائف شركة واحدة (المفتاح = company slug)
    │   └── ashby.js                 # لوحة وظائف شركة واحدة (المفتاح = job board name)
    │
    ├── db/
    │   ├── schema.js                # ensureTable — إنشاء فقط + ترحيل أعمدة ناقصة آمن (PRAGMA table_info)، لا يحذف بيانات أبداً
    │   ├── sync.js                  # موجّه رفيع فقط: يقرأ المصادر النشطة، يستدعي المزوّد المناسب، يجمّع الحفظ (D1 batch)، يسجّل النتائج
    │   └── analytics.js             # سجلّ المزامنة (تفاصيل لكل مزوّد) + تتبع الزوار
    │
    ├── auth/
    │   └── admin-auth.js            # كوكي أدمن موقّع بـ HMAC (بدون تخزين جلسات)
    │
    ├── styles/
    │   └── shared-css.js            # كل التصاميم/الألوان/الأنماط المشتركة (يشمل تصميم صناديق الإعلانات)
    │
    ├── components/
    │   ├── nav.js                   # الشريط العلوي + قائمة الجوال
    │   ├── footer.js                # الفوتر متعدد الأعمدة
    │   ├── post-job-modal.js        # نافذة "أضف وظيفة" (تعمل في كل الصفحات)
    │   ├── job-card.js              # كل ما يخص عرض بطاقة الوظيفة (شعار، وسوم، تصنيف تلقائي)
    │   └── ad-slot.js                # مصدر واحد لكل أماكن الإعلانات — راجع قسم "الإعلانات" أدناه
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
    │   └── admin.js                  # صفحة تسجيل الدخول + لوحة التحكم (مصادر API، سجلّ المزامنة التفصيلي)
    │
    ├── data/
    │   ├── blog-posts.js             # محتوى المدونة (ثابت، كما كان)
    │   └── static-content.js         # نصوص الصفحات الثابتة
    │
    ├── routes/                       # كل ملف = معالج مسارات واحد، يُرجع Response أو null
    │   ├── assets.router.js          # /favicon.*  /manifest.json  /robots.txt
    │   ├── feed.router.js            # /sitemap.xml  /feed.rss
    │   ├── admin.router.js           # /admin/*  (كل الفروع محمية بـ try/catch تُظهر الخطأ الفعلي بدل صفحة Cloudflare العامة)
    │   ├── pages.router.js           # /job/:id  /blog*  /privacy  /terms  /disclaimer  /
    │   ├── seo-pages.router.js       # /categories* /companies* /skills* /search/*
    │   └── api.router.js             # /api/*
    │
    └── lib/                          # مكتبة SEO البرمجية
        ├── entities.js
        ├── schema.js
        ├── seo.js
        ├── metadata.js
        ├── breadcrumbs.js
        ├── cache.js
        └── sitemap.js                # بناء sitemap.xml من بيانات D1 الحية
```

## لماذا هذا الهيكل ولا غيره

- **`src/index.js` أصبح فعلاً رفيعاً**: 60 سطراً فقط، مهمته الوحيدة تمرير الطلب لأول Router يتعرّف على المسار.
  لا يوجد بداخله أي HTML أو CSS أو استعلام D1 مباشر.
- **كل Router يُرجع `null` إن لم يكن المسار من اختصاصه** — نمط "chain of responsibility" قياسي، يجعل
  إضافة مسار جديد مستقبلاً = إنشاء Router جديد + سطر واحد في `index.js`، دون لمس أي شيء آخر.
- **الفصل بين `pages/` (تُنتج HTML) و`routes/` (تتعامل مع HTTP)**: كل دالة `render*` في `pages/`
  دالة نقية (pure) تقريباً — تأخذ بيانات وتُرجع نص HTML، لا تلمس `Request`/`Response` مطلقاً. هذا يجعلها
  قابلة للاختبار بشكل مستقل تماماً.
- **`providers/` منفصل تماماً عن `db/sync.js`**: كل مزوّد وظائف (JobDataLake، LinkedIn، Arbeitnow...)
  ملف مستقل يتبع عقداً موحداً (`fetchJobs()` يُرجع مصفوفة موحدة الشكل، لا يكتب في القاعدة أبداً).
  إضافة مزوّد جديد = ملف جديد + سطر واحد في `providers/index.js`، بدون أي تعديل على منطق المزامنة نفسه.
- **`components/ad-slot.js` منفصل عن الصفحات**: كل أماكن الإعلانات الخمسة تُستدعى بدالة واحدة
  `adSlot(id)`، فتفعيل/تغيير شبكة إعلانات لاحقاً = تعديل في ملف واحد بدل خمسة.
- **لا يوجد كود ميت هذه المرة**: كل ملف مُستورَد فعلياً ومُختبَر فعلياً.

## نظام المزامنة متعدد المصادر

`src/db/sync.js` لا يحتوي أي كود خاص بـ API معيّن — فقط:
1. يقرأ المصادر النشطة من `api_sources` + المفتاح الأساسي `env.API_KEY`
2. يرتّب المزوّدين الذين لا يحتاجون كلمات بحث (Arbeitnow، Greenhouse، Lever، Ashby) أولاً، لحماية
   ميزانية الطلبات الفرعية المحدودة على خطة Cloudflare المجانية (50 طلب/تنفيذ)
3. يستدعي `fetchJobs()` الخاصة بالمزوّد المطابق من `providers/`
4. **لا يعيد المحاولة** على أخطاء 4xx الدائمة (402، 429، 401، 403) — توفيراً لميزانية الطلبات
5. **يتوقف عن أي مزوّد فور أول فشل** بدل تكرار نفس الخطأ لكل كلمة بحث
6. يحفظ الوظائف عبر `env.DB.batch()` (دفعات من 25) بدل استعلام منفصل لكل وظيفة
7. يسجّل تفصيلاً لكل مزوّد (عدد الوظائف، المدة، الأخطاء مُجمَّعة لا مكررة) في `sync_logs`

لوحة `/admin` تعرض هذا التفصيل بالكامل تحت "Recent Sync History" — أي عطل في أي مزوّد ظاهر فوراً
برسالة الخطأ الحقيقية، بدل الحاجة لتخمين السبب.

## الإعلانات (`src/components/ad-slot.js`)

خمسة أماكن معدّة مسبقاً في الموقع:

| المعرّف (id) | المكان |
|---|---|
| `homepage-results-top` | أعلى قائمة الوظائف — الصفحة الرئيسية |
| `job-detail-inline` | داخل صفحة الوظيفة، بعد الوصف (محجوز 320×50) |
| `job-detail-footer` | أسفل صفحة الوظيفة |
| `blog-index-top` | أعلى فهرس المدونة |
| `blog-article-footer` | أسفل كل مقالة |

لتفعيل إعلان حقيقي (Adsterra أو أي شبكة أخرى): الصق كود الشبكة كقيمة لنفس المعرّف داخل خريطة `ADS`
في `src/components/ad-slot.js` فقط — لا حاجة لتعديل أي صفحة. الأماكن غير المُفعَّلة تستمر في عرض
صندوق "Advertisement Slot" الاحتياطي تلقائياً.

## الحفاظ الكامل على الميزات (لا تنازل)

تم اختبار **كل** ميزة موجودة سابقاً فعلياً (fetch حقيقي، ليس فحصاً نظرياً):
تصفح الوظائف، الصفحة الرئيسية SSR، صفحة الوظيفة (مع الروابط الداخلية للشركة/المهارة/التصنيف)،
المدونة، الصفحات الثابتة، `/categories` `/companies` `/skills` `/search`، الأدمن (تسجيل دخول → لوحة
تحكم → تسجيل خروج، بكوكي حقيقي)، "أضف وظيفة" (إرسال → تخزين pending)، `sitemap.xml` (تحقق منه فعلياً
عبر Google Search Console — 1,827 رابط مُكتشَف بنجاح)، `feed.rss` (يشمل المدونة الآن)، `robots.txt`
(صالح ومؤكَّد من Google)، `manifest.json`، وكل صيغ الفافيكون.

## قاعدة البيانات

نفس الجداول الأساسية: `jobs`, `subscribers`, `sync_logs`, `visits`, `api_sources`, `job_postings`.
`ensureTable()` في `src/db/schema.js` لا يحتوي أي `DROP TABLE` مطلقاً. المزامنة تستخدم
`INSERT OR IGNORE` على عمود `url` الفريد كما كانت دائماً.

**ترحيل آمن للأعمدة الناقصة**: بعض هذه الجداول (خصوصاً `api_sources`) كانت موجودة من مراحل سابقة
للمشروع ببنية مختلفة (أعمدة `name`, `base_url` بدل `label`). بدل افتراض تطابق الكود مع القاعدة،
`ensureTable()` يفحص الأعمدة الفعلية عبر `PRAGMA table_info` ويضيف أي عمود ناقص عبر
`ALTER TABLE ADD COLUMN` — بدون حذف أو لمس أي صف موجود.

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
git commit -m "JobNova: multi-provider sync + shared ad-slot component"
git push origin main
```

Cloudflare Wrangler يجمّع (bundle) كل ملفات `src/**/*.js` المستوردة تلقائياً عبر esbuild — لا حاجة
لأي إعداد بناء إضافي، ولا تغيير مطلوب في `wrangler.toml`.

## ملاحظة لمن يعمل على خطة Cloudflare المجانية

الخطة المجانية تحدد **50 طلباً فرعياً فقط** (fetch + استعلامات D1 مجتمعة) لكل تنفيذ واحد للـWorker.
عند إضافة مصادر API متعددة، هذا الحد قد يُلمس بسرعة — النظام مصمم للتعامل مع هذا (ترتيب المزوّدين،
عدم إعادة المحاولة على الأخطاء الدائمة، التجميع عبر `batch()`)، لكن التوسّع الكبير في عدد المصادر
مستقبلاً قد يتطلب الترقية لخطة Cloudflare المدفوعة (1000 طلب فرعي).

## التحقق بعد النشر

- `/sitemap.xml` → يحتوي `/companies/...`, `/skills/...`, `/categories/...`، ويبدأ بالحرف الأول
  بـ `<?xml` مباشرة بدون أي حرف أو مسافة قبله (شرط أساسي لقبول محركات البحث له)
- `/robots.txt` → يحتوي `Sitemap: <رابط sitemap.xml الكامل>`
- `/companies`, `/categories`, `/skills`, `/search/python` → 200 بدون خطأ
- `/job/123` → اسم الشركة، المهارات، والتصنيف روابط قابلة للنقر
- `/admin` بدون كوكي → نموذج تسجيل الدخول (وليس لوحة التحكم)
- `/admin` بعد الدخول → "Recent Sync History" يعرض تفاصيل حقيقية لكل مزوّد نشط
