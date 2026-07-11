// src/templates/styles.js
// Fresh visual design: refined dark palette, soft glass cards, new accent
// gradient (indigo → teal), real mobile-first layout (not just shrinking).

export const TOKENS_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#05070D;--bg2:#0A0E18;--bg3:#0F1420;
  --card:#0E131F;--card2:#131A2A;
  --border:#1B2436;--border2:#26324A;
  --accent:#6C8CFF;--accent2:#8FA6FF;--accent3:#4F6BE0;
  --teal:#2DD4BF;--teal2:#5EEAD4;
  --glow:rgba(108,140,255,.22);--glow2:rgba(108,140,255,.08);
  --green:#22D3A6;--amber:#FFB454;--red:#FF6B81;--purple:#B084F5;
  --salary:#22D3A6;--t1:#EEF2FF;--t2:#93A0C2;--t3:#586A8C;
  --r-sm:10px;--r:16px;--r-lg:22px;
  --shadow:0 10px 40px rgba(0,0,0,.45);
}
body.light{
  --bg:#F3F6FF;--bg2:#EAEFFB;--bg3:#E2E9F9;--card:#FFFFFF;--card2:#F6F9FF;
  --border:#DCE4F5;--border2:#C9D6EF;--t1:#0B1220;--t2:#4A5A80;--t3:#8595B8;
  --shadow:0 10px 30px rgba(30,50,100,.08);
}
html{scroll-behavior:smooth}
body{font-family:'Plus Jakarta Sans','Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:var(--bg);color:var(--t1);min-height:100vh;line-height:1.6;-webkit-font-smoothing:antialiased;transition:background .3s,color .3s}
::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:var(--bg2)}::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px}
a{color:inherit;text-decoration:none}
button,input,select{font-family:inherit}
@keyframes shimmer{0%{background-position:0%}100%{background-position:200%}}
@keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.6)}}
@keyframes pulse-glow{0%,100%{box-shadow:0 0 0 0 rgba(34,211,166,.25)}60%{box-shadow:0 0 0 6px rgba(34,211,166,.03)}}
@keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes skeleton{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes toast-bar{from{width:100%}to{width:0%}}
.grad-text{background:linear-gradient(135deg,var(--accent) 0%,var(--purple) 50%,var(--teal) 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 5s linear infinite}
`;

export const NAV_CSS = `
.nav{background:rgba(5,7,13,.85);backdrop-filter:blur(22px) saturate(140%);-webkit-backdrop-filter:blur(22px) saturate(140%);border-bottom:1px solid var(--border);padding:0 24px;height:62px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:200}
body.light .nav{background:rgba(255,255,255,.85)}
.nav-logo{font-size:21px;font-weight:900;letter-spacing:-1px}
.nav-links{display:flex;align-items:center;gap:4px}
.nav-link{padding:7px 13px;border-radius:9px;font-size:13px;font-weight:600;color:var(--t2);transition:all .2s}
.nav-link:hover{color:var(--t1);background:var(--card2)}
.nav-cta{background:linear-gradient(135deg,var(--accent3),var(--accent));color:#fff;border-radius:10px;padding:8px 16px;font-size:13px;font-weight:700;transition:all .2s;box-shadow:0 4px 16px rgba(108,140,255,.3)}
.nav-cta:hover{transform:translateY(-1px)}
@media(max-width:768px){.nav{display:none !important}}
`;

// AD SLOT COMPONENT — reusable, labeled banner container.
// Replace the inner placeholder with your ad network's embed code
// (e.g. AdSense, PropellerAds, Ezoic). Search this file for "AD SLOT" markers.
export const AD_CSS = `
.ad-slot{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;margin:14px 0;padding:6px;border:1px dashed var(--border2);border-radius:var(--r-sm);min-height:56px;background:var(--card)}
.ad-slot-label{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--t3);opacity:.6}
.ad-slot-inner{width:100%;display:flex;justify-content:center;align-items:center;overflow:hidden;max-height:100px}
`;

export const PAGE_CSS = `
.page{max-width:880px;margin:0 auto;padding:40px 20px 80px}
.page-sm{max-width:700px;margin:0 auto;padding:40px 20px 80px}
.breadcrumb{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--t3);margin-bottom:28px;flex-wrap:wrap}
.breadcrumb a{color:var(--accent2)}.breadcrumb a:hover{color:var(--t1)}
.glass-card{background:var(--card);border:1px solid var(--border2);border-radius:var(--r-lg);box-shadow:var(--shadow)}
.job-hero{background:var(--card);border:1px solid var(--border2);border-radius:var(--r-lg);overflow:hidden;margin-bottom:20px;position:relative;box-shadow:var(--shadow)}
.job-hero::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent3),var(--purple),var(--teal))}
.job-hero-hdr{padding:30px 26px}
.job-co-row{display:flex;align-items:center;gap:14px;margin-bottom:18px}
.job-logo{width:64px;height:64px;border-radius:16px;background:var(--bg2);border:1px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:var(--accent2);overflow:hidden;flex-shrink:0}
.job-logo img{width:100%;height:100%;object-fit:contain;padding:8px}
.job-co-name{font-size:16px;font-weight:700;color:var(--accent2);margin-bottom:3px}
.job-co-loc{font-size:12px;color:var(--t3)}
.job-title-h1{font-size:25px;font-weight:900;letter-spacing:-.5px;line-height:1.25;margin-bottom:14px;color:var(--t1)}
.job-chips{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:16px}
.job-salary-lg{font-size:22px;font-weight:800;color:var(--salary)}
.job-body{padding:26px;border-top:1px solid var(--border)}
.sec-label{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:12px}
.skills-wrap{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:24px}
.skill-tag{background:rgba(108,140,255,.1);border:1px solid rgba(108,140,255,.22);color:var(--accent2);font-size:12px;padding:5px 12px;border-radius:9px;font-weight:600}
.desc-wrap{font-size:14px;color:var(--t2);line-height:1.9;margin-bottom:24px;white-space:pre-line}
.apply-big{display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,var(--accent3),var(--accent));color:#fff;padding:15px 34px;border-radius:14px;font-size:16px;font-weight:700;text-decoration:none;transition:all .25s;box-shadow:0 6px 24px rgba(108,140,255,.35)}
.apply-big:hover{transform:translateY(-2px);box-shadow:0 10px 34px rgba(108,140,255,.5)}
.tag{display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:4px 11px;border-radius:20px;font-weight:700;white-space:nowrap}
.tag-remote{background:rgba(34,211,166,.1);color:var(--green);border:1px solid rgba(34,211,166,.22)}
.tag-hybrid{background:rgba(255,180,84,.1);color:var(--amber);border:1px solid rgba(255,180,84,.22)}
.tag-onsite{background:rgba(147,160,194,.07);color:var(--t2);border:1px solid var(--border2)}
.tag-type{background:rgba(147,160,194,.07);color:var(--t2);border:1px solid var(--border2)}
.tag-new{background:rgba(34,211,166,.13);color:var(--green);border:1px solid rgba(34,211,166,.28);font-size:10px;padding:3px 9px;font-weight:800;letter-spacing:.8px;border-radius:20px;animation:pulse-glow 2.5s ease-in-out infinite}
.tag-hot{background:rgba(255,107,129,.13);color:var(--red);border:1px solid rgba(255,107,129,.28);font-size:10px;padding:3px 9px;font-weight:800;border-radius:20px}
.tag-featured{background:rgba(176,132,245,.13);color:var(--purple);border:1px solid rgba(176,132,245,.28);font-size:10px;padding:3px 9px;font-weight:800;border-radius:20px}
.related-title{font-size:17px;font-weight:800;margin-bottom:14px;color:var(--t1)}
.related-grid{display:flex;flex-direction:column;gap:8px}
.related-card{background:var(--card);border:1px solid var(--border2);border-radius:14px;padding:14px 18px;display:flex;align-items:center;gap:14px;transition:all .2s;text-decoration:none}
.related-card:hover{border-color:var(--accent3);transform:translateX(3px)}
.related-logo{width:38px;height:38px;border-radius:9px;background:var(--bg2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:var(--accent2);overflow:hidden;flex-shrink:0}
.related-logo img{width:100%;height:100%;object-fit:contain;padding:5px}
.related-info{flex:1;min-width:0}
.related-jt{font-size:13px;font-weight:700;color:var(--t1);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.related-co{font-size:12px;color:var(--accent2)}
.related-sal{font-size:12px;font-weight:700;color:var(--salary);white-space:nowrap}
.article-cat{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--accent2);margin-bottom:12px}
.article-title{font-size:29px;font-weight:900;letter-spacing:-.5px;line-height:1.25;margin-bottom:14px;color:var(--t1)}
.article-meta{font-size:12px;color:var(--t3);display:flex;gap:16px;margin-bottom:28px;flex-wrap:wrap}
.article-body{font-size:15px;color:var(--t2);line-height:1.9}
.article-body h2{font-size:19px;font-weight:700;margin:28px 0 12px;color:var(--t1);padding-left:14px;border-left:3px solid var(--accent)}
.article-body p{margin-bottom:14px}
.article-body ul{padding-left:20px;margin-bottom:14px}
.article-body ul li{margin-bottom:8px}
.article-body strong{color:var(--t1)}
.static-title{font-size:27px;font-weight:900;margin-bottom:8px;color:var(--t1)}
.static-date{font-size:12px;color:var(--t3);margin-bottom:28px}
.static-body h2{font-size:17px;font-weight:700;margin:24px 0 10px;color:var(--t1)}
.static-body p{font-size:14px;color:var(--t2);line-height:1.8;margin-bottom:10px}
.static-body ul{padding-left:18px;margin-bottom:10px}
.static-body ul li{font-size:14px;color:var(--t2);line-height:1.8;margin-bottom:6px}
.static-body a{color:var(--accent2)}
.back-link{display:inline-flex;align-items:center;gap:7px;color:var(--t3);font-size:13px;font-weight:600;transition:color .2s;margin-bottom:24px;text-decoration:none}
.back-link:hover{color:var(--accent2)}
.footer{border-top:1px solid var(--border);padding:34px 20px;margin-top:32px}
.footer-inner{max-width:880px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px}
.footer-logo{font-size:18px;font-weight:900}
.footer-links{display:flex;gap:16px;flex-wrap:wrap}
.footer-link{font-size:12px;color:var(--t3);transition:color .2s}.footer-link:hover{color:var(--t2)}
.footer-copy{font-size:11px;color:var(--t3);width:100%}
@media(max-width:640px){
  .job-title-h1{font-size:21px}
  .article-title{font-size:23px}
  .job-hero-hdr,.job-body{padding:20px 16px}
  .apply-big{width:100%;justify-content:center}
}
`;

// ── HOME_CSS: the main job-board SPA layout ─────────────────────
// Real mobile-first design: on phones the sidebar is replaced by a
// bottom tab bar + a slide-up filter sheet, not just a shrunk desktop grid.
export const HOME_CSS = `
.app{display:flex;min-height:calc(100vh - 62px)}
.sidebar{width:264px;background:var(--bg2);border-right:1px solid var(--border);padding:22px 16px;position:sticky;top:62px;height:calc(100vh - 62px);overflow-y:auto;flex-shrink:0;display:flex;flex-direction:column;gap:20px}
.sidebar::-webkit-scrollbar{width:3px}.sidebar::-webkit-scrollbar-thumb{background:var(--border2)}
.s-title{font-size:9px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:var(--t3);margin-bottom:8px;display:flex;align-items:center;gap:7px}
.s-title::after{content:'';flex:1;height:1px;background:var(--border)}
.nav-btn{display:flex;align-items:center;gap:10px;width:100%;padding:9px 11px;border:1px solid transparent;background:transparent;color:var(--t2);border-radius:11px;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit;transition:all .2s;text-align:left}
.nav-btn:hover{background:var(--glow2);color:var(--accent2);border-color:var(--border2)}
.nav-btn.active{background:rgba(108,140,255,.1);color:var(--accent2);border-color:rgba(108,140,255,.2)}
.nav-icon{font-size:14px;width:18px;text-align:center}
.nav-count{margin-left:auto;font-size:10px;font-weight:700;background:rgba(108,140,255,.15);color:var(--accent2);padding:2px 8px;border-radius:20px}
.nav-btn.active .nav-count{background:var(--accent3);color:#fff}
.stats-card{background:rgba(108,140,255,.05);border:1px solid rgba(108,140,255,.12);border-radius:14px;padding:13px}
.stat-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0}
.stat-row:not(:last-child){border-bottom:1px solid var(--border)}
.stat-label{font-size:11px;color:var(--t3)}
.stat-val{font-size:12px;font-weight:700;color:var(--accent2)}
.footer-link-s{font-size:11px;color:var(--t3);padding:3px 0;transition:color .2s;cursor:pointer;background:none;border:none;font-family:inherit;text-align:left;text-decoration:none;display:block}
.footer-link-s:hover{color:var(--t2)}
.main{flex:1;min-width:0}
.hero{padding:40px 24px 30px;border-bottom:1px solid var(--border);background:radial-gradient(ellipse 80% 60% at 25% 0%,rgba(108,140,255,.1),transparent)}
.hero-eyebrow{display:inline-flex;align-items:center;gap:7px;background:rgba(108,140,255,.1);border:1px solid rgba(108,140,255,.2);border-radius:20px;padding:5px 13px;font-size:11px;color:var(--accent2);font-weight:700;margin-bottom:16px}
.hero-eyebrow-dot{width:5px;height:5px;border-radius:50%;background:var(--green);animation:pulse-dot 2s infinite}
.hero-title{font-size:30px;font-weight:900;letter-spacing:-1px;line-height:1.18;margin-bottom:10px;color:var(--t1)}
.hero-sub{color:var(--t2);font-size:14px;margin-bottom:22px;line-height:1.65;max-width:480px}
.hero-stats{display:flex;gap:0;margin-bottom:22px;background:var(--card);border:1px solid var(--border2);border-radius:14px;overflow:hidden;box-shadow:var(--shadow)}
.hero-stat{flex:1;padding:13px 10px;text-align:center;border-right:1px solid var(--border)}
.hero-stat:last-child{border-right:none}
.hero-stat-num{font-size:18px;font-weight:800;color:var(--t1);display:block;line-height:1.2}
.hero-stat-label{font-size:10px;color:var(--t3);font-weight:600;letter-spacing:.5px;text-transform:uppercase}
.search-wrap{position:relative;max-width:100%}
.search-icon{position:absolute;left:16px;top:50%;transform:translateY(-50%);color:var(--t3);pointer-events:none;font-size:15px}
.search-input{width:100%;background:var(--card);border:1.5px solid var(--border2);border-radius:14px;padding:14px 16px 14px 44px;color:var(--t1);font-size:14px;font-family:inherit;outline:none;transition:all .25s}
.search-input::placeholder{color:var(--t3)}
.search-input:focus{border-color:var(--accent);box-shadow:0 0 0 4px var(--glow)}
.filters-bar{padding:13px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:7px;overflow-x:auto;background:var(--bg2)}
.filters-bar::-webkit-scrollbar{height:0}
.chip{display:inline-flex;align-items:center;gap:5px;padding:7px 15px;border-radius:20px;border:1.5px solid var(--border2);background:var(--card);color:var(--t2);font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;white-space:nowrap;transition:all .2s}
.chip:hover{border-color:var(--accent3);color:var(--accent2)}
.chip.active{background:linear-gradient(135deg,var(--accent3),var(--accent));border-color:transparent;color:#fff;box-shadow:0 4px 14px rgba(108,140,255,.32)}
.adv-filters{padding:13px 20px;border-bottom:1px solid var(--border);display:none;gap:10px;flex-wrap:wrap;background:var(--bg);align-items:flex-end}
.adv-filters.open{display:flex}
.filter-select{background:var(--card);border:1px solid var(--border2);border-radius:9px;padding:8px 12px;color:var(--t2);font-size:12px;font-family:inherit;cursor:pointer;outline:none}
.filter-select:focus{border-color:var(--accent);color:var(--t1)}
.filter-label{font-size:10px;font-weight:700;color:var(--t3);display:flex;flex-direction:column;gap:4px;letter-spacing:.5px;text-transform:uppercase}
.salary-input{width:90px;background:var(--card);border:1px solid var(--border2);border-radius:9px;padding:8px 10px;color:var(--t1);font-size:12px;font-family:inherit;outline:none}
.salary-input:focus{border-color:var(--accent)}
.clear-btn{padding:8px 15px;border-radius:9px;border:1px solid var(--border2);background:transparent;color:var(--t3);font-size:12px;cursor:pointer;font-family:inherit;transition:all .2s}
.clear-btn:hover{color:var(--red);border-color:var(--red)}
.content-wrap{padding:22px}
.results-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;gap:10px;flex-wrap:wrap}
.results-count{font-size:13px;color:var(--t3)}
.results-count strong{color:var(--t1);font-weight:700}
.adv-toggle-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 15px;border-radius:10px;border:1px solid var(--border2);background:var(--card);color:var(--t2);font-size:12px;cursor:pointer;font-family:inherit;transition:all .2s;font-weight:600}
.adv-toggle-btn:hover,.adv-toggle-btn.active{background:var(--glow2);border-color:var(--accent3);color:var(--accent2)}
.jobs-list{display:flex;flex-direction:column;gap:9px}
.job-card{background:var(--card);border:1px solid var(--border2);border-radius:16px;display:block;text-decoration:none;color:inherit;transition:all .25s;position:relative;overflow:hidden}
.job-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,var(--accent3),var(--purple));opacity:0;transition:opacity .25s;border-radius:3px 0 0 3px}
.job-card:hover{border-color:rgba(108,140,255,.35);transform:translateY(-1px);box-shadow:0 8px 30px rgba(0,0,0,.35);background:var(--card2)}
.job-card:hover::before{opacity:1}
.card-inner{padding:17px}
.card-row1{display:flex;align-items:flex-start;gap:13px}
.co-logo{width:46px;height:46px;border-radius:12px;background:var(--bg2);border:1px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:var(--accent2);overflow:hidden;flex-shrink:0}
.co-logo img{width:100%;height:100%;object-fit:contain;padding:6px}
.card-body{flex:1;min-width:0}
.card-badges{display:flex;align-items:center;gap:5px;margin-bottom:5px;flex-wrap:wrap}
.job-title-card{font-size:14px;font-weight:700;color:var(--t1);line-height:1.3;margin-bottom:4px;transition:color .2s}
.job-card:hover .job-title-card{color:var(--accent2)}
.job-co-card{font-size:12px;color:var(--accent2);font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:5px}
.job-meta-row{display:flex;flex-wrap:wrap;gap:5px;align-items:center}
.card-right{display:flex;align-items:center;justify-content:space-between;margin-top:11px;padding-top:11px;border-top:1px solid var(--border)}
.salary-badge{font-size:12px;font-weight:700;color:var(--salary);background:rgba(34,211,166,.09);border:1px solid rgba(34,211,166,.2);padding:5px 12px;border-radius:9px;white-space:nowrap}
.card-actions{display:flex;align-items:center;gap:5px}
.act-btn{width:33px;height:33px;border-radius:9px;background:var(--bg2);border:1px solid var(--border2);color:var(--t3);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;transition:all .2s;position:relative;z-index:1}
.act-btn:hover{background:var(--card2);color:var(--t1);transform:scale(1.08)}
.act-btn.saved{background:rgba(255,180,84,.1);border-color:var(--amber);color:var(--amber)}
.arr-btn{width:33px;height:33px;border-radius:9px;background:rgba(108,140,255,.13);border:1px solid rgba(108,140,255,.2);color:var(--accent2);display:flex;align-items:center;justify-content:center;font-size:15px;transition:all .25s}
.job-card:hover .arr-btn{background:linear-gradient(135deg,var(--accent3),var(--accent));border-color:transparent;color:#fff}
.card-footer{padding:9px 17px;border-top:1px solid var(--border);background:rgba(0,0,0,.1);display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--t3)}
body.light .card-footer{background:rgba(0,0,0,.02)}
.tag-loc{color:var(--t3);font-size:11px}
.toast{position:fixed;bottom:20px;right:16px;background:var(--card2);border:1px solid var(--border2);border-radius:14px;padding:13px 19px;font-size:13px;color:var(--t1);display:flex;align-items:center;gap:10px;box-shadow:0 10px 36px rgba(0,0,0,.5);transform:translateY(100px);opacity:0;transition:all .3s;z-index:9999;max-width:300px}
.toast.show{transform:translateY(0);opacity:1}
.toast-bar{position:absolute;bottom:0;left:0;height:2px;background:var(--accent);border-radius:0 0 14px 14px;animation:toast-bar 3s linear forwards}
.empty{text-align:center;padding:64px 16px;color:var(--t3)}
.empty .e-icon{font-size:44px;margin-bottom:12px;opacity:.4}
.empty h3{font-size:17px;color:var(--t2);margin-bottom:6px;font-weight:700}
.empty p{font-size:13px}
.loader-wrap{padding:64px 16px;text-align:center}
.loader{display:inline-block;width:32px;height:32px;border:3px solid var(--border2);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite}
.skel{background:linear-gradient(90deg,var(--card) 25%,var(--card2) 50%,var(--card) 75%);background-size:200% 100%;animation:skeleton 1.5s infinite;border-radius:8px}
.pagination{display:flex;align-items:center;justify-content:center;gap:7px;padding:26px 0 12px}
.page-btn{padding:9px 17px;border-radius:10px;border:1.5px solid var(--border2);background:var(--card);color:var(--t2);font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;transition:all .2s}
.page-btn:hover:not(:disabled){border-color:var(--accent3);color:var(--accent2)}
.page-btn:disabled{opacity:.3;cursor:default}
.page-info{font-size:13px;color:var(--t3);padding:0 8px}
.form-card{background:var(--card);border:1px solid var(--border2);border-radius:18px;padding:30px 22px;max-width:540px;box-shadow:var(--shadow)}
.form-group{margin-bottom:18px}
.form-label{font-size:11px;font-weight:700;color:var(--t2);margin-bottom:7px;display:block;letter-spacing:.5px;text-transform:uppercase}
.form-input{width:100%;background:var(--bg2);border:1.5px solid var(--border2);border-radius:11px;padding:13px 15px;color:var(--t1);font-size:14px;font-family:inherit;outline:none;transition:all .25s}
.form-input:focus{border-color:var(--accent);box-shadow:0 0 0 4px var(--glow)}
.form-input::placeholder{color:var(--t3)}
.submit-btn{width:100%;background:linear-gradient(135deg,var(--accent3),var(--accent));color:#fff;padding:14px;border-radius:11px;font-size:15px;font-weight:700;font-family:inherit;border:none;cursor:pointer;box-shadow:0 6px 22px rgba(108,140,255,.32);transition:all .25s}
.submit-btn:hover{transform:translateY(-1px)}
.kw-chip{display:inline-flex;align-items:center;gap:6px;background:rgba(108,140,255,.1);border:1px solid rgba(108,140,255,.22);color:var(--accent2);padding:5px 11px;border-radius:20px;font-size:12px;font-weight:700;margin:3px}
.kw-chip button{background:none;border:none;color:var(--accent2);cursor:pointer;font-size:14px;line-height:1;padding:0;opacity:.7}

/* ── MOBILE HEADER (true mobile UX, not shrunk desktop) ── */
.mob-hdr{display:none;padding:0 16px;height:58px;background:rgba(5,7,13,.95);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid var(--border);align-items:center;justify-content:space-between;position:sticky;top:0;z-index:200;gap:10px}
body.light .mob-hdr{background:rgba(255,255,255,.95)}
.mob-logo{font-size:19px;font-weight:900;letter-spacing:-.5px}
.mob-btns{display:flex;gap:6px}
.mob-btn{width:37px;height:37px;border-radius:10px;border:1px solid var(--border2);background:var(--card2);color:var(--t2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;transition:all .2s}
.mob-btn:hover{border-color:var(--accent3);color:var(--accent2)}

/* Bottom tab bar — replaces sidebar navigation on mobile */
.bottom-tabbar{display:none;position:fixed;bottom:0;left:0;right:0;z-index:250;background:rgba(10,14,24,.92);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-top:1px solid var(--border);padding:6px 4px calc(6px + env(safe-area-inset-bottom));justify-content:space-around}
body.light .bottom-tabbar{background:rgba(255,255,255,.92)}
.tab-btn{display:flex;flex-direction:column;align-items:center;gap:2px;background:none;border:none;color:var(--t3);font-size:9px;font-weight:700;font-family:inherit;padding:6px 10px;border-radius:10px;cursor:pointer}
.tab-btn.active{color:var(--accent2)}
.tab-icon{font-size:18px}

.drawer-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:300;backdrop-filter:blur(4px)}
.drawer-overlay.open{display:block}
.mob-drawer{position:fixed;top:0;left:-280px;width:264px;height:100vh;background:var(--bg2);border-right:1px solid var(--border2);z-index:301;transition:left .3s cubic-bezier(.4,0,.2,1);overflow-y:auto;padding:22px 15px;display:flex;flex-direction:column;gap:20px}
.mob-drawer.open{left:0}
.drawer-close{position:absolute;top:14px;right:14px;background:var(--card);border:1px solid var(--border2);color:var(--t2);width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center}

/* Filter bottom-sheet on mobile */
.sheet-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:320;backdrop-filter:blur(3px)}
.sheet-overlay.open{display:block}
.filter-sheet{position:fixed;left:0;right:0;bottom:-100%;background:var(--bg2);border-top-left-radius:22px;border-top-right-radius:22px;border:1px solid var(--border2);z-index:321;transition:bottom .3s cubic-bezier(.4,0,.2,1);padding:18px 18px calc(18px + env(safe-area-inset-bottom));max-height:80vh;overflow-y:auto}
.filter-sheet.open{bottom:0}
.sheet-handle{width:38px;height:4px;background:var(--border2);border-radius:4px;margin:0 auto 16px}

@media(max-width:768px){
  .nav{display:none !important}
  .mob-hdr{display:flex}
  .sidebar{display:none}
  .app{min-height:calc(100vh - 58px)}
  body{padding-bottom:66px}
  .bottom-tabbar{display:flex}
  .adv-filters{display:none !important}
  .hero{padding:24px 16px 20px}
  .hero-title{font-size:23px;letter-spacing:-.5px}
  .hero-sub{font-size:13px;margin-bottom:16px}
  .hero-eyebrow{font-size:10px;padding:4px 11px;margin-bottom:12px}
  .hero-stats{margin-bottom:16px}
  .hero-stat{padding:11px 8px}
  .hero-stat-num{font-size:16px}
  .hero-stat-label{font-size:9px}
  .search-input{font-size:14px;padding:13px 14px 13px 40px}
  .filters-bar{padding:11px 14px;gap:6px}
  .chip{padding:6px 12px;font-size:11px}
  .content-wrap{padding:14px}
  .card-inner{padding:15px 13px}
  .co-logo{width:42px;height:42px;border-radius:10px}
  .job-title-card{font-size:13px}
  .job-co-card{font-size:11px;margin-bottom:6px}
  .card-footer{padding:8px 13px}
  .pagination{padding:20px 0 10px;gap:6px}
  .page-btn{padding:8px 13px;font-size:12px}
}
@media(max-width:380px){
  .hero-title{font-size:20px}
  .hero-stat-num{font-size:14px}
  .chip{padding:5px 10px;font-size:11px}
}
`;
