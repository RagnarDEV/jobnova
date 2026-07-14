// src/components/nav.js
// Desktop nav bar + mobile header/menu (shared across every page).

export function navHtml() {
  return `
<nav class="nav">
  <a href="/" class="nav-logo"><img src="/favicon.svg" alt="JobNova"><span>JobNova</span><span class="dot"></span></a>
  <div class="nav-links">
    <a href="/" class="nav-link">Browse Jobs</a>
    <a href="/companies" class="nav-link">Companies</a>
    <a href="/categories" class="nav-link">Categories</a>
    <a href="/blog" class="nav-link">Blog</a>
    <button class="nav-link" onclick="if(window.goView){goView('saved')}else{location='/'}">Saved</button>
    <button class="nav-cta" onclick="openPostJobModal()">+ Post a Job</button>
  </div>
</nav>`;
}

export function mobileHeaderHtml() {
  return `
<div class="mob-hdr">
  <a href="/" class="mob-logo"><img src="/favicon.svg" alt="JobNova">JobNova</a>
  <div class="mob-btns">
    <button class="mob-cta" onclick="openPostJobModal()">+ Post</button>
    <button class="mob-burger" onclick="toggleMobMenu()" id="mobBurgerBtn">☰</button>
  </div>
</div>
<div class="mob-menu" id="mobMenu">
  <a href="/">🔍 Browse Jobs</a>
  <button onclick="if(window.goView){goView('saved');closeMobMenu();}else{location='/'}">🔖 Saved Jobs</button>
  <a href="/blog">📝 Career Blog</a>
  <button onclick="openPostJobModal();closeMobMenu();">➕ Post a Job</button>
  <a href="/privacy">🔒 Privacy</a>
</div>
<script>
function toggleMobMenu(){document.getElementById('mobMenu').classList.toggle('open');}
function closeMobMenu(){document.getElementById('mobMenu').classList.remove('open');}
</script>`;
}
