(() => {
  "use strict";
  const cfg = window.OOZY_ADMIN_CONFIG || {};
  const aliases = window.OOZY_ADMIN_LOGIN_ALIASES || {};
  const $ = (id) => document.getElementById(id);
  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];
  const won = (n) => `${Number(n || 0).toLocaleString("ko-KR")}원`;
  const num = (n) => Number(n || 0);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const todayKst = () => new Intl.DateTimeFormat("sv-SE", {timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const fmtTime = (v) => { if(!v) return ""; const s=String(v); if(s.includes("T")){ try{return new Date(s).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Seoul"});}catch(_){}} return s.slice(0,8); };
  const fmtDateTime = (v) => { if(!v) return "-"; try{return new Date(v).toLocaleString("ko-KR",{timeZone:"Asia/Seoul",hour12:false});}catch(_){return String(v);} };
  const sum = (rows, key) => rows.reduce((a,r)=>a+num(r[key]),0);
  const rangeFor = (mode, value) => {
    if(mode === "day") return {start:value,end:value,label:value};
    if(mode === "month") { const [y,m]=value.split("-").map(Number); const end=new Date(y,m,0).getDate(); return {start:`${y}-${String(m).padStart(2,"0")}-01`,end:`${y}-${String(m).padStart(2,"0")}-${String(end).padStart(2,"0")}`,label:`${y}년 ${m}월`}; }
    const y=Number(value); return {start:`${y}-01-01`,end:`${y}-12-31`,label:`${y}년`};
  };
  const dayKey = (y,m,d) => `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  function dailyTotals(rows,dateKey,amountKey,filterFn=null){
    const out={};
    rows.forEach(r=>{ if(filterFn && !filterFn(r)) return; const d=r[dateKey]; if(!d) return; out[d]=(out[d]||0)+num(r[amountKey]); });
    return out;
  }
  function calendarHtml(monthValue, totals, amountLabel="매출"){
    const [y,m]=monthValue.slice(0,7).split("-").map(Number), firstDow=new Date(y,m-1,1).getDay(), lastDay=new Date(y,m,0).getDate(), today=todayKst();
    const weekdays=["일","월","화","수","목","금","토"];
    const cells=[];
    for(let i=0;i<firstDow;i++) cells.push('<div class="calendar-cell outside"></div>');
    for(let d=1;d<=lastDay;d++){
      const date=dayKey(y,m,d), dow=(firstDow+d-1)%7, amount=num(totals[date]);
      const cls=["calendar-cell",dow===0?"sun":"",dow===6?"sat":"",date===today?"today":""].filter(Boolean).join(" ");
      cells.push(`<button type="button" class="${cls}" data-calendar-date="${date}"><span class="calendar-date">${d}</span>${amount?`<span class="calendar-label">${esc(amountLabel)}</span><strong class="calendar-amount">${won(amount)}</strong>`:'<span class="calendar-empty">-</span>'}</button>`);
    }
    while(cells.length%7) cells.push('<div class="calendar-cell outside"></div>');
    return `<div class="sales-calendar"><div class="calendar-weekdays">${weekdays.map((w,i)=>`<div class="${i===0?"sun":i===6?"sat":""}">${w}</div>`).join("")}</div><div class="calendar-grid">${cells.join("")}</div></div>`;
  }
  function calendarSection(key, monthValue, totals, amountLabel="매출"){
    return `<div class="calendar-section"><div class="calendar-section-head"><strong>${esc(monthValue.slice(0,7))} 달력</strong><span>날짜를 누르면 해당 일 상세로 이동합니다.</span></div>${calendarHtml(monthValue,totals,amountLabel)}</div>`;
  }
  function bindCalendarClicks(host,key){
    qsa("[data-calendar-date]",host).forEach(btn=>btn.onclick=()=>{
      state.mode[key]="day"; state.period[key]=btn.dataset.calendarDate;
      const group=qs(`[data-mode-group="${key}"]`);
      if(group) qsa("button[data-mode]",group).forEach(x=>x.classList.toggle("active",x.dataset.mode==="day"));
      renderPeriodControl(key); refreshCurrent(false);
    });
  }
  function monthlyTotals(rows,dateKey,amountKey,filterFn=null){
    const out={};
    rows.forEach(r=>{
      if(filterFn && !filterFn(r)) return;
      const d=String(r[dateKey]||"");
      if(d.length<7) return;
      const month=d.slice(0,7);
      out[month]=(out[month]||0)+num(r[amountKey]);
    });
    return out;
  }
  function yearCalendarHtml(yearValue, totals, amountLabel="매출"){
    const y=String(yearValue).slice(0,4);
    const cells=[];
    for(let m=1;m<=12;m++){
      const month=`${y}-${String(m).padStart(2,"0")}`;
      const amount=num(totals[month]);
      cells.push(`<button type="button" class="year-month-cell" data-calendar-month="${month}-01"><span class="year-month-number">${m}월</span><span class="year-month-label">${esc(amountLabel)}</span><strong class="year-month-amount">${amount?won(amount):"-"}</strong></button>`);
    }
    return `<div class="year-sales-calendar">${cells.join("")}</div>`;
  }
  function yearCalendarSection(key, yearValue, totals, amountLabel="매출"){
    const y=String(yearValue).slice(0,4);
    return `<div class="calendar-section year-calendar-section"><div class="calendar-section-head"><strong>${esc(y)}년 연간 달력</strong><span>월을 누르면 해당 월 달력으로 이동합니다.</span></div>${yearCalendarHtml(y,totals,amountLabel)}</div>`;
  }
  function bindYearCalendarClicks(host,key){
    qsa("[data-calendar-month]",host).forEach(btn=>btn.onclick=()=>{
      state.mode[key]="month"; state.period[key]=btn.dataset.calendarMonth;
      const group=qs(`[data-mode-group="${key}"]`);
      if(group) qsa("button[data-mode]",group).forEach(x=>x.classList.toggle("active",x.dataset.mode==="month"));
      renderPeriodControl(key); refreshCurrent(false);
    });
  }

  if(!window.supabase || !cfg.supabaseUrl || !cfg.publishableKey){ $("loginMessage").textContent="Supabase 설정 또는 라이브러리를 불러오지 못했습니다."; return; }
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.publishableKey, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const CURRENT_REQUEST_SITE = "OOZY";
  const REQUEST_SOURCE_LABEL = {UWASH:"UWASH",OOZY:"OOZY",KCEM:"KCEM"};
  const state = {
    page:"dashboard", user:null, mode:{oozySales:"day",oozyPurchase:"day",kcem:"day",uwash:"day"},
    period:{oozySales:todayKst(),oozyPurchase:todayKst(),kcem:todayKst(),uwash:todayKst()}, uwashLedger:"supply",
    requestRows:[], requestMode:"pending", editingRequestKey:null, requestDbReady:true,
    timer:null, refreshing:false, lastRefresh:null
  };

  function toast(msg){ const el=$("toast"); el.textContent=msg; el.classList.remove("hidden"); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.add("hidden"),2800); }
  function setRefresh(text, ok=true){ const el=$("refreshStatus"); el.textContent=text; el.style.background=ok?"#28473d":"#633838"; }
  function kpis(el, items){ el.innerHTML=items.map((x,i)=>`<div class="kpi ${x.cls||((i<2)?"accent":"")}"><div class="label">${esc(x.label)}</div><div class="value">${won(x.value)}</div>${x.sub?`<div class="sub">${esc(x.sub)}</div>`:""}</div>`).join(""); }
  function lines(items){ return `<div class="summary-lines">${items.map(x=>`<div class="summary-line ${x.total?"total":""}"><span>${esc(x.label)}</span><strong>${typeof x.value==="number"?won(x.value):esc(x.value)}</strong></div>`).join("")}</div>`; }
  function badgePayment(p){ const cls=p==="카드"?"card":"cash"; return `<span class="badge ${cls}">${esc(p||"-")}</span>`; }
  function empty(msg="조회된 데이터가 없습니다."){ return `<div class="empty-state">${esc(msg)}</div>`; }
  function errorBox(msg){
    const text=String(msg||"");
    let hint="로그인 계정의 조회 권한을 확인해 주세요.";
    if(/oozy_daily_sales|oozy_monthly_delivery_overrides|oozy_sync_status|oozy_profiles/i.test(text) && /schema cache|could not find|does not exist/i.test(text)){
      hint="OOZY DB 테이블이 아직 없습니다. Supabase SQL Editor에서 supabase/OOZY_DB_SETUP.sql을 한 번 실행해 주세요.";
    } else if(/permission|row-level security|policy|not authorized|401|403/i.test(text)){
      hint="통합 관리자 역할 또는 RLS 권한을 확인해 주세요. 필요하면 supabase/INTEGRATED_ADMIN_SETUP.sql을 실행해 주세요.";
    }
    return `<div class="error-box">${esc(text)}<br>${esc(hint)}</div>`;
  }

  async function login(){
    const id=$("loginId").value.trim(), email=aliases[id]||id, password=$("loginPassword").value;
    $("loginMessage").textContent="로그인 중...";
    const {data,error}=await sb.auth.signInWithPassword({email,password});
    if(error){ $("loginMessage").textContent="로그인 실패: "+error.message; return; }
    state.user=data.user; $("loginMessage").textContent=""; await afterLogin();
  }
  async function logout(){ await sb.auth.signOut(); location.reload(); }

  async function ensureIntegratedRoles(){
    try{ await sb.rpc("oozy_unify_my_admin_roles"); }catch(_e){ /* migration is optional for already-provisioned accounts */ }
  }
  async function afterLogin(){
    await ensureIntegratedRoles();
    $("loginView").classList.add("hidden"); $("appView").classList.remove("hidden");
    $("accountLabel").textContent=state.user?.email||"관리자";
    setupPeriodControls();
    resetRequestForm();
    await refreshCurrent(true);
    startPolling();
  }

  function switchPage(page){
    state.page=page;
    qsa(".page").forEach(x=>x.classList.toggle("active",x.id===`${page}Page`));
    qsa(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
    refreshCurrent(false);
  }
  function startPolling(){ clearInterval(state.timer); state.timer=setInterval(()=>refreshCurrent(false,true), Math.max(5000,Number(cfg.refreshIntervalMs||10000))); }

  function setupPeriodControls(){
    ["oozySales","oozyPurchase","kcem","uwash"].forEach(key=>renderPeriodControl(key));
  }
  function renderPeriodControl(key){
    const mode=state.mode[key], host=$(`${key}Period`); if(!host) return;
    let input="";
    if(mode==="day") input=`<input type="date" data-period-input="${key}" value="${esc(state.period[key])}">`;
    else if(mode==="month") input=`<input type="month" data-period-input="${key}" value="${esc(state.period[key].slice(0,7))}">`;
    else input=`<input type="number" min="${Number(cfg.firstYear||2026)}" max="2100" data-period-input="${key}" value="${esc(String(state.period[key]).slice(0,4))}">`;
    host.innerHTML=`<div class="period-control"><button data-shift="-1" data-key="${key}">‹</button>${input}<button data-shift="1" data-key="${key}">›</button></div>`;
    qs(`[data-period-input="${key}"]`,host).onchange=(e)=>{ state.period[key]=normalizePeriod(mode,e.target.value); refreshCurrent(false); };
    qsa("button[data-shift]",host).forEach(b=>b.onclick=()=>shiftPeriod(key,Number(b.dataset.shift)));
  }
  function normalizePeriod(mode,v){ if(mode==="day") return v; if(mode==="month") return v+"-01"; return String(v)+"-01-01"; }
  function shiftPeriod(key,delta){
    const mode=state.mode[key], cur=state.period[key]; let d=new Date(cur+"T00:00:00");
    if(mode==="day") d.setDate(d.getDate()+delta); else if(mode==="month") d.setMonth(d.getMonth()+delta); else d.setFullYear(d.getFullYear()+delta);
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
    state.period[key]=mode==="day"?`${y}-${m}-${day}`:`${y}-${m}-01`; renderPeriodControl(key); refreshCurrent(false);
  }

  async function selectRange(table,dateColumn,range,columns="*"){ const {data,error}=await sb.from(table).select(columns).gte(dateColumn,range.start).lte(dateColumn,range.end).order(dateColumn,{ascending:true}); if(error) throw error; return data||[]; }
  async function selectOne(table,filters){ let q=sb.from(table).select("*").limit(1); Object.entries(filters).forEach(([k,v])=>q=q.eq(k,v)); const {data,error}=await q; if(error) throw error; return (data||[])[0]||null; }

  async function loadDashboard(){
    const day=todayKst(); $("dashboardDateText").textContent=`${day} · 10초 자동 새로고침`;
    const results=await Promise.allSettled([
      selectOne("oozy_daily_sales",{business_date:day}),
      selectRange("kcem_sales","sale_date",{start:day,end:day}),
      selectOne("uwash_daily_sales",{sale_date:day}),
      selectOne("oozy_sync_status",{id:1})
    ]);
    const oozy=results[0].status==="fulfilled"?(results[0].value||{}):{}, kcem=results[1].status==="fulfilled"?results[1].value:[], uwash=results[2].status==="fulfilled"?(results[2].value||{}):{}, sync=results[3].status==="fulfilled"?results[3].value:null;
    const kcemTotal=sum(kcem,"amount");
    kpis($("dashboardKpis"),[
      {label:"우지 매출",value:oozy.total,sub:"우지커피 단독"},
      {label:"박물관 매출",value:kcemTotal,sub:"KCEM 단독"},
      {label:"유워시 매출",value:uwash.total_sales,sub:"U-WASH 단독"},
      {label:"우지 매입",value:oozy.purchase_total,cls:"blue",sub:"우지커피 단독"}
    ]);
    $("dashboardOozy").innerHTML=results[0].status==="rejected"?errorBox(results[0].reason.message):lines([{label:"매출",value:num(oozy.total),total:true},{label:"매입",value:num(oozy.purchase_total)},{label:"POS",value:num(oozy.pos_total)},{label:"배달",value:num(oozy.delivery_total)}]);
    const kCash=kcem.filter(r=>["현금","계좌","시루"].includes(r.payment_method)).reduce((a,r)=>a+num(r.amount),0), kCard=kcem.filter(r=>r.payment_method==="카드").reduce((a,r)=>a+num(r.amount),0);
    $("dashboardKcem").innerHTML=results[1].status==="rejected"?errorBox(results[1].reason.message):lines([{label:"현금계",value:kCash},{label:"카드",value:kCard},{label:"총매출",value:kcemTotal,total:true},{label:"거래",value:`${kcem.length}건`}]);
    $("dashboardUwash").innerHTML=results[2].status==="rejected"?errorBox(results[2].reason.message):lines([{label:"현금계",value:num(uwash.cash_total)},{label:"카드",value:num(uwash.card_total)},{label:"총매출",value:num(uwash.total_sales),total:true},{label:"미확인",value:`${num(uwash.pending_count)}건`}]);
    $("dashboardSync").innerHTML=sync?lines([{label:"OOZY 최종 업로드",value:fmtDateTime(sync.generated_at)},{label:"업로드 일수",value:`${num(sync.daily_count)}일`},{label:"앱 버전",value:sync.app_version||"-"}]):empty("OOZY Supabase 업로드 기록이 없습니다.");
  }

  async function loadSeparateBusinessDailySales(day){
    const r={start:day,end:day};
    const res=await Promise.allSettled([
      selectRange("kcem_sales","sale_date",r,"payment_method,amount"),
      selectRange("uwash_supply_sales","sale_date",r,"payment_method,amount"),
      selectRange("uwash_manual_charge","sale_date",r,"payment_method,sales_amount,decision")
    ]);
    const kcem=res[0].status==="fulfilled"?res[0].value:[];
    const supply=res[1].status==="fulfilled"?res[1].value:[];
    const manual=res[2].status==="fulfilled"?res[2].value:[];
    const kcemCash=kcem.filter(x=>["현금","계좌","시루"].includes(x.payment_method)).reduce((a,x)=>a+num(x.amount),0);
    const kcemCard=kcem.filter(x=>x.payment_method==="카드").reduce((a,x)=>a+num(x.amount),0);
    const kcemTotal=kcemCash+kcemCard;
    const supplyTotal=sum(supply,"amount");
    const manualTotal=manual.filter(x=>x.decision==="record").reduce((a,x)=>a+num(x.sales_amount),0);
    const uwashTotal=supplyTotal+manualTotal;
    const errors=res.filter(x=>x.status==="rejected").map(x=>x.reason?.message||String(x.reason||"조회 오류"));
    return {kcemCash,kcemCard,kcemTotal,supplyTotal,manualTotal,uwashTotal,errors};
  }

  function separateBusinessDailyHtml(info){
    const warning=info.errors.length?`<div class="separate-sales-warning">일부 별도 사업장 자료를 불러오지 못했습니다: ${esc(info.errors.join(" / "))}</div>`:"";
    return `<section class="separate-sales-block"><div class="separate-sales-head"><div><strong>별도 사업장 매출</strong><span>우지 총매출 미포함</span></div><em>참고 기록</em></div>${warning}<div class="separate-sales-grid"><div class="separate-sales-group"><h4>박물관</h4><div><span>현금계 <small>(현금+계좌+시루)</small></span><strong>${won(info.kcemCash)}</strong></div><div><span>카드</span><strong>${won(info.kcemCard)}</strong></div><div class="separate-total"><span>박물관 총매출</span><strong>${won(info.kcemTotal)}</strong></div></div><div class="separate-sales-group"><h4>유워시</h4><div><span>세차용품</span><strong>${won(info.supplyTotal)}</strong></div><div><span>수동충전</span><strong>${won(info.manualTotal)}</strong></div><div class="separate-total"><span>유워시 총매출</span><strong>${won(info.uwashTotal)}</strong></div></div></div><p class="separate-sales-note">※ 위 금액은 별도 사업장 매출이며 우지 총매출 및 우지 매입 계산에 합산되지 않습니다.</p></section>`;
  }

  async function loadOozySales(){
    const key="oozySales", mode=state.mode[key], r=rangeFor(mode,mode==="day"?state.period[key]:mode==="month"?state.period[key].slice(0,7):state.period[key].slice(0,4));
    let rows; try{rows=await selectRange("oozy_daily_sales","business_date",r);}catch(e){$("oozySalesBody").innerHTML=errorBox(e.message);return;}
    const total=sum(rows,"total"), pos=sum(rows,"pos_total"), delivery=sum(rows,"delivery_total"), card=sum(rows,"card"), cash=sum(rows,"cash");
    kpis($("oozySalesKpis"),[{label:"우지 총매출",value:total},{label:"POS",value:pos},{label:"배달",value:delivery},{label:"카드 + 현금",value:card+cash}]);
    if(mode==="day"){
      const x=rows[0]||{};
      const separate=await loadSeparateBusinessDailySales(r.start);
      $("oozySalesBody").innerHTML=`<div class="period-summary"><div class="mini-card"><span>카드</span><strong>${won(x.card)}</strong></div><div class="mini-card"><span>현금</span><strong>${won(x.cash)}</strong></div><div class="mini-card"><span>배달</span><strong>${won(x.delivery_total)}</strong></div></div><div class="table-wrap"><table class="table"><thead><tr><th>항목</th><th class="num">금액</th></tr></thead><tbody><tr><td>배달의민족</td><td class="num">${won(x.baemin)}</td></tr><tr><td>쿠팡이츠</td><td class="num">${won(x.coupang)}</td></tr><tr><td>OOZY 오더</td><td class="num">${won(x.oozy_order)}</td></tr><tr><td>기타 배달</td><td class="num">${won(x.other_delivery)}</td></tr><tr class="total-row"><td>우지 총매출</td><td class="num">${won(x.total)}</td></tr></tbody></table></div>${separateBusinessDailyHtml(separate)}`;
    } else if(mode==="month"){
      $("oozySalesBody").innerHTML=calendarSection(key,state.period[key],dailyTotals(rows,"business_date","total"),"우지 매출");
      bindCalendarClicks($("oozySalesBody"),key);
    } else {
      $("oozySalesBody").innerHTML=yearCalendarSection(key,state.period[key],monthlyTotals(rows,"business_date","total"),"우지 매출");
      bindYearCalendarClicks($("oozySalesBody"),key);
    }
  }

  async function loadOozyPurchase(){
    const key="oozyPurchase", mode=state.mode[key], r=rangeFor(mode,mode==="day"?state.period[key]:mode==="month"?state.period[key].slice(0,7):state.period[key].slice(0,4));
    let rows; try{rows=await selectRange("oozy_daily_sales","business_date",r);}catch(e){$("oozyPurchaseBody").innerHTML=errorBox(e.message);return;}
    const spc=sum(rows,"purchase_spc_total"), hq=sum(rows,"purchase_headquarters_total"), total=sum(rows,"purchase_total");
    kpis($("oozyPurchaseKpis"),[{label:"총 매입",value:total},{label:"SPC",value:spc},{label:"본사",value:hq},{label:"기간 매출",value:sum(rows,"total"),cls:"blue"}]);
    if(mode==="day"){
      const x=rows[0]||{};
      $("oozyPurchaseBody").innerHTML=rows.length?`<div class="table-wrap"><table class="table"><thead><tr><th>항목</th><th class="num">금액</th></tr></thead><tbody><tr><td>SPC 매입</td><td class="num">${won(x.purchase_spc_total)}</td></tr><tr><td>본사 매입</td><td class="num">${won(x.purchase_headquarters_total)}</td></tr><tr class="total-row"><td>총 매입</td><td class="num"><strong>${won(x.purchase_total)}</strong></td></tr></tbody></table></div>`:empty();
    } else if(mode==="month"){
      $("oozyPurchaseBody").innerHTML=calendarSection(key,state.period[key],dailyTotals(rows,"business_date","purchase_total"),"우지 매입");
      bindCalendarClicks($("oozyPurchaseBody"),key);
    } else {
      $("oozyPurchaseBody").innerHTML=yearCalendarSection(key,state.period[key],monthlyTotals(rows,"business_date","purchase_total"),"우지 매입");
      bindYearCalendarClicks($("oozyPurchaseBody"),key);
    }
  }

  async function loadKcem(){
    const key="kcem", mode=state.mode[key], r=rangeFor(mode,mode==="day"?state.period[key]:mode==="month"?state.period[key].slice(0,7):state.period[key].slice(0,4));
    let rows; try{ rows=await selectRange("kcem_sales","sale_date",r,"transaction_key,sale_date,sale_time,item_name,payment_method,amount,quantity,comment,created_at"); rows.sort((a,b)=>`${b.sale_date} ${b.sale_time}`.localeCompare(`${a.sale_date} ${a.sale_time}`)); }catch(e){$("kcemBody").innerHTML=errorBox(e.message);return;}
    const cash=rows.filter(x=>["현금","계좌","시루"].includes(x.payment_method)).reduce((a,x)=>a+num(x.amount),0), card=rows.filter(x=>x.payment_method==="카드").reduce((a,x)=>a+num(x.amount),0), total=cash+card;
    kpis($("kcemKpis"),[{label:"현금계",value:cash},{label:"카드",value:card},{label:"박물관 총매출",value:total},{label:"거래금액 평균",value:rows.length?Math.round(total/rows.length):0,cls:"blue"}]);
    if(mode==="day"){
      $("kcemBody").innerHTML=rows.length?`<div class="table-wrap"><table class="table"><thead><tr><th>시간</th><th>결제</th><th class="num">금액</th><th>판매품목</th><th class="center">수량</th><th>비고</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(fmtTime(x.sale_time))}</td><td>${badgePayment(x.payment_method)}</td><td class="num"><strong>${won(x.amount)}</strong></td><td>${esc(x.item_name)}</td><td class="center">${num(x.quantity)||1}</td><td>${esc(x.comment||"")}</td></tr>`).join("")}</tbody></table></div>`:empty();
    } else if(mode==="month"){
      $("kcemBody").innerHTML=calendarSection(key,state.period[key],dailyTotals(rows,"sale_date","amount"),"박물관 매출");
      bindCalendarClicks($("kcemBody"),key);
    } else {
      $("kcemBody").innerHTML=yearCalendarSection(key,state.period[key],monthlyTotals(rows,"sale_date","amount"),"박물관 매출");
      bindYearCalendarClicks($("kcemBody"),key);
    }
  }

  async function loadUwash(){
    const key="uwash", mode=state.mode[key], r=rangeFor(mode,mode==="day"?state.period[key]:mode==="month"?state.period[key].slice(0,7):state.period[key].slice(0,4));
    if(state.uwashLedger==="supply") return loadUwashSupply(r,mode); return loadUwashManual(r,mode);
  }
  async function loadUwashSupply(r,mode){
    const key="uwash";
    let rows; try{rows=await selectRange("uwash_supply_sales","sale_date",r,"transaction_key,sale_date,item_name,payment_method,amount,comment,local_updated_at"); rows.sort((a,b)=>String(b.local_updated_at||b.sale_date).localeCompare(String(a.local_updated_at||a.sale_date)));}catch(e){$("uwashBody").innerHTML=errorBox(e.message);return;}
    const cash=rows.filter(x=>["현금","계좌"].includes(x.payment_method)).reduce((a,x)=>a+num(x.amount),0), card=rows.filter(x=>x.payment_method==="카드").reduce((a,x)=>a+num(x.amount),0), total=cash+card;
    kpis($("uwashKpis"),[{label:"현금계",value:cash},{label:"카드",value:card},{label:"세차용품 매출",value:total},{label:"판매 건수",value:rows.length,sub:"금액이 아닌 건수",cls:"blue"}]);
    if(mode==="day"){
      $("uwashBody").innerHTML=rows.length?`<div class="table-wrap"><table class="table"><thead><tr><th>시간</th><th>결제</th><th>품목</th><th class="num">금액</th><th>비고</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(fmtTime(x.local_updated_at))}</td><td>${badgePayment(x.payment_method)}</td><td>${esc(x.item_name)}</td><td class="num"><strong>${won(x.amount)}</strong></td><td>${esc(x.comment||"")}</td></tr>`).join("")}</tbody></table></div>`:empty();
    } else if(mode==="month"){
      $("uwashBody").innerHTML=calendarSection(key,state.period[key],dailyTotals(rows,"sale_date","amount"),"세차용품 매출");
      bindCalendarClicks($("uwashBody"),key);
    } else {
      $("uwashBody").innerHTML=yearCalendarSection(key,state.period[key],monthlyTotals(rows,"sale_date","amount"),"세차용품 매출");
      bindYearCalendarClicks($("uwashBody"),key);
    }
  }

  async function loadUwashManual(r,mode){
    const key="uwash";
    let actual=[], pending=[]; const res=await Promise.allSettled([
      selectRange("uwash_manual_charge","sale_date",r,"transaction_key,sale_date,event_time,charge_amount,sales_amount,decision,payment_method,comment,local_updated_at"),
      selectRange("uwash_manual_preentry","sale_date",r,"preentry_key,sale_date,charge_amount,sales_amount,payment_method,comment,status,matched_transaction_key,created_at")
    ]);
    if(res[0].status==="rejected"){ $("uwashBody").innerHTML=errorBox(res[0].reason.message); return; }
    actual=res[0].value||[]; pending=res[1].status==="fulfilled"?(res[1].value||[]).filter(x=>x.status==="pending"):[];
    const recorded=actual.filter(x=>x.decision==="record"), cash=recorded.filter(x=>["현금","계좌"].includes(x.payment_method)).reduce((a,x)=>a+num(x.sales_amount),0), card=recorded.filter(x=>x.payment_method==="카드").reduce((a,x)=>a+num(x.sales_amount),0), total=cash+card;
    kpis($("uwashKpis"),[{label:"현금계",value:cash},{label:"카드",value:card},{label:"수동충전 매출",value:total},{label:"매칭 대기",value:pending.length,sub:"건수",cls:"blue"}]);
    const merged=[...actual.map(x=>({...x,_kind:"actual",_sort:String(x.local_updated_at||`${x.sale_date} ${x.event_time||""}`)})),...pending.map(x=>({...x,_kind:"pending",_sort:String(x.created_at||x.sale_date)}))].sort((a,b)=>b._sort.localeCompare(a._sort));
    if(mode==="day"){
      $("uwashBody").innerHTML=merged.length?`<div class="table-wrap"><table class="table"><thead><tr><th>시간</th><th>상태</th><th>결제</th><th class="num">충전금액</th><th class="num">실수납</th><th>비고</th></tr></thead><tbody>${merged.map(x=>{const pend=x._kind==="pending", status=pend?'<span class="badge pending">매칭 대기</span>':x.decision==="record"?'<span class="badge cash">기록</span>':x.decision==="ignore"?'<span class="badge ignore">무시</span>':'<span class="badge pending">미확인</span>';return `<tr><td>${esc(pend?fmtTime(x.created_at):fmtTime(x.event_time||x.local_updated_at))}</td><td>${status}</td><td>${x.payment_method?badgePayment(x.payment_method):"-"}</td><td class="num">${won(x.charge_amount)}</td><td class="num"><strong>${x.sales_amount==null?"-":won(x.sales_amount)}</strong></td><td>${esc(x.comment||"")}</td></tr>`;}).join("")}</tbody></table></div><p class="section-note">매출 합계는 실제 수동충전 중 ‘기록’ 확정 건만 포함합니다. 매칭 대기 사전입력은 합계에서 제외됩니다.</p>`:empty();
    } else if(mode==="month"){
      $("uwashBody").innerHTML=calendarSection(key,state.period[key],dailyTotals(recorded,"sale_date","sales_amount"),"수동충전 매출");
      bindCalendarClicks($("uwashBody"),key);
    } else {
      $("uwashBody").innerHTML=yearCalendarSection(key,state.period[key],monthlyTotals(recorded,"sale_date","sales_amount"),"수동충전 매출");
      bindYearCalendarClicks($("uwashBody"),key);
    }
  }



  // v1.0.10 shared purchase requests ---------------------------------------
  function requestKey(){
    if(globalThis.crypto?.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==="x"?r:(r&3|8);return v.toString(16);});
  }
  function requestSourceClass(source){ return `source-${String(source||"").toLowerCase()}`; }
  function requestPriorityClass(priority){ return `priority-${Math.min(5,Math.max(1,Number(priority)||3))}`; }
  function requestDateTimeText(v){
    if(!v) return "-";
    try{return new Date(v).toLocaleString("ko-KR",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false});}
    catch(_){return String(v);}
  }
  function parseRequestMoney(text){
    const s=String(text||"").replace(/,/g,"");
    const hits=[...s.matchAll(/(\d+(?:\.\d+)?)\s*(만원|천원|원|만)(?![가-힣])/g)];
    if(hits.length){
      const m=hits[hits.length-1]; let v=Number(m[1]);
      if(m[2]==="만원"||m[2]==="만") v*=10000;
      else if(m[2]==="천원") v*=1000;
      return {value:Math.round(v),raw:m[0]};
    }
    const bare=[...s.matchAll(/(?:^|\s)(\d{4,})(?=\s|$)/g)];
    if(bare.length){ const m=bare[bare.length-1]; return {value:Number(m[1]),raw:m[1]}; }
    return null;
  }
  function parseRequestNaturalData(raw){
    const text=String(raw||"").trim();
    if(!text) return null;
    let priority=3;
    const pm=text.match(/([1-5])\s*(?:순위|순|등급)/);
    if(pm) priority=Number(pm[1]);
    else if(/긴급|급함|급하게|최우선/.test(text)) priority=1;
    else if(/여유|나중/.test(text)) priority=5;
    const money=parseRequestMoney(text);
    const qm=text.match(/(\d+(?:\.\d+)?)\s*(개|세트|박스|통|봉|팩|롤|ea)(?=\s|$|[,./])/i);
    const qty=qm?Number(qm[1]):1;
    let item=text;
    if(pm)item=item.replace(pm[0]," ");
    item=item.replace(/긴급|급함|급하게|최우선/g," ");
    if(money)item=item.replace(money.raw," ");
    if(qm)item=item.replace(qm[0]," ");
    item=item.replace(/(?:^|\s)(구매요청|구매|구입|필요|요청)(?=\s|$)/g," ").replace(/\s+/g," ").trim();
    if(!item)item="구매요청";
    return {request_date:todayKst(),priority,item_name:item,quantity:qty,estimated_amount:money?money.value:null,memo:null};
  }
  function requestNumberInput(id, fallback=null){
    const raw=String($(id)?.value||"").replace(/,/g,"").trim();
    if(!raw) return fallback;
    const n=Number(raw); return Number.isFinite(n)?n:fallback;
  }
  function setRequestMessage(message, isError=false){
    const el=$("requestMessage"); if(!el) return;
    el.textContent=message||""; el.classList.toggle("error",!!isError);
  }
  function setRequestBusy(button,busy,busyLabel){
    if(!button) return;
    if(busy){ button.dataset.normalLabel=button.textContent; button.textContent=busyLabel; button.disabled=true; }
    else { button.textContent=button.dataset.normalLabel||button.textContent; button.disabled=false; }
  }
  function resetRequestForm(){
    if(!$("requestDate")) return;
    state.editingRequestKey=null;
    $("requestDate").value=todayKst();
    $("requestPriority").value="3";
    $("requestItem").value="";
    $("requestQuantity").value="1";
    $("requestAmount").value="";
    $("requestMemo").value="";
    $("requestSave").textContent="수동 저장";
    setRequestMessage("");
  }
  function requestDbFailure(error){
    console.error("shared_purchase_requests",error);
    state.requestDbReady=false;
    const notice=$("requestDbNotice");
    if(notice){
      notice.classList.remove("hidden");
      notice.innerHTML=`공동 구매요청을 불러오지 못했습니다. 새 테이블을 만들지 말고 UWash에서 사용 중인 <b>public.shared_purchase_requests</b>와 RLS 권한을 확인해 주세요.<br><small>${esc(error?.message||String(error||"조회 오류"))}</small>`;
    }
    $("requestBody").innerHTML=`<tr><td colspan="8">${errorBox(error?.message||String(error||"조회 오류"))}</td></tr>`;
  }
  function requestDbSuccess(){
    state.requestDbReady=true;
    $("requestDbNotice")?.classList.add("hidden");
  }
  async function fetchPurchaseRequests(){
    const {data,error}=await sb.from("shared_purchase_requests").select("*").order("priority",{ascending:true}).order("created_at",{ascending:false});
    if(error) throw error;
    state.requestRows=data||[];
    requestDbSuccess();
    renderPurchaseRequests();
  }
  function filteredPurchaseRequests(){
    const source=$("requestSourceFilter")?.value||"";
    const priority=$("requestPriorityFilter")?.value||"";
    const search=($("requestSearch")?.value||"").trim().toLowerCase();
    let rows=state.requestRows.filter(r=>(r.status||"pending")===state.requestMode);
    if(source) rows=rows.filter(r=>r.source_site===source);
    if(priority) rows=rows.filter(r=>String(r.priority||3)===priority);
    if(search) rows=rows.filter(r=>[r.item_name,r.memo,r.purpose].some(v=>String(v||"").toLowerCase().includes(search)));
    if(state.requestMode==="pending"){
      rows.sort((a,b)=>(Number(a.priority||3)-Number(b.priority||3)) || String(b.created_at||b.local_updated_at||"").localeCompare(String(a.created_at||a.local_updated_at||"")));
    }else{
      rows.sort((a,b)=>String(b.completed_at||b.local_updated_at||"").localeCompare(String(a.completed_at||a.local_updated_at||"")));
    }
    return rows;
  }
  function requestActionButtons(row){
    const key=esc(row.request_key);
    const own=row.source_site===CURRENT_REQUEST_SITE;
    const completion=(row.status||"pending")==="completed"
      ? `<button class="request-action restore" data-request-action="restore" data-request-key="${key}">완료취소</button>`
      : `<button class="request-action complete" data-request-action="complete" data-request-key="${key}">구매완료</button>`;
    const ownButtons=own?`<button class="request-action edit" data-request-action="edit" data-request-key="${key}">수정</button><button class="request-action delete" data-request-action="delete" data-request-key="${key}">삭제</button>`:"";
    return `<div class="request-actions">${completion}${ownButtons}</div>`;
  }
  function renderPurchaseRequests(){
    if(!$("requestBody")) return;
    const pendingCount=state.requestRows.filter(r=>(r.status||"pending")==="pending").length;
    const completedCount=state.requestRows.filter(r=>r.status==="completed").length;
    $("requestPendingCount").textContent=String(pendingCount);
    $("requestCompletedCount").textContent=String(completedCount);
    $("requestPendingMode").classList.toggle("active",state.requestMode==="pending");
    $("requestCompletedMode").classList.toggle("active",state.requestMode==="completed");
    const rows=filteredPurchaseRequests();
    $("requestSummary").textContent=`${rows.length}건 표시`;
    if(!rows.length){
      $("requestBody").innerHTML=`<tr><td colspan="8">${empty(state.requestMode==="completed"?"구매완료 내역이 없습니다.":"진행중 구매요청이 없습니다.")}</td></tr>`;
      return;
    }
    $("requestBody").innerHTML=rows.map(row=>{
      const completed=row.status==="completed";
      const source=REQUEST_SOURCE_LABEL[row.source_site]||row.source_site||"-";
      const completion=completed?`<small class="request-completed-at">완료 ${esc(requestDateTimeText(row.completed_at))}</small>`:"";
      const memo=[row.memo,row.purpose].filter(Boolean).join(row.memo&&row.purpose?" · ":"");
      const amount=row.estimated_amount==null||row.estimated_amount===""?"-":won(row.estimated_amount);
      return `<tr class="${completed?"request-completed-row":""}"><td><strong>${esc(row.request_date||"")}</strong>${completion}</td><td><span class="request-source ${requestSourceClass(row.source_site)}">${esc(source)}</span></td><td><span class="request-priority ${requestPriorityClass(row.priority)}">${esc(String(row.priority||3))}순위</span></td><td class="request-item-cell"><strong>${esc(row.item_name||"")}</strong></td><td class="center">${esc(row.quantity==null?"1":row.quantity)}</td><td class="num">${amount}</td><td>${esc(memo||"")}</td><td class="center no-print">${requestActionButtons(row)}</td></tr>`;
    }).join("");
    qsa("[data-request-action]",$("requestBody")).forEach(btn=>btn.onclick=()=>handleRequestAction(btn.dataset.requestAction,btn.dataset.requestKey));
  }
  async function quickAddPurchaseRequest(){
    const input=$("requestNatural"), parsed=parseRequestNaturalData(input.value);
    if(!parsed){ setRequestMessage("자연어 입력 내용을 적어 주세요.",true); input.focus(); return; }
    const button=$("requestQuickAdd"); setRequestBusy(button,true,"추가 중..."); setRequestMessage("");
    const now=new Date().toISOString();
    const body={request_key:requestKey(),request_date:parsed.request_date,source_site:CURRENT_REQUEST_SITE,priority:parsed.priority,item_name:parsed.item_name,quantity:parsed.quantity,estimated_amount:parsed.estimated_amount,purpose:null,memo:parsed.memo,status:"pending",completed_at:null,completed_by:null,created_by:state.user?.id||null,created_at:now,local_updated_at:now};
    try{
      const {error}=await sb.from("shared_purchase_requests").insert(body); if(error) throw error;
      input.value=""; setRequestMessage(`추가 완료 · ${body.priority}순위 · ${body.item_name}`); toast("공동 구매요청에 추가했습니다."); await fetchPurchaseRequests();
    }catch(e){ requestDbFailure(e); setRequestMessage("추가 실패: "+e.message,true); }
    finally{setRequestBusy(button,false,"추가 중...");}
  }
  async function saveManualPurchaseRequest(){
    const item=$("requestItem").value.trim(); if(!item){setRequestMessage("품목·요청내용을 입력해 주세요.",true);$("requestItem").focus();return;}
    const qty=requestNumberInput("requestQuantity",1); if(!(qty>0)){setRequestMessage("수량은 0보다 크게 입력해 주세요.",true);return;}
    const amount=requestNumberInput("requestAmount",null); if(amount!=null && amount<0){setRequestMessage("예상금액을 확인해 주세요.",true);return;}
    const button=$("requestSave"); setRequestBusy(button,true,state.editingRequestKey?"수정 중...":"저장 중..."); setRequestMessage("");
    const now=new Date().toISOString();
    try{
      if(state.editingRequestKey){
        const row=state.requestRows.find(r=>r.request_key===state.editingRequestKey);
        if(!row || row.source_site!==CURRENT_REQUEST_SITE) throw new Error("OOZY에서 작성한 요청만 수정할 수 있습니다.");
        const update={request_date:$("requestDate").value||todayKst(),priority:Number($("requestPriority").value||3),item_name:item,quantity:qty,estimated_amount:amount,memo:$("requestMemo").value.trim()||null,local_updated_at:now};
        const {error}=await sb.from("shared_purchase_requests").update(update).eq("request_key",state.editingRequestKey).eq("source_site",CURRENT_REQUEST_SITE); if(error) throw error;
        toast("구매요청을 수정했습니다.");
      }else{
        const body={request_key:requestKey(),request_date:$("requestDate").value||todayKst(),source_site:CURRENT_REQUEST_SITE,priority:Number($("requestPriority").value||3),item_name:item,quantity:qty,estimated_amount:amount,purpose:null,memo:$("requestMemo").value.trim()||null,status:"pending",completed_at:null,completed_by:null,created_by:state.user?.id||null,created_at:now,local_updated_at:now};
        const {error}=await sb.from("shared_purchase_requests").insert(body); if(error) throw error;
        toast("공동 구매요청에 저장했습니다.");
      }
      resetRequestForm(); await fetchPurchaseRequests();
    }catch(e){ requestDbFailure(e); setRequestMessage("저장 실패: "+e.message,true); }
    finally{setRequestBusy(button,false,"저장 중..."); if(!state.editingRequestKey) $("requestSave").textContent="수동 저장";}
  }
  function editPurchaseRequest(key){
    const row=state.requestRows.find(r=>r.request_key===key); if(!row) return;
    if(row.source_site!==CURRENT_REQUEST_SITE){toast("UWASH/KCEM 요청은 이 사이트에서 수정할 수 없습니다.");return;}
    state.editingRequestKey=key;
    $("requestDate").value=row.request_date||todayKst();
    $("requestPriority").value=String(row.priority||3);
    $("requestItem").value=row.item_name||"";
    $("requestQuantity").value=row.quantity==null?1:row.quantity;
    $("requestAmount").value=row.estimated_amount==null?"":row.estimated_amount;
    $("requestMemo").value=row.memo||"";
    $("requestSave").textContent="수정 저장";
    setRequestMessage("OOZY 요청 수정 중");
    $("requestItem").focus();
    window.scrollTo({top:0,behavior:"smooth"});
  }
  async function setRequestCompletion(key,completed){
    const now=new Date().toISOString();
    const update=completed?{status:"completed",completed_at:now,completed_by:state.user?.id||null,local_updated_at:now}:{status:"pending",completed_at:null,completed_by:null,local_updated_at:now};
    const {error}=await sb.from("shared_purchase_requests").update(update).eq("request_key",key); if(error) throw error;
    toast(completed?"구매완료로 이동했습니다.":"진행중으로 되돌렸습니다."); await fetchPurchaseRequests();
  }
  async function deletePurchaseRequest(key){
    const row=state.requestRows.find(r=>r.request_key===key); if(!row) return;
    if(row.source_site!==CURRENT_REQUEST_SITE){toast("OOZY에서 작성한 요청만 삭제할 수 있습니다.");return;}
    if(!confirm(`'${row.item_name||"구매요청"}' 요청을 삭제할까요?`)) return;
    const {error}=await sb.from("shared_purchase_requests").delete().eq("request_key",key).eq("source_site",CURRENT_REQUEST_SITE); if(error) throw error;
    if(state.editingRequestKey===key) resetRequestForm(); toast("구매요청을 삭제했습니다."); await fetchPurchaseRequests();
  }
  async function handleRequestAction(action,key){
    try{
      if(action==="edit") editPurchaseRequest(key);
      else if(action==="delete") await deletePurchaseRequest(key);
      else if(action==="complete") await setRequestCompletion(key,true);
      else if(action==="restore") await setRequestCompletion(key,false);
    }catch(e){requestDbFailure(e);toast("처리 실패: "+e.message);}
  }
  async function loadPurchaseRequests(){
    try{await fetchPurchaseRequests();}catch(e){requestDbFailure(e);}
  }

  async function refreshCurrent(showToast=false,background=false){
    if(state.refreshing) return; state.refreshing=true; if(!background)setRefresh("새로고침 중");
    try{
      if(state.page==="dashboard") await loadDashboard();
      else if(state.page==="oozySales") await loadOozySales();
      else if(state.page==="oozyPurchase") await loadOozyPurchase();
      else if(state.page==="purchaseRequests") await loadPurchaseRequests();
      else if(state.page==="kcem") await loadKcem();
      else if(state.page==="uwash") await loadUwash();
      state.lastRefresh=new Date(); setRefresh(`최신 ${state.lastRefresh.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}`); if(showToast)toast("최신 DB 값으로 갱신했습니다.");
    }catch(e){ console.error(e); setRefresh("갱신 오류",false); if(showToast)toast("갱신 오류: "+e.message); }
    finally{state.refreshing=false;}
  }

  qsa(".nav").forEach(b=>b.onclick=()=>switchPage(b.dataset.page));
  qsa("[data-go]").forEach(b=>b.onclick=()=>switchPage(b.dataset.go));
  qsa("[data-mode-group]").forEach(group=>qsa("button[data-mode]",group).forEach(b=>b.onclick=()=>{ const key=group.dataset.modeGroup; state.mode[key]=b.dataset.mode; qsa("button",group).forEach(x=>x.classList.toggle("active",x===b)); renderPeriodControl(key); refreshCurrent(false); }));
  qsa("#uwashLedgerTabs button").forEach(b=>b.onclick=()=>{state.uwashLedger=b.dataset.ledger;qsa("#uwashLedgerTabs button").forEach(x=>x.classList.toggle("active",x===b));refreshCurrent(false);});
  qsa(".print-button").forEach(b=>b.onclick=()=>window.print());
  $("requestQuickAdd").onclick=quickAddPurchaseRequest;
  $("requestNatural").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();quickAddPurchaseRequest();}};
  $("requestSave").onclick=saveManualPurchaseRequest;
  $("requestReset").onclick=resetRequestForm;
  $("requestRefreshButton").onclick=()=>loadPurchaseRequests();
  $("requestPendingMode").onclick=()=>{state.requestMode="pending";renderPurchaseRequests();};
  $("requestCompletedMode").onclick=()=>{state.requestMode="completed";renderPurchaseRequests();};
  $("requestSourceFilter").onchange=renderPurchaseRequests;
  $("requestPriorityFilter").onchange=renderPurchaseRequests;
  $("requestSearch").oninput=renderPurchaseRequests;
  $("loginButton").onclick=login; $("loginPassword").onkeydown=e=>{if(e.key==="Enter")login();}; $("logoutButton").onclick=logout; $("refreshButton").onclick=()=>refreshCurrent(true);

  (async()=>{ const {data}=await sb.auth.getSession(); if(data?.session){state.user=data.session.user;await afterLogin();} })();
})();
