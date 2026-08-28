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
  const state = {
    page:"dashboard", user:null, mode:{oozySales:"day",oozyPurchase:"day",kcem:"day",uwash:"day"},
    period:{oozySales:todayKst(),oozyPurchase:todayKst(),kcem:todayKst(),uwash:todayKst()}, uwashLedger:"supply",
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

  async function loadOozySales(){
    const key="oozySales", mode=state.mode[key], r=rangeFor(mode,mode==="day"?state.period[key]:mode==="month"?state.period[key].slice(0,7):state.period[key].slice(0,4));
    let rows; try{rows=await selectRange("oozy_daily_sales","business_date",r);}catch(e){$("oozySalesBody").innerHTML=errorBox(e.message);return;}
    const total=sum(rows,"total"), pos=sum(rows,"pos_total"), delivery=sum(rows,"delivery_total"), card=sum(rows,"card"), cash=sum(rows,"cash");
    kpis($("oozySalesKpis"),[{label:"우지 총매출",value:total},{label:"POS",value:pos},{label:"배달",value:delivery},{label:"카드 + 현금",value:card+cash}]);
    if(mode==="day"){
      const x=rows[0]||{}; $("oozySalesBody").innerHTML=`<div class="period-summary"><div class="mini-card"><span>카드</span><strong>${won(x.card)}</strong></div><div class="mini-card"><span>현금</span><strong>${won(x.cash)}</strong></div><div class="mini-card"><span>배달</span><strong>${won(x.delivery_total)}</strong></div></div><div class="table-wrap"><table class="table"><thead><tr><th>항목</th><th class="num">금액</th></tr></thead><tbody><tr><td>배달의민족</td><td class="num">${won(x.baemin)}</td></tr><tr><td>쿠팡이츠</td><td class="num">${won(x.coupang)}</td></tr><tr><td>OOZY 오더</td><td class="num">${won(x.oozy_order)}</td></tr><tr><td>기타 배달</td><td class="num">${won(x.other_delivery)}</td></tr><tr class="total-row"><td>우지 총매출</td><td class="num">${won(x.total)}</td></tr></tbody></table></div>`;
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
    $("oozyPurchaseBody").innerHTML=rows.length?`<div class="table-wrap"><table class="table"><thead><tr><th>날짜</th><th class="num">SPC</th><th class="num">본사</th><th class="num">총 매입</th><th class="num">매출</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.business_date)}</td><td class="num">${won(x.purchase_spc_total)}</td><td class="num">${won(x.purchase_headquarters_total)}</td><td class="num"><strong>${won(x.purchase_total)}</strong></td><td class="num">${won(x.total)}</td></tr>`).join("")}<tr class="total-row"><td>합계</td><td class="num">${won(spc)}</td><td class="num">${won(hq)}</td><td class="num">${won(total)}</td><td class="num">${won(sum(rows,"total"))}</td></tr></tbody></table></div>`:empty();
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

  async function refreshCurrent(showToast=false,background=false){
    if(state.refreshing) return; state.refreshing=true; if(!background)setRefresh("새로고침 중");
    try{
      if(state.page==="dashboard") await loadDashboard();
      else if(state.page==="oozySales") await loadOozySales();
      else if(state.page==="oozyPurchase") await loadOozyPurchase();
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
  $("loginButton").onclick=login; $("loginPassword").onkeydown=e=>{if(e.key==="Enter")login();}; $("logoutButton").onclick=logout; $("refreshButton").onclick=()=>refreshCurrent(true);

  (async()=>{ const {data}=await sb.auth.getSession(); if(data?.session){state.user=data.session.user;await afterLogin();} })();
})();
