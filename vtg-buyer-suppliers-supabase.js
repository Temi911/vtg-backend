(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let client=null,userId=null,items=[];
  const preview=false;
  function notice(message,isError=false){
    const host=$('supplierRows');
    if(host)host.innerHTML='<div class="empty">'+esc(message)+'</div>';
    const n=document.querySelector('[data-i18n="supplierLocalNotice"]');
    if(n){n.textContent=message;n.style.color=isError?'var(--danger, #b42318)':'';}
  }
  async function session(){
    let auth=null;
    if(window.VTG_AUTH_READY) auth=await window.VTG_AUTH_READY;
    if(!auth&&window.VTGAuth) auth=window.VTGAuth;
    const supabase=auth?.client||window.VTG_SUPABASE;
    if(!supabase?.auth)throw new Error('Secure sign-in is not ready. Refresh and try again.');
    const {data,error}=await supabase.auth.getSession();
    if(error)throw error;
    if(!data?.session)throw new Error('Sign in to save supplier contacts to your VTG account.');
    const id=data.session.user.id;
    const {data:profile,error:profileError}=await supabase.from('profiles').select('role,is_active').eq('id',id).single();
    if(profileError)throw profileError;
    if(profile?.role!=='buyer'||profile?.is_active!==true)throw new Error('An active buyer account is required to save suppliers.');
    client=supabase;userId=id;
  }
  function render(){
    const count=$('supplierCount'),rows=$('supplierRows');
    if(count)count.textContent=String(items.length);
    if(!rows)return;
    rows.innerHTML=items.length?items.map(x=>'<div class="row"><div class="rowMain"><strong>'+esc(x.company_name)+'</strong><p>'+esc(x.country)+(x.contact_person?' · '+esc(x.contact_person):'')+(x.email?' · '+esc(x.email):'')+'</p>'+(x.products?'<p>'+esc(x.products)+'</p>':'')+(x.notes?'<p>'+esc(x.notes)+'</p>':'')+'<p><span class="chip">Saved to your VTG account · unverified contact</span></p><button class="btn" type="button" data-account-supplier-id="'+esc(x.id)+'">Remove</button></div></div>').join(''):'<div class="empty">No supplier contacts saved to your VTG account yet. Add a supplier using the form.</div>';
  }
  async function load(){
    const rows=$('supplierRows');
    if(preview){if(rows)rows.innerHTML='<div class="empty">Preview mode: supplier contacts are saved in this browser only. Sign in to save them to your VTG account across devices.</div>';return;}
    if(rows)rows.innerHTML='<div class="empty">Loading your saved suppliers…</div>';
    try{
      await session();
      const {data,error}=await client.from('buyer_saved_suppliers').select('id,company_name,country,contact_person,email,products,notes,created_at').eq('buyer_id',userId).order('created_at',{ascending:false});
      if(error)throw error;
      items=Array.isArray(data)?data:[];
      const n=document.querySelector('[data-i18n="supplierLocalNotice"]');
      if(n){n.textContent='Saved to your VTG buyer account across devices. Contact details and documents have not been independently verified by VTG.';n.style.color='';}
      render();
    }catch(error){
      notice((error?.message||'Could not load saved suppliers.')+' Try refreshing the page.',true);
    }
  }
  async function save(form){
    const button=form.querySelector('button[type="submit"]');
    if(button)button.disabled=true;
    try{
      await session();
      const values=Object.fromEntries(new FormData(form));
      const payload={
        buyer_id:userId,
        company_name:String(values.company||'').trim(),
        country:String(values.country||''),
        contact_person:String(values.contact||'').trim()||null,
        email:String(values.email||'').trim()||null,
        products:String(values.products||'').trim()||null,
        notes:String(values.notes||'').trim()||null
      };
      if(!payload.company_name){notice('Enter the supplier or factory name.',true);return;}
      if(!['China','South Korea','Other'].includes(payload.country)){notice('Choose a supplier country.',true);return;}
      if(payload.company_name.length>140||payload.contact_person?.length>100||payload.email?.length>180||payload.products?.length>180||payload.notes?.length>1000){notice('One or more fields exceed the allowed length. Shorten the entry and try again.',true);return;}
      const {error}=await client.from('buyer_saved_suppliers').insert(payload);
      if(error)throw error;
      form.reset();
      await load();
      if(typeof window.say==='function')window.say('Supplier contact saved to your VTG account.');
    }catch(error){notice(error?.message||'Could not save this supplier contact.',true);}
    finally{if(button)button.disabled=false;}
  }
  async function remove(id,button){
    if(button)button.disabled=true;
    try{
      await session();
      const {error}=await client.from('buyer_saved_suppliers').delete().eq('id',id).eq('buyer_id',userId);
      if(error)throw error;
      await load();
      if(typeof window.say==='function')window.say('Supplier contact removed from your VTG account.');
    }catch(error){notice(error?.message||'Could not remove this supplier contact.',true);}
    finally{if(button)button.disabled=false;}
  }
  $('supplierForm')?.addEventListener('submit',event=>{
    if(preview)return;
    if(!window.VTGBuyerSuppliers)return;
    event.preventDefault();
    save(event.currentTarget);
  },true);
  $('supplierRows')?.addEventListener('click',event=>{
    const button=event.target.closest('[data-account-supplier-id]');
    if(!button)return;
    remove(button.getAttribute('data-account-supplier-id'),button);
  });
  window.VTGBuyerSuppliers={load,save,remove};
  load();
})();