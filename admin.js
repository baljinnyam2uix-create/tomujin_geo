const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let adminSession=null, users=[], content=[], settings={};
const typeLabel={lesson:'Хичээл',assignment:'Даалгавар',exam:'Шалгалт'};
const statusLabel={pending:'Батлах хүлээгдэж буй',active:'Идэвхтэй',suspended:'Түр хаасан',rejected:'Татгалзсан'};
const statusClass={pending:'orange',active:'green',suspended:'red',rejected:'red'};
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function fmt(d){if(!d)return'—';try{return new Intl.DateTimeFormat('mn-MN',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(d))}catch{return'—'}}
function showLoginError(t){const b=$('#adminLoginError');b.textContent=t;b.classList.add('show')}
function tab(name){$$('#adminApp .nav-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));$$('#adminApp .tab-page').forEach(p=>p.classList.toggle('active',p.id===`tab-${name}`));$('#adminTopTitle').textContent={overview:'Админ хяналтын самбар',users:'Хэрэглэгчид',content:'Бүх агуулга',settings:'Тохиргоо'}[name]||'Админ'}
$$('#adminApp .nav-tab').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.tab)));$$('[data-tab-jump]').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.tabJump)));

function gradeSelect(u){
  if(u.role!=='student') return `<span class="muted">${esc(u.subject||'Багш')}</span>`;
  return `<select class="grade-select compact-select" data-user="${u.id}">${['7','8','9','10','11','12'].map(g=>`<option value="${g}" ${u.grade===g?'selected':''}>${g}-р анги</option>`).join('')}</select>`;
}
function statusSelect(u){
  return `<select class="status-select compact-select" data-user="${u.id}" ${u.id===adminSession?.user?.id?'disabled':''}>
    <option value="pending" ${u.status==='pending'?'selected':''}>Батлах хүлээгдэж буй</option>
    <option value="active" ${u.status==='active'?'selected':''}>Идэвхтэй</option>
    <option value="suspended" ${u.status==='suspended'?'selected':''}>Түр хаах</option>
    <option value="rejected" ${u.status==='rejected'?'selected':''}>Татгалзсан</option>
  </select>`;
}
function userRows(){
  const q=$('#userSearch').value.toLowerCase().trim(),r=$('#roleFilter').value,st=$('#statusFilter')?.value||'';
  const arr=users.filter(u=>(!r||u.role===r)&&(!st||u.status===st)&&(!q||`${u.full_name} ${u.email} ${u.school}`.toLowerCase().includes(q)));
  if(!arr.length)return'<div class="empty"><b>Хэрэглэгч олдсонгүй.</b><span>Хайлтын нөхцлөө өөрчилж үзнэ үү.</span></div>';
  return`<div class="table-wrap"><table class="data-table"><thead><tr><th>Хэрэглэгч</th><th>Сургууль / мэдээлэл</th><th>Эрх</th><th>Төлөв</th><th>Бүртгүүлсэн</th></tr></thead><tbody>${arr.map(u=>`<tr class="${u.status==='pending'?'pending-row':''}"><td class="title-cell"><b>${esc(u.full_name||'Нэргүй')}</b><small>${esc(u.email||'')}</small></td><td><b class="school-name">${esc(u.school||'—')}</b>${gradeSelect(u)}</td><td><select class="role-select compact-select" data-user="${u.id}" ${u.id===adminSession?.user?.id?'disabled':''}><option value="student" ${u.role==='student'?'selected':''}>Сурагч</option><option value="teacher" ${u.role==='teacher'?'selected':''}>Багш</option><option value="admin" ${u.role==='admin'?'selected':''}>Админ</option></select></td><td>${statusSelect(u)}</td><td>${fmt(u.created_at)}</td></tr>`).join('')}</tbody></table></div>`
}
function pendingRows(){
  const arr=users.filter(u=>u.status==='pending').sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  if(!arr.length)return'<div class="approval-empty"><span>✓</span><div><b>Шинэ хүсэлт алга</b><small>Бүх бүртгэлийн хүсэлтийг шийдвэрлэсэн байна.</small></div></div>';
  return `<div class="approval-list">${arr.map(u=>`<article class="approval-card"><div class="approval-avatar">${u.role==='teacher'?'Б':'С'}</div><div class="approval-info"><div class="approval-title"><b>${esc(u.full_name||'Нэргүй')}</b><span class="pill ${u.role==='teacher'?'blue':'purple'}">${u.role==='teacher'?'Багш':'Сурагч'}</span></div><p>${esc(u.school||'Сургууль оруулаагүй')}${u.role==='student'&&u.grade?` · ${esc(u.grade)}-р анги`:u.subject?` · ${esc(u.subject)}`:''}</p><small>${esc(u.email||'')} · ${fmt(u.created_at)}</small></div><div class="approval-actions"><button class="btn btn-approve" data-approve-user="${u.id}">✓ Батлах</button><button class="btn btn-reject" data-reject-user="${u.id}">Татгалзах</button></div></article>`).join('')}</div>`;
}
function contentRows(arr=filteredContent()){if(!arr.length)return'<div class="empty"><b>Агуулга олдсонгүй.</b></div>';return`<div class="table-wrap"><table class="data-table"><thead><tr><th>Агуулга</th><th>Багш</th><th>Төрөл</th><th>Анги</th><th>Төлөв</th><th>Үйлдэл</th></tr></thead><tbody>${arr.map(x=>`<tr><td class="title-cell"><b>${esc(x.title)}</b><small>${esc(x.description||'')}</small></td><td>${esc(x.teacher_name||x.profiles?.full_name||'—')}</td><td><span class="pill ${x.content_type==='lesson'?'green':x.content_type==='assignment'?'blue':'purple'}">${typeLabel[x.content_type]||x.content_type}</span></td><td>${esc(x.grade)}-р</td><td><span class="pill ${x.published?'green':'orange'}">${x.published?'Нийтэлсэн':'Ноорог'}</span></td><td><div class="actions"><button class="icon-action" data-admin-open="${x.id}">Нээх</button><button class="icon-action" data-admin-toggle="${x.id}">${x.published?'Нуух':'Нийтлэх'}</button><button class="icon-action danger-link" data-admin-delete="${x.id}">Устгах</button></div></td></tr>`).join('')}</tbody></table></div>`}
function filteredContent(){const q=$('#adminContentSearch').value.toLowerCase().trim(),t=$('#adminTypeFilter').value,g=$('#adminGradeFilter').value;return content.filter(x=>(!t||x.content_type===t)&&(!g||x.grade===g)&&(!q||`${x.title} ${x.description} ${x.teacher_name}`.toLowerCase().includes(q)))}
function render(){
  const pending=users.filter(u=>u.status==='pending').length;
  $('#userCount').textContent=users.length;$('#studentCount').textContent=users.filter(u=>u.role==='student').length;$('#teacherCount').textContent=users.filter(u=>u.role==='teacher').length;$('#pendingCount').textContent=pending;$('#allContentCount').textContent=content.length;$('#allPublishedCount').textContent=content.filter(x=>x.published).length;
  const navBadge=$('#pendingNavBadge'); if(navBadge){navBadge.textContent=pending;navBadge.classList.toggle('hidden',pending===0)}
  $('#pendingApprovals').innerHTML=pendingRows();$('#usersTable').innerHTML=userRows();$('#adminContentTable').innerHTML=contentRows();$('#adminRecent').innerHTML=contentRows(content.slice(0,5));bindActions();
}
async function setApproval(userId,status){
  const patch={status};
  if(status==='active'){patch.approved_at=new Date().toISOString();patch.approved_by=adminSession?.user?.id||null}
  else if(status==='rejected'){patch.approved_at=null;patch.approved_by=adminSession?.user?.id||null}
  await GeoBackend.updateUser(userId,patch);await loadAll();
}
function bindActions(){
  $$('.role-select').forEach(s=>s.onchange=async()=>{try{const current=users.find(u=>u.id===s.dataset.user);await GeoBackend.updateUser(s.dataset.user,{role:s.value,grade:s.value==='student'?(current?.grade||'7'):''});await loadAll()}catch(e){alert(e.message)}});
  $$('.grade-select').forEach(s=>s.onchange=async()=>{try{await GeoBackend.updateUser(s.dataset.user,{grade:s.value});await loadAll()}catch(e){alert(e.message)}});
  $$('.status-select').forEach(s=>s.onchange=async()=>{try{await setApproval(s.dataset.user,s.value)}catch(e){alert(e.message)}});
  $$('[data-approve-user]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await setApproval(b.dataset.approveUser,'active')}catch(e){alert(e.message);b.disabled=false}});
  $$('[data-reject-user]').forEach(b=>b.onclick=async()=>{const u=users.find(x=>x.id===b.dataset.rejectUser);if(!confirm(`${u?.full_name||'Энэ хэрэглэгч'}-ийн бүртгэлийг татгалзах уу?`))return;b.disabled=true;try{await setApproval(b.dataset.rejectUser,'rejected')}catch(e){alert(e.message);b.disabled=false}});
  $$('[data-admin-open]').forEach(b=>b.onclick=async()=>{const x=content.find(i=>i.id===b.dataset.adminOpen);try{await GeoBackend.openResource(x)}catch(e){alert(e.message)}});
  $$('[data-admin-toggle]').forEach(b=>b.onclick=async()=>{const x=content.find(i=>i.id===b.dataset.adminToggle);try{await GeoBackend.togglePublished(x,!x.published);await loadAll()}catch(e){alert(e.message)}});
  $$('[data-admin-delete]').forEach(b=>b.onclick=async()=>{const x=content.find(i=>i.id===b.dataset.adminDelete);if(confirm(`“${x.title}” материалыг системээс устгах уу?`)){try{await GeoBackend.deleteContent(x);await loadAll()}catch(e){alert(e.message)}}});
}
$('#userSearch').addEventListener('input',render);$('#roleFilter').addEventListener('change',render);$('#statusFilter')?.addEventListener('change',render);$('#adminContentSearch').addEventListener('input',render);$('#adminTypeFilter').addEventListener('change',render);$('#adminGradeFilter').addEventListener('change',render);
async function loadAll(){[users,content,settings]=await Promise.all([GeoBackend.listUsers(),GeoBackend.listContent(),GeoBackend.getSettings()]);$('#settingSiteTitle').value=settings.site_title||'Сонирхолтой Газарзүй';$('#settingSupportEmail').value=settings.support_email||'';$('#settingStudentRegistration').checked=settings.student_registration_open!==false&&settings.registration_open!==false;$('#settingRegistration').checked=settings.teacher_registration_open!==false&&settings.registration_open!==false;$('#settingPublish').checked=settings.teacher_can_publish!==false;render()}
$('#settingsForm').addEventListener('submit',async e=>{e.preventDefault();const btn=e.submitter;btn.disabled=true;try{const teacherOpen=$('#settingRegistration').checked,studentOpen=$('#settingStudentRegistration').checked;settings={site_title:$('#settingSiteTitle').value.trim(),support_email:$('#settingSupportEmail').value.trim(),registration_open:teacherOpen||studentOpen,teacher_registration_open:teacherOpen,student_registration_open:studentOpen,teacher_can_publish:$('#settingPublish').checked};await GeoBackend.saveSettings(settings);const b=$('#settingsMessage');b.textContent='Тохиргоо амжилттай хадгалагдлаа.';b.classList.add('show');setTimeout(()=>b.classList.remove('show'),2500)}catch(ex){alert(ex.message)}finally{btn.disabled=false}});
$('#adminLogoutBtn').onclick=async()=>{await GeoBackend.signOut();location.href='/admin'};
$('#adminLoginForm').addEventListener('submit',async e=>{e.preventDefault();$('#adminLoginError').classList.remove('show');const btn=e.submitter;btn.disabled=true;btn.textContent='Шалгаж байна...';try{const s=await GeoBackend.signIn($('#adminEmail').value.trim(),$('#adminPassword').value);if(s.profile.role!=='admin'){await GeoBackend.signOut();throw new Error('Энэ хэрэглэгч админ эрхгүй байна.')}await enterAdmin(s)}catch(ex){showLoginError(ex.message||'Нэвтрэхэд алдаа гарлаа.');btn.disabled=false;btn.textContent='Админ самбар нээх →'}});
async function enterAdmin(s){adminSession=s;$('#adminLoginView').classList.add('hidden');$('#adminApp').classList.remove('hidden');$('#adminSideName').textContent=s.profile.full_name||'Админ';$('#adminSideEmail').textContent=s.user.email;if(GeoBackend.mode==='demo')$('#adminDemoNotice').classList.remove('hidden');else{$('#adminBackendBadge').textContent='LIVE';$('#adminBackendBadge').classList.add('live')}await loadAll()}
(async()=>{if(GeoBackend.mode==='demo')$('#adminDemoNote').classList.remove('hidden');try{const s=await GeoBackend.getSession();if(s.user&&s.profile?.role==='admin'&&s.profile?.status==='active')await enterAdmin(s)}catch(e){console.error(e)}})();
