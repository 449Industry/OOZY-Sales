const cfg = window.OOZY_WEB_CONFIG || {};
const state = { token:"", user:null, profile:null, daily:[], overrides:[], sync:null, page:"daily" };
const $ = id => document.getElementById(id);
const won = n => `${Number(n||0).toLocaleString("ko-KR")}원`;
const sum = (rows,key) => rows.reduce((a,r)=>a+Number(r[key]||0),0);
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
function api(path, options={}){
  const headers = { apikey:cfg.anonKey, ...(options.headers||{}) };
  if(state.token) headers.Authorization=`Bearer ${state.token}`;
  return fetch(`${cfg.supabaseUrl}${path}`, {...options, headers}).then(async r=>{
    const text=await r.text(); if(!r.ok) throw new Error(text||`HTTP ${r.status}`); return text?JSON.parse(text):null;
  });
}
async function login(){
  const loginId=$("loginEmail").value.trim(), aliases=window.OOZY_LOGIN_ALIASES||{};
  const email=aliases[loginId]||loginId, password=$("loginPassword").value;
  $("loginMessage").textContent="로그인 중...";
  try{
    const res=await api("/auth/v1/token?grant_type=password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
    state.token=res.access_token; state.user=res.user; sessionStorage.setItem("oozyToken",state.token); sessionStorage.setItem("oozyUser",JSON.stringify(state.user||{}));
    await loadData(); showApp();
  }catch(e){$("loginMessage").textContent="로그인 실패: "+e.message;}
}
async function loadData(){
  const [daily, overrides, sync, profile] = await Promise.all([
    api("/rest/v1/oozy_daily_sales?select=*&order=business_date.asc"),
    api("/rest/v1/oozy_monthly_delivery_overrides?select=*&order=year.asc,month.asc"),
    api("/rest/v1/oozy_sync_status?select=*&id=eq.1"),
    state.user?.id ? api(`/rest/v1/oozy_profiles?select=display_name,role&user_id=eq.${encodeURIComponent(state.user.id)}`).catch(()=>[]) : Promise.resolve([])
  ]);
  state.daily=daily||[]; state.overrides=overrides||[]; state.sync=(sync||[])[0]||null; state.profile=(profile||[])[0]||null;
}
function showApp(){
  $("loginView").classList.add("hidden"); $("appView").classList.remove("hidden");
  $("accountLabel").textContent = state.profile?.display_name || state.user?.email || "로그인";
  $("syncText").textContent = state.sync ? `최종 업로드 ${String(state.sync.generated_at||"").replace("T"," ")} · ${state.sync.daily_count||0}일` : "업로드 기록 없음";
  const latest=state.daily.at(-1)?.business_date || new Date().toISOString().slice(0,10);
  $("dailyDate").value=latest; $("monthPicker").value=latest.slice(0,7); $("yearInput").value=latest.slice(0,4);
  renderDaily(); renderMonth(); renderYear();
}
function logout(){state.token="";sessionStorage.clear();location.reload();}
function kpis(el, items){el.innerHTML=items.map((x,i)=>`<div class="kpi ${i<2?'accent':''}"><div class="label">${esc(x[0])}</div><div class="value">${won(x[1])}</div></div>`).join("");}
function dailyByDate(d){return state.daily.find(r=>r.business_date===d)||null;}
function renderDaily(){
  const d=$("dailyDate").value, r=dailyByDate(d)||{};
  kpis($("dailyKpis"),[["매출총금액",r.total],["총 매입",r.purchase_total],["포스매출",r.pos_total],["배달매출",r.delivery_total],["카드",r.card],["현금",r.cash]]);
  $("dailySalesTable").innerHTML=`<table class="table"><tr><th>항목</th><th>금액</th></tr>
    <tr><td>카드</td><td class="num">${won(r.card)}</td></tr><tr><td>현금</td><td class="num">${won(r.cash)}</td></tr>
    <tr><td>배달의민족</td><td class="num">${won(r.baemin)}</td></tr><tr><td>쿠팡이츠</td><td class="num">${won(r.coupang)}</td></tr>
    <tr><td>OOZY 오더</td><td class="num">${won(r.oozy_order)}</td></tr><tr><td>기타 배달</td><td class="num">${won(r.other_delivery)}</td></tr>
    <tr class="total-row"><td>합계</td><td class="num">${won(r.total)}</td></tr></table>${r.memo?`<p class="muted">메모: ${esc(r.memo)}</p>`:""}`;
  $("dailyPurchaseTable").innerHTML=`<table class="table"><tr><th>항목</th><th>금액</th></tr>
    <tr><td>SPC 발주</td><td class="num">${won(r.purchase_spc_total)}</td></tr><tr><td>본사발주</td><td class="num">${won(r.purchase_headquarters_total)}</td></tr>
    <tr class="total-row"><td>총 매입</td><td class="num">${won(r.purchase_total)}</td></tr></table>`;
}
function monthSummary(y,m){
  const prefix=`${y}-${String(m).padStart(2,"0")}`, rows=state.daily.filter(r=>r.business_date.startsWith(prefix));
  const o=state.overrides.find(x=>Number(x.year)===Number(y)&&Number(x.month)===Number(m));
  const result={rows,total:sum(rows,"total"),purchase_total:sum(rows,"purchase_total"),pos_total:sum(rows,"pos_total"),delivery_total:sum(rows,"delivery_total"),baemin:sum(rows,"baemin"),coupang:sum(rows,"coupang"),oozy_order:sum(rows,"oozy_order")};
  if(o){result.baemin=Number(o.baemin||0);result.coupang=Number(o.coupang||0);result.oozy_order=Number(o.oozy_order||0);result.override=true;} return result;
}
function renderMonth(){
  const [y,m]=$("monthPicker").value.split("-").map(Number), s=monthSummary(y,m);
  kpis($("monthKpis"),[["매출총금액",s.total],["총 매입",s.purchase_total],["포스매출",s.pos_total],["배달매출",s.delivery_total]]);
  $("monthDelivery").innerHTML=`<table class="table"><tr><th>채널</th><th>월 합계</th></tr><tr><td>배달의민족</td><td class="num">${won(s.baemin)}</td></tr><tr><td>쿠팡이츠</td><td class="num">${won(s.coupang)}</td></tr><tr><td>OOZY 오더</td><td class="num">${won(s.oozy_order)}</td></tr></table>${s.override?'<p class="muted">OOZY 프로그램에서 저장한 월별 수동 배달 합계를 적용했습니다.</p>':''}`;
  const first=new Date(y,m-1,1), last=new Date(y,m,0).getDate(), start=(first.getDay()+6)%7; let html=["월","화","수","목","금","토","일"].map(d=>`<div class="cal-head">${d}</div>`).join("");
  for(let i=0;i<start;i++) html+='<div class="day empty"></div>';
  for(let d=1;d<=last;d++){const ds=`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`, r=dailyByDate(ds)||{}; html+=`<div class="day" data-date="${ds}"><div class="date">${d}</div><div class="sales">${Number(r.total||0).toLocaleString()}</div><div class="purchase">매입 ${Number(r.purchase_total||0).toLocaleString()}</div></div>`;}
  $("monthCalendar").innerHTML=html; document.querySelectorAll(".day[data-date]").forEach(x=>x.onclick=()=>{ $("dailyDate").value=x.dataset.date; switchPage("daily"); renderDaily(); });
}
function renderYear(){
  const y=Number($("yearInput").value), months=Array.from({length:12},(_,i)=>monthSummary(y,i+1));
  kpis($("yearKpis"),[["연 매출",months.reduce((a,x)=>a+x.total,0)],["연 매입",months.reduce((a,x)=>a+x.purchase_total,0)],["포스매출",months.reduce((a,x)=>a+x.pos_total,0)],["배달매출",months.reduce((a,x)=>a+x.delivery_total,0)]]);
  $("yearCards").innerHTML=months.map((x,i)=>`<div class="year-card" data-month="${i+1}"><div class="month">${i+1}월</div><div class="sales">${won(x.total)}</div><div class="meta">매입 ${won(x.purchase_total)} · 배달 ${won(x.delivery_total)}</div></div>`).join("");
  document.querySelectorAll(".year-card").forEach(x=>x.onclick=()=>{ $("monthPicker").value=`${y}-${String(x.dataset.month).padStart(2,"0")}`; switchPage("month"); renderMonth(); });
}
function switchPage(page){state.page=page;document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));$(`${page}Page`).classList.remove("hidden");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===page));}
function shiftDate(days){const d=new Date($("dailyDate").value+"T00:00:00");d.setDate(d.getDate()+days);$("dailyDate").value=d.toISOString().slice(0,10);renderDaily();}
function shiftMonth(delta){const [y,m]=$("monthPicker").value.split("-").map(Number);const d=new Date(y,m-1+delta,1);$("monthPicker").value=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;renderMonth();}
$("loginButton").onclick=login;$("loginPassword").onkeydown=e=>{if(e.key==="Enter")login();};$("logoutButton").onclick=logout;
document.querySelectorAll(".nav").forEach(x=>x.onclick=()=>switchPage(x.dataset.page));$("dailyDate").onchange=renderDaily;$("prevDay").onclick=()=>shiftDate(-1);$("nextDay").onclick=()=>shiftDate(1);$("monthPicker").onchange=renderMonth;$("prevMonth").onclick=()=>shiftMonth(-1);$("nextMonth").onclick=()=>shiftMonth(1);$("yearInput").onchange=renderYear;$("prevYear").onclick=()=>{$("yearInput").value=Number($("yearInput").value)-1;renderYear();};$("nextYear").onclick=()=>{$("yearInput").value=Number($("yearInput").value)+1;renderYear();};
(async()=>{if(!cfg.supabaseUrl||!cfg.anonKey||cfg.supabaseUrl.includes("YOUR_PROJECT")){ $("loginMessage").textContent="config.js에 Supabase 연결값을 먼저 설정해 주세요."; return;} const token=sessionStorage.getItem("oozyToken"); const user=sessionStorage.getItem("oozyUser"); if(token){state.token=token;try{state.user=JSON.parse(user||"{}");await loadData();showApp();}catch(_e){sessionStorage.clear();}}})();
