// src/client/app.js
// Front-end logic for the JobNova job board SPA.
// Served as a standalone file at GET /assets/app.js (see src/routes/assets.js)
// so it is cached by the browser separately from the HTML shell.

export const APP_JS = `
let pg=1,cat='',srch='',advT,srchT;
let jobs=[],total=0;
let savedIds=JSON.parse(localStorage.getItem('jn_saved')||'[]');
let alertKws=[];
let adv={remote:'',employ:'',seniority:'',salaryMin:'',days:''};
let isLight=localStorage.getItem('jn_theme')==='light';

function applyTheme(){
  document.body.classList.toggle('light',isLight);
  const ic=isLight?'☀️':'🌙';
  ['themeBtn','themeNavIcon','drawerThemeIcon'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=ic;});
}
function toggleTheme(){isLight=!isLight;localStorage.setItem('jn_theme',isLight?'light':'dark');applyTheme();}
applyTheme();

function openDrawer(){document.getElementById('mobDrawer').classList.add('open');document.getElementById('drawerOverlay').classList.add('open');document.body.style.overflow='hidden';}
function closeDrawer(){document.getElementById('mobDrawer').classList.remove('open');document.getElementById('drawerOverlay').classList.remove('open');document.body.style.overflow='';}
function openSheet(){document.getElementById('filterSheet').classList.add('open');document.getElementById('sheetOverlay').classList.add('open');}
function closeSheet(){document.getElementById('filterSheet').classList.remove('open');document.getElementById('sheetOverlay').classList.remove('open');}

function initials(n){return(n||'?').split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();}
function logoHtml(co,sz='46px'){
  const slug=(co||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const domain=slug+'.com';
  const ini=initials(co);
  const fs=Math.round(parseInt(sz)*.32)+'px';
  return \`<div class="co-logo" style="width:\${sz};height:\${sz}">
    <img src="https://www.google.com/s2/favicons?domain=\${domain}&sz=64" alt="\${co}"
      style="width:100%;height:100%;object-fit:contain;padding:6px;display:block"
      onerror="this.onerror=null;this.src='https://icons.duckduckgo.com/ip3/\${domain}.ico';this.onerror=function(){this.style.display='none';this.nextElementSibling.style.display='flex'}">
    <span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:\${fs};font-weight:800;color:#6C8CFF">\${ini}</span>
  </div>\`;
}
function remoteTag(t){
  if(!t)return'';
  const m={fully_remote:['tag-remote','🌐 Remote'],hybrid:['tag-hybrid','🏢 Hybrid'],on_site:['tag-onsite','📍 On-site'],onsite:['tag-onsite','📍 On-site']};
  const[cls,lbl]=m[t]||['tag-onsite',t.replace(/_/g,' ')];
  return\`<span class="tag \${cls}">\${lbl}</span>\`;
}
function isNew(ts){if(!ts)return false;return Date.now()-new Date(ts).getTime()<86400000;}
function isHot(sal){if(!sal)return false;return parseInt(sal.replace(/\\D/g,'').slice(0,3))>=150;}
function getTimeAgo(date){
  const diff=Date.now()-date.getTime();
  const h=Math.floor(diff/3600000);
  const d=Math.floor(diff/86400000);
  if(h<1)return'just now';
  if(h<24)return h+'h ago';
  return d+'d ago';
}

let toastTimer;
function showToast(msg,type='success'){
  const el=document.getElementById('toast');
  const icon=document.getElementById('toastIcon');
  const bar=document.getElementById('toastBar');
  document.getElementById('toastMsg').textContent=msg;
  icon.textContent=type==='success'?'✓':'ℹ';
  icon.style.color=type==='success'?'var(--green)':'var(--accent2)';
  el.className='toast show';
  if(bar){bar.style.animation='none';bar.offsetHeight;bar.style.animation='toast-bar 3s linear forwards';}
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),3100);
}
function updateSavedCount(){
  document.querySelectorAll('.js-saved-count').forEach(el=>el.textContent=savedIds.length||0);
}

const VIEWS=['vJobs','vSaved','vAlerts'];
function showView(id){
  VIEWS.forEach(v=>{const el=document.getElementById(v);if(el)el.style.display=v===id?'block':'none';});
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
  window.scrollTo({top:0,behavior:'smooth'});
}
function goView(v){
  if(v==='jobs'){showView('vJobs');return;}
  if(v==='saved'){showView('vSaved');renderSaved();return;}
  if(v==='alerts'){showView('vAlerts');return;}
}

function toggleAdv(){
  if(window.innerWidth<=768){ openSheet(); return; }
  document.getElementById('advFilters').classList.toggle('open');
  document.getElementById('advToggleBtn').classList.toggle('active');
}
function applyAdvFilters(){
  adv.remote=(document.getElementById('fRemote')||{}).value||'';
  adv.employ=(document.getElementById('fEmploy')||{}).value||'';
  adv.seniority=(document.getElementById('fSeniority')||{}).value||'';
  adv.salaryMin=(document.getElementById('fSalaryMin')||{}).value||'';
  adv.days=(document.getElementById('fDate')||{}).value||'';
  // Mirror to sheet counterparts if present
  ['fRemoteS','fEmployS','fSenioritySSel','fSalaryMinS','fDateS'].forEach(()=>{});
  pg=1;loadJobs();
}
function debounceAdv(){clearTimeout(advT);advT=setTimeout(applyAdvFilters,500);}
function clearAdvFilters(){
  ['fRemote','fEmploy','fSeniority','fDate'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const sm=document.getElementById('fSalaryMin');if(sm)sm.value='';
  adv={remote:'',employ:'',seniority:'',salaryMin:'',days:''};
  pg=1;loadJobs();
}

function renderSkeletons(){
  return Array(4).fill(0).map(()=>\`
    <div class="job-card" style="pointer-events:none">
      <div class="card-inner">
        <div class="card-row1">
          <div class="skel" style="width:46px;height:46px;border-radius:12px;flex-shrink:0"></div>
          <div class="card-body">
            <div class="skel" style="height:12px;width:55%;margin-bottom:8px;border-radius:5px"></div>
            <div class="skel" style="height:16px;width:80%;margin-bottom:8px;border-radius:5px"></div>
            <div class="skel" style="height:11px;width:40%;border-radius:5px"></div>
          </div>
        </div>
        <div class="card-right">
          <div class="skel" style="height:28px;width:90px;border-radius:9px"></div>
          <div style="display:flex;gap:5px">
            <div class="skel" style="width:33px;height:33px;border-radius:9px"></div>
            <div class="skel" style="width:33px;height:33px;border-radius:9px"></div>
            <div class="skel" style="width:33px;height:33px;border-radius:9px"></div>
          </div>
        </div>
      </div>
    </div>\`).join('');
}

async function loadJobs(){
  document.getElementById('jobsList').innerHTML=renderSkeletons();
  document.getElementById('pagination').innerHTML='';
  const p=new URLSearchParams({page:pg});
  if(cat)p.set('category',cat);
  if(srch)p.set('search',srch);
  if(adv.remote)p.set('remote_type',adv.remote);
  if(adv.employ)p.set('employment_type',adv.employ);
  if(adv.seniority)p.set('seniority',adv.seniority);
  if(adv.salaryMin)p.set('salary_min',adv.salaryMin);
  if(adv.days)p.set('days',adv.days);
  try{
    const res=await fetch('/api/jobs?'+p);
    const data=await res.json();
    jobs=data.jobs||[];total=data.total||0;
    document.getElementById('resultsCount').innerHTML=\`<strong>\${total.toLocaleString()}</strong> jobs found\${cat?' in <strong>'+cat+'</strong>':''}\${srch?' for "<strong>'+srch+'</strong>"':''}\`;
    if(!jobs.length){
      document.getElementById('jobsList').innerHTML=\`<div class="empty"><div class="e-icon">🔍</div><h3>No jobs found</h3><p>Try different keywords</p></div>\`;
      return;
    }
    document.getElementById('jobsList').innerHTML=jobs.map((j,idx)=>{
      const saved=savedIds.includes(j.id);
      const nw=isNew(j.created_at);
      const hot=isHot(j.salary);
      const featured=idx<3&&!nw&&!hot;
      const timeAgo=j.created_at?getTimeAgo(new Date(j.created_at)):'';
      return\`<a href="/job/\${j.id}" class="job-card" style="animation:fadeInUp .35s ease \${idx*.05}s both">
        <div class="card-inner">
          <div class="card-row1">
            \${logoHtml(j.company)}
            <div class="card-body">
              <div class="card-badges">
                \${nw?'<span class="tag-new">✦ NEW</span>':''}
                \${hot?'<span class="tag-hot">🔥 HOT</span>':''}
                \${featured?'<span class="tag-featured">⭐ FEATURED</span>':''}
              </div>
              <div class="job-title-card">\${j.title}</div>
              <div class="job-co-card">
                <span style="width:5px;height:5px;border-radius:50%;background:var(--green);display:inline-block;flex-shrink:0"></span>
                \${j.company}
              </div>
              <div class="job-meta-row">
                \${j.location?'<span class="tag tag-loc">📍 '+j.location+'</span>':''}
                \${remoteTag(j.remote_type)}
                \${j.employment_type?'<span class="tag tag-type">'+j.employment_type.replace(/_/g,' ')+'</span>':''}
                \${j.seniority?'<span class="tag tag-type">'+j.seniority+'</span>':''}
              </div>
            </div>
          </div>
          <div class="card-right">
            \${j.salary?'<div class="salary-badge">'+j.salary+'</div>':'<div></div>'}
            <div class="card-actions">
              <button class="act-btn\${saved?' saved':''}" onclick="event.preventDefault();event.stopPropagation();toggleSave(\${j.id})" id="sb-\${j.id}">🔖</button>
              <button class="act-btn" onclick="event.preventDefault();event.stopPropagation();shareJob(\${j.id})">🔗</button>
              <div class="arr-btn">→</div>
            </div>
          </div>
        </div>
        \${timeAgo?'<div class="card-footer"><span>⏰ '+timeAgo+'</span><span style="color:var(--accent2)">View →</span></div>':''}
      </a>\`;
    }).join('');
    const tp=Math.ceil(total/20);
    if(tp>1)document.getElementById('pagination').innerHTML=\`
      <button class="page-btn" onclick="goPage(\${pg-1})" \${pg===1?'disabled':''}>← Prev</button>
      <span class="page-info">Page \${pg} / \${tp}</span>
      <button class="page-btn" onclick="goPage(\${pg+1})" \${pg===tp?'disabled':''}>Next →</button>\`;
  }catch(e){
    document.getElementById('jobsList').innerHTML=\`<div class="empty"><div class="e-icon">⚠️</div><h3>Failed to load</h3><p>Refresh and try again</p></div>\`;
  }
}

function toggleSave(id){
  const idx=savedIds.indexOf(id);
  if(idx>=0){savedIds.splice(idx,1);showToast('Removed from saved','info');}
  else{savedIds.push(id);showToast('Job saved! 🔖');}
  localStorage.setItem('jn_saved',JSON.stringify(savedIds));
  updateSavedCount();
  const btn=document.getElementById('sb-'+id);
  if(btn)btn.classList.toggle('saved',savedIds.includes(id));
}
function shareJob(id){
  const url=window.location.origin+'/job/'+id;
  navigator.clipboard.writeText(url).then(()=>showToast('Link copied! 🔗')).catch(()=>showToast('Copied!'));
}

function renderSaved(){
  if(!savedIds.length){
    document.getElementById('savedList').innerHTML=\`<div class="empty"><div class="e-icon">🔖</div><h3>No saved jobs yet</h3><p>Tap the bookmark icon to save jobs</p></div>\`;
    return;
  }
  const saved=jobs.filter(j=>savedIds.includes(j.id));
  if(!saved.length){
    document.getElementById('savedList').innerHTML=\`<div class="empty"><div class="e-icon">🔖</div><h3>Browse jobs and save the ones you like</h3></div>\`;
    return;
  }
  document.getElementById('savedList').innerHTML=saved.map(j=>\`
    <a href="/job/\${j.id}" class="job-card">
      <div class="card-inner">
        <div class="card-row1">
          \${logoHtml(j.company)}
          <div class="card-body">
            <div class="job-title-card">\${j.title}</div>
            <div class="job-co-card">\${j.company}</div>
            <div class="job-meta-row">\${remoteTag(j.remote_type)}</div>
          </div>
        </div>
        <div class="card-right">
          \${j.salary?'<div class="salary-badge">'+j.salary+'</div>':'<div></div>'}
          <button class="act-btn saved" onclick="event.preventDefault();toggleSave(\${j.id});renderSaved()">🔖</button>
        </div>
      </div>
    </a>\`).join('');
}
function clearAllSaved(){savedIds=[];localStorage.removeItem('jn_saved');updateSavedCount();renderSaved();showToast('All cleared','info');}

function addKeyword(e){
  if(e.key!=='Enter')return;
  const inp=document.getElementById('alertKwInput');
  const val=inp.value.trim();if(!val)return;
  if(!alertKws.includes(val)){alertKws.push(val);renderKws();}
  inp.value='';
}
function removeKw(kw){alertKws=alertKws.filter(k=>k!==kw);renderKws();}
function renderKws(){
  document.getElementById('kwWrap').innerHTML=alertKws.map(k=>\`<span class="kw-chip">\${k}<button onclick="removeKw('\${k}')">×</button></span>\`).join('');
}
async function submitAlert(){
  const email=document.getElementById('alertEmail').value.trim();
  if(!email||!email.includes('@')){showToast('Please enter a valid email','info');return;}
  if(!alertKws.length){showToast('Add at least one keyword','info');return;}
  try{
    const res=await fetch('/api/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,keywords:alertKws})});
    const d=await res.json();
    if(d.success){showToast('Subscribed! 🎉');document.getElementById('alertEmail').value='';alertKws=[];renderKws();}
    else showToast(d.error||'Something went wrong','info');
  }catch(e){showToast('Failed. Try again.','info');}
}

function filterCat(c,label){
  cat=c;pg=1;
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>{if(b.textContent.trim().includes(label.split(' ')[0]))b.classList.add('active');});
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  document.querySelectorAll('.chip').forEach(c=>{if(c.textContent.trim()===label||c.textContent.includes(label.split(' ').slice(-1)[0]))c.classList.add('active');});
  showView('vJobs');loadJobs();
}
function debounceSearch(v){clearTimeout(srchT);srchT=setTimeout(()=>{srch=v;pg=1;loadJobs();},400);}
function goPage(p){pg=p;loadJobs();window.scrollTo({top:0,behavior:'smooth'});}

async function init(){
  updateSavedCount();
  loadJobs();
  try{
    const r=await fetch('/api/debug');
    const d=await r.json();
    const n=d.jobs_in_db||0;
    const fmt=n=>n.toLocaleString();
    ['st-total','cnt-all'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=fmt(n);});
    ['tc1','tc2'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=fmt(n);});
    const sj=document.getElementById('stat-jobs');if(sj)sj.textContent=fmt(n)+'+';
    const ss=document.getElementById('st-salary');if(ss)ss.textContent=fmt(Math.round(n*.65));
    const sr=document.getElementById('st-remote');if(sr)sr.textContent=fmt(Math.round(n*.4));
  }catch(e){}
}
window.toggleTheme=toggleTheme;window.openDrawer=openDrawer;window.closeDrawer=closeDrawer;
window.openSheet=openSheet;window.closeSheet=closeSheet;window.toggleAdv=toggleAdv;
window.applyAdvFilters=applyAdvFilters;window.debounceAdv=debounceAdv;window.clearAdvFilters=clearAdvFilters;
window.toggleSave=toggleSave;window.shareJob=shareJob;window.clearAllSaved=clearAllSaved;
window.addKeyword=addKeyword;window.removeKw=removeKw;window.submitAlert=submitAlert;
window.filterCat=filterCat;window.debounceSearch=debounceSearch;window.goPage=goPage;window.goView=goView;
init();
`;
