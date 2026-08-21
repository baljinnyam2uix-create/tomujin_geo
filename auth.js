const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const errorBox = $('#errorBox'), successBox = $('#successBox');
function message(text, type='error') { errorBox.classList.remove('show'); successBox.classList.remove('show'); const box = type==='success'?successBox:errorBox; box.textContent=text; box.classList.add('show'); }
function clearMessage(){ errorBox.classList.remove('show'); successBox.classList.remove('show'); }
function redirectByRole(profile){ if(!profile) return; if(profile.role==='admin') location.href='/admin'; else if(profile.role==='teacher') location.href='/teacher'; else if(profile.role==='student') location.href='/student'; }
function setMode(mode){
  const reg = mode === 'register'; clearMessage();
  $('#loginTab').classList.toggle('active', !reg); $('#registerTab').classList.toggle('active', reg);
  $('#loginForm').classList.toggle('hidden', reg); $('#registerForm').classList.toggle('hidden', !reg);
  $('#authTitle').textContent = reg ? 'Бүртгүүлэх' : 'Нэвтрэх';
  $('#authSubtitle').textContent = reg ? 'Мэдээллээ бөглөж хүсэлт илгээнэ. Админ баталсны дараа таны эрх идэвхжинэ.' : 'Баталгаажсан бүртгэлийн и-мэйл, нууц үгээ оруулна уу.';
  history.replaceState(null,'', reg ? '/auth?mode=register' : '/auth');
}
function setRole(role){
  $('#regRole').value=role;
  $$('.role-option').forEach(b=>b.classList.toggle('active',b.dataset.role===role));
  $('#studentGradeField').classList.toggle('hidden',role!=='student');
  $('#teacherSubjectField').classList.toggle('hidden',role!=='teacher');
  $('#regGrade').required=role==='student'; $('#regSubject').required=role==='teacher';
  $('#registerSubmit').textContent = role==='teacher' ? 'Багшаар бүртгүүлэх →' : 'Сурагчаар бүртгүүлэх →';
}
$('#loginTab').onclick=()=>setMode('login'); $('#registerTab').onclick=()=>setMode('register');
$$('.role-option').forEach(b=>b.onclick=()=>setRole(b.dataset.role));
setRole('student');
if(new URLSearchParams(location.search).get('mode')==='register') setMode('register');
if(GeoBackend.mode==='demo') $('#demoNote').classList.remove('hidden');
(async()=>{ try { const { profile } = await GeoBackend.getSession(); if(profile?.status==='active') return redirectByRole(profile); if(profile?.status){ await GeoBackend.signOut(); if(profile.status==='pending') message('Таны бүртгэл админы баталгаажуулалт хүлээж байна. Батлагдсаны дараа нэвтэрнэ үү.','success'); } } catch{} })();

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault(); clearMessage(); const btn=e.submitter; btn.disabled=true; btn.textContent='Нэвтэрч байна...';
  try { const { profile } = await GeoBackend.signIn($('#loginEmail').value.trim(), $('#loginPassword').value); if(profile?.role==='admin'){ await GeoBackend.signOut(); throw new Error('Админ хэрэглэгч /admin хаягаар нэвтэрнэ үү.'); } redirectByRole(profile); }
  catch(err){ message(err.message || 'Нэвтрэхэд алдаа гарлаа.'); btn.disabled=false; btn.textContent='Нэвтрэх →'; }
});

$('#registerForm').addEventListener('submit', async e => {
  e.preventDefault(); clearMessage();
  if($('#regPassword').value !== $('#regPassword2').value) return message('Нууц үгнүүд таарахгүй байна.');
  const role=$('#regRole').value, btn=e.submitter; btn.disabled=true; btn.textContent='Бүртгэж байна...';
  try {
    const result = await GeoBackend.signUpUnified({ role, email:$('#regEmail').value.trim(), password:$('#regPassword').value, fullName:$('#regName').value.trim(), school:$('#regSchool').value.trim(), subject:$('#regSubject').value.trim()||'Газарзүй', grade:$('#regGrade').value });
    const confirmText = result.needsEmailConfirmation ? ' И-мэйлээр ирсэн баталгаажуулах холбоосыг мөн нээнэ үү.' : '';
    message(`Бүртгэл амжилттай илгээгдлээ.${confirmText} Админ таны бүртгэлийг баталсны дараа нэвтрэх боломжтой болно.`,'success');
    e.target.reset(); setRole(role); btn.disabled=false;
  } catch(err){ message(err.message || 'Бүртгэл үүсгэхэд алдаа гарлаа.'); btn.disabled=false; setRole(role); }
});
