const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let session=null, items=[], students=[], teacherProgress=[], editing=null, schemes=[], categoryScores=[];
const typeLabel={lesson:'Хичээл',assignment:'Даалгавар',exam:'Шалгалт'};
const resourceLabel={video:'Видео',ppt:'PowerPoint',word:'Word',pdf:'PDF',link:'Линк',other:'Файл'};
const examKindLabel={baseline:'Гарааны үнэлгээ',progress:'Явцын үнэлгээ',final:'Эцсийн үнэлгээ'};
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function fmt(d,withTime=false){if(!d)return'—';try{return new Intl.DateTimeFormat('mn-MN',withTime?{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}:{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(d))}catch{return'—'}}
function tab(name){$$('.nav-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));$$('.tab-page').forEach(p=>p.classList.toggle('active',p.id===`tab-${name}`));$('#topTitle').textContent={overview:'Хяналтын самбар',lessons:'Хичээлүүд',assignments:'Даалгавар',exams:'Шалгалт',gradebook:'Дүн ба ахиц'}[name]||'Багшийн самбар';if(name==='gradebook')renderGradebook()}
$$('.nav-tab').forEach(b=>b.onclick=()=>tab(b.dataset.tab));$$('[data-tab-jump]').forEach(b=>b.onclick=()=>tab(b.dataset.tabJump));
function filtered(type){const q=$(`.content-search[data-type="${type}"]`)?.value.toLowerCase().trim()||'',g=$(`.grade-filter[data-type="${type}"]`)?.value||'';return items.filter(x=>x.content_type===type&&(!g||String(x.grade)===g)&&(!q||`${x.title} ${x.description} ${x.subject}`.toLowerCase().includes(q)))}
function rowsHtml(rows){if(!rows.length)return'<div class="empty"><b>Агуулга хараахан алга.</b>“Агуулга нэмэх” товчоор шинээр үүсгэнэ үү.</div>';return`<div class="table-wrap"><table class="data-table"><thead><tr><th>Агуулга</th><th>Төрөл</th><th>Анги</th><th>Дүнгийн ангилал</th><th>Төлөв</th><th>Үйлдэл</th></tr></thead><tbody>${rows.map(x=>`<tr><td class="title-cell"><b>${esc(x.title)}</b><small>${esc(x.description||'Тайлбаргүй')}</small></td><td><span class="pill ${x.content_type==='lesson'?'green':x.content_type==='assignment'?'blue':'purple'}">${esc(typeLabel[x.content_type]||x.content_type)} · ${esc(resourceLabel[x.resource_type]||x.resource_type)}</span>${x.content_type==='exam'&&examKindLabel[x.exam_kind]?`<span class="pill ${x.exam_kind==='baseline'?'orange':'blue'} kind-pill">${esc(examKindLabel[x.exam_kind])}</span>`:''}</td><td>${esc(x.grade)}-р</td><td>${x.content_type==='lesson'?'—':`${Number(x.max_score||0)} оноо · ${CAT_LABEL[categoryOf(x)]||'дүнд ороогүй'}`}</td><td><span class="pill ${x.published?'green':'orange'}">${x.published?'Нийтэлсэн':'Ноорог'}</span></td><td><div class="actions"><button class="icon-action" data-open="${x.id}">Нээх</button><button class="icon-action" data-edit="${x.id}">Засах</button><button class="icon-action" data-delete="${x.id}">Устгах</button></div></td></tr>`).join('')}</tbody></table></div>`}
function render(){
  $('#lessonCount').textContent=items.filter(x=>x.content_type==='lesson').length;$('#assignmentCount').textContent=items.filter(x=>x.content_type==='assignment').length;$('#examCount').textContent=items.filter(x=>x.content_type==='exam').length;$('#studentCountTeacher').textContent=students.length;
  $('#recentContent').innerHTML=rowsHtml(items.slice(0,5));$('#lessonTable').innerHTML=rowsHtml(filtered('lesson'));$('#assignmentTable').innerHTML=rowsHtml(filtered('assignment'));$('#examTable').innerHTML=rowsHtml(filtered('exam'));bindContentActions();refreshAssessmentFilter();
}
function bindContentActions(){
  $$('[data-open]').forEach(b=>b.onclick=async()=>{const x=items.find(i=>i.id===b.dataset.open);try{await GeoBackend.openResource(x)}catch(e){alert(e.message)}});
  $$('[data-edit]').forEach(b=>b.onclick=()=>openDialog(items.find(i=>i.id===b.dataset.edit)));
  $$('[data-delete]').forEach(b=>b.onclick=async()=>{const x=items.find(i=>i.id===b.dataset.delete);if(confirm(`“${x.title}” материалыг устгах уу?`)){try{await GeoBackend.deleteContent(x);await load()}catch(e){alert(e.message)}}});
}
$$('.content-search').forEach(el=>el.addEventListener('input',render));$$('.grade-filter').forEach(el=>el.addEventListener('change',render));
function syncFields(){const rt=$('#resourceType').value,type=$('#contentType').value;$('#fileField').classList.toggle('hidden',rt==='link');$('#linkField').classList.toggle('hidden',rt!=='link');$('#dueField').classList.toggle('hidden',type==='lesson');$('#gradingFields').classList.toggle('hidden',type==='lesson');$('#maxScore').required=type!=='lesson';$('#examKindField').classList.toggle('hidden',type!=='exam')}
$('#resourceType').onchange=syncFields;$('#contentType').onchange=syncFields;
function openDialog(x=null,forcedType=null){editing=x;$('#contentForm').reset();$('#formError').classList.remove('show');$('#contentId').value=x?.id||'';$('#existingFilePath').value=x?.file_path||'';$('#existingFileName').value=x?.file_name||'';$('#contentType').value=x?.content_type||forcedType||'lesson';$('#grade').value=x?.grade||'7';$('#contentTitle').value=x?.title||'';$('#description').value=x?.description||'';$('#subject').value=x?.subject||session?.profile?.subject||'Газарзүй';$('#resourceType').value=x?.resource_type||'video';$('#externalUrl').value=x?.external_url||'';$('#dueAt').value=x?.due_at?new Date(x.due_at).toISOString().slice(0,16):'';$('#published').value=String(x?.published??true);$('#maxScore').value=x?.max_score??100;$('#examKind').value=x?.exam_kind||'progress';$('#currentFile').textContent=x?.file_name||'байхгүй';$('#dialogTitle').textContent=x?'Агуулга засах':'Шинэ агуулга нэмэх';syncFields();$('#contentModal').classList.add('open')}
function closeDialog(){$('#contentModal').classList.remove('open');editing=null}
$('#dialogClose').onclick=closeDialog;$('#cancelDialog').onclick=closeDialog;$('#contentModal').onclick=e=>{if(e.target.id==='contentModal')closeDialog()};$('#newContentBtn').onclick=()=>openDialog();$$('[data-new]').forEach(b=>b.onclick=()=>openDialog(null,b.dataset.new));
$('#contentForm').addEventListener('submit',async e=>{e.preventDefault();const err=$('#formError');err.classList.remove('show');const btn=$('#saveContentBtn');btn.disabled=true;btn.textContent='Хадгалж байна...';try{const file=$('#resourceFile').files[0]||null;if(file&&file.size>50*1024*1024)throw new Error('Файл 50MB-аас их байна. Том видеог YouTube/Vimeo линкээр оруулахыг зөвлөж байна.');const rt=$('#resourceType').value,type=$('#contentType').value;if(rt==='link'&&!$('#externalUrl').value.trim())throw new Error('Веб линк оруулна уу.');if(rt!=='link'&&!file&&!editing?.file_path&&!editing?.file_name)throw new Error('Файл сонгоно уу.');if(type!=='lesson'&&Number($('#maxScore').value)<=0)throw new Error('Дээд оноо 0-ээс их байх ёстой.');await GeoBackend.saveContent({id:$('#contentId').value||null,file_path:$('#existingFilePath').value,file_name:$('#existingFileName').value,content_type:type,title:$('#contentTitle').value.trim(),description:$('#description').value.trim(),grade:$('#grade').value,subject:$('#subject').value.trim(),resource_type:rt,external_url:$('#externalUrl').value.trim(),due_at:$('#dueAt').value?new Date($('#dueAt').value).toISOString():null,published:$('#published').value==='true',max_score:$('#maxScore').value,grade_weight:0,exam_kind:type==='exam'?$('#examKind').value:null},file);closeDialog();await load()}catch(ex){err.textContent=ex.message||'Хадгалахад алдаа гарлаа.';err.classList.add('show')}finally{btn.disabled=false;btn.textContent='Хадгалах'}});

function assessmentsForGrade(g=''){return items.filter(x=>['assignment','exam'].includes(x.content_type)&&(!g||String(x.grade)===String(g)))}
function selectableForGrade(g=''){return items.filter(x=>(!g||String(x.grade)===String(g))).sort((a,b)=>String(a.grade).localeCompare(String(b.grade))||String(a.title).localeCompare(String(b.title)))}
function refreshAssessmentFilter(){const sel=$('#assessmentFilter'),cur=sel.value,g=$('#gradebookGrade').value;const a=selectableForGrade(g);sel.innerHTML='<option value="">Бүх агуулга / үнэлгээ</option>'+a.map(x=>`<option value="${x.id}">${esc(x.grade)}-р · ${typeLabel[x.content_type]||x.content_type} · ${esc(x.title)}</option>`).join('');if(a.some(x=>x.id===cur))sel.value=cur}
function pFor(studentId,contentId){return teacherProgress.find(p=>p.student_id===studentId&&p.content_id===contentId)}
function latestActivity(studentId){const ps=teacherProgress.filter(p=>p.student_id===studentId);const dates=ps.flatMap(p=>[p.last_opened_at,p.completed_at,p.updated_at].filter(Boolean)).map(d=>new Date(d));return dates.length?new Date(Math.max(...dates)) : null}
// ---- Дүнгийн бүтэц: Ирц · Явц · Явцын шалгалт · Даалгавар · Эцсийн шалгалт ----
const CAT_LABEL={attendance:'Ирц',participation:'Явц',progress_exam:'Явцын шалгалт',assignment:'Даалгавар',final_exam:'Эцсийн шалгалт'};
const CAT_KEYS=['attendance','participation','progress_exam','assignment','final_exam'];
const MANUAL_CATS=['attendance','participation'];
// Гарааны үнэлгээ (baseline) нь оношилгооны зорилготой тул эцсийн дүнд ороогүй.
function categoryOf(x){
  if(x.content_type==='assignment')return 'assignment';
  if(x.content_type==='exam')return x.exam_kind==='final'?'final_exam':x.exam_kind==='baseline'?null:'progress_exam';
  return null;
}
function catScoreFor(studentId,cat){const r=categoryScores.find(x=>x.student_id===studentId&&x.category===cat);return r&&r.score!=null?Number(r.score):null}
// Ангилал доторх оноог нийт онооны харьцаагаар бодно (авсан оноо / боломжит оноо).
function categoryPercent(studentId,pool,cat){
  let earned=0,possible=0;
  pool.filter(x=>categoryOf(x)===cat).forEach(x=>{const p=pFor(studentId,x.id),max=Number(x.max_score||0);if(max>0&&p?.score!=null){earned+=Number(p.score);possible+=max}});
  return possible>0?{pct:(earned/possible)*100,has:true}:{pct:0,has:false};
}
function categoryPct(studentId,pool,cat){
  if(MANUAL_CATS.includes(cat))return catScoreFor(studentId,cat);
  const r=categoryPercent(studentId,pool,cat);return r.has?r.pct:null;
}
function studentFinal(studentId,pool,scheme){
  let score=0,counted=0;
  CAT_KEYS.forEach(k=>{const w=Number(scheme?.[k]||0);if(w<=0)return;const pct=categoryPct(studentId,pool,k);if(pct!=null){score+=pct*w/100;counted+=w}});
  return{score,counted};
}
// ---- Жингийн тохиргооны засварлагч ----
const SCHEME_INPUTS={attendance:'#wAttendance',participation:'#wParticipation',progress_exam:'#wProgressExam',assignment:'#wAssignment',final_exam:'#wFinalExam'};
function schemeForGrade(g){
  const row=schemes.find(x=>String(x.grade)===String(g));
  const base=GeoBackend.DEFAULT_SCHEME;
  const out={};CAT_KEYS.forEach(k=>{const n=Number(row?.[k]);out[k]=Number.isFinite(n)?n:base[k]});
  out.exists=Boolean(row);return out;
}
function readSchemeInputs(){const o={};CAT_KEYS.forEach(k=>{const n=Number($(SCHEME_INPUTS[k]).value);o[k]=Number.isFinite(n)?n:0});return o}
function updateSchemeTotal(){
  const w=readSchemeInputs(),total=CAT_KEYS.reduce((n,k)=>n+w[k],0),ok=Math.abs(total-100)<.01;
  const el=$('#schemeTotal');el.textContent=`${Math.round(total*10)/10}%`;el.className=ok?'ok-weight':'warn-weight';
  $('#schemeSaveBtn').disabled=!ok||!$('#gradebookGrade').value;
  return{total,ok};
}
function fillSchemeInputs(){
  const g=$('#gradebookGrade').value;
  const box=$('#schemeBox');box.classList.toggle('scheme-disabled',!g);
  const sc=schemeForGrade(g||'7');
  CAT_KEYS.forEach(k=>{const el=$(SCHEME_INPUTS[k]);el.value=sc[k];el.disabled=!g});
  $('#schemeScope').textContent=g?`${g}-р ангийн жин${sc.exists?'':' (анхны утга — хараахан хадгалаагүй)'}`:'Дээрээс анги сонгоход тохируулах боломжтой';
  $('#schemeMsg').textContent='';$('#schemeMsg').className='scheme-msg';
  $('#schemeResetBtn').disabled=!g;
  updateSchemeTotal();
}
CAT_KEYS.forEach(k=>$(SCHEME_INPUTS[k]).addEventListener('input',updateSchemeTotal));
$('#schemeResetBtn').onclick=()=>{const b=GeoBackend.DEFAULT_SCHEME;CAT_KEYS.forEach(k=>$(SCHEME_INPUTS[k]).value=b[k]);updateSchemeTotal()};
$('#schemeSaveBtn').onclick=async()=>{
  const g=$('#gradebookGrade').value;if(!g)return;
  const btn=$('#schemeSaveBtn'),msg=$('#schemeMsg');btn.disabled=true;btn.textContent='Хадгалж байна...';
  try{
    await GeoBackend.saveGradeScheme(g,readSchemeInputs());
    schemes=await GeoBackend.listGradeSchemes(session.user.id);
    fillSchemeInputs();renderGradebook();
    msg.textContent=`${g}-р ангийн дүнгийн бүтэц хадгалагдлаа.`;msg.className='scheme-msg ok';
  }catch(e){msg.textContent=e.message||'Хадгалахад алдаа гарлаа.';msg.className='scheme-msg bad'}
  finally{btn.textContent='Бүтэц хадгалах';updateSchemeTotal()}
};

function renderGradebook(){
  refreshAssessmentFilter();
  const g=$('#gradebookGrade').value,cid=$('#assessmentFilter').value;
  const st=students.filter(s=>!g||String(s.grade)===g);
  const selected=cid?items.find(x=>x.id===cid):null,isGradable=selected&&['assignment','exam'].includes(selected.content_type);
  const scheme=schemeForGrade(g||'7');
  const pool=items.filter(x=>!g||String(x.grade)===String(g));

  $('#gradeWeightSummary').innerHTML=`<div><b>Үнэлгээний бүтэц</b><span>${CAT_KEYS.map(k=>`${CAT_LABEL[k]} ${scheme[k]}%`).join(' · ')}</span></div>${selected?`<div class="selected-assessment">Сонгосон: <b>${esc(selected.title)}</b> · ${typeLabel[selected.content_type]||selected.content_type}${isGradable?` · ${Number(selected.max_score||0)} оноо · ${CAT_LABEL[categoryOf(selected)]||'дүнд ороогүй'}`:' · үзсэн хугацааг хянах'}</div>`:'<div class="selected-assessment">Агуулга сонговол тухайн хичээлийн оноо, үзсэн хугацааг хянана. Сонгохгүй бол доор ангиллаар задалсан нийт дүн харагдана.</div>'}`;

  if(!st.length){$('#gradebookTable').innerHTML='<div class="empty"><b>Сурагч олдсонгүй.</b>Таны сургуультай ижил бүртгэлтэй сурагчид энд харагдана.</div>';return}

  if(selected){
    const rows=st.map(s=>{const p=pFor(s.id,selected.id);return`<tr><td class="title-cell"><b>${esc(s.full_name||'Нэргүй')}</b><small>${esc(s.email||'')} · ${esc(s.grade||'—')}-р анги</small></td><td>${isGradable?`<input class="score-input" data-score-student="${s.id}" type="number" min="0" max="${Number(selected.max_score||100)}" step="0.1" value="${p?.score??''}" placeholder="0 / ${Number(selected.max_score||0)}">`:'—'}</td><td>${isGradable?`<input class="feedback-input" data-feedback-student="${s.id}" value="${esc(p?.teacher_feedback||'')}" placeholder="Тайлбар">`:'—'}</td><td>${fmt(p?.opened_at,true)}</td><td>${fmt(p?.completed_at,true)}</td><td>${isGradable?`<button class="icon-action" data-save-grade="${s.id}">Хадгалах</button>`:`<span class="pill ${p?.completed_at?'green':p?.opened_at?'blue':'orange'}">${p?.completed_at?'Гүйцэтгэсэн':p?.opened_at?'Үзсэн':'Нээгээгүй'}</span>`}</td></tr>`}).join('');
    $('#gradebookTable').innerHTML=`<div class="table-wrap"><table class="data-table grade-table"><thead><tr><th>Сурагч</th><th>Оноо</th><th>Багшийн тайлбар</th><th>Анх нээсэн</th><th>Гүйцэтгэсэн</th><th>Үйлдэл</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    if(isGradable)$$('[data-save-grade]').forEach(b=>b.onclick=async()=>{const sid=b.dataset.saveGrade,score=$(`[data-score-student="${sid}"]`).value,feedback=$(`[data-feedback-student="${sid}"]`).value;try{if(score!==''&&(Number(score)<0||Number(score)>Number(selected.max_score||100)))throw new Error(`Оноо 0–${selected.max_score} хооронд байна.`);b.disabled=true;b.textContent='...';await GeoBackend.saveGrade(selected.id,sid,score,feedback);teacherProgress=await GeoBackend.listTeacherProgress(session.user.id);renderGradebook()}catch(e){alert(e.message)}finally{b.disabled=false}});
    return;
  }

  // Ерөнхий харагдац: Ирц/Явцыг шууд бичиж, бусад ангиллыг тооцоолж харуулна.
  const cell=(sid,k)=>{const v=categoryPct(sid,pool,k);return v==null?'<span class="muted">—</span>':`${v.toFixed(1)}%`};
  const rows=st.map(s=>{
    const fin=studentFinal(s.id,pool,scheme);
    return`<tr><td class="title-cell"><b>${esc(s.full_name||'Нэргүй')}</b><small>${esc(s.email||'')} · ${esc(s.grade||'—')}-р анги</small></td>`+
      MANUAL_CATS.map(k=>`<td><input class="score-input cat-input" data-cat-student="${s.id}" data-cat="${k}" type="number" min="0" max="100" step="0.1" value="${catScoreFor(s.id,k)??''}" placeholder="0–100" ${scheme[k]>0?'':'disabled title="Энэ ангиллын жин 0%"'}></td>`).join('')+
      `<td>${cell(s.id,'progress_exam')}</td><td>${cell(s.id,'assignment')}</td><td>${cell(s.id,'final_exam')}</td>`+
      `<td><span class="pill ${fin.score>=80?'green':fin.score>=60?'blue':'orange'}">${fin.score.toFixed(1)}%</span><small class="counted-hint">боломжит ${fin.counted}%</small></td>`+
      `<td><button class="icon-action" data-save-cat="${s.id}">Хадгалах</button></td></tr>`;
  }).join('');
  $('#gradebookTable').innerHTML=`<div class="table-wrap"><table class="data-table grade-table"><thead><tr><th>Сурагч</th><th>Ирц (${scheme.attendance}%)</th><th>Явц (${scheme.participation}%)</th><th>Явцын шалгалт (${scheme.progress_exam}%)</th><th>Даалгавар (${scheme.assignment}%)</th><th>Эцсийн шалгалт (${scheme.final_exam}%)</th><th>Нийт дүн</th><th>Үйлдэл</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  $$('[data-save-cat]').forEach(b=>b.onclick=async()=>{
    const sid=b.dataset.saveCat;b.disabled=true;b.textContent='...';
    try{
      for(const k of MANUAL_CATS){
        const el=$(`[data-cat-student="${sid}"][data-cat="${k}"]`);
        if(el&&!el.disabled)await GeoBackend.saveCategoryScore(sid,k,el.value);
      }
      categoryScores=await GeoBackend.listCategoryScores({ownerId:session.user.id});
      renderGradebook();
    }catch(e){alert(e.message)}finally{b.disabled=false;b.textContent='Хадгалах'}
  });
}
$('#gradebookGrade').onchange=()=>{refreshAssessmentFilter();fillSchemeInputs();renderGradebook()};$('#assessmentFilter').onchange=renderGradebook;
function exportExcel(){
  const g=$('#gradebookGrade').value,ass=assessmentsForGrade(g),allContent=selectableForGrade(g),st=students.filter(s=>!g||String(s.grade)===g),gradeRows=[],activityRows=[];
  const scheme=schemeForGrade(g||'7'),pool=items.filter(x=>!g||String(x.grade)===String(g));
  st.forEach(s=>{
    ass.forEach(a=>{const p=pFor(s.id,a.id);gradeRows.push({'Сурагч':s.full_name,'И-мэйл':s.email,'Анги':`${s.grade}-р анги`,'Ангилал':CAT_LABEL[categoryOf(a)]||'—','Үнэлгээ':a.title,'Дээд оноо':Number(a.max_score||0),'Авсан оноо':p?.score??'','Анх нээсэн':fmt(p?.opened_at,true),'Сүүлд нээсэн':fmt(p?.last_opened_at,true),'Гүйцэтгэсэн':fmt(p?.completed_at,true),'Багшийн тайлбар':p?.teacher_feedback||''})});
    CAT_KEYS.forEach(k=>{const pct=categoryPct(s.id,pool,k);gradeRows.push({'Сурагч':s.full_name,'И-мэйл':s.email,'Анги':`${s.grade}-р анги`,'Ангилал':CAT_LABEL[k],'Үнэлгээ':`Ангиллын дүн (жин ${scheme[k]}%)`,'Дээд оноо':100,'Авсан оноо':pct==null?'':Number(pct.toFixed(1)),'Анх нээсэн':'','Сүүлд нээсэн':'','Гүйцэтгэсэн':'','Багшийн тайлбар':''})});
    const fin=studentFinal(s.id,pool,scheme);gradeRows.push({'Сурагч':s.full_name,'И-мэйл':s.email,'Анги':`${s.grade}-р анги`,'Ангилал':'НИЙТ','Үнэлгээ':`Эцсийн дүн (боломжит ${fin.counted}%)`,'Дээд оноо':100,'Авсан оноо':Number(fin.score.toFixed(1)),'Анх нээсэн':'','Сүүлд нээсэн':'','Гүйцэтгэсэн':'','Багшийн тайлбар':''});
    allContent.forEach(c=>{const p=pFor(s.id,c.id);activityRows.push({'Сурагч':s.full_name,'И-мэйл':s.email,'Анги':`${s.grade}-р анги`,'Төрөл':typeLabel[c.content_type]||c.content_type,'Агуулга':c.title,'Анх нээсэн':fmt(p?.opened_at,true),'Сүүлд нээсэн':fmt(p?.last_opened_at,true),'Гүйцэтгэсэн':fmt(p?.completed_at,true),'Төлөв':p?.completed_at?'Гүйцэтгэсэн':p?.opened_at?'Үзсэн':'Нээгээгүй'})})
  });
  if(!gradeRows.length&&!activityRows.length)return alert('Экспортлох мэдээлэл алга.');
  if(window.XLSX){const wb=XLSX.utils.book_new();if(gradeRows.length)XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(gradeRows),'Дүн ба шалгалт');if(activityRows.length)XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(activityRows),'Үзсэн хугацаа');XLSX.writeFile(wb,`tomujin-gradebook-${g||'all'}-${new Date().toISOString().slice(0,10)}.xlsx`)}else{const rows=gradeRows.length?gradeRows:activityRows,keys=Object.keys(rows[0]),csv='\ufeff'+[keys.join(','),...rows.map(r=>keys.map(k=>`"${String(r[k]??'').replace(/"/g,'""')}"`).join(','))].join('\n'),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='tomujin-gradebook.csv';a.click();URL.revokeObjectURL(a.href)}
}
$('#exportExcelBtn').onclick=exportExcel;
async function load(){[items,students,teacherProgress,schemes,categoryScores]=await Promise.all([GeoBackend.listContent({ownerId:session.user.id}),GeoBackend.listTeacherStudents(),GeoBackend.listTeacherProgress(session.user.id),GeoBackend.listGradeSchemes(session.user.id),GeoBackend.listCategoryScores({ownerId:session.user.id})]);render();fillSchemeInputs();if($('#tab-gradebook').classList.contains('active'))renderGradebook()}
$('#logoutBtn').onclick=async()=>{await GeoBackend.signOut();location.href='/auth'};
(async()=>{try{session=await GeoBackend.getSession();if(!session.user||!session.profile||!['teacher','admin'].includes(session.profile.role)){location.href='/auth';return}if(session.profile.status!=='active'){await GeoBackend.signOut();location.href='/auth';return}$('#sideName').textContent=session.profile.full_name||'Багш';$('#sideEmail').textContent=session.user.email;$('#welcomeName').textContent=(session.profile.full_name||'Багш').split(' ')[0];if(GeoBackend.mode==='demo')$('#demoNotice').classList.remove('hidden');else{$('#backendBadge').textContent='LIVE';$('#backendBadge').classList.add('live')}await load()}catch(e){console.error(e);location.href='/auth'}})();
