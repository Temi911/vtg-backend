/* VTG bank workspace: live, role-scoped trade finance view.
   Data comes only from the vtg_bank_workspace_overview() RPC (assigned LC cases of the signed-in VERIFIED bank).
   Review actions call vtg_bank_review_lc(); every outcome is audit-recorded and the buyer is notified.
   This page never issues an LC and never moves money. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const OPEN=['requested','under_review','documents_requested'];
const LABEL={requested:'New request',under_review:'Under review',documents_requested:'Documents requested',declined:'Declined'};
const PILL={requested:'amber',under_review:'blue',documents_requested:'amber',declined:''};
const REFRESH_MS=60000;
let client=null,data=null,busy=false,timer=null,selectedLc='',filter='open',query='',lcSelect='',loaded=false;
const M={cases:new Map(),docs:new Map(),ships:new Map(),events:new Map(),pay:new Map(),reviews:new Map()};

const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const money=(c,a)=>esc(c||'')+' '+num(a).toLocaleString('en-US',{maximumFractionDigits:2});
const day=d=>{if(!d)return '—';const t=new Date(d);return Number.isNaN(t.getTime())?'—':t.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})};
const when=d=>{if(!d)return '—';const t=new Date(d);return Number.isNaN(t.getTime())?'—':t.toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})};
const pill=s=>'<span class="pill '+(PILL[s]??'')+'">'+esc(LABEL[s]||s||'—')+'</span>';
const isOpen=c=>OPEN.includes(c.status);
const toast=m=>{const t=$('toast');if(!t)return;t.textContent=m;t.classList.add('show');clearTimeout(window.__vtgToast);window.__vtgToast=setTimeout(()=>t.classList.remove('show'),3600)};
const groupInto=(map,rows,key)=>{map.clear();(rows||[]).forEach(r=>{const k=r[key];if(!map.has(k))map.set(k,[]);map.get(k).push(r)})};
const daysUntil=d=>{if(!d)return null;const t=new Date(d+(String(d).length<=10?'T23:59:59':''));return Number.isNaN(t.getTime())?null:Math.ceil((t-Date.now())/864e5)};
const verifiedLike=s=>/verif|approv/i.test(String(s||''));
const rejectedLike=s=>/reject|declin|fail/i.test(String(s||''));

/* ---- derived readiness + risk from real records ---- */
function analyse(c){
  const docs=M.docs.get(c.order_id)||[],ships=M.ships.get(c.order_id)||[],pays=M.pay.get(c.order_id)||[];
  const total=num(c.quantity)*num(c.unit_price);
  const checks=[],flags=[];
  const buyerOk=verifiedLike(c.buyer_kyc),supOk=verifiedLike(c.supplier_verification);
  checks.push({key:'parties',ok:buyerOk&&supOk,title:'Applicant and beneficiary verified on VTG',
    detail:'Buyer KYC: '+(c.buyer_kyc||'not recorded')+' · Supplier verification: '+(c.supplier_verification||'not recorded')+'. Confirm identities through your own procedures too.'});
  let amountOk=true,amountDetail='LC '+money(c.currency,c.amount)+' · order value '+(total>0?money(c.order_currency||c.currency,total):'not available');
  if(total>0){if((c.order_currency||c.currency)!==c.currency){amountOk=false;amountDetail+=' · currency differs from the order'}else if(num(c.amount)>total*1.05){amountOk=false;amountDetail+=' · LC amount exceeds the order value'}}
  checks.push({key:'terms',ok:amountOk&&num(c.amount)>0,title:'Amount and currency consistent with the order',detail:amountDetail});
  const left=daysUntil(c.expiry_date);
  let datesOk=left!==null&&left>0,datesDetail=c.expiry_date?('Expiry '+day(c.expiry_date)+(left!==null?(left>0?' ('+left+' days left)':' (expired)'):'')):'No expiry date requested';
  if(c.latest_shipment_date){datesDetail+=' · latest shipment '+day(c.latest_shipment_date);if(c.expiry_date&&c.latest_shipment_date>c.expiry_date)datesOk=false}
  checks.push({key:'dates',ok:datesOk,title:'Expiry and shipment dates workable',detail:datesDetail});
  const bad=docs.filter(d=>rejectedLike(d.status)),good=docs.filter(d=>verifiedLike(d.status));
  checks.push({key:'docs',ok:docs.length>0&&!bad.length&&good.length>0,title:'Trade documents received and verified',
    detail:docs.length?(docs.length+' uploaded · '+good.length+' verified'+(bad.length?' · '+bad.length+' rejected':'')):'No documents uploaded for this order yet'});
  checks.push({key:'reviewed',ok:c.status!=='requested',title:'Bank review recorded',detail:c.status==='requested'?'No review outcome recorded yet':'Latest outcome: '+(LABEL[c.status]||c.status)});
  const open=isOpen(c);
  if(open){
    if(!buyerOk||!supOk)flags.push({level:'amber',text:'Buyer or supplier is not fully verified on VTG'});
    if(!amountOk)flags.push({level:'red',text:'LC amount or currency does not match the linked order'});
    if(left!==null&&left<=0)flags.push({level:'red',text:'Requested LC expiry has passed'});
    else if(left!==null&&left<=14)flags.push({level:'amber',text:'Requested expiry is within '+left+' days'});
    if(c.latest_shipment_date&&c.expiry_date&&c.latest_shipment_date>c.expiry_date)flags.push({level:'red',text:'Latest shipment date is after the LC expiry'});
    if(bad.length)flags.push({level:'red',text:bad.length+' document(s) rejected on this order'});
    if(c.status==='requested'&&(Date.now()-new Date(c.created_at).getTime())>2*864e5)flags.push({level:'amber',text:'Request has waited over 2 days for a first review'});
    if(c.status==='documents_requested'&&(Date.now()-new Date(c.updated_at||c.created_at).getTime())>7*864e5)flags.push({level:'amber',text:'Documents requested more than 7 days ago'});
  }
  ships.forEach(s=>{const eta=s.estimated_arrival?new Date(s.estimated_arrival).getTime():0;if(open&&eta&&eta<Date.now()&&!/deliver|arriv|complete/i.test(String(s.status||'')))flags.push({level:'amber',text:'Shipment '+(s.container_number||s.tracking_number||'')+' is past its estimated arrival'})});
  pays.forEach(p=>{if(/fail|declin|cancel/i.test(String(p.status||'')))flags.push({level:'amber',text:'Payment intent '+(p.purpose||'')+' is '+p.status})});
  return {checks,flags,docs,ships,pays,total,progress:checks.filter(x=>x.ok).length};
}
const A=new Map();
function derive(){
  groupInto(M.docs,data.documents,'order_id');groupInto(M.ships,data.shipments,'order_id');groupInto(M.pay,data.payment_intents,'order_id');
  groupInto(M.events,data.shipment_events,'shipment_id');groupInto(M.reviews,data.review_events,'lc_id');
  M.cases.clear();A.clear();
  (data.cases||[]).forEach(c=>{M.cases.set(c.id,c);A.set(c.id,analyse(c))});
}

/* ---- renderers ---- */
const set=(id,html)=>{const n=$(id);if(n)n.innerHTML=html};
const txt=(id,v)=>{const n=$(id);if(n)n.textContent=v};
const empty=m=>'<div class="empty">'+esc(m)+'</div>';
const parties=c=>esc(c.buyer_name||'Buyer')+' → '+esc(c.supplier_name||'Supplier');
const corridor=c=>esc(c.supplier_country||'—')+' → '+esc(c.buyer_country||'—');

function renderMetrics(){
  const cases=data.cases||[],open=cases.filter(isOpen);
  txt('mCases',open.length);txt('caseCount',cases.length);
  txt('mCasesFoot',open.filter(c=>c.status==='requested').length+' new · '+open.filter(c=>c.status==='under_review').length+' in review · '+open.filter(c=>c.status==='documents_requested').length+' awaiting documents');
  const docs=data.documents||[];
  txt('mDocs',docs.length);txt('mDocsFoot',docs.filter(d=>!verifiedLike(d.status)&&!rejectedLike(d.status)).length+' awaiting verification');
  const pays=data.payment_intents||[],sum={};
  pays.forEach(p=>{sum[p.currency]=(sum[p.currency]||0)+num(p.amount)});
  txt('mPayments',pays.length);txt('mPaymentsFoot',Object.keys(sum).length?Object.entries(sum).map(([k,v])=>k+' '+v.toLocaleString('en-US',{maximumFractionDigits:0})).join(' · ')+' (records only)':'No payment records yet');
  const flagCount=open.reduce((n,c)=>n+A.get(c.id).flags.length,0);
  txt('mRisk',flagCount);txt('mRiskFoot',flagCount?'Open cases need your attention':'No exceptions on open cases');
}
function renderRecent(){
  const rows=(data.cases||[]).slice(0,6).map(c=>'<tr data-case="'+esc(c.id)+'" style="cursor:pointer"><td><span class="primarytext">'+esc(c.reference)+'</span><span class="subtext">'+parties(c)+'</span></td><td>'+esc(c.order_reference||'—')+'</td><td>'+money(c.currency,c.amount)+'</td><td>'+pill(c.status)+'</td></tr>').join('');
  set('recentRows',rows||'<tr><td colspan="4">No LC requests have been assigned to your bank yet. They appear here as soon as a verified buyer sends one.</td></tr>');
}
function renderActions(){
  const tasks=[];
  (data.cases||[]).filter(isOpen).forEach(c=>{
    const a=A.get(c.id);
    if(c.status==='requested')tasks.push({c,icon:'!',t:'Start review of '+c.reference,s:money(c.currency,c.amount)+' · '+parties(c)+' · received '+when(c.created_at),w:0});
    else if(c.status==='documents_requested'&&a.docs.length)tasks.push({c,icon:'▧',t:'New documents on '+c.reference,s:a.docs.length+' document(s) uploaded for the order · check them against your request',w:2});
    a.flags.filter(f=>f.level==='red').forEach(f=>tasks.push({c,icon:'◇',t:c.reference+': '+f.text,s:'Open the case to review the evidence',w:1}));
  });
  tasks.sort((x,y)=>x.w-y.w);
  set('actionQueue',tasks.length?tasks.slice(0,8).map(k=>'<div class="queueitem"><div class="queueicon">'+k.icon+'</div><div style="flex:1"><b>'+esc(k.t)+'</b><small>'+k.s+'</small></div><button class="btn" data-case-open="'+esc(k.c.id)+'">Open</button></div>').join(''):empty('Nothing needs action right now.'));
}
function filteredCases(){
  const q=query.toLowerCase();
  return (data.cases||[]).filter(c=>(filter==='all'||(filter==='open'?isOpen(c):c.status===filter))&&(!q||[c.reference,c.order_reference,c.buyer_name,c.supplier_name,c.goods_summary,c.supplier_country,c.buyer_country].join(' ').toLowerCase().includes(q)));
}
function renderCases(){
  const list=filteredCases();
  set('caseRows',list.length?list.map(c=>'<tr data-case="'+esc(c.id)+'" style="cursor:pointer"><td><span class="primarytext">'+esc(c.reference)+'</span><span class="subtext">Order '+esc(c.order_reference||'—')+(c.goods_summary?' · '+esc(String(c.goods_summary).slice(0,60)):'')+'</span></td><td>'+parties(c)+'</td><td>'+corridor(c)+'</td><td>'+money(c.currency,c.amount)+'</td><td>'+pill(c.status)+'</td><td><button class="btn" data-case-open="'+esc(c.id)+'">Open</button></td></tr>').join(''):'<tr><td colspan="6">'+(data.cases?.length?'No cases match this filter.':'No LC requests assigned to your bank yet.')+'</td></tr>');
  txt('caseStatus',list.length+' of '+(data.cases||[]).length+' assigned cases shown');
}
function renderLC(){
  const open=(data.cases||[]).filter(isOpen);
  set('lcList',open.length?open.map(c=>{const a=A.get(c.id);return '<div class="queueitem"><div class="queueicon">▣</div><div style="flex:1"><b>'+esc(c.reference)+' · '+esc(c.order_reference||'')+'</b><small>'+money(c.currency,c.amount)+' · '+esc(c.preferred_lc_type||'LC type to be advised')+' · expires '+day(c.expiry_date)+'</small><small>'+a.progress+' of 5 checks pass '+pill(c.status)+'</small></div><button class="btn" data-case-open="'+esc(c.id)+'">Review</button></div>'}).join(''):empty('No open LC requests. Declined requests stay under “Trade finance cases”.'));
  const sel=$('lcCaseSelect');if(!sel)return;
  const all=data.cases||[];
  if(!all.some(c=>c.id===lcSelect))lcSelect=(open[0]||all[0]||{}).id||'';
  sel.innerHTML=all.length?all.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.reference)+' · '+esc(LABEL[c.status]||c.status)+'</option>').join(''):'<option value="">No LC cases yet</option>';
  sel.value=lcSelect;sel.disabled=!all.length;
  const a=lcSelect?A.get(lcSelect):null;
  txt('lcProgress',a?a.progress+' of 5':'0 of 5');
  set('lcChecks',a?a.checks.map(k=>'<div class="check"><span aria-hidden="true" style="font-weight:800;color:var(--'+(k.ok?'green':'amber')+')">'+(k.ok?'✓':'!')+'</span><span><b>'+esc(k.title)+'</b><small>'+esc(k.detail)+'</small></span></div>').join(''):empty('Select a case to see its readiness checks.'));
}
function docRow(d){
  return '<div class="queueitem"><div style="flex:1"><b>'+esc(d.file_name||'Trade document')+'</b><small>'+esc(d.document_type||'Document')+' · '+esc(d.status||'pending')+' · uploaded '+day(d.created_at)+(d.review_notes?' · '+esc(d.review_notes):'')+'</small></div><button class="btn" data-doc-path="'+esc(d.storage_path)+'" data-doc-name="'+esc(d.file_name||'VTG-trade-document')+'">Secure download</button></div>';
}
function renderDocs(){
  const cases=(data.cases||[]).filter(c=>(M.docs.get(c.order_id)||[]).length);
  set('docQueue',cases.length?cases.map(c=>'<article class="panel" style="margin:0 0 14px;padding:14px"><div class="panelhead"><div><b>'+esc(c.reference)+' · Order '+esc(c.order_reference||'')+'</b><small class="subtext">'+parties(c)+'</small></div>'+pill(c.status)+'</div>'+M.docs.get(c.order_id).map(docRow).join('')+'</article>').join(''):empty('No documents have been uploaded for your assigned orders yet. Use “Request documents” on a case to ask the buyer.'));
}
function renderPayments(){
  const rows=(data.payment_intents||[]).map(p=>{const c=(data.cases||[]).find(x=>x.order_id===p.order_id);return '<tr><td><b>'+esc(c?.reference||'—')+'</b><span class="subtext">Order '+esc(c?.order_reference||'—')+'</span></td><td>'+esc(p.purpose||'—')+'</td><td>'+esc(p.provider||'Not set')+'</td><td>'+money(p.currency,p.amount)+'</td><td><span class="pill">'+esc(p.status||'—')+'</span></td></tr>'}).join('');
  set('paymentRows',rows||'<tr><td colspan="5">No payment records are linked to your assigned orders yet.</td></tr>');
}
function bar(label,value,max,right){return '<div class="barrow" style="grid-template-columns:130px 1fr 110px"><span>'+esc(label)+'</span><div class="bartrack"><div class="barfill" style="width:'+Math.max(2,Math.round(value/(max||1)*100))+'%"></div></div><b>'+esc(right)+'</b></div>'}
function renderAnalytics(){
  const cases=data.cases||[],open=cases.filter(isOpen);
  if(!cases.length){set('fxBody',empty('Analytics appear once LC requests are assigned to your bank.'));return}
  const cur={};open.forEach(c=>{cur[c.currency]=(cur[c.currency]||0)+num(c.amount)});
  const curMax=Math.max(...Object.values(cur),1);
  const st={};cases.forEach(c=>{st[c.status]=(st[c.status]||0)+1});
  const stMax=Math.max(...Object.values(st),1);
  const lad=[['Expired',0],['Next 30 days',0],['31–60 days',0],['61–90 days',0],['Later',0],['No expiry',0]];
  open.forEach(c=>{const d=daysUntil(c.expiry_date);const i=d===null?5:d<=0?0:d<=30?1:d<=60?2:d<=90?3:4;lad[i][1]++});
  const cor={};cases.forEach(c=>{const k=(c.supplier_country||'—')+' → '+(c.buyer_country||'—');cor[k]=(cor[k]||0)+1});
  const corMax=Math.max(...Object.values(cor),1),ladMax=Math.max(...lad.map(x=>x[1]),1);
  set('fxBody','<div class="grid2"><section class="panel"><div class="panelhead"><h2>Open exposure by currency</h2><span class="pill blue">Requested LC amounts</span></div>'+Object.entries(cur).map(([k,v])=>bar(k,v,curMax,v.toLocaleString('en-US',{maximumFractionDigits:0}))).join('')+'<p class="footnote">Sum of requested LC amounts on open cases, per currency. No FX conversion is applied.</p></section>'+
    '<section class="panel"><div class="panelhead"><h2>Cases by status</h2></div>'+Object.entries(st).map(([k,v])=>bar(LABEL[k]||k,v,stMax,String(v))).join('')+'</section></div>'+
    '<div class="grid2" style="margin-top:16px"><section class="panel"><div class="panelhead"><h2>Requested expiry ladder</h2><span class="pill">Open cases</span></div>'+lad.map(x=>bar(x[0],x[1],ladMax,String(x[1]))).join('')+'</section>'+
    '<section class="panel"><div class="panelhead"><h2>Corridors</h2></div>'+Object.entries(cor).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>bar(k,v,corMax,String(v))).join('')+'<p class="footnote">Supplier country → buyer country, from the parties’ VTG profiles.</p></section></div>');
}
function renderShipments(){
  const ships=data.shipments||[];
  set('shipList',ships.length?ships.map(s=>{const c=(data.cases||[]).find(x=>x.order_id===s.order_id);const ev=(M.events.get(s.id)||[]).slice(0,6);
    return '<article class="panel" style="margin:0 0 14px;padding:14px"><div class="panelhead"><div><b>'+esc(c?.reference||'—')+' · Order '+esc(c?.order_reference||'—')+'</b><small class="subtext">'+esc(s.carrier||'Carrier pending')+' · '+esc(s.container_number||s.tracking_number||'No tracking reference')+'</small></div><span class="pill blue">'+esc(s.status||'pending')+'</span></div>'+
    '<div class="barrow" style="grid-template-columns:1fr 60px"><div class="bartrack"><div class="barfill" style="width:'+Math.max(2,Math.min(100,num(s.progress_percent)))+'%"></div></div><b>'+Math.round(num(s.progress_percent))+'%</b></div>'+
    '<small class="subtext">'+esc(s.origin_port||'Origin pending')+' → '+esc(s.destination_port||'Destination pending')+' · now: '+esc(s.current_location||'not reported')+' · ETA '+day(s.estimated_arrival)+'</small>'+
    (ev.length?'<div class="timeline" style="margin-top:12px">'+ev.map(e=>'<div class="event"><b>'+esc(e.event_type||'Update')+'</b><small>'+esc(e.description||'')+(e.location?' · '+esc(e.location):'')+' · '+when(e.event_time)+'</small></div>').join('')+'</div>':'')+'</article>'}).join(''):empty('No shipments are linked to your assigned LC cases yet. Tracking appears when the supplier or VTG logistics records them.'));
}
function renderRisk(){
  const rows=[];(data.cases||[]).filter(isOpen).forEach(c=>A.get(c.id).flags.forEach(f=>rows.push({c,f})));
  rows.sort((a,b)=>(a.f.level==='red'?0:1)-(b.f.level==='red'?0:1));
  set('riskList',rows.length?rows.map(r=>'<div class="queueitem"><div class="queueicon" style="color:var(--'+(r.f.level==='red'?'accent':'amber')+')">◇</div><div style="flex:1"><b>'+esc(r.c.reference)+'</b><small>'+esc(r.f.text)+'</small></div><button class="btn" data-case-open="'+esc(r.c.id)+'">Open</button></div>').join(''):empty('No exceptions on open cases. Flags are computed from the case, order, documents and shipments; they are prompts for your own review, not a compliance decision.'));
  const ev=data.review_events||[];
  set('auditList',ev.length?ev.slice(0,40).map(e=>{const c=M.cases.get(e.lc_id);return '<div class="queueitem"><div class="queueicon">◷</div><div style="flex:1;min-width:0"><b>'+esc(LABEL[e.status]||e.status)+' · '+esc(c?.reference||'LC')+'</b><small>'+when(e.created_at)+(e.note?' · '+esc(e.note):'')+'</small></div></div>'}).join(''):empty('No review actions recorded yet.'));
}
function renderProfile(){
  const b=data.bank||{};
  const row=(k,v)=>'<div class="queueitem"><div style="flex:1"><small>'+esc(k)+'</small><b>'+esc(v||'—')+'</b></div></div>';
  set('bankProfileLive',row('Institution',b.bank_name)+row('Branch',b.branch_name)+row('SWIFT / BIC',b.swift_code)+row('Authorised officer',[b.officer_name,b.officer_title].filter(Boolean).join(' · '))+row('VTG verification',(b.verification_status||'')+(b.verified_at?' since '+day(b.verified_at):'')));
}
function fillMessageCases(){const mc=$('messageCase');if(!mc)return;mc.innerHTML=(data?.cases||[]).map(c=>'<option value="'+esc(c.id)+'">'+esc(c.reference)+'</option>').join('')}
function renderAll(){
  derive();renderMetrics();renderRecent();renderActions();renderCases();renderLC();renderDocs();renderPayments();renderAnalytics();renderShipments();renderRisk();renderProfile();fillMessageCases();
  txt('dataLabel','LIVE · updated '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}));
  if(selectedLc&&!$('caseModal').classList.contains('hidden'))showCase(selectedLc,true);
}

/* ---- case detail + review ---- */
function showCase(id,keepNote){
  const c=M.cases.get(id);if(!c)return;selectedLc=id;
  const a=A.get(id),rev=M.reviews.get(id)||[],keep=keepNote?($('reviewNote')?.value||''):'';
  txt('modalTitle',c.reference+' · '+(LABEL[c.status]||c.status));
  const kv=(k,v)=>'<div><small class="subtext">'+esc(k)+'</small><b style="display:block">'+(v||'—')+'</b></div>';
  const body=
   '<div class="two" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:14px">'+
   kv('Buyer (applicant)',esc(c.buyer_name)+(c.buyer_country?' · '+esc(c.buyer_country):''))+kv('Supplier (beneficiary)',esc(c.supplier_name)+(c.supplier_country?' · '+esc(c.supplier_country):''))+
   kv('LC amount',money(c.currency,c.amount))+kv('Requested expiry',day(c.expiry_date))+
   kv('Order',esc(c.order_reference)+' · '+esc(c.order_status))+kv('Order value',a.total>0?money(c.order_currency||c.currency,a.total)+' ('+esc(c.quantity)+' × '+num(c.unit_price).toLocaleString('en-US')+')':'—')+
   kv('Incoterm / route',esc(c.incoterm||'—')+' · '+esc(c.origin_port||'—')+' → '+esc(c.destination_port||'—'))+kv('LC type requested',esc(c.preferred_lc_type||'To be advised'))+
   kv('Named beneficiary',esc(c.beneficiary_name||'—'))+kv('Latest shipment date',day(c.latest_shipment_date))+'</div>'+
   (c.goods_summary?'<p><b>Goods:</b> '+esc(c.goods_summary)+'</p>':'')+(c.supporting_notes?'<p><b>Buyer notes:</b> '+esc(c.supporting_notes)+'</p>':'')+
   '<h3 style="margin:14px 0 4px">Readiness checks · '+a.progress+' of 5</h3>'+a.checks.map(k=>'<div class="check"><span aria-hidden="true" style="font-weight:800;color:var(--'+(k.ok?'green':'amber')+')">'+(k.ok?'✓':'!')+'</span><span><b>'+esc(k.title)+'</b><small>'+esc(k.detail)+'</small></span></div>').join('')+
   (a.flags.length?'<h3 style="margin:14px 0 4px">Exceptions</h3>'+a.flags.map(f=>'<div class="noticebar">'+esc(f.text)+'</div>').join(''):'')+
   '<h3 style="margin:14px 0 4px">Documents</h3>'+(a.docs.length?a.docs.map(docRow).join(''):empty('No documents uploaded yet.'))+
   '<h3 style="margin:14px 0 4px">Review history</h3>'+(rev.length?rev.map(e=>'<div class="queueitem"><div class="queueicon">◷</div><div style="flex:1"><b>'+esc(LABEL[e.status]||e.status)+'</b><small>'+when(e.created_at)+(e.note?' · '+esc(e.note):'')+'</small></div></div>').join(''):empty('No review recorded yet.'))+
   '<h3 style="margin:14px 0 4px">Record a review outcome</h3><div class="field"><label for="reviewNote">Note for the audit record and the buyer (required to decline or request documents)</label><textarea id="reviewNote" maxlength="1000" rows="3" placeholder="e.g. Please upload the signed proforma invoice and the packing list."></textarea></div>'+
   '<div class="actions" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-review="under_review">Start / continue review</button><button class="btn" data-review="documents_requested">Request documents</button><button class="btn alt" data-review="declined">Decline request</button></div>'+
   '<p class="footnote">The buyer is notified of each outcome. VTG does not issue letters of credit; issuance and funding stay with your institution’s own systems.</p>';
  set('caseDetails',body);
  const n=$('reviewNote');if(n)n.value=keep;
  $('caseModal').classList.remove('hidden');
}
function closeCase(){$('caseModal').classList.add('hidden');selectedLc=''}
async function review(btn){
  const status=btn.dataset.review,note=($('reviewNote').value||'').trim();
  if((status==='declined'||status==='documents_requested')&&note.length<5){toast('Add a short note so the buyer knows what to do.');$('reviewNote').focus();return}
  if(status==='declined'&&!confirm('Decline this LC request? The buyer will be notified.'))return;
  const all=document.querySelectorAll('[data-review]');all.forEach(b=>b.disabled=true);
  try{
    const {error}=await client.rpc('vtg_bank_review_lc',{p_lc_id:selectedLc,p_status:status,p_note:note||null});
    if(error)throw error;
    toast('Review recorded. The buyer has been notified.');
    $('reviewNote').value='';
    await load(true);
  }catch(e){toast(e.message||'The review could not be recorded.');all.forEach(b=>b.disabled=false)}
}
async function signedDocument(path,name){
  if(!client||!path)return;
  const {data:s,error}=await client.storage.from('vtg-trade-documents').createSignedUrl(path,60);
  if(error||!s?.signedUrl){toast('This bank account cannot open that private file.');return}
  const a=document.createElement('a');a.href=s.signedUrl;a.target='_blank';a.rel='noopener';a.download=name||'VTG-trade-document';a.click();
}
function exportCsv(){
  const rows=[['Reference','Order','Buyer','Supplier','Currency','Amount','Status','Expiry','Received']];
  (data?.cases||[]).forEach(c=>rows.push([c.reference,c.order_reference,c.buyer_name,c.supplier_name,c.currency,c.amount,c.status,c.expiry_date||'',c.created_at]));
  const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""').replace(/^([=+\-@])/,"'$1")+'"').join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='vtg-bank-assigned-cases.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}

/* ---- loading ---- */
const LIVE_IDS=['recentRows','actionQueue','caseRows','lcList','docQueue','paymentRows','fxBody','shipList','riskList','auditList','bankProfileLive'];
function showStatus(msg,bad){
  txt('dataLabel',bad?'UNAVAILABLE':'LIVE');
  const n=$('globalNotice');if(n){n.innerHTML='<strong>'+(bad?'Workspace unavailable.':'Live workspace.')+'</strong> '+esc(msg);n.dataset.state=bad?'error':'info'}
  if(bad)LIVE_IDS.forEach(id=>{const e=$(id);if(e)e.innerHTML=e.tagName==='TBODY'?'<tr><td colspan="6">'+esc(msg)+'</td></tr>':empty(msg)});
}
async function load(silent){
  if(busy||!client)return;busy=true;
  const b=$('vtgBankLiveRefresh');if(b)b.disabled=true;
  try{
    const {data:r,error}=await client.rpc('vtg_bank_workspace_overview');
    if(error)throw error;
    data=r;loaded=true;renderAll();
    if(!silent)showStatus('Showing only LC requests assigned to your verified bank. Review outcomes are recorded for audit and sent to the buyer. VTG does not issue LCs or move funds here.');
  }catch(e){
    if(!loaded)showStatus(e.code==='42501'?'An active, VTG-verified bank trade account is required.':(e.message||'Bank records could not be loaded.'),true);
    else toast('Refresh failed: '+(e.message||'network error'));
  }finally{busy=false;if(b)b.disabled=false}
}
async function init(){
  if(!$('caseRows'))return;
  LIVE_IDS.forEach(id=>{const e=$(id);if(e&&!e.innerHTML.trim())e.innerHTML=empty('Loading live records…')});
  try{
    const auth=await window.VTG_AUTH_READY;
    client=auth?.client||window.VTGAuth?.client||window.VTG_SUPABASE;
    if(!client)throw new Error('Secure VTG sign-in is unavailable.');
    const {data:s,error}=await client.auth.getSession();if(error)throw error;
    if(!s.session)throw new Error('Sign in with your VTG bank account to view assigned cases.');
    const {data:p,error:pe}=await client.from('profiles').select('role,is_active,account_environment').eq('id',s.session.user.id).maybeSingle();
    if(pe)throw pe;
    if(p?.role!=='bank'||p?.is_active!==true||p?.account_environment!=='trade')throw new Error('An active bank trade account is required.');
    const {data:bp,error:be}=await client.from('bank_profiles').select('verification_status').eq('user_id',s.session.user.id).maybeSingle();
    if(be)throw be;
    if(bp?.verification_status!=='verified'){showStatus('Your bank account is awaiting VTG approval. Assigned LC requests appear here once it is verified.',true);return}
    await load(false);
    clearInterval(timer);timer=setInterval(()=>{if(!document.hidden)load(true)},REFRESH_MS);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&loaded)load(true)});
  }catch(e){showStatus(e.message||'Bank workspace unavailable.',true)}
}

document.addEventListener('click',e=>{
  const d=e.target.closest('[data-doc-path]');if(d){signedDocument(d.dataset.docPath,d.dataset.docName);return}
  const r=e.target.closest('[data-review]');if(r&&selectedLc){review(r);return}
  const o=e.target.closest('[data-case-open]');if(o){showCase(o.dataset.caseOpen);return}
  const tr=e.target.closest('tr[data-case]');if(tr&&!e.target.closest('button')){showCase(tr.dataset.case);return}
  if(e.target.id==='closeModal'||e.target===$('caseModal'))closeCase();
  if(e.target.id==='vtgBankLiveRefresh')load(false);
  if(e.target.id==='exportWorkspace')exportCsv();
  if(e.target.id==='exportAudit'){const rows=(data?.review_events||[]).map(x=>({at:x.created_at,lc:M.cases.get(x.lc_id)?.reference,outcome:x.status,note:x.note}));const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(rows,null,2)],{type:'application/json'}));a.download='vtg-bank-review-log.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&selectedLc)closeCase()});
document.addEventListener('input',e=>{if(e.target.id==='caseSearch'){query=e.target.value||'';if(data)renderCases()}});
document.addEventListener('change',e=>{
  if(e.target.id==='caseFilter'){filter=e.target.value;if(data)renderCases()}
  if(e.target.id==='lcCaseSelect'){lcSelect=e.target.value;if(data)renderLC()}
});
window.VTGBankLive={reload:()=>load(false)};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();
