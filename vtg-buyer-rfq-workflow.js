(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let client=null,buyerId=null,drafts=[],requests=[],suppliers=[],channel=null;
function notice(message,isError=false){const n=$('rfqSaveNotice');if(n){n.textContent=message;n.style.color=isError?'var(--danger,#b42318)':'';}}
async function session(){
 const auth=await window.VTG_AUTH_READY;
 if(!auth?.client)throw new Error('Secure sign-in is not ready. Refresh and try again.');
 const {data,error}=await auth.client.auth.getSession();if(error)throw error;
 if(!data.session)throw new Error('Sign in to create and publish RFQs.');
 const p=await auth.client.from('profiles').select('role,is_active,account_environment').eq('id',data.session.user.id).single();
 if(p.error)throw p.error;
 if(p.data.role!=='buyer'||!p.data.is_active||p.data.account_environment!=='trade')throw new Error('An active buyer trade account is required.');
 client=auth.client;buyerId=data.session.user.id;
}
function values(form){
 const v=Object.fromEntries(new FormData(form));
 const deadline=v.quotation_deadline?new Date(v.quotation_deadline).toISOString():null;
 return {
  title:String(v.title||'').trim()||null,product:String(v.product||'').trim(),
  category:String(v.category||'').trim()||null,sourcing_market:String(v.origin||'Open to options'),
  quantity:Number(v.quantity),unit:String(v.unit||'units'),destination:String(v.destination||'').trim(),
  destination_port:String(v.destination_port||'').trim()||null,
  specifications:String(v.details||'').trim()||null,incoterm:String(v.incoterm||'').trim()||null,
  quotation_deadline:deadline,shipment_window_start:String(v.shipment_window_start||'')||null,
  shipment_window_end:String(v.shipment_window_end||'')||null,
  budget_min:v.budget_min===''||v.budget_min===undefined?null:Number(v.budget_min),
  budget_max:v.budget_max===''||v.budget_max===undefined?null:Number(v.budget_max),
  required_certifications:String(v.required_certifications||'').trim()||null,
  audience:String(v.audience||'open_market'),
  buyer_confidential:v.buyer_confidential==='true'
 };
}
function selectedSuppliers(){return [...document.querySelectorAll('input[name="rfq_supplier_ids"]:checked')].map(x=>x.value);}
function renderDrafts(){
 const host=$('rfqRows'),total=$('rfqTotal'),count=$('rfqCount'),stat=$('statRfqs');
 if(total)total.textContent=String(drafts.length);if(count)count.textContent=String(drafts.length);if(stat)stat.textContent=String(drafts.length);
 if(!host)return;
 host.innerHTML=drafts.length?drafts.map(d=>'<article class="rfqRecord"><div class="rfqRecordTop"><strong class="rfqRecordTitle">'+esc(d.rfq_data?.title||d.product)+'</strong><span class="rfqStatus">PRIVATE DRAFT</span></div><p class="rfqRecordMeta">'+esc(d.quantity)+' '+esc(d.rfq_data?.unit||'units')+' · '+esc(d.sourcing_country)+' → '+esc(d.destination)+' · '+new Date(d.created_at).toLocaleDateString()+'</p>'+(d.specifications?'<p class="rfqRecordDetails">'+esc(d.specifications)+'</p>':'')+'<button class="btn" type="button" data-delete-rfq-draft="'+esc(d.id)+'">Remove draft</button></article>').join(''):'<div class="empty">No saved RFQ drafts yet.</div>';
}
function quoteGrid(r){
 const qs=r.supplier_trade_quotations||[];
 if(!qs.length)return '<p class="rfqRecordMeta">No supplier quotations received yet.</p>';
 return '<div style="overflow-x:auto;margin-top:12px"><table style="width:100%;border-collapse:collapse;min-width:650px;font-size:12px"><thead><tr><th style="text-align:left;padding:9px;border-bottom:1px solid var(--line)">Supplier</th><th style="text-align:left;padding:9px;border-bottom:1px solid var(--line)">Unit price</th><th style="text-align:left;padding:9px;border-bottom:1px solid var(--line)">Incoterm</th><th style="text-align:left;padding:9px;border-bottom:1px solid var(--line)">Lead time</th><th style="text-align:left;padding:9px;border-bottom:1px solid var(--line)">Validity</th><th style="text-align:left;padding:9px;border-bottom:1px solid var(--line)">Status</th></tr></thead><tbody>'+qs.map(q=>'<tr><td style="padding:9px;border-bottom:1px solid var(--line)">'+esc(q.supplier_company)+'</td><td style="padding:9px;border-bottom:1px solid var(--line)">'+esc(q.currency)+' '+Number(q.unit_price).toLocaleString()+'</td><td style="padding:9px;border-bottom:1px solid var(--line)">'+esc(q.incoterms)+'</td><td style="padding:9px;border-bottom:1px solid var(--line)">'+esc(q.lead_time)+'</td><td style="padding:9px;border-bottom:1px solid var(--line)">'+esc(q.validity||'Not stated')+'</td><td style="padding:9px;border-bottom:1px solid var(--line)">'+esc(q.status)+'</td></tr>').join('')+'</tbody></table></div>';
}
function renderRequests(){
 const host=$('liveEnquiriesRows'),quotesHost=$('liveQuotesRows');
 if(host)host.innerHTML=requests.length?requests.map(r=>'<article class="rfqRecord"><div class="rfqRecordTop"><strong class="rfqRecordTitle">'+esc(r.title||r.product)+'</strong><span class="rfqStatus">'+esc(r.status).replaceAll('_',' ').toUpperCase()+'</span></div><p class="rfqRecordMeta">'+esc(r.reference)+' · '+esc(r.quantity)+' '+esc(r.unit||'units')+' · '+esc(r.sourcing_market)+' → '+esc(r.destination)+'</p><p class="rfqRecordMeta">Audience: '+esc(r.audience||'open_market')+' · Deadline: '+(r.quotation_deadline?new Date(r.quotation_deadline).toLocaleString():'Not specified')+'</p>'+(r.specifications?'<p class="rfqRecordDetails">'+esc(r.specifications)+'</p>':'')+'<p class="rfqRecordMeta">Destination: '+esc(r.destination_port||r.destination)+' · Incoterm: '+esc(r.incoterm||'Supplier to propose')+'</p></article>').join(''):'<div class="empty">No published RFQs yet. Save a draft or publish your first sourcing request.</div>';
 if(quotesHost)quotesHost.innerHTML=requests.length?requests.map(r=>'<article class="rfqRecord"><div class="rfqRecordTop"><strong class="rfqRecordTitle">'+esc(r.reference)+' · '+esc(r.title||r.product)+'</strong><span class="rfqStatus">'+(r.supplier_trade_quotations||[]).length+' QUOTATIONS</span></div>'+quoteGrid(r)+'</article>').join(''):'<div class="empty">Supplier quotations will appear here after you publish an RFQ.</div>';
}
async function loadDrafts(){
 const {data,error}=await client.from('buyer_rfq_drafts').select('id,product,sourcing_country,quantity,destination,specifications,rfq_data,created_at,updated_at').eq('buyer_id',buyerId).order('created_at',{ascending:false});
 if(error)throw error;drafts=data||[];renderDrafts();
}
async function loadRequests(){
 const {data,error}=await client.from('buyer_trade_requests').select('id,reference,title,product,sourcing_market,category,quantity,unit,destination,destination_port,specifications,incoterm,budget_min,budget_max,quotation_deadline,shipment_window_start,shipment_window_end,audience,buyer_confidential,required_certifications,status,published_at,created_at,supplier_trade_quotations(id,supplier_id,supplier_company,currency,unit_price,lead_time,incoterms,validity,notes,status,created_at)').eq('buyer_id',buyerId).order('created_at',{ascending:false}).limit(100);
 if(error)throw error;requests=data||[];renderRequests();
 if(!channel){channel=client.channel('vtg-buyer-rfq-'+buyerId).on('postgres_changes',{event:'*',schema:'public',table:'buyer_trade_requests',filter:'buyer_id=eq.'+buyerId},()=>loadRequests()).on('postgres_changes',{event:'*',schema:'public',table:'supplier_trade_quotations'},()=>loadRequests()).subscribe();}
}
async function loadSuppliers(){
 const picker=$('rfqSupplierPicker'),host=$('rfqSupplierChoices'),category=$('rfqCategory')?.value||'';
 if(!picker||!host)return;
 const audience=$('rfqAudience')?.value||'open_market';picker.hidden=!['targeted','both'].includes(audience);
 if(picker.hidden)return;
 host.textContent='Loading eligible suppliers from the approved catalogue…';
 try{
  let q=client.from('vtg_marketplace_products').select('supplier_id,supplier_name,supplier_country,category').not('supplier_id','is',null).limit(500);
  if(category&&category!=='Other')q=q.ilike('category',category);
  const {data,error}=await q;if(error)throw error;
  const seen=new Map();(data||[]).forEach(x=>{if(x.supplier_id&&!seen.has(x.supplier_id))seen.set(x.supplier_id,x)});
  suppliers=[...seen.values()];
  host.innerHTML=suppliers.length?suppliers.map(s=>'<label style="display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)"><input type="checkbox" name="rfq_supplier_ids" value="'+esc(s.supplier_id)+'"><span><strong>'+esc(s.supplier_name||'Verified supplier')+'</strong><small style="display:block;color:var(--muted)">'+esc(s.supplier_country||'')+' · '+esc(s.category||'Catalogue supplier')+'</small></span></label>').join(''):'No currently eligible catalogue suppliers match this category. Choose Open market only if you want to publish to any supplier with a matching approved listing.';
 }catch(e){host.textContent=e.message||'Could not load eligible suppliers.';}
}
async function saveDraft(form){
 const b=form.querySelector('button[type="submit"]');if(b)b.disabled=true;
 try{
  await session();const v=values(form);
  if(!v.product||!Number.isFinite(v.quantity)||v.quantity<=0||!v.destination)throw new Error('Enter a product, valid quantity and destination.');
  if(v.budget_min!==null&&v.budget_max!==null&&v.budget_max<v.budget_min)throw new Error('Maximum budget must be greater than or equal to minimum budget.');
  const payload={buyer_id:buyerId,product:v.product,sourcing_country:v.sourcing_market,quantity:v.quantity,destination:v.destination,specifications:v.specifications,rfq_data:v};
  const {error}=await client.from('buyer_rfq_drafts').insert(payload);if(error)throw error;
  await loadDrafts();notice('Private RFQ draft saved to your VTG account. It has not been sent to suppliers.');
 }catch(e){notice(e.message||'Could not save this RFQ draft.',true);}
 finally{if(b)b.disabled=false;}
}
async function publish(){
 const form=$('rfqForm'),b=$('publishRfqBtn');if(!form||!form.reportValidity())return;
 if(b)b.disabled=true;
 try{
  await session();const v=values(form),ids=selectedSuppliers();
  if(!v.product||!Number.isFinite(v.quantity)||v.quantity<=0||!v.destination)throw new Error('Enter a product, valid quantity and destination.');
  if(v.budget_min!==null&&v.budget_max!==null&&v.budget_max<v.budget_min)throw new Error('Maximum budget must be greater than or equal to minimum budget.');
  if(v.shipment_window_start&&v.shipment_window_end&&v.shipment_window_end<v.shipment_window_start)throw new Error('Shipment window end must be after its start.');
  if(['targeted','both'].includes(v.audience)&&!ids.length)throw new Error('Select at least one eligible supplier, or choose Open market.');
  notice('Publishing your RFQ securely…');
  const {data,error}=await client.rpc('vtg_publish_buyer_rfq',{p_payload:v,p_supplier_ids:ids});
  if(error)throw error;
  form.reset();if($('rfqAudience'))$('rfqAudience').value='open_market';await loadSuppliers();await Promise.all([loadDrafts(),loadRequests()]);
  notice('Published successfully. Reference: '+data.reference+'. '+data.matched_suppliers+' eligible supplier account(s) matched and notified. No payment has been taken.');
 }catch(e){notice(e.message||'Could not publish this RFQ.',true);}
 finally{if(b)b.disabled=false;}
}
async function removeDraft(id,button){if(button)button.disabled=true;try{await session();const {error}=await client.from('buyer_rfq_drafts').delete().eq('id',id).eq('buyer_id',buyerId);if(error)throw error;await loadDrafts();}catch(e){notice(e.message||'Could not remove this draft.',true);}finally{if(button)button.disabled=false;}}
$('rfqForm')?.addEventListener('submit',e=>{e.preventDefault();e.stopImmediatePropagation();saveDraft(e.currentTarget);},true);
$('publishRfqBtn')?.addEventListener('click',publish);
$('rfqAudience')?.addEventListener('change',loadSuppliers);
$('rfqCategory')?.addEventListener('change',loadSuppliers);
$('rfqRows')?.addEventListener('click',e=>{const b=e.target.closest('[data-delete-rfq-draft]');if(b)removeDraft(b.dataset.deleteRfqDraft,b);});
$('refreshLiveEnquiries')?.addEventListener('click',()=>loadRequests().catch(e=>notice(e.message,true)));
$('refreshLiveQuotes')?.addEventListener('click',()=>loadRequests().catch(e=>notice(e.message,true)));
(async()=>{try{await session();await Promise.all([loadDrafts(),loadRequests()]);await loadSuppliers();notice('Connected to your VTG account. Save drafts privately or publish to qualified suppliers.');}catch(e){notice(e.message||'Could not load the RFQ workspace.',true);}})();
window.VTGBuyerRfqWorkflow={loadDrafts,loadRequests,publish};
})();