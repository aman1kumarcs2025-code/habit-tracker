const STORAGE_KEY = "habitflow_v1";
const THEME_KEY = "habitflow_theme";

const state = {
  habits: [],
  month: new Date().getMonth(),
  year: new Date().getFullYear()
};

const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, "0");
const dateKey = (y,m,d) => `${y}-${pad(m+1)}-${pad(d)}`;
const daysInMonth = (y,m) => new Date(y,m+1,0).getDate();
const isToday = (y,m,d) => {
  const t = new Date();
  return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d;
};

function load(){
  try{
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(saved && Array.isArray(saved.habits)) state.habits = saved.habits;
  }catch(e){}
  if(!state.habits.length){
    state.habits = [
      {id:crypto.randomUUID(), name:"Coding", icon:"💻", goal:20, completions:{}},
      {id:crypto.randomUUID(), name:"DSA Practice", icon:"🧠", goal:18, completions:{}},
      {id:crypto.randomUUID(), name:"Reading", icon:"📖", goal:20, completions:{}},
      {id:crypto.randomUUID(), name:"Workout", icon:"🏋️", goal:16, completions:{}}
    ];
    save();
  }
  const theme = localStorage.getItem(THEME_KEY);
  if(theme === "dark") document.body.classList.add("dark");
}

function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify({habits:state.habits}));
}

function monthLabel(){
  return new Date(state.year,state.month,1).toLocaleDateString("en-US",{month:"long",year:"numeric"});
}

function completedForMonth(habit){
  let n=0;
  const total=daysInMonth(state.year,state.month);
  for(let d=1;d<=total;d++) if(habit.completions[dateKey(state.year,state.month,d)]) n++;
  return n;
}

function habitPercent(habit){
  return Math.min(100, Math.round(completedForMonth(habit)/habit.goal*100));
}

function render(){
  $("monthTitle").textContent = monthLabel();
  $("trackerHeading").textContent = monthLabel();
  $("monthSub").textContent = `${state.habits.length} habits · ${daysInMonth(state.year,state.month)} days`;
  renderStats();
  renderTable();
  renderGoals();
}

function renderStats(){
  const totalPossible = state.habits.reduce((sum,h)=>sum+h.goal,0);
  const totalDone = state.habits.reduce((sum,h)=>sum+completedForMonth(h),0);
  const rate = totalPossible ? Math.min(100,Math.round(totalDone/totalPossible*100)) : 0;
  const overall = state.habits.length ? Math.round(state.habits.reduce((s,h)=>s+habitPercent(h),0)/state.habits.length) : 0;
  $("completionRate").textContent = `${rate}%`;
  $("goalCount").textContent = `${overall}%`;
  $("overallProgressText").textContent = `${totalDone} / ${totalPossible}`;
  $("overallProgressBar").style.width = `${overall}%`;
  $("currentStreak").textContent = currentStreak();
  $("bestStreak").textContent = bestStreak();
}

function renderTable(){
  const thead = $("habitTable").querySelector("thead");
  const tbody = $("habitTable").querySelector("tbody");
  const total = daysInMonth(state.year,state.month);
  thead.innerHTML = `<tr><th class="habit-col">Habit</th><th class="goal-col">Goal</th>${Array.from({length:total},(_,i)=>{
    const d=i+1, dt=new Date(state.year,state.month,d);
    return `<th class="${isToday(state.year,state.month,d)?"today-col":""}">
      <span class="day-number">${d}</span><span class="day-name">${dt.toLocaleDateString("en-US",{weekday:"short"})}</span>
    </th>`;
  }).join("")}<th>Manage</th></tr>`;

  tbody.innerHTML = state.habits.map(h=>{
    const cells = Array.from({length:total},(_,i)=>{
      const d=i+1,key=dateKey(state.year,state.month,d),done=!!h.completions[key];
      return `<td class="${isToday(state.year,state.month,d)?"today-col":""}">
        <button class="check ${done?"done":""}" data-action="toggle" data-id="${h.id}" data-date="${key}">${done?"✓":""}</button>
      </td>`;
    }).join("");
    return `<tr>
      <td class="habit-name"><span>${escapeHtml(h.icon)}</span>${escapeHtml(h.name)}</td>
      <td class="goal-value">${h.goal}</td>${cells}
      <td><div class="row-actions">
        <button class="mini-btn" data-action="edit" data-id="${h.id}">Edit</button>
        <button class="mini-btn" data-action="delete" data-id="${h.id}">Delete</button>
      </div></td>
    </tr>`;
  }).join("");
}

function renderGoals(){
  const box=$("goalCards");
  box.innerHTML = state.habits.map(h=>{
    const done=completedForMonth(h), pct=habitPercent(h);
    return `<div class="goal-card">
      <div class="goal-top">
        <div class="goal-title"><span>${escapeHtml(h.icon)}</span>${escapeHtml(h.name)}</div>
        <div class="goal-percent">${pct}%</div>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="goal-meta"><span>${done} completed</span><span>Goal: ${h.goal}</span></div>
    </div>`;
  }).join("");
}

function currentStreak(){
  const today=new Date();
  let streak=0;
  for(let offset=0;offset<366;offset++){
    const d=new Date(today);
    d.setDate(today.getDate()-offset);
    const key=dateKey(d.getFullYear(),d.getMonth(),d.getDate());
    const any=state.habits.length && state.habits.every(h=>h.completions[key]);
    if(any) streak++; else break;
  }
  return streak;
}

function bestStreak(){
  if(!state.habits.length) return 0;
  const dates=[];
  const start=new Date(state.year,state.month,1);
  const end=new Date(state.year,state.month+1,0);
  for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1)){
    const key=dateKey(d.getFullYear(),d.getMonth(),d.getDate());
    if(state.habits.every(h=>h.completions[key])) dates.push(key);
  }
  let best=0,run=0,prev=null;
  for(const key of dates){
    const cur=new Date(key);
    if(prev && (cur-prev)/86400000===1) run++; else run=1;
    best=Math.max(best,run); prev=cur;
  }
  return best;
}

function toggle(id,key){
  const h=state.habits.find(x=>x.id===id);
  if(!h) return;
  if(h.completions[key]) delete h.completions[key];
  else h.completions[key]=true;
  save(); render();
}

function openModal(habit=null){
  $("modalBackdrop").classList.remove("hidden");
  $("modalTitle").textContent=habit?"Edit habit":"Add a habit";
  $("habitId").value=habit?.id||"";
  $("habitName").value=habit?.name||"";
  $("habitIcon").value=habit?.icon||"";
  $("habitGoal").value=habit?.goal||20;
  $("habitName").focus();
}

function closeModal(){ $("modalBackdrop").classList.add("hidden"); }

$("addHabitBtn").addEventListener("click",()=>openModal());
$("closeModal").addEventListener("click",closeModal);
$("cancelModal").addEventListener("click",closeModal);
$("modalBackdrop").addEventListener("click",e=>{if(e.target===$("modalBackdrop")) closeModal()});

$("habitForm").addEventListener("submit",e=>{
  e.preventDefault();
  const id=$("habitId").value;
  const name=$("habitName").value.trim();
  const icon=$("habitIcon").value.trim() || "✓";
  const goal=Math.max(1,Math.min(31,Number($("habitGoal").value)||20));
  if(id){
    const h=state.habits.find(x=>x.id===id);
    if(h){h.name=name;h.icon=icon;h.goal=goal;}
  }else{
    state.habits.push({id:crypto.randomUUID(),name,icon,goal,completions:{}});
  }
  save();closeModal();render();
});

$("habitTable").addEventListener("click",e=>{
  const btn=e.target.closest("[data-action]");
  if(!btn) return;
  const action=btn.dataset.action,id=btn.dataset.id;
  if(action==="toggle") toggle(id,btn.dataset.date);
  if(action==="edit"){
    const h=state.habits.find(x=>x.id===id); if(h) openModal(h);
  }
  if(action==="delete"){
    const h=state.habits.find(x=>x.id===id);
    if(h && confirm(`Delete "${h.name}"?`)){
      state.habits=state.habits.filter(x=>x.id!==id);save();render();
    }
  }
});

$("prevMonth").addEventListener("click",()=>{
  state.month--; if(state.month<0){state.month=11;state.year--;} render();
});
$("nextMonth").addEventListener("click",()=>{
  state.month++; if(state.month>11){state.month=0;state.year++;} render();
});
$("todayBtn").addEventListener("click",()=>{
  const d=new Date();state.month=d.getMonth();state.year=d.getFullYear();render();
});
$("themeBtn").addEventListener("click",()=>{
  document.body.classList.toggle("dark");
  localStorage.setItem(THEME_KEY,document.body.classList.contains("dark")?"dark":"light");
});
$("resetBtn").addEventListener("click",()=>{
  if(confirm("Reset every habit and all completion data?")){
    localStorage.removeItem(STORAGE_KEY); location.reload();
  }
});

function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

load(); render();
