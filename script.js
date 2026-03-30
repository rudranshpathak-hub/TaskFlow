document.addEventListener("DOMContentLoaded", function() {
'use strict';

/* ============================================================
   STORAGE HELPERS
============================================================ */
function getUsers()    { return JSON.parse(localStorage.getItem('tf_users')||'{}'); }
function saveUsers(u)  { localStorage.setItem('tf_users',JSON.stringify(u)); }
const dataKey = u => 'tf_data_'+u;
function getUserData(username){
  const raw = localStorage.getItem(dataKey(username));
  if(raw) return JSON.parse(raw);
  return {
    tasks:[
      {id:'t1',title:'Review project proposal',col:'todo',priority:'high',done:false,created:Date.now()-86400000*2},
      {id:'t2',title:'Design landing page wireframes',col:'todo',priority:'medium',done:false,created:Date.now()-86400000},
      {id:'t3',title:'Set up CI/CD pipeline',col:'inprogress',priority:'high',done:false,created:Date.now()-43200000},
      {id:'t4',title:'Write unit tests for auth module',col:'inprogress',priority:'medium',done:false,created:Date.now()-21600000},
      {id:'t5',title:'Update README documentation',col:'done',priority:'low',done:true,created:Date.now()-172800000},
      {id:'t6',title:'Refactor database queries',col:'done',priority:'medium',done:true,created:Date.now()-259200000},
    ],
    activityLog:[
      {text:'Task <strong>"Update README"</strong> was completed',time:'2h ago'},
      {text:'Task <strong>"Refactor DB queries"</strong> completed',time:'1d ago'},
      {text:'Task <strong>"Review proposal"</strong> added',time:'2d ago'},
    ],
    settings:{dark:false,compact:false,showCompleted:true,fontSize:'16',accent:'#3a6fd8'},
  };
}
function saveUserData(){
  if(!currentUser) return;
  localStorage.setItem(dataKey(currentUser.username),JSON.stringify({
    tasks, activityLog,
    settings:{
      dark:document.getElementById('darkMode').checked,
      compact:document.getElementById('compactView').checked,
      showCompleted:document.getElementById('showCompleted').checked,
      fontSize:document.getElementById('fontSizeSelect').value,
      accent:document.getElementById('accentColorPicker').value,
    }
  }));
}
function getSession()  { return sessionStorage.getItem('tf_session'); }
function setSession(u) { sessionStorage.setItem('tf_session',u); }
function clearSession(){ sessionStorage.removeItem('tf_session'); }
function hashPass(pw){
  let h=5381;
  for(let i=0;i<pw.length;i++) h=((h<<5)+h)^pw.charCodeAt(i);
  return(h>>>0).toString(16);
}

/* ============================================================
   APP STATE
============================================================ */
let currentUser=null, tasks=[], activityLog=[];
let activeFilter='all', draggedId=null, ctxTargetId=null;
const genId=()=>'t'+Math.random().toString(36).slice(2,8);

/* ============================================================
   AUTH — TAB SWITCH
============================================================ */
document.getElementById('tabLogin').addEventListener('click',()=>{
  document.getElementById('tabLogin').classList.add('active');
  document.getElementById('tabSignup').classList.remove('active');
  document.getElementById('loginForm').style.display='';
  document.getElementById('signupForm').style.display='none';
});
document.getElementById('tabSignup').addEventListener('click',()=>{
  document.getElementById('tabSignup').classList.add('active');
  document.getElementById('tabLogin').classList.remove('active');
  document.getElementById('signupForm').style.display='';
  document.getElementById('loginForm').style.display='none';
});

/* PASSWORD VISIBILITY */
document.getElementById('loginEye').addEventListener('click',()=>{const i=document.getElementById('loginPass');i.type=i.type==='password'?'text':'password';});
document.getElementById('signupEye').addEventListener('click',()=>{const i=document.getElementById('signupPass');i.type=i.type==='password'?'text':'password';});

/* STRENGTH METER */
document.getElementById('signupPass').addEventListener('input',e=>{
  const pw=e.target.value;
  let score=0;
  if(pw.length>=6) score++;
  if(pw.length>=10) score++;
  if(/[A-Z]/.test(pw)&&/[0-9]/.test(pw)) score++;
  if(/[^A-Za-z0-9]/.test(pw)) score++;
  const colors=['#d94f6a','#e09030','#2db0a0','#2b59c3'];
  const labels=['','Weak','Fair','Strong','Very strong'];
  ['sb1','sb2','sb3','sb4'].forEach((id,i)=>{document.getElementById(id).style.background=i<score?colors[score-1]:'';});
  document.getElementById('strengthLabel').textContent=labels[score]||'';
});

/* ============================================================
   AUTH — LOGIN
============================================================ */
document.getElementById('loginBtn').addEventListener('click',doLogin);
document.getElementById('loginPass').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
function doLogin(){
  const uname=document.getElementById('loginUser').value.trim();
  const pw=document.getElementById('loginPass').value;
  clearAuthErrors();
  if(!uname){showAuthErr('loginUserErr');return;}
  const users=getUsers();
  if(!users[uname]||users[uname].passwordHash!==hashPass(pw)){showAuthErr('loginPassErr');return;}
  loginUser(uname,users[uname]);
}

/* DEMO */
document.getElementById('demoBtn').addEventListener('click',()=>{
  const users=getUsers();
  if(!users['demo']){
    users['demo']={name:'Demo User',passwordHash:hashPass('demo123'),joined:new Date().toLocaleDateString('en-GB',{month:'short',year:'numeric'})};
    saveUsers(users);
  }
  loginUser('demo',users['demo']);
});

/* ============================================================
   AUTH — SIGN UP
============================================================ */
document.getElementById('signupBtn').addEventListener('click',doSignup);
document.getElementById('signupPass').addEventListener('keydown',e=>{if(e.key==='Enter')doSignup();});
function doSignup(){
  const name=document.getElementById('signupName').value.trim();
  const uname=document.getElementById('signupUser').value.trim().toLowerCase();
  const pw=document.getElementById('signupPass').value;
  clearAuthErrors();
  let ok=true;
  if(!name){showAuthErr('signupNameErr');ok=false;}
  if(uname.length<3){showAuthErr('signupUserErr','Username must be at least 3 characters.');ok=false;}
  if(pw.length<6){showAuthErr('signupPassErr');ok=false;}
  if(!ok)return;
  const users=getUsers();
  if(users[uname]){showAuthErr('signupUserErr','That username is already taken.');return;}
  users[uname]={name,passwordHash:hashPass(pw),joined:new Date().toLocaleDateString('en-GB',{month:'short',year:'numeric'})};
  saveUsers(users);
  loginUser(uname,users[uname]);
  showToast('Account created! Welcome, '+name.split(' ')[0]+' 🎉','success');
}
function showAuthErr(id,msg){
  const el=document.getElementById(id);
  if(msg)el.textContent=msg;
  el.classList.add('show');
}
function clearAuthErrors(){
  document.querySelectorAll('.auth-error-msg').forEach(e=>e.classList.remove('show'));
  document.querySelectorAll('.auth-input').forEach(e=>e.classList.remove('error'));
}

/* ============================================================
   LOGIN / LOGOUT
============================================================ */
function loginUser(username,userData){
  currentUser={username,name:userData.name,joined:userData.joined};
  setSession(username);
  const d=getUserData(username);
  tasks=d.tasks; activityLog=d.activityLog;
  applySettings(d.settings);

  const initials=(userData.name||username).split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  document.getElementById('userAvatar').textContent=initials;
  document.getElementById('ddName').textContent=userData.name||username;
  document.getElementById('ddUsername').textContent='@'+username;

  const hour=new Date().getHours();
  const tod=hour<12?'morning':hour<17?'afternoon':'evening';
  const first=(userData.name||username).split(' ')[0];
  document.getElementById('heroGreeting').innerHTML='Good '+tod+', '+escHtml(first)+' —<br>let\'s get things done.';

  document.getElementById('settingUsername').textContent='@'+username;
  document.getElementById('settingFullName').textContent=userData.name||'—';
  document.getElementById('settingJoined').textContent=userData.joined||'—';

  const quotes=[
    {text:'The secret of getting ahead is getting started.',author:'Mark Twain'},
    {text:'It is not enough to be busy; so too are the ants. What are we busy about?',author:'Henry David Thoreau'},
    {text:'Focus on being productive instead of busy.',author:'Tim Ferriss'},
    {text:'You don\'t have to be great to start, but you have to start to be great.',author:'Zig Ziglar'},
    {text:'The key is not to prioritise what\'s on your schedule, but to schedule your priorities.',author:'Stephen Covey'},
    {text:'Done is better than perfect.',author:'Sheryl Sandberg'},
  ];
  const q=quotes[Math.floor(Math.random()*quotes.length)];
  document.getElementById('quoteText').textContent='\u201c'+q.text+'\u201d';
  document.getElementById('quoteAuthor').textContent='\u2014 '+q.author;

  renderBoard(); updateStats(); renderActivity(); updateSettingsPage();
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appShell').classList.add('visible');
  showToast('Welcome back, '+first+'!','success');
}

function logoutUser(){
  saveUserData();
  clearSession();
  currentUser=null; tasks=[]; activityLog=[];
  document.getElementById('darkMode').checked=false;
  document.getElementById('compactView').checked=false;
  document.getElementById('showCompleted').checked=true;
  document.body.className='';
  document.documentElement.style.fontSize='16px';
  document.documentElement.style.removeProperty('--blue-500');
  document.documentElement.style.removeProperty('--blue-600');
  document.getElementById('appShell').classList.remove('visible');
  document.getElementById('authScreen').classList.remove('hidden');
  ['loginUser','loginPass','signupName','signupUser','signupPass'].forEach(id=>{document.getElementById(id).value='';});
  clearAuthErrors();
  showToast('Signed out successfully.','info');
}

function applySettings(s){
  if(!s)return;
  document.getElementById('darkMode').checked=!!s.dark;
  document.getElementById('compactView').checked=!!s.compact;
  document.getElementById('showCompleted').checked=s.showCompleted!==false;
  if(s.fontSize){document.getElementById('fontSizeSelect').value=s.fontSize;document.documentElement.style.fontSize=s.fontSize+'px';}
  if(s.accent){document.getElementById('accentColorPicker').value=s.accent;document.documentElement.style.setProperty('--blue-500',s.accent);document.documentElement.style.setProperty('--blue-600',s.accent);}
  document.body.classList.toggle('dark',!!s.dark);
  document.body.classList.toggle('compact',!!s.compact);
  document.body.classList.toggle('hide-completed',s.showCompleted===false);
}

document.getElementById('ddLogout').addEventListener('click',logoutUser);
document.getElementById('logoutBtn2').addEventListener('click',logoutUser);

/* USER DROPDOWN */
document.getElementById('userAvatar').addEventListener('click',e=>{
  e.stopPropagation();
  document.getElementById('userDropdown').classList.toggle('open');
});
document.addEventListener('click',e=>{
  if(!document.getElementById('userMenu').contains(e.target))
    document.getElementById('userDropdown').classList.remove('open');
});
document.getElementById('ddGoSettings').addEventListener('click',()=>{
  document.querySelector('[data-page="settings"]').click();
  document.getElementById('userDropdown').classList.remove('open');
});

/* ============================================================
   TOAST
============================================================ */
function showToast(msg,type='success'){
  const icons={success:'✓',error:'✕',info:'ℹ'};
  const el=document.createElement('div');
  el.className='toast '+type;
  el.innerHTML='<span class="toast-icon">'+icons[type]+'</span> '+msg;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(()=>el.remove(),3100);
}

/* ============================================================
   ESCAPE HTML
============================================================ */
function escHtml(str){
  const d=document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

/* ============================================================
   SPA NAVIGATION
============================================================ */
document.getElementById('navTabs').addEventListener('click',e=>{
  const link=e.target.closest('[data-page]');
  if(!link)return;
  e.preventDefault();
  document.querySelectorAll('.nav-tabs a').forEach(a=>a.classList.remove('active'));
  link.classList.add('active');
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+link.dataset.page).classList.add('active');
  if(link.dataset.page==='settings')updateSettingsPage();
});

/* ============================================================
   RENDER BOARD
============================================================ */
function relativeTime(ts){
  const d=Date.now()-ts;
  if(d<60000)return 'just now';
  if(d<3600000)return Math.floor(d/60000)+'m ago';
  if(d<86400000)return Math.floor(d/3600000)+'h ago';
  return Math.floor(d/86400000)+'d ago';
}

function buildCard(task){
  const card=document.createElement('div');
  card.className='task-card'+(task.done?' completed':'');
  card.dataset.id=task.id;
  card.draggable=true;
  card.innerHTML=`
    <div class="task-card-top">
      <div class="task-check" data-id="${task.id}">${task.done?'✓':''}</div>
      <span class="task-title">${escHtml(task.title)}</span>
    </div>
    <div class="task-meta">
      <span class="task-tag ${task.priority}">${task.priority}</span>
      <span class="task-date">${relativeTime(task.created)}</span>
    </div>`;
  card.addEventListener('dragstart',e=>{draggedId=task.id;card.classList.add('dragging');e.dataTransfer.effectAllowed='move';});
  card.addEventListener('dragend',()=>{card.classList.remove('dragging');draggedId=null;document.querySelectorAll('.drag-placeholder').forEach(el=>el.remove());});
  card.addEventListener('dblclick',()=>startInlineEdit(card,task));
  card.addEventListener('contextmenu',e=>{e.preventDefault();showCtxMenu(e.clientX,e.clientY,task.id);});
  card.querySelector('.task-check').addEventListener('click',e=>{e.stopPropagation();toggleDone(task.id);});
  return card;
}

function renderBoard(){
  const board=document.getElementById('kanbanBoard');
  board.innerHTML='';
  const cols=[
    {id:'todo',label:'To Do',color:'#3a6fd8'},
    {id:'inprogress',label:'In Progress',color:'#e09030'},
    {id:'done',label:'Done',color:'#2db0a0'},
  ];
  cols.forEach(col=>{
    let ct=tasks.filter(t=>t.col===col.id);
    if(activeFilter==='done') ct=ct.filter(t=>t.done);
    else if(activeFilter!=='all') ct=ct.filter(t=>t.priority===activeFilter);
    const colEl=document.createElement('div');
    colEl.className='kanban-col';
    colEl.dataset.col=col.id;
    colEl.innerHTML=`<div class="col-header"><span class="col-title"><span class="col-dot" style="background:${col.color}"></span>${col.label}</span><span class="col-count">${ct.length}</span></div><div class="task-list" id="list-${col.id}"></div>`;
    const listEl=colEl.querySelector('.task-list');
    if(!ct.length){listEl.innerHTML='<div class="empty-state"><div class="empty-icon">📭</div><p>No tasks here yet</p></div>';}
    else ct.forEach(t=>listEl.appendChild(buildCard(t)));
    colEl.addEventListener('dragover',e=>{
      e.preventDefault();e.dataTransfer.dropEffect='move';
      colEl.classList.add('drag-over');
      const after=getDragAfterElement(listEl,e.clientY);
      document.querySelectorAll('.drag-placeholder').forEach(el=>el.remove());
      const ph=document.createElement('div');ph.className='drag-placeholder';
      if(!after)listEl.appendChild(ph);else listEl.insertBefore(ph,after);
    });
    colEl.addEventListener('dragleave',e=>{
      if(!colEl.contains(e.relatedTarget)){colEl.classList.remove('drag-over');document.querySelectorAll('.drag-placeholder').forEach(el=>el.remove());}
    });
    colEl.addEventListener('drop',e=>{
      e.preventDefault();colEl.classList.remove('drag-over');
      if(draggedId){
        const t=tasks.find(x=>x.id===draggedId);
        if(t){t.col=col.id;t.done=col.id==='done';addActivity('Task <strong>"'+escHtml(t.title)+'"</strong> moved to <strong>'+col.label+'</strong>');}
        renderBoard();updateStats();saveUserData();
      }
    });
    board.appendChild(colEl);
  });
}

function getDragAfterElement(container,y){
  const cards=[...container.querySelectorAll('.task-card:not(.dragging)')];
  return cards.reduce((closest,child)=>{
    const box=child.getBoundingClientRect();
    const offset=y-box.top-box.height/2;
    return offset<0&&offset>closest.offset?{offset,element:child}:closest;
  },{offset:Number.NEGATIVE_INFINITY}).element;
}

/* ============================================================
   INLINE EDIT
============================================================ */
function startInlineEdit(cardEl,task){
  const titleEl=cardEl.querySelector('.task-title');
  const input=document.createElement('input');
  input.className='task-title-input';
  input.value=task.title;
  titleEl.replaceWith(input);
  input.focus();input.select();
  const save=()=>{
    const nt=input.value.trim();
    if(nt&&nt!==task.title){task.title=nt;addActivity('Task renamed to <strong>"'+escHtml(nt)+'"</strong>');showToast('Task updated.','success');saveUserData();}
    renderBoard();updateStats();
  };
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();save();}if(e.key==='Escape')renderBoard();});
  input.addEventListener('blur',save);
}

/* ============================================================
   TOGGLE DONE / DELETE
============================================================ */
function toggleDone(id){
  const t=tasks.find(x=>x.id===id);if(!t)return;
  t.done=!t.done;t.col=t.done?'done':'todo';
  if(t.done){addActivity('Task <strong>"'+escHtml(t.title)+'"</strong> marked complete ✓');showToast('Task completed! 🎉','success');}
  else addActivity('Task <strong>"'+escHtml(t.title)+'"</strong> re-opened');
  renderBoard();updateStats();saveUserData();
}
function deleteTask(id){
  const t=tasks.find(x=>x.id===id);if(!t)return;
  addActivity('Task <strong>"'+escHtml(t.title)+'"</strong> deleted');
  tasks=tasks.filter(x=>x.id!==id);
  renderBoard();updateStats();saveUserData();
  showToast('Task deleted.','error');
}

/* ============================================================
   CONTEXT MENU
============================================================ */
const ctxMenu=document.getElementById('ctxMenu');
function showCtxMenu(x,y,id){
  ctxTargetId=id;
  ctxMenu.style.left=Math.min(x,window.innerWidth-190)+'px';
  ctxMenu.style.top=Math.min(y,window.innerHeight-150)+'px';
  ctxMenu.classList.add('visible');
}
function hideCtxMenu(){ctxMenu.classList.remove('visible');ctxTargetId=null;}
document.addEventListener('click',e=>{if(!ctxMenu.contains(e.target))hideCtxMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){hideCtxMenu();closeModal();}});
document.getElementById('ctxEdit').addEventListener('click',()=>{
  if(ctxTargetId){const c=document.querySelector('.task-card[data-id="'+ctxTargetId+'"]');const t=tasks.find(x=>x.id===ctxTargetId);if(c&&t)startInlineEdit(c,t);}
  hideCtxMenu();
});
document.getElementById('ctxComplete').addEventListener('click',()=>{if(ctxTargetId)toggleDone(ctxTargetId);hideCtxMenu();});
document.getElementById('ctxDelete').addEventListener('click',()=>{if(ctxTargetId)deleteTask(ctxTargetId);hideCtxMenu();});
document.addEventListener('contextmenu',e=>{if(e.target.closest('.task-card'))e.preventDefault();});

/* ============================================================
   MODAL
============================================================ */
const modalOverlay=document.getElementById('modalOverlay');
function openModal(){modalOverlay.classList.add('visible');document.getElementById('taskTitleInput').focus();}
function closeModal(){modalOverlay.classList.remove('visible');document.getElementById('taskTitleInput').value='';}
document.getElementById('openModalBtn').addEventListener('click',openModal);
document.getElementById('closeModalBtn').addEventListener('click',closeModal);
document.getElementById('cancelModalBtn').addEventListener('click',closeModal);
modalOverlay.addEventListener('click',e=>{if(e.target===modalOverlay)closeModal();});
document.getElementById('taskTitleInput').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('saveTaskBtn').click();});
document.getElementById('saveTaskBtn').addEventListener('click',()=>{
  const title=document.getElementById('taskTitleInput').value.trim();
  const col=document.getElementById('taskColSelect').value;
  const priority=document.getElementById('taskPrioritySelect').value;
  if(!title){
    document.getElementById('taskTitleInput').style.borderColor='var(--accent-rose)';
    document.getElementById('taskTitleInput').focus();
    showToast('Please enter a task title.','error');
    setTimeout(()=>{document.getElementById('taskTitleInput').style.borderColor='';},1400);
    return;
  }
  tasks.push({id:genId(),title,col,priority,done:col==='done',created:Date.now()});
  addActivity('New task <strong>"'+escHtml(title)+'"</strong> added');
  closeModal();renderBoard();updateStats();saveUserData();
  showToast('Task added!','success');
  document.querySelector('[data-page="tasks"]').click();
});

/* ============================================================
   FILTER CHIPS
============================================================ */
document.querySelectorAll('.chip').forEach(chip=>{
  chip.addEventListener('click',()=>{
    document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter=chip.dataset.filter;
    renderBoard();
  });
});

/* ============================================================
   STATS + HOME EXTRAS
============================================================ */
function updateStats(){
  const total=tasks.length;
  const done=tasks.filter(t=>t.done).length;
  const pending=total-done;
  const high=tasks.filter(t=>t.priority==='high'&&!t.done).length;
  const pct=total?Math.round((done/total)*100):0;
  document.getElementById('statsGrid').innerHTML=`
    <div class="stat-card"><div class="stat-label">Total Tasks</div><div class="stat-value">${total}</div><div class="stat-sub">across all columns</div></div>
    <div class="stat-card"><div class="stat-label">Completed</div><div class="stat-value">${done}</div><div class="stat-sub">${pct}% completion rate</div></div>
    <div class="stat-card"><div class="stat-label">Pending</div><div class="stat-value">${pending}</div><div class="stat-sub">awaiting action</div></div>
    <div class="stat-card"><div class="stat-label">High Priority</div><div class="stat-value">${high}</div><div class="stat-sub">need attention</div></div>`;
  const fill=document.getElementById('progressFill');
  if(fill){
    fill.style.width=pct+'%';
    document.getElementById('progressPct').textContent=pct+'%';
    document.getElementById('progressSub').textContent=total?done+' of '+total+' tasks completed':'No tasks yet — add one to get started!';
  }
  const bd=document.getElementById('priorityBreakdown');
  if(bd){
    const priDefs=[{key:'high',label:'High',color:'#d94f6a'},{key:'medium',label:'Medium',color:'#e09030'},{key:'low',label:'Low',color:'#2db0a0'}];
    const maxC=Math.max(...priDefs.map(p=>tasks.filter(t=>t.priority===p.key).length),1);
    bd.innerHTML=priDefs.map(p=>{
      const c=tasks.filter(t=>t.priority===p.key).length;
      const w=Math.round((c/maxC)*100);
      return '<div class="priority-row"><span class="priority-row-label">'+p.label+'</span><div class="priority-bar-wrap"><div class="priority-bar-fill" style="width:'+w+'%;background:'+p.color+'"></div></div><span class="priority-row-count">'+c+'</span></div>';
    }).join('');
  }
}

function updateSettingsPage(){
  const total=tasks.length,done=tasks.filter(t=>t.done).length;
  document.getElementById('settingTotal').textContent=total;
  document.getElementById('settingDone').textContent=done;
  document.getElementById('settingPending').textContent=total-done;
  if(currentUser){
    document.getElementById('settingUsername').textContent='@'+currentUser.username;
    document.getElementById('settingFullName').textContent=currentUser.name||'—';
    document.getElementById('settingJoined').textContent=currentUser.joined||'—';
  }
}

/* ============================================================
   ACTIVITY LOG
============================================================ */
function addActivity(text){
  activityLog.unshift({text,time:'just now'});
  if(activityLog.length>8)activityLog.pop();
  renderActivity();
}
function renderActivity(){
  const el=document.getElementById('activityList');
  if(!activityLog.length){el.innerHTML='<div class="empty-state"><div class="empty-icon">📋</div><p>No recent activity</p></div>';return;}
  el.innerHTML=activityLog.map(a=>'<div class="activity-item"><span class="activity-dot"></span><span class="activity-text">'+a.text+'</span><span class="activity-time">'+a.time+'</span></div>').join('');
}

/* ============================================================
   CLEAR ALL
============================================================ */
document.getElementById('clearAllBtn').addEventListener('click',()=>{
  if(confirm('Delete all tasks? This cannot be undone.')){
    tasks=[];activityLog=[];
    renderBoard();updateStats();renderActivity();updateSettingsPage();saveUserData();
    showToast('All tasks cleared.','info');
  }
});

/* ============================================================
   SETTINGS TOGGLES — live & persisted
============================================================ */
document.getElementById('darkMode').addEventListener('change',e=>{document.body.classList.toggle('dark',e.target.checked);showToast(e.target.checked?'🌙 Dark mode on':'☀️ Light mode on','info');saveUserData();});
document.getElementById('compactView').addEventListener('change',e=>{document.body.classList.toggle('compact',e.target.checked);showToast(e.target.checked?'Compact view on':'Normal view on','info');saveUserData();});
document.getElementById('showCompleted').addEventListener('change',e=>{document.body.classList.toggle('hide-completed',!e.target.checked);renderBoard();showToast(e.target.checked?'Showing completed':'Hiding completed','info');saveUserData();});
document.getElementById('fontSizeSelect').addEventListener('change',e=>{document.documentElement.style.fontSize=e.target.value+'px';showToast('Font size updated.','info');saveUserData();});
document.getElementById('accentColorPicker').addEventListener('input',e=>{const hex=e.target.value;document.documentElement.style.setProperty('--blue-500',hex);document.documentElement.style.setProperty('--blue-600',hex);saveUserData();});

/* ============================================================
   LONG PRESS (mobile)
============================================================ */
let longPressTimer=null;
document.addEventListener('touchstart',e=>{
  const card=e.target.closest('.task-card');if(!card)return;
  longPressTimer=setTimeout(()=>{const t=e.touches[0];showCtxMenu(t.clientX,t.clientY,card.dataset.id);},600);
},{passive:true});
document.addEventListener('touchend',()=>clearTimeout(longPressTimer));
document.addEventListener('touchmove',()=>clearTimeout(longPressTimer));

/* ============================================================
   INIT — restore session if exists
============================================================ */
(function init(){
  const session=getSession();
  if(session){
    const users=getUsers();
    if(users[session]){loginUser(session,users[session]);return;}
  }
  // else stay on auth screen (already visible)
})();
});