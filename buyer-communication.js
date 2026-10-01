(() => {
  'use strict';
  const API='/api';
  const token=()=>localStorage.getItem('vtg_access_token')||'';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function api(path,opt={}){const headers={...(opt.headers||{}),Authorization:'Bearer '+token()};if(opt.body&&!(opt.body instanceof FormData))headers['Content-Type']='application/json';const r=await fetch(API+path,{...opt,headers});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d?.error?.message||d?.message||'Request failed');return d}
  function mount(){
    if(document.getElementById('buyerCommunicationDesk'))return;
    const host=document.getElementById('buyerTradeRoomLive');if(!host)return;
    const s=document.createElement('section');s.id='buyerCommunicationDesk';s.className='buyerRoom';
    s.innerHTML=`<div class="buyerRoomGrid">
      <div class="buyerRoomPanel"><h3>Buyer Communication</h3><div class="buyerRoomSub">Order-linked conversations with suppliers.</div><div id="buyerConversations" class="buyerRoomList"><div class="buyerRoomEmpty">Loading conversations…</div></div></div>
      <div class="buyerRoomPanel"><h3>Conversation</h3><div id="buyerMessages" class="buyerRoomEmpty">Select an order conversation.</div>
      <div id="buyerMessageComposer" style="display:none;margin-top:10px"><div style="display:flex;gap:7px"><input id="buyerMessageInput" class="buyerRoomFieldInput" placeholder="Write a message…" style="flex:1;border:1px solid var(--line);border-radius:9px;padding:9px;background:var(--card);color:var(--ink)"><button class="btn primary" id="buyerSendMessage">Send</button></div></div></div>
    </div>`;
    host.insertAdjacentElement('afterend',s);
    let active=null;
    async function loadConversations(){
      try{
        const d=await api('/messages');const box=document.getElementById('buyerConversations');
        const rows=(d.conversations||[]).filter(x=>x.order_reference);
        box.innerHTML=rows.length?rows.map(x=>`<div class="buyerRoomItem" data-c="${esc(x.id)}" style="cursor:pointer"><div class="row"><strong>${esc(x.order_reference)}</strong><span class="buyerRoomBadge">${Number(x.unread_count||0)?esc(x.unread_count)+' unread':'active'}</span></div><small>${esc(x.last_message||'No messages yet')}</small></div>`).join(''):'<div class="buyerRoomEmpty">No order conversations yet.</div>';
        box.querySelectorAll('[data-c]').forEach(x=>x.onclick=()=>openConversation(x.dataset.c));
      }catch(e){document.getElementById('buyerConversations').innerHTML='<div class="buyerOsError">'+esc(e.message)+'</div>'}
    }
    async function openConversation(id){
      active=id;
      try{
        const d=await api('/messages/'+encodeURIComponent(id)+'/messages');
        const box=document.getElementById('buyerMessages');
        box.className='buyerRoomList';
        box.innerHTML=(d.messages||[]).length?(d.messages||[]).map(m=>`<div class="buyerRoomItem"><strong style="font-size:10px">${m.sender_id===getUserId()?'You':'Supplier'}</strong><small style="font-size:11px;color:var(--ink)">${esc(m.body)}</small><small>${esc(new Date(m.created_at).toLocaleString())}</small></div>`).join(''):'<div class="buyerRoomEmpty">No messages yet. Start the conversation below.</div>';
        document.getElementById('buyerMessageComposer').style.display='block';
        document.getElementById('buyerMessageInput').focus();
        loadConversations();
      }catch(e){document.getElementById('buyerMessages').innerHTML='<div class="buyerOsError">'+esc(e.message)+'</div>'}
    }
    function getUserId(){
      try{const p=JSON.parse(atob(token().split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return p.id||p.userId||''}catch{return ''}
    }
    document.getElementById('buyerSendMessage').onclick=async()=>{
      const input=document.getElementById('buyerMessageInput');const body=input.value.trim();if(!active||!body)return;
      try{await api('/messages/'+encodeURIComponent(active)+'/messages',{method:'POST',body:JSON.stringify({body})});input.value='';await openConversation(active)}catch(e){alert(e.message)}
    };
    document.getElementById('buyerMessageInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();document.getElementById('buyerSendMessage').click()}});
    loadConversations();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();