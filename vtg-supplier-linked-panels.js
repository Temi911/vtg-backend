(function(){
 'use strict';
 const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function panel(pageId,id,title,note){
  const page=document.getElementById(pageId);if(!page||document.getElementById(id))return null;
  const s=document.createElement('section');s.className='panel';s.id=id;
  s.innerHTML='<div class="panel-head"><h2>'+esc(title)+'</h2></div><div class="panel-body"><p class="subtext" style="margin:0 0 10px">'+esc(note)+'</p><div data-body><div class="empty">Loading…</div></div></div>';
  const head=page.querySelector('.page-head');head?head.after(s):page.prepend(s);return s.querySelector('[data-body]');
 }
 const row=(a,b,st)=>'<div class="progress-row"><span><strong>'+esc(a)+'</strong><br><small>'+esc(b)+'</small></span><span class="pill">'+esc(st)+'</span></div>';
 async function run(){
  let auth;try{auth=await window.VTG_AUTH_READY}catch(_){return}
  const c=auth&&auth.client;if(!c)return;
  const {data:s}=await c.auth.getSession();if(!s||!s.session)return;
  const q=panel('page-quality','liveInspections','Inspections on your goods (live)','Read-only status from VTG. Fees and findings stay with the buyer and inspector.');
  const f=panel('page-finance','liveLcs','Letters of credit on your orders (live)','Read-only. Status is set by the issuing bank, not by you.');
  if(q){
   const {data,error}=await c.rpc('vtg_supplier_inspections');
   q.innerHTML=error?'<div class="empty">Inspection status is unavailable right now.</div>':(data&&data.length?data.map(r=>row((r.product_name||'Goods')+' · '+(r.reference||''),(r.inspection_type||'Inspection')+' · '+(r.completed_at?'Completed '+String(r.completed_at).slice(0,10):'Requested '+(r.requested_date||String(r.created_at).slice(0,10))),String(r.status||'').replace(/_/g,' '))).join(''):'<div class="empty">No inspections have been requested on your goods.</div>');
  }
  if(f){
   const {data,error}=await c.from('letters_of_credit').select('id,reference,amount,currency,status,expiry_date').eq('supplier_id',s.session.user.id).order('created_at',{ascending:false}).limit(100);
   let notes={};
   if(!error&&data&&data.length){const ev=await c.from('vtg_bank_lc_review_events').select('lc_id,note,created_at').in('lc_id',data.map(r=>r.id)).order('created_at',{ascending:false});(ev.data||[]).forEach(e=>{if(e.note&&!notes[e.lc_id])notes[e.lc_id]=e.note})}
   f.innerHTML=error?'<div class="empty">Letter of credit status is unavailable right now.</div>':(data&&data.length?data.map(r=>row(r.reference||'Letter of credit',(r.currency||'')+' '+Number(r.amount||0).toLocaleString()+(r.expiry_date?' · Expires '+r.expiry_date:'')+(notes[r.id]?' · Bank note: '+notes[r.id]:''),String(r.status||'').replace(/_/g,' '))).join(''):'<div class="empty">No letters of credit are linked to your orders yet.</div>');
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();
