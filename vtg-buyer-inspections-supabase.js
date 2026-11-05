(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const esc=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let busy=false;
 async function clientForBuyer(){
  const auth=await window.VTG_AUTH_READY;
  const {data,error}=await auth.client.auth.getSession();if(error)throw error;
  if(!data.session)throw new Error('Your secure session has expired. Please sign in again.');
  const {data:profile,error:pe}=await auth.client.from('profiles').select('role,is_active').eq('id',data.session.user.id).single();
  if(pe)throw pe;if(profile.role!=='buyer'||!profile.is_active)throw new Error('An active buyer account is required.');
  return {client:auth.client,userId:data.session.user.id};
 }
 async function load(){
  const host=$('liveInspectionRows');if(!host||busy)return;
  if(new URLSearchParams(location.search).get('preview')==='1'){host.innerHTML='<div class="empty">Preview mode: sign in as a buyer to view private inspection requests and evidence.</div>';return;}
  busy=true;host.innerHTML='<div class="empty">Loading account-linked inspection requests…</div>';
  try{
   const {client}=await clientForBuyer();
   const {data:rows,error}=await client.from('vtg_inspection_requests')
    .select('id,reference,order_id,requested_by,supplier_id,inspection_type,requested_date,location,scope,status,inspector_id,findings,completed_at,created_at,country,city,supplier_name,product_name,category,quantity,service_level,buyer_fee_usd,payment_status,assigned_at,inspection_summary,buyer_decision,buyer_notes')
    .order('created_at',{ascending:false}).limit(100);
   if(error)throw error;
   if(!rows?.length){host.innerHTML='<div class="empty">No live inspection requests are linked to this buyer account yet. Local drafts are not submitted requests.</div>';return;}
   const cards=await Promise.all(rows.map(async x=>{
    const [{data:evidence,error:ee},{data:payments,error:pe}]=await Promise.all([
     client.from('vtg_inspection_evidence').select('id,evidence_type,file_name,mime_type,file_size_bytes,notes,created_at').eq('inspection_id',x.id).order('created_at',{ascending:false}).limit(50),
     client.from('vtg_inspection_payments').select('amount_usd,amount_ngn,currency,status,paid_at,provider_reference').eq('inspection_id',x.id).order('created_at',{ascending:false}).limit(5)
    ]);
    if(ee)throw ee;if(pe)throw pe;
    const fee=Number(x.buyer_fee_usd||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
    const evidenceHtml=(evidence||[]).length?(evidence||[]).map(v=>'<div class="small" style="padding:7px 0;border-top:1px solid var(--line)"><b>'+esc(v.evidence_type||'Evidence')+'</b> · '+esc(v.file_name||'File')+(v.notes?' — '+esc(v.notes):'')+'<br><span class="muted">'+esc(v.created_at?new Date(v.created_at).toLocaleString():'')+'</span></div>').join(''):'<p class="small muted">No evidence has been uploaded for this request yet.</p>';
    const paymentHtml=(payments||[]).length?(payments||[]).map(p=>'<p class="small">Payment: <b>'+esc(p.status||'unknown')+'</b> · '+esc(p.currency||'USD')+' '+esc(p.currency==='NGN'?Number(p.amount_ngn||0).toLocaleString():Number(p.amount_usd||0).toFixed(2))+(p.paid_at?' · Paid '+esc(new Date(p.paid_at).toLocaleDateString()):'')+'</p>').join(''):'<p class="small muted">No payment record is linked yet.</p>';
    return '<article class="row" style="display:block;padding:16px 0"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><strong>'+esc(x.reference||'Inspection request')+'</strong><p>'+esc(x.product_name||'Product not specified')+' · '+esc(x.quantity??'—')+' · '+esc([x.city,x.country].filter(Boolean).join(', '))+'</p><p class="small muted">Type: '+esc(x.inspection_type||x.service_level||'Not specified')+' · Requested: '+esc(x.requested_date|| (x.created_at?new Date(x.created_at).toLocaleDateString():'Date unavailable'))+'</p><p class="small muted">Supplier: '+esc(x.supplier_name||'Supplier linked to request')+'</p></div><span class="chip">'+esc(String(x.status||'pending').replaceAll('_',' ').toUpperCase())+'</span></div>'+
    '<p class="small">Inspection fee: USD '+fee+' · Payment status: '+esc(x.payment_status||'not recorded')+'</p>'+paymentHtml+
    (x.inspection_summary||x.findings?'<div class="notice"><b>Agent report</b><p>'+esc(x.inspection_summary||x.findings)+'</p>'+(x.completed_at?'<small>Completed '+esc(new Date(x.completed_at).toLocaleString())+'</small>':'')+'</div>':'<p class="small muted">Agent report has not been submitted yet.</p>')+
    '<div class="notice" style="margin-top:10px"><b>Evidence ('+(evidence||[]).length+')</b>'+evidenceHtml+'</div>'+
    (x.buyer_decision?'<p class="small">Buyer decision: '+esc(String(x.buyer_decision).replaceAll('_',' '))+(x.buyer_notes?' · '+esc(x.buyer_notes):'')+'</p>':'')+
    '<p class="small muted">Payment initiation and buyer decisions are not enabled in this Supabase read-only view.</p></article>';
   }));
   host.innerHTML=cards.join('');
  }catch(e){host.innerHTML='<div class="empty">Could not load live inspections. '+esc(e.message||'Supabase request failed')+' <button class="btn" type="button" id="retryLiveInspections">Try again</button></div>';$('retryLiveInspections')?.addEventListener('click',load);}
  finally{busy=false;}
 }
 window.VTGBuyerInspections={load};
 document.addEventListener('DOMContentLoaded',()=>{$('refreshLiveInspections')?.addEventListener('click',load);load();},{once:true});
})();