const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let studentSession=null,studentItems=[],studentProgress=[],aiHistory=[],studentSchemes=[],studentCatScores=[];
const typeLabel={lesson:'Хичээл',assignment:'Даалгавар',exam:'Шалгалт'},resourceLabel={video:'Видео',ppt:'PowerPoint',word:'Word',pdf:'PDF',link:'Линк',other:'Файл'};
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function fmt(d,withTime=false){if(!d)return'—';try{return new Intl.DateTimeFormat('mn-MN',withTime?{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}:{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(d))}catch{return'—'}}
function tab(name){$$('.nav-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));$$('.tab-page').forEach(p=>p.classList.toggle('active',p.id===`tab-${name}`));$('#studentTopTitle').textContent={overview:'Хяналтын самбар',lessons:'Хичээлүүд',assignments:'Даалгавар',exams:'Шалгалт',grades:'Миний дүн',ai:'AI чат багш'}[name]||'Сурагчийн самбар'}
$$('.nav-tab').forEach(b=>b.onclick=()=>tab(b.dataset.tab));$$('[data-tab-jump]').forEach(b=>b.onclick=()=>tab(b.dataset.tabJump));
function progressFor(id){return studentProgress.find(p=>p.content_id===id)}
function rowsHtml(rows,empty=null){if(!rows.length)return empty||'<div class="empty"><b>Одоогоор материал алга.</b>Багш энэ ангид материал нийтлэх үед энд харагдана.</div>';return`<div class="table-wrap"><table class="data-table"><thead><tr><th>Материал</th><th>Төрөл</th><th>Багш</th><th>Хугацаа</th><th>Төлөв</th><th>Үйлдэл</th></tr></thead><tbody>${rows.map(x=>{const p=progressFor(x.id),done=p?.status==='completed';return`<tr><td class="title-cell"><b>${esc(x.title)}</b><small>${esc(x.description||'Тайлбаргүй')}</small></td><td><span class="pill ${x.content_type==='lesson'?'green':x.content_type==='assignment'?'blue':'purple'}">${esc(typeLabel[x.content_type]||x.content_type)} · ${esc(resourceLabel[x.resource_type]||x.resource_type)}</span></td><td>${esc(x.teacher_name||'Багш')}</td><td>${x.due_at?fmt(x.due_at):'—'}</td><td><span class="pill ${done?'green':p?.opened_at?'blue':'orange'}">${done?'Гүйцэтгэсэн':p?.opened_at?'Үзэж эхэлсэн':'Хүлээгдэж байна'}</span></td><td><div class="actions"><button class="icon-action" data-student-open="${x.id}">Нээх</button><button class="icon-action" data-student-done="${x.id}">${done?'Буцаах':'✓ Гүйцэтгэсэн'}</button></div></td></tr>`}).join('')}</tbody></table></div>`}
function filtered(type,extra=null){const q=$(`.student-search[data-type="${type}"]`)?.value.toLowerCase().trim()||'';return studentItems.filter(x=>x.content_type===type&&(!extra||extra(x))&&(!q||`${x.title} ${x.description} ${x.subject} ${x.teacher_name}`.toLowerCase().includes(q)))}
function baselineItems(){return studentItems.filter(x=>x.content_type==='exam'&&x.exam_kind==='baseline')}
// ---- Дүнгийн бүтэц (багшийн тохируулсан жингээр) ----
const CAT_LABEL={attendance:'Ирц',participation:'Явц',progress_exam:'Явцын шалгалт',assignment:'Даалгавар',final_exam:'Эцсийн шалгалт'};
const CAT_KEYS=['attendance','participation','progress_exam','assignment','final_exam'];
const MANUAL_CATS=['attendance','participation'];
function categoryOf(x){
  if(x.content_type==='assignment')return 'assignment';
  if(x.content_type==='exam')return x.exam_kind==='final'?'final_exam':x.exam_kind==='baseline'?null:'progress_exam';
  return null;
}
function studentScheme(){
  const base=GeoBackend.DEFAULT_SCHEME,g=String(studentSession?.profile?.grade||'7');
  const matching=studentSchemes.filter(x=>String(x.grade)===g);
  if(!matching.length)return{...base};
  const counts={};studentItems.forEach(x=>{counts[x.owner_id]=(counts[x.owner_id]||0)+1});
  matching.sort((a,b)=>(counts[b.owner_id]||0)-(counts[a.owner_id]||0));
  const r=matching[0],out={};
  CAT_KEYS.forEach(k=>{const n=Number(r[k]);out[k]=Number.isFinite(n)?n:base[k]});
  return out;
}
function gradeData(){
  const scheme=studentScheme();
  const cats=CAT_KEYS.map(k=>{
    const weight=Number(scheme[k]||0);let pct=null,detail='';
    if(MANUAL_CATS.includes(k)){
      const r=studentCatScores.find(x=>x.category===k);
      pct=r&&r.score!=null?Number(r.score):null;
      detail=pct==null?'Багш хараахан оруулаагүй':'Багшийн үнэлгээ';
    }else{
      const rel=studentItems.filter(x=>categoryOf(x)===k);
      let earned=0,possible=0,n=0;
      rel.forEach(x=>{const p=progressFor(x.id),max=Number(x.max_score||0);if(max>0&&p?.score!=null){earned+=Number(p.score);possible+=max;n++}});
      if(possible>0)pct=(earned/possible)*100;
      detail=rel.length?`${n} / ${rel.length} үнэлэгдсэн`:'Материал алга';
    }
    return{key:k,label:CAT_LABEL[k],weight,pct,detail,contribution:pct==null?0:pct*weight/100};
  });
  const final=cats.reduce((n,c)=>n+c.contribution,0);
  const counted=cats.reduce((n,c)=>n+(c.pct==null?0:c.weight),0);
  return{cats,final,counted,scheme};
}
function gradesHtml(){
  const{cats,final,counted}=gradeData();
  const items=studentItems.filter(x=>categoryOf(x));
  const catRows=cats.map(c=>`<tr><td class="title-cell"><b>${c.label}</b><small>${esc(c.detail)}</small></td><td><b>${c.weight}%</b></td><td>${c.pct==null?'<span class="muted">—</span>':`${c.pct.toFixed(1)}%`}</td><td>${c.pct==null?'<span class="muted">—</span>':`${c.contribution.toFixed(1)}%`}</td></tr>`).join('');
  const detail=items.length?`<div class="panel-head sub-head"><h3>Үнэлгээ тус бүрээр</h3></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Үнэлгээ</th><th>Ангилал</th><th>Оноо</th><th>Багшийн тайлбар</th></tr></thead><tbody>${items.map(x=>{const p=progressFor(x.id),max=Number(x.max_score||0);return`<tr><td class="title-cell"><b>${esc(x.title)}</b><small>${esc(x.teacher_name||'Багш')}</small></td><td><span class="pill ${x.content_type==='assignment'?'blue':'purple'}">${esc(CAT_LABEL[categoryOf(x)])}</span></td><td>${p?.score==null?'—':`${Number(p.score)} / ${max}`}</td><td>${esc(p?.teacher_feedback||'—')}</td></tr>`}).join('')}</tbody></table></div>`:'';
  return`<div class="grade-summary student-grade-summary"><div><b>Одоогийн нийт дүн</b><span><strong>${final.toFixed(1)}%</strong> / одоогоор боломжит ${counted}%</span></div><span class="muted">Гарааны үнэлгээ эцсийн дүнд ороогүй</span></div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Ангилал</th><th>Жин</th><th>Гүйцэтгэл</th><th>Дүнд нэмэгдэх</th></tr></thead><tbody>${catRows}</tbody></table></div>${detail}`;
}
function renderStudent(){const {final}=gradeData();$('#studentLessonCount').textContent=studentItems.filter(x=>x.content_type==='lesson').length;$('#studentAssignmentCount').textContent=studentItems.filter(x=>x.content_type==='assignment').length;$('#studentExamCount').textContent=studentItems.filter(x=>x.content_type==='exam').length;$('#studentFinalGrade').textContent=`${final.toFixed(1)}%`;$('#studentRecent').innerHTML=rowsHtml(studentItems.slice(0,5));$('#studentLessonTable').innerHTML=rowsHtml(filtered('lesson'));$('#studentAssignmentTable').innerHTML=rowsHtml(filtered('assignment'));$('#studentExamTable').innerHTML=rowsHtml(filtered('exam',x=>x.exam_kind!=='baseline'));renderBaseline();$('#studentGradesTable').innerHTML=gradesHtml();bindStudentActions()}
function renderBaseline(){
  const list=baselineItems(),box=$('#studentBaselineTable'),badge=$('#baselineBadge');
  if(box)box.innerHTML=rowsHtml(list,'<div class="empty"><b>Гарааны үнэлгээ хараахан алга.</b>Багш гарааны үнэлгээ нийтлэх үед энд хамгийн түрүүнд харагдана.</div>');
  if(!badge)return;
  if(!list.length){badge.textContent='Алга';badge.className='pill';return}
  const done=list.filter(x=>progressFor(x.id)?.status==='completed').length;
  badge.textContent=done===list.length?'Гүйцэтгэсэн':`${done}/${list.length} гүйцэтгэсэн`;
  badge.className=`pill ${done===list.length?'green':'orange'}`;
}
function bindStudentActions(){
  $$('[data-student-open]').forEach(b=>b.onclick=async()=>{const x=studentItems.find(i=>i.id===b.dataset.studentOpen);try{await GeoBackend.touchStudentProgress(x.id,'open');studentProgress=await GeoBackend.listStudentProgress();renderStudent();await GeoBackend.openResource(x)}catch(e){alert(e.message)}});
  $$('[data-student-done]').forEach(b=>b.onclick=async()=>{const x=studentItems.find(i=>i.id===b.dataset.studentDone),p=progressFor(x.id);try{await GeoBackend.setStudentProgress(x.id,p?.status==='completed'?'pending':'completed');await loadStudent()}catch(e){alert(e.message)}});
}
$$('.student-search').forEach(el=>el.addEventListener('input',renderStudent));
async function loadStudent(){[studentItems,studentProgress,studentSchemes,studentCatScores]=await Promise.all([GeoBackend.listStudentContent(studentSession.profile.grade),GeoBackend.listStudentProgress(),GeoBackend.listGradeSchemes(),GeoBackend.listCategoryScores({studentId:studentSession.user.id})]);renderStudent()}
$('#studentLogoutBtn').onclick=async()=>{await GeoBackend.signOut();location.href='/auth'};

// Vercel дээр /api/..., Netlify дээр /.netlify/functions/... — аль нь байгааг нь ашиглана.
const AI_ENDPOINTS=['/api/ai-teacher','/.netlify/functions/ai-teacher'];
async function askAiTeacher(payload,token){
  let missing=null;
  for(const url of AI_ENDPOINTS){
    const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(payload)});
    if(res.status===404){missing=new Error('AI үйлчилгээ сервер дээр олдсонгүй. SETUP.md-ийн “AI чат багш” хэсгийг шалгана уу.');continue}
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||'AI үйлчилгээ одоогоор холбогдоогүй байна.');
    return data;
  }
  throw missing;
}
function addAiMessage(role,text){const div=document.createElement('div');div.className=`ai-message ${role}`;div.innerHTML=`<b>${role==='assistant'?'AI багш':'Та'}</b><p>${esc(text).replace(/\n/g,'<br>')}</p>`;$('#aiChat').appendChild(div);$('#aiChat').scrollTop=$('#aiChat').scrollHeight}
$('#aiForm').addEventListener('submit',async e=>{e.preventDefault();const input=$('#aiInput'),text=input.value.trim();if(!text)return;addAiMessage('user',text);aiHistory.push({role:'user',content:text});input.value='';const btn=$('#aiSendBtn');btn.disabled=true;btn.textContent='Бодож байна...';$('#aiStatus').textContent='AI багш хариулж байна...';try{
  if(GeoBackend.mode==='demo')throw new Error('AI чатны интерфэйс бэлэн байна. Жинхэнэ AI хариулт авахын тулд Supabase холбож, серверт OPENAI_API_KEY тохируулна уу.');
  const {data:{session:sbSession}}=await GeoBackend.client.auth.getSession();const token=sbSession?.access_token;if(!token)throw new Error('AI багш ашиглахын тулд дахин нэвтэрнэ үү.');
  const data=await askAiTeacher({message:text,history:aiHistory.slice(0,-1).slice(-8)},token);const answer=data.answer||'Хариу ирсэнгүй.';addAiMessage('assistant',answer);aiHistory.push({role:'assistant',content:answer});$('#aiStatus').textContent='AI зөвлөгөө алдаа гаргаж болох тул чухал мэдээллийг багш, сурах бичгээс давхар шалгаарай.'
}catch(err){addAiMessage('assistant',err.message||'AI холболтын тохиргоог SETUP.md файлаас шалгана уу.');$('#aiStatus').textContent='AI холболтын тохиргоог SETUP.md файлаас харна уу.'}finally{btn.disabled=false;btn.textContent='Илгээх →'}});

(async()=>{try{studentSession=await GeoBackend.getSession();if(!studentSession.user||studentSession.profile?.role!=='student'||studentSession.profile?.status!=='active'){if(studentSession.user)await GeoBackend.signOut();location.href='/auth';return}const n=studentSession.profile.full_name||'Сурагч',g=studentSession.profile.grade||'7';$('#studentSideName').textContent=n;$('#studentSideEmail').textContent=studentSession.user.email;$('#studentWelcomeName').textContent=n.split(' ')[0];$('#studentGradeBadge').textContent=`${g}-р анги`;$('#studentGradeText').textContent=`${g}-р анги`;if(GeoBackend.mode==='demo')$('#studentDemoNotice').classList.remove('hidden');else{$('#studentBackendBadge').textContent='LIVE';$('#studentBackendBadge').classList.add('live')}await loadStudent()}catch(e){console.error(e);location.href='/auth'}})();
