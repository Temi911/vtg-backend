(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let client=null,activeBuyer=null;
 async function getClient(){
   let auth=null;
   if(window.VTG_AUTH_READY)auth=await window.VTG_AUTH_READY;
   if(!auth&&window.VTGAuth)auth=window.VTGAuth;
   const sb=auth?.client||window.VTG_SUPABASE;
   if(!sb?.auth)throw new Error('VTG sign-in service is not ready. Refresh and try again.');
   const {data,error}=await sb.auth.getSession();
   if(error)throw error;
   if(!data?.session)throw new Error('Sign in again to view the verified trade network.');
   const uid=data.session.user.id;
   const {data:profile,error:pe}=await sb.from('profiles').select('role,is_active').eq('id',uid).single();
   if(pe)throw pe;
   if(profile?.role!=='buyer'||profile?.is_active!==true)throw new Error('An active buyer account is required.');
   client=sb;activeBuyer=uid;return sb;
 }
 async function load(){
   const box=$('networkRows'),status=$('networkStatus');if(!box||!status)return;
   box.innerHTML='<div class="empty">Loading verified VTG partners…</div>';
   status.textContent='Checking your buyer account and verified directory…';
   try{
     const sb=await getClient();
     const role=$('networkRole')?.value||null;
     const {data,error}=await sb.rpc('vtg_verified_network_directory',{p_role:role});
     if(error)throw error;
     const rows=Array.isArray(data)?data:[];
     status.textContent=rows.length+' verified partner'+(rows.length===1?'':'s')+' available';
     if(!rows.length){box.innerHTML='<div class="empty">No verified partners are currently listed for this category. VTG will show partners here only after their verification status is approved.</div>';return;}
     box.innerHTML=rows.map(p=>'<article class="panel" style="padding:17px"><div class="eyebrow">'+esc(({supplier:'Supplier',bank:'Bank',agent:'Inspection agent'})[p.role]||'Partner')+'</div><h2 style="margin:9px 0">'+esc(p.name)+'</h2><span class="chip">VTG verification status: verified</span>'+(p.location?'<p class="desc" style="margin-top:9px">'+esc(p.location)+'</p>':'')+(p.regions?.length?'<p class="desc">Service regions: '+esc(p.regions.join(', '))+'</p>':'')+(p.verified_at?'<p class="desc">Verified '+esc(new Date(p.verified_at).toLocaleDateString())+'</p>':'')+'<div class="formActions"><button class="btn primary" type="button" data-vtg-network-connect="'+esc(p.partner_id)+'" data-vtg-network-role="'+esc(p.role)+'">Request connection</button></div></article>').join('');
   }catch(e){
     status.textContent='Directory unavailable';
     box.innerHTML='<div class="empty">Could not load the verified directory. '+esc(e?.message||'Please try again.')+' <button class="btn" type="button" id="retryVtgNetwork">Try again</button></div>';
     $('retryVtgNetwork')?.addEventListener('click',load);
   }
 }
 async function connect(button){
   button.disabled=true;
   try{
     const sb=await getClient();
     const partnerId=button.dataset.vtgNetworkConnect,partnerType=button.dataset.vtgNetworkRole;
     const note=(window.prompt('Add a short note for this connection request (optional):')||'').trim().slice(0,1000)||null;
     const {error}=await sb.from('vtg_network_connection_requests').insert({buyer_id:activeBuyer,partner_id:partnerId,partner_type:partnerType,note});
     if(error){
       if(error.code==='23505')throw new Error('You have already requested a connection with this partner.');
       throw error;
     }
     button.textContent='Request submitted';button.disabled=true;
     $('networkStatus').textContent='Your connection request has been saved to your VTG buyer account.';
   }catch(e){
     window.alert(e?.message||'Could not submit the connection request.');
     button.disabled=false;
   }
 }
 $('refreshNetwork')?.addEventListener('click',load);
 $('networkRole')?.addEventListener('change',load);
 $('networkRows')?.addEventListener('click',e=>{
   const b=e.target.closest('[data-vtg-network-connect]');if(b)connect(b);
 });
 window.VTGBuyerNetwork={load};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(location.hash==='#network')load()});
 else if(location.hash==='#network')load();
})();