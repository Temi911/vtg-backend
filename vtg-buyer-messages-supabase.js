(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=value=>typeof window.esc==='function'?window.esc(value):String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let client=null,userId=null,conversations=[];
  async function session(){
    let auth=null;
    if(window.VTG_AUTH_READY)auth=await window.VTG_AUTH_READY;
    else if(window.VTGAuth)auth=window.VTGAuth;
    const supabase=auth?.client||window.VTG_SUPABASE;
    if(!supabase?.auth)throw new Error('VTG account service is unavailable. Refresh and sign in again.');
    const {data,error}=await supabase.auth.getSession();
    if(error)throw error;
    if(!data.session)throw new Error('Sign in to load account conversations.');
    const {data:profile,error:pe}=await supabase.from('profiles').select('role,is_active').eq('id',data.session.user.id).single();
    if(pe)throw pe;
    if(profile.role!=='buyer'||!profile.is_active)throw new Error('An active buyer account is required for this workspace.');
    client=supabase;userId=data.session.user.id;
    return data.session;
  }
  function showError(host,message,retry){
    host.innerHTML='<div class="empty">'+esc(message)+' <button type="button" class="btn" id="retryLiveConversations">Try again</button></div>';
    $('retryLiveConversations')?.addEventListener('click',retry);
  }
  async function loadConversations(){
    const host=$('liveConversationRows');if(!host)return;
    if(new URLSearchParams(location.search).get('preview')==='1'){host.innerHTML='<div class="empty">Preview mode: account conversations are available after buyer sign-in.</div>';return;}
    host.innerHTML='<div class="empty">Loading account conversations…</div>';
    try{
      await session();
      const [created,participantRows]=await Promise.all([
        client.from('conversations').select('id,order_id,created_at').eq('created_by',userId),
        client.from('conversation_participants').select('conversation_id').eq('user_id',userId)
      ]);
      if(created.error)throw created.error;if(participantRows.error)throw participantRows.error;
      const ids=[...new Set([...(created.data||[]).map(x=>x.id),...(participantRows.data||[]).map(x=>x.conversation_id)])];
      if(!ids.length){conversations=[];host.innerHTML='<div class="empty">No account conversations yet. A conversation will appear here when an RFQ, confirmed order or supported trade workflow links your account with another participant.</div>';return;}
      const {data:rows,error}=await client.from('conversations').select('id,order_id,created_at').in('id',ids).order('created_at',{ascending:false});
      if(error)throw error;
      const orderIds=[...new Set((rows||[]).map(x=>x.order_id).filter(Boolean))];
      let orderMap={};
      if(orderIds.length){const {data:orders,error:oe}=await client.from('trade_orders').select('id,reference').in('id',orderIds);if(oe)throw oe;orderMap=Object.fromEntries((orders||[]).map(o=>[o.id,o.reference]));}
      const {data:messages,error:me}=await client.from('messages').select('conversation_id,body,created_at,sender_id').in('conversation_id',ids).order('created_at',{ascending:false}).limit(300);
      if(me)throw me;
      const latest={};(messages||[]).forEach(m=>{if(!latest[m.conversation_id])latest[m.conversation_id]=m;});
      conversations=(rows||[]).map(c=>({...c,order_reference:orderMap[c.order_id]||'General trade conversation',last_message:latest[c.id]?.body||'No messages yet'}));
      host.innerHTML=conversations.length?conversations.map(c=>'<div class="row"><div class="rowMain"><button type="button" data-live-conversation="'+esc(c.id)+'" class="'+(window.VTG_ACTIVE_CONVERSATION_ID===c.id?'active':'')+'"><strong>'+esc(c.order_reference)+'</strong><small>'+esc(c.last_message)+'</small></button></div></div>').join(''):'<div class="empty">No account conversations yet.</div>';
    }catch(e){showError(host,'Live conversations could not be loaded: '+(e.message||'Supabase request failed'),loadConversations);}
  }
  async function loadMessages(conversationId){
    if(!conversationId)return;
    const box=$('chatLog');if(!box)return;
    box.innerHTML='<div class="empty">Loading account messages…</div>';
    try{
      await session();
      const {data:rows,error}=await client.from('messages').select('id,conversation_id,sender_id,body,created_at').eq('conversation_id',conversationId).order('created_at',{ascending:true}).limit(300);
      if(error)throw error;
      box.innerHTML=rows?.length?rows.map(m=>'<div class="bubble '+(m.sender_id===userId?'mine':'')+'">'+esc(m.body)+'<small>'+esc(m.created_at?new Date(m.created_at).toLocaleString():'')+(m.sender_id===userId?' · You':'')+'</small></div>').join(''):'<div class="empty">No messages in this conversation yet.</div>';
      const conv=conversations.find(c=>c.id===conversationId);
      $('threadTitle').textContent=conv?.order_reference||'Live trade conversation';
      box.scrollTop=box.scrollHeight;
    }catch(e){box.innerHTML='<div class="empty">Could not load account messages: '+esc(e.message||'Supabase request failed')+'</div>';}
  }
  async function sendMessage(conversationId,body){
    await session();
    const {error}=await client.from('messages').insert({conversation_id:conversationId,sender_id:userId,body});
    if(error)throw error;
    await Promise.all([loadMessages(conversationId),loadConversations()]);
  }
  window.VTGBuyerMessages={loadConversations,loadMessages,sendMessage};
})();