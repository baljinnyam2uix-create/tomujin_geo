const menuBtn = document.getElementById('mobileMenuBtn');
const nav = document.getElementById('mainNav');
menuBtn?.addEventListener('click', () => { const isOpen = nav.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', String(isOpen)); });
nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('geo-theme'); if (savedTheme === 'dark') document.body.classList.add('dark');
const syncThemeIcon = () => themeToggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙'; syncThemeIcon();
themeToggle?.addEventListener('click', () => { document.body.classList.toggle('dark'); localStorage.setItem('geo-theme', document.body.classList.contains('dark') ? 'dark' : 'light'); syncThemeIcon(); });
const videoModal = document.getElementById('videoModal'), videoClose = document.getElementById('videoClose');
function openVideo(){ videoModal.classList.add('open'); videoModal.setAttribute('aria-hidden','false'); }
function closeVideo(){ videoModal.classList.remove('open'); videoModal.setAttribute('aria-hidden','true'); }
document.getElementById('introBtn')?.addEventListener('click', openVideo); document.getElementById('introBtn2')?.addEventListener('click', openVideo); videoClose?.addEventListener('click', closeVideo); videoModal?.addEventListener('click', e => { if(e.target === videoModal) closeVideo(); }); document.addEventListener('keydown', e => { if(e.key === 'Escape') closeVideo(); });
const observer = new IntersectionObserver(entries => { entries.forEach(entry => { if(entry.isIntersecting){ entry.target.classList.add('visible'); observer.unobserve(entry.target); } }); }, { threshold: .12 }); document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
document.getElementById('showAllBtn')?.addEventListener('click', () => { document.querySelectorAll('.course-card').forEach(card => card.animate([{ transform: 'scale(.985)', opacity: .75 },{ transform: 'scale(1)', opacity: 1 }], { duration: 350, easing: 'ease-out' })); });
