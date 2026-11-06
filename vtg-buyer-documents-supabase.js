(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=value=>typeof window.esc==='function'?window.esc(value):String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const bucket='vtg-trade-documents';
  const maxBytes=10*1024*1024;
  let client=null,orders=[],busy=false;
  async function getClient(){
    let auth=null;
    try{
      if(window.VTG_AUTH_READY)auth=await window.VTG_AUTH_READY;
      else if(window.VTGAuth)auth=window.VTGAuth;
    }catch(error){
      if(!window.VTG_SUPABASE)throw new Error('The VTG sign-in service could not initialise: '+(error.message||'Please refresh the page.'));
    }
    const db=auth?.client||window.VTG_SUPABASE;
    if(!db)throw new Error('VTG secure sign-in is unavailable. Refresh the page and try again.');
    const {data,error}=await db.auth.getSession();
    if(error)throw error;
    if(!data.session)throw new Error('Sign in with your buyer account to load orders and documents.');
    const {data:profile,error:profileError}=await db.from('profiles').select('role,is_active').eq('id',data.session.user.id).maybeSingle();
    if(profileError)throw profileError;
    if(!profile)throw new Error('Your VTG account profile was not found. Sign out and sign in again.');
    if(profile.role!=='buyer'||!profile.is_active)throw new Error('An active buyer account is required.');
    return {client:db,user:data.session.user};
  }
  function message(text){const n=$('documentUploadNotice');if(n)n.textContent=text;}
  function showEmpty(text,button){
    const host=$('liveDocumentsRows');if(!host)return;
    host.innerHTML='<div class="empty">'+esc(text)+(button?' <button class="btn" id="retrySupabaseDocuments" type="button">Try again</button>':'')+'</div>';
    $('retrySupabaseDocuments')?.addEventListener('click',loadOrders);
  }
  async function loadOrders(){
    const select=$('documentOrderId'),host=$('liveDocumentsRows');
    if(!select||!host)return;
    if(busy)return;
    busy=true;host.innerHTML='<div class="empty">Loading your orders from VTG…</div>';
    try{
      const auth=await getClient();client=auth.client;
      const {data,error}=await client.from('trade_orders')
        .select('id,reference,supplier_id,created_at')
        .eq('buyer_id',auth.user.id)
        .order('created_at',{ascending:false}).limit(100);
      if(error)throw error;
      orders=data||[];
      const previous=select.value;
      select.innerHTML='<option value="">Select an order</option>'+orders.map(o=>'<option value="'+esc(o.id)+'">'+esc(o.reference||'VTG order')+' · '+esc(o.id.slice(0,8))+'</option>').join('');
      if(previous&&orders.some(o=>o.id===previous))select.value=previous;
      if(!orders.length){showEmpty('No orders are linked to this buyer account yet. Uploaded documents will appear here once an order exists.');return;}
      await loadForOrder();
    }catch(error){
      select.innerHTML='<option value="">Unable to load orders</option>';
      showEmpty('Could not load documents: '+(error.message||'Supabase request failed'),true);
    }finally{busy=false;}
  }
  async function loadForOrder(){
    const id=$('documentOrderId')?.value,host=$('liveDocumentsRows');
    if(!host)return;
    if(!id){showEmpty('Select an order to view its uploaded documents.');return;}
    if(!client){showEmpty('Your secure session is not ready. Refresh and try again.',true);return;}
    host.innerHTML='<div class="empty">Loading uploaded order documents…</div>';
    try{
      const {data,error}=await client.from('trade_documents')
        .select('id,order_id,document_type,file_name,mime_type,file_size_bytes,status,created_at,storage_path')
        .eq('order_id',id).order('created_at',{ascending:false}).limit(100);
      if(error)throw error;
      if(!data?.length){showEmpty('No documents have been uploaded against this order yet. The checklist below is guidance only.');return;}
      host.innerHTML=data.map(doc=>'<article class="row" style="display:block;padding:12px 0"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><strong>'+esc(doc.file_name||'Trade document')+'</strong><span class="chip">'+esc(String(doc.status||'pending').replaceAll('_',' ').toUpperCase())+'</span></div><p>'+esc(String(doc.document_type||'other').replaceAll('_',' '))+' · '+esc(doc.created_at?new Date(doc.created_at).toLocaleString():'Date unavailable')+' · '+esc(doc.file_size_bytes?Math.ceil(doc.file_size_bytes/1024)+' KB':'Size unavailable')+'</p><button class="btn" type="button" data-supabase-document="'+esc(doc.id)+'" data-storage-path="'+esc(doc.storage_path)+'">Download document</button></article>').join('');
    }catch(error){showEmpty('Could not load uploaded documents: '+(error.message||'Supabase request failed'),true);}
  }
  async function upload(event){
    event.preventDefault();
    const form=event.currentTarget,button=form.querySelector('button[type=submit]');
    const orderId=$('documentOrderId')?.value,file=form.elements.file?.files?.[0],type=form.elements.docType?.value;
    if(!orderId){message('Select an order linked to your account first.');return;}
    if(!file){message('Choose a PDF, JPEG, PNG or WEBP file.');return;}
    if(file.size<1||file.size>maxBytes){message('The file must be no larger than 10 MB.');return;}
    const allowed=['application/pdf','image/jpeg','image/png','image/webp'];
    if(!allowed.includes(file.type)){message('Only PDF, JPEG, PNG and WEBP files are accepted by the secure document store.');return;}
    if(!orders.some(o=>o.id===orderId)){message('That order is not in your account order list. Refresh and select it again.');return;}
    button.disabled=true;message('Uploading securely to your selected order…');
    let path=null;
    try{
      if(!client){const auth=await getClient();client=auth.client;}
      const {data:userData,error:userError}=await client.auth.getUser();
      if(userError)throw userError;
      const uid=userData.user.id;
      const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-120)||'trade-document';
      path=uid+'/'+orderId+'/'+crypto.randomUUID()+'_'+safeName;
      const {error:storageError}=await client.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});
      if(storageError)throw storageError;
      const {error:insertError}=await client.from('trade_documents').insert({
        owner_id:uid,order_id:orderId,document_type:type,storage_path:path,
        file_name:file.name,mime_type:file.type,file_size_bytes:file.size,status:'pending'
      });
      if(insertError){
        await client.storage.from(bucket).remove([path]);
        path=null;
        throw insertError;
      }
      form.elements.file.value='';
      message('Document uploaded and linked to this order. Its review status will update when an authorised reviewer checks it.');
      await loadForOrder();
    }catch(error){message('Upload failed: '+(error.message||'Secure upload could not be completed.'));}
    finally{button.disabled=false;}
  }
  async function download(event){
    const button=event.target.closest('[data-supabase-document]');if(!button)return;
    button.disabled=true;
    try{
      if(!client){const auth=await getClient();client=auth.client;}
      const {data,error}=await client.storage.from(bucket).createSignedUrl(button.dataset.storagePath,60);
      if(error)throw error;
      if(!data?.signedUrl)throw new Error('A secure download link could not be created.');
      window.open(data.signedUrl,'_blank','noopener,noreferrer');
    }catch(error){message('Download unavailable: '+(error.message||'Secure download failed.'));}
    finally{button.disabled=false;}
  }
  document.addEventListener('DOMContentLoaded',()=>{
    $('documentOrderId')?.addEventListener('change',e=>{e.stopImmediatePropagation();loadForOrder()},true);
    $('refreshLiveDocuments')?.addEventListener('click',e=>{e.stopImmediatePropagation();loadOrders()},true);
    $('liveDocumentForm')?.addEventListener('submit',e=>{e.stopImmediatePropagation();upload(e)},true);
    $('liveDocumentsRows')?.addEventListener('click',e=>{if(e.target.closest('[data-supabase-document]')){e.stopImmediatePropagation();download(e)}},true);
    loadOrders();
  },{once:true});
  window.VTGBuyerDocuments={loadOrders,loadForOrder};
})();
