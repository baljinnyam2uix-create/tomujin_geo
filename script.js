const menuBtn=document.getElementById('mobileMenuBtn');
const nav=document.getElementById('mainNav');
menuBtn?.addEventListener('click',()=>{const open=nav?.classList.toggle('open');menuBtn.setAttribute('aria-expanded',String(Boolean(open)));});
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));

const themeToggle=document.getElementById('themeToggle');
const savedTheme=localStorage.getItem('geo-theme');
if(savedTheme==='dark') document.body.classList.add('geo-dark');
const syncThemeIcon=()=>{if(themeToggle) themeToggle.textContent=document.body.classList.contains('geo-dark')?'☀️':'🌙';};
syncThemeIcon();
themeToggle?.addEventListener('click',()=>{document.body.classList.toggle('geo-dark');localStorage.setItem('geo-theme',document.body.classList.contains('geo-dark')?'dark':'light');syncThemeIcon();});

const videoModal=document.getElementById('videoModal');
const videoClose=document.getElementById('videoClose');
const openVideo=()=>{videoModal?.classList.add('open');videoModal?.setAttribute('aria-hidden','false');};
const closeVideo=()=>{videoModal?.classList.remove('open');videoModal?.setAttribute('aria-hidden','true');};
document.getElementById('introBtn')?.addEventListener('click',openVideo);
videoClose?.addEventListener('click',closeVideo);
videoModal?.addEventListener('click',e=>{if(e.target===videoModal)closeVideo();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeVideo();});

if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}),{threshold:.1});
  document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
}else document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));
