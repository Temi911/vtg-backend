(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const KEY='vtg-buyer-verification-drafts-v1';
 const esc=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let busy=false;
 const preview=()=>new URLSearchParams(location.search).get('preview')==='1';
 function readDrafts(){try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v:[]}catch(_){return[]}}
 function writeDrafts(rows){localStorage.setItem(KEY,JSON.stringify(rows));}
 function selectedChecks(form){const el=form.elements.checks;return el?.multiple?[...el.selectedOptions].map(o=>o.value):[el?.value].filter(Boolean)}
 function renderDrafts(){
  const host=$('verifyRows');if(!host)return;
  const rows=readDrafts();
  host.innerHTML=rows.length?rows.map(d=>'<article class="row" style="display:block;padding:12px 0"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><strong>'+esc(d.product)+'</strong><span class="chip">Local draft</span></div><p class="small muted">Supplier / factory: '+esc(d.supplier||'Not specified')+'</p><p class="small">Checks: '+esc((d.checks||[]).join(', '))+'</p>'+(d.notes?'<p class="small">'+esc(d.notes)+'</p>':'')+'<p class="small muted">Saved '+esc(new Date(d.updatedAt||d.createdAt).toLocaleString())+' · This draft is stored only in this browser.</p><button class="btn" type="button" data-delete-draft="'+esc(d.id)+'">Delete draft</button></article>').join(''):'<div class="empty">No verification drafts saved in this browser yet.</div>';
  host.querySelectorAll('[data-delete-draft]').forEach(b=>b.addEventListener('click',()=>{writeDrafts(readDrafts().filter(x=>x.id!==b.dataset.deleteDraft));renderDrafts()}));
 }
 function bindDraftForm(){
  const form=$('verifyForm');if(!form||form.dataset.bound)return;form.dataset.bound='1';
  form.addEventListener('submit',e=>{
   e.preventDefault();const fd=new FormData(form),product=String(fd.get('product')||'').trim();
   if(!product){form.elements.product.focus();return;}
   const rows=readDrafts(),now=new Date().toISOString();
   rows.unshift({id:(crypto.randomUUID?crypto.randomUUID():'draft-'+Date.now()),product,supplier:String(fd.get('supplier')||'').trim(),checks:selectedChecks(form),notes:String(fd.get('notes')||'').trim(),createdAt:now,updatedAt:now});
   try{writeDrafts(rows.slice(0,100));form.reset();renderDrafts();const notice=document.querySelector('#verifyForm')?.parentElement?.querySelector('.notice');if(notice)notice.textContent='Draft saved in this browser only. No inspection has been booked, no inspector contacted and no fee charged.';}
   catch(_){const notice=document.querySelector('#verifyForm')?.parentElement?.querySelector('.notice');if(notice)notice.textContent='Could not save this draft in browser storage. Check available browser storage and try again.';}
  });
 }
 async function clientForBuyer(){
  let auth;
  try{auth=await window.VTG_AUTH_READY;}catch(err){if(window.VTG_SUPABASE)auth={client:window.VTG_SUPABASE};else throw err;}
  const client=auth?.client||window.VTG_SUPABASE;if(!client)throw new Error('VTG secure sign-in service is unavailable. Refresh the page and try again.');
  const {data,error}=await client.auth.getSession();if(error)throw error;
  if(!data.session)throw new Error('Sign in with your buyer account to view live inspection requests.');
  const {data:profile,error:pe}=await client.from('profiles').select('role,is_active').eq('id',data.session.user.id).maybeSingle();
  if(pe)throw pe;if(!profile)throw new Error('Your VTG buyer profile could not be found. Sign out and sign in again, or contact VTG support.');
  if(profile.role!=='buyer'||!profile.is_active)throw new Error('An active buyer account is required to view these requests.');
  return {client,userId:data.session.user.id};
 }
 async function load(){
  const host=$('liveInspectionRows');if(!host||busy)return;
  if(preview()){host.innerHTML='<div class="empty">Preview mode: sign in as a buyer to view private inspection requests, fees, agent reports and evidence.</div>';return;}
  busy=true;host.innerHTML='<div class="empty">Loading account-linked inspection requests…</div>';
  try{
   const {client}=await clientForBuyer();
   const {data:rows,error}=await client.from('vtg_inspection_requests')
    .select('id,reference,order_id,requested_by,supplier_id,inspection_type,requested_date,location,scope,status,inspector_id,findings,completed_at,created_at,country,city,supplier_name,product_name,category,quantity,service_level,buyer_fee_usd,payment_status,assigned_at,inspection_summary,buyer_decision,buyer_notes')
    .order('created_at',{ascending:false}).limit(100);
   if(error)throw error;
   if(!rows?.length){host.innerHTML='<div class="empty">No live inspection requests are linked to this buyer account yet. Your local drafts are kept separately and have not been submitted.</div>';return;}
   const cards=await Promise.all(rows.map(async x=>{
    const [{data:evidence,error:ee},{data:payments,error:pe}]=await Promise.all([
     client.from('vtg_inspection_evidence').select('id,evidence_type,file_name,mime_type,file_size_bytes,notes,created_at').eq('inspection_id',x.id).order('created_at',{ascending:false}).limit(50),
     client.from('vtg_inspection_payments').select('amount_usd,amount_ngn,currency,status,paid_at,provider_reference').eq('inspection_id',x.id).order('created_at',{ascending:false}).limit(5)
    ]);
    if(ee)throw ee;if(pe)throw pe;
    const fee=Number(x.buyer_fee_usd||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
    const evidenceHtml=(evidence||[]).length?evidence.map(v=>'<div class="small" style="padding:7px 0;border-top:1px solid var(--line)"><b>'+esc(v.evidence_type||'Evidence')+'</b> · '+esc(v.file_name||'File')+(v.notes?' — '+esc(v.notes):'')+'<br><span class="muted">'+esc(v.created_at?new Date(v.created_at).toLocaleString():'')+'</span></div>').join(''):'<p class="small muted">No evidence has been uploaded for this request yet.</p>';
    const paymentHtml=(payments||[]).length?payments.map(p=>'<p class="small">Payment: <b>'+esc(p.status||'unknown')+'</b> · '+esc(p.currency||'USD')+' '+esc(p.currency==='NGN'?Number(p.amount_ngn||0).toLocaleString():Number(p.amount_usd||0).toFixed(2))+(p.paid_at?' · Paid '+esc(new Date(p.paid_at).toLocaleDateString()):'')+'</p>').join(''):'<p class="small muted">No payment record is linked yet.</p>';
    return '<article class="row" style="display:block;padding:16px 0"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><strong>'+esc(x.reference||'Inspection request')+'</strong><p>'+esc(x.product_name||'Product not specified')+' · '+esc(x.quantity??'—')+' · '+esc([x.city,x.country].filter(Boolean).join(', '))+'</p><p class="small muted">Type: '+esc(x.inspection_type||x.service_level||'Not specified')+' · Requested: '+esc(x.requested_date||(x.created_at?new Date(x.created_at).toLocaleDateString():'Date unavailable'))+'</p><p class="small muted">Supplier: '+esc(x.supplier_name||'Supplier linked to request')+'</p></div><span class="chip">'+esc(String(x.status||'pending').replaceAll('_',' ').toUpperCase())+'</span></div>'+
    '<p class="small">Inspection fee: USD '+fee+' · Payment status: '+esc(x.payment_status||'not recorded')+'</p>'+paymentHtml+
    (x.inspection_summary||x.findings?'<div class="notice"><b>Agent report</b><p>'+esc(x.inspection_summary||x.findings)+'</p>'+(x.completed_at?'<small>Completed '+esc(new Date(x.completed_at).toLocaleString())+'</small>':'')+'</div>':'<p class="small muted">Agent report has not been submitted yet.</p>')+
    '<div class="notice" style="margin-top:10px"><b>Evidence ('+(evidence||[]).length+')</b>'+evidenceHtml+'</div>'+
    (x.buyer_decision?'<p class="small">Buyer decision: '+esc(String(x.buyer_decision).replaceAll('_',' '))+(x.buyer_notes?' · '+esc(x.buyer_notes):'')+'</p>':'')+
    '<p class="small muted">This view is read-only. No inspection is booked and no payment or buyer decision is initiated here.</p></article>';
   }));
   host.innerHTML=cards.join('');
  }catch(e){const msg=String(e?.message||'Supabase request failed');host.innerHTML='<div class="empty">Could not load live inspections. '+esc(msg)+' <button class="btn" type="button" id="retryLiveInspections">Try again</button></div>';$('retryLiveInspections')?.addEventListener('click',load);}
  finally{busy=false;}
 }
 window.VTGBuyerInspections={load,renderDrafts};
 document.addEventListener('DOMContentLoaded',()=>{bindDraftForm();renderDrafts();$('refreshLiveInspections')?.addEventListener('click',load);load();},{once:true});
})();