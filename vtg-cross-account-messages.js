/* VTG account messages — WhatsApp-style chats between trade-linked buyers, suppliers and banks.
   Own messages: right (blue). Other people: left, named, each with their own colour. */
(function(){
'use strict';
const host=document.querySelector('[data-vtg-peer-chat]');if(!host||!window.VTGChat)return;
const C=window.VTGChat,I=C.icons,esc=C.esc;
const role=String(document.documentElement.dataset.vtgRole||'').toLowerCase();
const roleNames={buyer:'Buyer',supplier:'Supplier',bank:'Bank'};
host.className='vtg-wa vtg-wa-messages';
host.innerHTML='<aside class="vtg-wa-side"><div class="vtg-wa-sidehead"><strong>Chats</strong><button type="button" class="vtg-wa-sidebtn" data-new>'+I.plus+' New chat</button><button type="button" class="vtg-wa-sidebtn ghost" data-refresh>Refresh</button></div><label class="vtg-wa-search"><input data-chat-search type="search" placeholder="Search chats" aria-label="Search chats"></label><div data-picker hidden></div><div class="vtg-wa-list" data-list role="list"></div></aside>'
 +'<div class="vtg-wa-main"><header class="vtg-wa-head"><button type="button" class="vtg-wa-iconbtn vtg-wa-back" data-back aria-label="Back to chats">'+I.back+'</button><div class="vtg-wa-avatar" data-avatar>V</div><div class="vtg-wa-title"><strong data-title>Choose a chat</strong><small data-sub>Secure account-linked trade messages</small></div><div class="vtg-wa-actions"><button type="button" class="vtg-wa-sidebtn ghost" data-clearchat disabled>Clear chat</button><button type="button" class="vtg-wa-iconbtn" data-voice aria-label="Start voice call" title="Voice call (up to 5 people)" disabled>'+I.phone+'</button><button type="button" class="vtg-wa-iconbtn" data-video aria-label="Start video call" title="Video call (up to 5 people)" disabled>'+I.video+'</button></div></header>'
 +'<div class="vtg-wa-callbar" data-callbar><span data-calltext></span><button type="button" data-joincall>Join</button></div>'
 +'<div class="vtg-wa-pinbar" data-pinbar hidden></div><div class="vtg-wa-clearbar" data-clearbar hidden></div>'
 +'<div class="vtg-wa-stream" data-log role="log" aria-live="polite"></div>'
 +'<form class="vtg-wa-compose" data-form><textarea data-input rows="1" maxlength="4000" placeholder="Type a message" aria-label="Type a message"></textarea><button class="vtg-wa-send" data-send type="submit" aria-label="Send message">'+I.send+'</button></form>'
 +'<div class="vtg-wa-note">Only people in a chat can read or send messages, and you can only chat with partners linked to your trade records. Do not share passwords, one-time codes or bank credentials.</div></div>';
const $=s=>host.querySelector(s);
const list=$('[data-list]'),log=$('[data-log]'),form=$('[data-form]'),input=$('[data-input]'),sendBtn=$('[data-send]'),picker=$('[data-picker]'),chatSearch=$('[data-chat-search]'),clearBtn=$('[data-clearchat]'),pinbar=$('[data-pinbar]'),clearbar=$('[data-clearbar]');
const titleEl=$('[data-title]'),subEl=$('[data-sub]'),avatarEl=$('[data-avatar]'),voiceBtn=$('[data-voice]'),videoBtn=$('[data-video]'),callbar=$('[data-callbar]'),headerActions=$('.vtg-wa-actions');
const selectionBar=document.createElement('div');selectionBar.className='vtg-wa-selection-toolbar';selectionBar.hidden=true;selectionBar.setAttribute('aria-label','Selected message actions');headerActions.insertBefore(selectionBar,clearBtn);
const ATT='[Attachment]',attMap={};
let picker2=null, presenceChannel=null, typingTimer=null, isTyping=false, replyTo=null, reactionsByMessage={}, receiptsByMessage={};
let client=null,userId='',convs=[],activeId='',members={},messages=[],busy=false,channel=null,callChannel=null,liveCalls={},unreadCounts={},starredByMessage={},deliveryByMessage={},pinnedMessage=null,selectedMessageId='';
const memberCache={};
picker2=window.VTGAttach?(function(){try{return window.VTGAttach.mountPicker(form,'chat',note=>flash(note));}catch(_){return null;}})():null;
function flash(text){const n=document.createElement('div');n.className='vtg-wa-empty';n.textContent=text;log.append(n);log.scrollTop=log.scrollHeight;}
function addAtt(a){const list=attMap[a.message_id]||(attMap[a.message_id]=[]);if(!list.some(x=>x.id===a.id))list.push({id:a.id,name:a.original_name,mime:a.mime_type,size:a.size_bytes,kind:a.attachment_type,path:a.storage_path,bucket:'vtg-chat-attachments'});}
async function loadAtts(id){try{const {data,error}=await client.from('vtg_chat_attachments').select('id,message_id,storage_path,original_name,mime_type,size_bytes,attachment_type').eq('conversation_id',id).limit(500);if(!error)(data||[]).forEach(addAtt);}catch(_){}}

function empty(el,text){el.innerHTML='<div class="vtg-wa-empty">'+esc(text)+'</div>';}
async function boot(){
 const s=await C.clientReady();client=s.client;userId=s.userId;
 const {data:profile,error}=await client.from('profiles').select('role,is_active').eq('id',userId).single();
 if(error)throw error;
 if(!profile?.is_active||profile.role!==role)throw new Error('An active '+(roleNames[role]||'VTG')+' account is required.');
}
async function membersOf(id){
 if(memberCache[id])return memberCache[id];
 const {data,error}=await client.rpc('vtg_conversation_members',{p_conversation_id:id});
 if(error)throw error;
 const tones=C.toneMap((data||[]).map(m=>m.user_id),userId);
 const map={};(data||[]).forEach(m=>{map[m.user_id]={id:m.user_id,name:m.display_name,role:m.role,tone:tones[String(m.user_id)]??0,me:String(m.user_id)===String(userId)};});
 return (memberCache[id]=map);
}
function convTitle(c){
 const others=Object.values(c.members||{}).filter(m=>!m.me).map(m=>m.name);
 return c.title||others.join(', ')||'Trade chat';
}
function renderList(){
 const needle=(chatSearch?.value||'').trim().toLowerCase();
 const visible=convs.filter(c=>(convTitle(c)+' '+(c.last_message||'')).toLowerCase().includes(needle));
 if(!convs.length){empty(list,'No chats yet. Tap “New chat” to message a partner linked to your trade records.');return;}
 if(!visible.length){empty(list,'No matching chats.');return;}
 list.innerHTML=visible.map(c=>{
  const t=convTitle(c),live=liveCalls[c.id],unread=Number(unreadCounts[c.id]||0);
  return '<button type="button" role="listitem" class="vtg-wa-item'+(String(c.id)===String(activeId)?' active':'')+'" data-open="'+esc(c.id)+'"><div class="vtg-wa-avatar">'+esc(C.initials(t))+'</div><div class="vtg-wa-item-body"><div class="vtg-wa-item-top"><strong>'+esc(t)+'</strong><time>'+(c.last_at?esc(C.time(c.last_at)):'')+'</time></div><small>'+(live?'<span class="vtg-wa-live">Call in progress</span>':esc(c.last_message||'No messages yet'))+'</small></div>'+(unread?'<span class="vtg-wa-unread" aria-label="'+unread+' unread messages">'+(unread>99?'99+':unread)+'</span>':'')+'</button>';
 }).join('');
}
async function loadList(){
 empty(list,'Loading chats…');
 try{
  if(!client)await boot();
  const {data:rows,error}=await client.from('conversations').select('id,title,is_group,created_at').order('created_at',{ascending:false});
  if(error)throw error;
  const ids=(rows||[]).map(r=>r.id);
  convs=[];
  if(ids.length){
   const [msgs,mems,calls]=await Promise.all([
    client.from('messages').select('conversation_id,body,created_at,hidden_at').in('conversation_id',ids).is('hidden_at',null).order('created_at',{ascending:false}).limit(400),
    Promise.all(ids.slice(0,40).map(id=>membersOf(id).catch(()=>({})))),
    client.from('vtg_calls').select('id,conversation_id,kind').in('conversation_id',ids).eq('status','active')
   ]);
   if(msgs.error)throw msgs.error;
   const latest={};(msgs.data||[]).forEach(m=>{if(!latest[m.conversation_id])latest[m.conversation_id]=m;});
   liveCalls={};(calls.data||[]).forEach(c=>{liveCalls[c.conversation_id]=c;});
   convs=rows.map((r,i)=>({...r,members:mems[i]||memberCache[r.id]||{},last_message:latest[r.id]?.body,last_at:latest[r.id]?.created_at||r.created_at}));
   convs.sort((a,b)=>new Date(b.last_at)-new Date(a.last_at));
  }
  unreadCounts={};try{const {data:counts,error:countError}=await client.rpc('vtg_unread_conversation_counts');if(!countError)(counts||[]).forEach(x=>{unreadCounts[x.conversation_id]=Number(x.unread_count||0);});}catch(_){}
  renderList();
  if(activeId&&convs.some(c=>String(c.id)===activeId))refreshHeader();
 }catch(e){
  list.innerHTML='<div class="vtg-wa-empty">Chats could not be loaded: '+esc(e.message||'request failed')+'<br><br><button type="button" class="vtg-wa-sidebtn" data-refresh>Try again</button></div>';
 }
}
function refreshHeader(){
 const c=convs.find(x=>String(x.id)===activeId);if(!c)return;
 const t=convTitle(c),n=Object.keys(c.members||{}).length;
 titleEl.textContent=t;avatarEl.textContent=C.initials(t);
 subEl.textContent=n>2?n+' people · '+Object.values(c.members).map(m=>m.me?'You':m.name).join(', '):(Object.values(c.members).find(m=>!m.me)?.role?roleNames[Object.values(c.members).find(m=>!m.me).role]||'Trade partner':'Trade partner');
 const canCall=n>=2&&n<=5&&!!window.VTGCalls;voiceBtn.disabled=videoBtn.disabled=!canCall;clearBtn.disabled=!activeId;
 const live=liveCalls[activeId];callbar.classList.toggle('show',!!live);
 if(live)$('[data-calltext]').textContent='A '+live.kind+' call is in progress in this chat.';
}
function toRows(rows){
 return rows.map(m=>{const mem=members[m.sender_id];const att=m.localAtt||attMap[m.id]||null;const ph=m.body===ATT;return {id:m.id,senderId:m.sender_id,viewerId:userId,mine:String(m.sender_id).trim().toLowerCase()===String(userId).trim().toLowerCase(),name:mem?.name||'Trade partner',role:mem?.role||'other',tone:mem?.tone??0,text:m.deleted_at?'This message was deleted':(ph?(att&&att.length?'':'Sending attachment…'):(m.body||'')),replyText:m.reply_to_message_id?('Replying to: '+String(rows.find(x=>String(x.id)===String(m.reply_to_message_id))?.body||'Original message unavailable').slice(0,160)):'',attachments:m.deleted_at?null:att,client,at:m.created_at,pending:m.pending,editedAt:m.edited_at,editable:!m.deleted_at&&String(m.sender_id)===String(userId)&&!m.pending&&Date.now()-new Date(m.created_at).getTime()<=15*60*1000};});
}
async function editMessage(msg){
 const next=window.prompt('Edit your message',msg.text||'');
 if(next===null)return;
 const body=next.trim();if(!body||body===msg.text)return;
 try{
  const {data,error}=await client.rpc('vtg_edit_message',{p_message_id:msg.id,p_body:body});
  if(error)throw error;
  if(!data?.ok){flash(data?.message||'Your edit was not saved. Please review VTG messaging rules.');return;}
  const row=messages.find(x=>String(x.id)===String(msg.id));
  if(row){row.body=body;row.edited_at=data.edited_at||new Date().toISOString();}
  draw();
 }catch(error){flash('Message edit failed: '+(error.message||'Please try again'));}
}
function draw(){C.renderStream(log,toRows(messages),'No messages yet. Say hello below.',editMessage);decorateMessages();if(selectedMessageId&&!messages.some(m=>String(m.id)===String(selectedMessageId)))selectedMessageId='';syncSelectionToolbar();}
async function loadReactions(){
 reactionsByMessage={};receiptsByMessage={};
 const ids=messages.map(m=>m.id).filter(Boolean);if(!ids.length)return;
 const [rr,rd]=await Promise.all([
  client.from('vtg_message_reactions').select('message_id,user_id,emoji').in('message_id',ids),
  client.from('vtg_message_read_receipts').select('message_id,user_id,read_at').in('message_id',ids)
 ]);
 (rr.data||[]).forEach(x=>(reactionsByMessage[x.message_id]||(reactionsByMessage[x.message_id]=[])).push(x));
 (rd.data||[]).forEach(x=>(receiptsByMessage[x.message_id]||(receiptsByMessage[x.message_id]=[])).push(x));
}
async function markRead(){if(!activeId)return;try{await client.rpc('vtg_mark_conversation_read',{p_conversation_id:activeId});}catch(_){}}
function decorateMessages(){
 log.querySelectorAll('.vtg-wa-row[data-msg-id]').forEach(row=>{
  const id=String(row.dataset.msgId||'');row.classList.toggle('is-selected',id===String(selectedMessageId));
  row.setAttribute('aria-selected',id===String(selectedMessageId)?'true':'false');row.setAttribute('tabindex','0');row.setAttribute('role','button');row.setAttribute('aria-label','Select message');row.querySelector('.vtg-wa-tools')?.remove();
 });
}
function syncSelectionToolbar(){
 const msg=messages.find(x=>String(x.id)===String(selectedMessageId));selectionBar.replaceChildren();selectionBar.hidden=!msg;
 voiceBtn.hidden=!!msg;videoBtn.hidden=!!msg;clearBtn.hidden=!!msg;if(!msg)return;
 const add=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);selectionBar.append(b);};
 const view=toRows([msg])[0];
 if(!msg.deleted_at&&view.editable)add('Edit',()=>{editMessage(view);clearMessageSelection();});
 if(!msg.deleted_at){add('Copy',()=>{copyMessage(msg);clearMessageSelection();});add('Share',()=>{shareMessage(msg);clearMessageSelection();});add('Reply',()=>{replyTo=msg;showReply();clearMessageSelection();});add('React',()=>showReactions(msg.id));add('Forward',()=>{forwardMessage(msg.id);clearMessageSelection();});add(starredByMessage[msg.id]?'Unstar':'Star',()=>{toggleStar(msg.id);clearMessageSelection();});add(pinnedMessage&&String(pinnedMessage.message_id)===String(msg.id)?'Unpin':'Pin',()=>{togglePin(msg.id);clearMessageSelection();});}
 if(String(msg.sender_id)===String(userId)&&!msg.deleted_at)add('Delete',()=>{deleteMessage(msg.id);clearMessageSelection();});
 add('Cancel',clearMessageSelection);
}
function clearMessageSelection(){selectedMessageId='';decorateMessages();syncSelectionToolbar();}
function selectMessage(id){selectedMessageId=String(id);decorateMessages();syncSelectionToolbar();}

function showReactions(id){
 const m=messages.find(x=>String(x.id)===String(id));if(!m)return;
 const pick=document.createElement('div');pick.className='vtg-wa-reaction-picker';
 ['👍','❤️','😂','😮','😢','🙏'].forEach(emoji=>{const b=document.createElement('button');b.type='button';b.textContent=emoji;b.addEventListener('click',async()=>{pick.remove();try{const {error}=await client.rpc('vtg_toggle_message_reaction',{p_message_id:id,p_emoji:emoji});if(error)throw error;await loadReactions();decorateMessages();}catch(e){flash('Reaction not saved: '+e.message);}});pick.append(b);});
 const row=log.querySelector('[data-msg-id="'+CSS.escape(String(id))+'"]');row?.append(pick);
}
function showReply(){
 let tray=host.querySelector('[data-reply]');if(!tray){tray=document.createElement('div');tray.className='vtg-wa-reply-preview';tray.dataset.reply='';form.parentNode.insertBefore(tray,form);}
 tray.innerHTML='';const text=document.createElement('span');text.textContent='Replying to '+(replyTo.sender_id===userId?'yourself':(members[replyTo.sender_id]?.name||'message'))+': '+String(replyTo.body||'').slice(0,160);
 const close=document.createElement('button');close.type='button';close.textContent='×';close.onclick=()=>{replyTo=null;tray.remove();};tray.append(text,close);input.focus();
}
async function forwardMessage(id){
 const options=convs.filter(c=>String(c.id)!==activeId);if(!options.length){flash('Open another conversation before forwarding.');return;}
 const choice=window.prompt('Forward to which chat? Enter its number:\n'+options.map((c,i)=>(i+1)+'. '+convTitle(c)).join('\n'));
 const index=Number(choice)-1;if(!Number.isInteger(index)||index<0||index>=options.length)return;
 try{const {error}=await client.rpc('vtg_forward_message',{p_message_id:id,p_target_conversation_id:options[index].id});if(error)throw error;flash('Message forwarded.');}catch(e){flash('Forward failed: '+e.message);}
}
function joinPresence(){
 if(presenceChannel||!activeId)return;
 presenceChannel=client.channel('vtg-presence-'+activeId,{config:{presence:{key:userId}}});
 presenceChannel.on('presence',{event:'sync'},()=>{const state=presenceChannel.presenceState();const online=Object.keys(state).filter(k=>k!==String(userId)).length;subEl.textContent=online?'Online now · '+online+' other participant(s)':'Trade partner';});
 presenceChannel.on('presence',{event:'join'},()=>{const state=presenceChannel.presenceState();subEl.textContent=Object.keys(state).length>1?'Online now':'Trade partner';});
 presenceChannel.on('presence',{event:'leave'},()=>{const state=presenceChannel.presenceState();subEl.textContent=Object.keys(state).length>1?'Online now':'Trade partner';});
 presenceChannel.subscribe(async status=>{if(status==='SUBSCRIBED')await presenceChannel.track({online_at:new Date().toISOString(),typing:false});});
}
async function setTyping(value){
 if(!presenceChannel)return;try{await presenceChannel.track({online_at:new Date().toISOString(),typing:!!value});}catch(_){}
}
async function loadReactions(){
 reactionsByMessage={};receiptsByMessage={};starredByMessage={};deliveryByMessage={};
 const ids=messages.map(m=>m.id).filter(Boolean);if(!ids.length)return;
 const [rr,rd,dd,ss]=await Promise.all([
  client.from('vtg_message_reactions').select('message_id,user_id,emoji').in('message_id',ids),
  client.from('vtg_message_read_receipts').select('message_id,user_id,read_at').in('message_id',ids),
  client.from('vtg_message_delivery_receipts').select('message_id,user_id,delivered_at').in('message_id',ids),
  client.from('vtg_message_stars').select('message_id,user_id').in('message_id',ids).eq('user_id',userId)
 ]);
 (rr.data||[]).forEach(x=>(reactionsByMessage[x.message_id]||(reactionsByMessage[x.message_id]=[])).push(x));
 (rd.data||[]).forEach(x=>(receiptsByMessage[x.message_id]||(receiptsByMessage[x.message_id]=[])).push(x));
 (dd.data||[]).forEach(x=>(deliveryByMessage[x.message_id]||(deliveryByMessage[x.message_id]=[])).push(x));
 (ss.data||[]).forEach(x=>starredByMessage[x.message_id]=true);
}
async function markDelivered(rows){for(const m of (rows||[]).filter(x=>String(x.sender_id)!==String(userId)&&!x.deleted_at).slice(-100))try{await client.rpc('vtg_mark_message_delivered',{p_message_id:m.id});}catch(_){}}
async function markRead(){if(!activeId)return;try{await client.rpc('vtg_mark_conversation_read',{p_conversation_id:activeId});unreadCounts[activeId]=0;renderList();}catch(_){}}
function decorateMessages(){
 log.querySelectorAll('.vtg-wa-row[data-msg-id]').forEach(row=>{
  const id=String(row.dataset.msgId||'');row.classList.toggle('is-selected',id===String(selectedMessageId));
  row.setAttribute('aria-selected',id===String(selectedMessageId)?'true':'false');row.setAttribute('tabindex','0');row.setAttribute('role','button');row.setAttribute('aria-label','Select message');row.querySelector('.vtg-wa-tools')?.remove();
 });
}
function syncSelectionToolbar(){
 const msg=messages.find(x=>String(x.id)===String(selectedMessageId));selectionBar.replaceChildren();selectionBar.hidden=!msg;
 voiceBtn.hidden=!!msg;videoBtn.hidden=!!msg;clearBtn.hidden=!!msg;if(!msg)return;
 const add=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);selectionBar.append(b);};
 const view=toRows([msg])[0];
 if(!msg.deleted_at&&view.editable)add('Edit',()=>{editMessage(view);clearMessageSelection();});
 if(!msg.deleted_at){add('Copy',()=>{copyMessage(msg);clearMessageSelection();});add('Share',()=>{shareMessage(msg);clearMessageSelection();});add('Reply',()=>{replyTo=msg;showReply();clearMessageSelection();});add('React',()=>showReactions(msg.id));add('Forward',()=>{forwardMessage(msg.id);clearMessageSelection();});add(starredByMessage[msg.id]?'Unstar':'Star',()=>{toggleStar(msg.id);clearMessageSelection();});add(pinnedMessage&&String(pinnedMessage.message_id)===String(msg.id)?'Unpin':'Pin',()=>{togglePin(msg.id);clearMessageSelection();});}
 if(String(msg.sender_id)===String(userId)&&!msg.deleted_at)add('Delete',()=>{deleteMessage(msg.id);clearMessageSelection();});
 add('Cancel',clearMessageSelection);
}
function clearMessageSelection(){selectedMessageId='';decorateMessages();syncSelectionToolbar();}
function selectMessage(id){selectedMessageId=String(id);decorateMessages();syncSelectionToolbar();}

function showReactions(id){const picker=document.createElement('div');picker.className='vtg-wa-reaction-picker';['👍','❤️','😂','😮','😢','🙏'].forEach(emoji=>{const b=document.createElement('button');b.type='button';b.textContent=emoji;b.onclick=async()=>{picker.remove();try{const {error}=await client.rpc('vtg_toggle_message_reaction',{p_message_id:id,p_emoji:emoji});if(error)throw error;await loadReactions();decorateMessages();}catch(e){flash('Reaction not saved: '+e.message);}};picker.append(b);});log.querySelector('[data-msg-id="'+CSS.escape(String(id))+'"]')?.append(picker);}
function showReply(){let tray=host.querySelector('[data-reply]');if(!tray){tray=document.createElement('div');tray.className='vtg-wa-reply-preview';tray.dataset.reply='';form.parentNode.insertBefore(tray,form);}tray.innerHTML='';const t=document.createElement('span');t.textContent='Replying to '+(String(replyTo?.sender_id)===String(userId)?'yourself':(members[replyTo?.sender_id]?.name||'message'))+': '+String(replyTo?.body||'').slice(0,140);const x=document.createElement('button');x.type='button';x.textContent='×';x.onclick=()=>{replyTo=null;tray.remove();};tray.append(t,x);input.focus();}
async function forwardMessage(id){const options=convs.filter(c=>String(c.id)!==activeId);if(!options.length){flash('Open another conversation before forwarding.');return;}const choice=window.prompt('Forward to which chat? Enter its number:\n'+options.map((c,i)=>(i+1)+'. '+convTitle(c)).join('\n'));const n=Number(choice)-1;if(!Number.isInteger(n)||n<0||n>=options.length)return;try{const {error}=await client.rpc('vtg_forward_message',{p_message_id:id,p_target_conversation_id:options[n].id});if(error)throw error;flash('Message forwarded.');}catch(e){flash('Forward failed: '+e.message);}}
function joinPresence(){if(presenceChannel){client.removeChannel(presenceChannel);presenceChannel=null;}if(!activeId)return;presenceChannel=client.channel('vtg-presence-'+activeId,{config:{presence:{key:userId}}});presenceChannel.on('presence',{event:'sync'},()=>{const state=presenceChannel.presenceState(),others=Object.entries(state).filter(([k])=>k!==String(userId));const typing=others.some(([,v])=>(v||[]).some(x=>x.typing));subEl.textContent=typing?'typing…':(others.length?'Online now':'Trade partner');});presenceChannel.subscribe(async status=>{if(status==='SUBSCRIBED')await presenceChannel.track({online_at:new Date().toISOString(),typing:false});});}
async function setTyping(value){if(presenceChannel)try{await presenceChannel.track({online_at:new Date().toISOString(),typing:!!value});}catch(_){}}
async function copyMessage(msg){try{await navigator.clipboard.writeText(String(msg.body||''));flash('Message copied.');}catch(_){const ta=document.createElement('textarea');ta.value=String(msg.body||'');document.body.append(ta);ta.select();const ok=document.execCommand('copy');ta.remove();flash(ok?'Message copied.':'Copy is unavailable in this browser.');}}
async function shareMessage(msg){try{if(navigator.share)await navigator.share({text:String(msg.body||'')});else await copyMessage(msg);}catch(e){if(e?.name!=='AbortError')flash('Sharing is unavailable here.');}}
async function deleteMessage(id){if(!window.confirm('Delete this message for everyone in the conversation?'))return;try{const {data,error}=await client.rpc('vtg_delete_message',{p_message_id:id});if(error)throw error;if(data?.ok===false)throw new Error(data?.message||'The message was not deleted.');const m=messages.find(x=>String(x.id)===String(id));if(m){m.deleted_at=new Date().toISOString();m.body='This message was deleted';m.deleted_by=userId;}draw();flash('Message deleted.');}catch(e){flash('Delete failed: '+(e.message||'Please try again'));}}
async function toggleStar(id){try{const {data,error}=await client.rpc('vtg_toggle_message_star',{p_message_id:id});if(error)throw error;if(data)starredByMessage[id]=true;else delete starredByMessage[id];log.querySelectorAll('.vtg-wa-tools').forEach(x=>x.remove());decorateMessages();}catch(e){flash('Star could not be saved: '+(e.message||'Please try again'));}}
async function togglePin(id){try{const {data,error}=await client.rpc('vtg_pin_message',{p_message_id:id});if(error)throw error;await loadPinned();flash(data?.pinned?'Message pinned.':'Message unpinned.');}catch(e){flash('Pin could not be saved: '+(e.message||'Please try again'));}}
async function loadPinned(){try{const {data,error}=await client.from('vtg_conversation_pins').select('message_id,pinned_by,pinned_at').eq('conversation_id',activeId).maybeSingle();if(error)throw error;pinnedMessage=data||null;pinbar.hidden=!pinnedMessage;pinbar.replaceChildren();if(pinnedMessage){const m=messages.find(x=>String(x.id)===String(pinnedMessage.message_id));const label=document.createElement('span');label.textContent='Pinned message: '+String(m?.body||'Message').slice(0,140);const jump=document.createElement('button');jump.type='button';jump.textContent='View';jump.onclick=()=>log.querySelector('[data-msg-id="'+CSS.escape(String(pinnedMessage.message_id))+'"]')?.scrollIntoView({behavior:'smooth',block:'center'});pinbar.append(label,jump);}}catch(_){pinbar.hidden=true;}}
async function loadPendingClear(){clearbar.hidden=true;clearbar.replaceChildren();if(!activeId)return;try{const {data,error}=await client.rpc('vtg_pending_chat_clear',{p_conversation_id:activeId});if(error||!data)return;clearbar.hidden=false;const msg=document.createElement('span');msg.textContent=String(data.requested_by)===String(userId)?'You requested a shared chat clear. Waiting for every participant.':'A participant requested to clear this chat for everyone. Your approval is required.';clearbar.append(msg);if(String(data.requested_by)!==String(userId)){for(const [label,approve] of [['Agree',true],['Decline',false]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.clearResponse=approve?'yes':'no';b.dataset.requestId=data.id;clearbar.append(b);}}}catch(_){}}
async function respondClear(requestId,approve){try{const {data,error}=await client.rpc('vtg_respond_chat_clear',{p_request_id:requestId,p_approve:approve});if(error)throw error;flash(data?.message||'Your response was recorded.');if(data?.cleared){messages=[];pinnedMessage=null;pinbar.hidden=true;pinbar.replaceChildren();clearbar.hidden=true;clearbar.replaceChildren();selectedMessageId='';await loadPendingClear();draw();await loadList();return;}await loadPendingClear();}catch(e){flash('Your response could not be saved: '+(e.message||'Please try again'));}}
async function requestClear(){if(!activeId)return;if(!window.confirm('Ask every participant to agree before this chat history is cleared for everyone? No messages will be cleared unless everyone approves.'))return;try{const {data,error}=await client.rpc('vtg_request_chat_clear',{p_conversation_id:activeId});if(error)throw error;flash(data?.message||'Clear request sent to the other participants.');await loadPendingClear();}catch(e){flash('Could not request a shared chat clear: '+(e.message||'Please try again'));}}
async function startVoiceNote(){if(!picker2||!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){flash('Voice notes are not supported by this browser.');return;}let stream;try{stream=await navigator.mediaDevices.getUserMedia({audio:true});const recorder=new MediaRecorder(stream),chunks=[];const stopBtn=host.querySelector('[data-voice-note]');stopBtn.textContent='Stop recording';stopBtn.classList.add('recording');stopBtn.dataset.recording='true';recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());stopBtn.textContent='Voice note';stopBtn.classList.remove('recording');delete stopBtn.dataset.recording;stopBtn.onclick=null;if(chunks.length){const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});const ext=blob.type.includes('mp4')?'m4a':'webm';picker2.addFiles([new File([blob],'voice-note-'+Date.now()+'.'+ext,{type:blob.type||'audio/webm'})]);}};stopBtn.onclick=()=>{if(recorder.state!=='inactive')recorder.stop();};recorder.start();}catch(e){stream?.getTracks().forEach(t=>t.stop());flash('Microphone access was not available: '+(e.message||'Please check browser permission'));}}

async function openConv(id){
 selectedMessageId='';syncSelectionToolbar();activeId=String(id);host.classList.add('is-open');renderList();empty(log,'Loading messages…');
 try{
  members=await membersOf(activeId);
  const c=convs.find(x=>String(x.id)===activeId);if(c)c.members=members;
  refreshHeader();
  const {data,error}=await client.from('messages').select('id,sender_id,body,created_at,edited_at,deleted_at,hidden_at,reply_to_message_id').eq('conversation_id',activeId).is('hidden_at',null).order('created_at',{ascending:true}).limit(500);
  if(error)throw error;
  messages=data||[];await loadAtts(activeId);await markDelivered(messages);await markRead();await loadReactions();await loadPinned();await loadPendingClear();joinPresence();draw();
 }catch(e){empty(log,'Messages could not be loaded: '+(e.message||'request failed'));}
}
function listen(){
 if(channel)return;
 client.channel('vtg-atts-'+userId).on('postgres_changes',{event:'INSERT',schema:'public',table:'vtg_chat_attachments'},p=>{const a=p.new;if(!a)return;addAtt(a);if(String(a.conversation_id)===activeId)draw();}).subscribe();
 channel=client.channel('vtg-msgs-'+userId).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},payload=>{
  const m=payload.new;if(!m)return;
  const c=convs.find(x=>String(x.id)===String(m.conversation_id));
  if(c){c.last_message=m.body===ATT?'Attachment':m.body;c.last_at=m.created_at;convs.sort((a,b)=>new Date(b.last_at)-new Date(a.last_at));renderList();}
  else loadList();
  if(String(m.conversation_id)===activeId&&!messages.some(x=>String(x.id)===String(m.id))){
   const pendingIdx=messages.findIndex(x=>x.pending&&x.body===m.body&&String(x.sender_id)===String(m.sender_id));
   if(pendingIdx>=0)messages.splice(pendingIdx,1);
   messages.push(m);if(String(m.sender_id)!==String(userId))markDelivered([m]);markRead();loadReactions().then(()=>draw());
  }
 }).on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages'},payload=>{
  const m=payload.new;if(!m)return;
  if(String(m.conversation_id)===activeId){
   if(m.hidden_at){messages=messages.filter(x=>String(x.id)!==String(m.id));draw();if(!messages.length){clearbar.hidden=true;clearbar.replaceChildren();loadPendingClear();loadList();}}
   else {const row=messages.find(x=>String(x.id)===String(m.id));if(row){row.body=m.body;row.edited_at=m.edited_at;row.deleted_at=m.deleted_at;row.deleted_by=m.deleted_by;draw();}}
  }
 }).on('postgres_changes',{event:'*',schema:'public',table:'vtg_message_reactions'},payload=>{
  const row=payload.new||payload.old||{};if(String(row.conversation_id)===activeId){loadReactions().then(()=>{log.querySelectorAll('.vtg-wa-tools').forEach(x=>x.remove());decorateMessages();});}
 }).on('postgres_changes',{event:'*',schema:'public',table:'vtg_message_read_receipts'},payload=>{
  const row=payload.new||payload.old||{};if(String(row.conversation_id)===activeId){loadReactions().then(()=>{log.querySelectorAll('.vtg-wa-tools').forEach(x=>x.remove());decorateMessages();});}
 }).on('postgres_changes',{event:'*',schema:'public',table:'vtg_message_delivery_receipts'},payload=>{
  const row=payload.new||payload.old||{};if(String(row.conversation_id)===activeId){loadReactions().then(()=>{log.querySelectorAll('.vtg-wa-tools').forEach(x=>x.remove());decorateMessages();});}
 }).on('postgres_changes',{event:'*',schema:'public',table:'vtg_message_stars'},payload=>{
  const row=payload.new||payload.old||{};if(String(row.conversation_id)===activeId){loadReactions().then(()=>{log.querySelectorAll('.vtg-wa-tools').forEach(x=>x.remove());decorateMessages();});}
 }).on('postgres_changes',{event:'*',schema:'public',table:'vtg_conversation_pins'},payload=>{
  const row=payload.new||payload.old||{};if(String(row.conversation_id)===activeId)loadPinned();
 }).subscribe();
 callChannel=client.channel('vtg-calls-'+userId).on('postgres_changes',{event:'*',schema:'public',table:'vtg_calls'},payload=>{
  const r=payload.new||payload.old||{};
  if(payload.eventType==='DELETE'||r.status==='ended')delete liveCalls[r.conversation_id];
  else if(r.status==='active'){liveCalls[r.conversation_id]=r;if(payload.eventType==='INSERT'&&String(r.started_by)!==String(userId))window.VTGCalls?.incoming?.(r,convTitleById(r.conversation_id));}
  renderList();if(String(r.conversation_id)===activeId)refreshHeader();
 }).subscribe();
}
function convTitleById(id){const c=convs.find(x=>String(x.id)===String(id));return c?convTitle(c):'Trade chat';}

/* ---- new chat picker */
async function showPicker(){
 picker.hidden=false;picker.className='vtg-wa-picker';picker.innerHTML='<h4>Start a chat</h4><small>Loading your trade partners…</small>';
 try{
  if(!client)await boot();
  const {data,error}=await client.rpc('vtg_chat_contacts');if(error)throw error;
  if(!data?.length){picker.innerHTML='<h4>Start a chat</h4><small>No trade partners are linked to your account yet. Partners appear here once you share an order or letter of credit.</small><div class="row"><button type="button" class="vtg-wa-sidebtn ghost" data-cancel>Close</button></div>';return;}
  picker.innerHTML='<h4>Start a chat</h4><small>Pick 1 partner, or up to 4 for a group (5 people max).</small>'
   +data.map(c=>'<label><input type="checkbox" value="'+esc(c.user_id)+'"><span>'+esc(c.display_name)+'<small>'+esc(roleNames[c.role]||c.role)+'</small></span></label>').join('')
   +'<input type="text" data-grouptitle maxlength="80" placeholder="Group name (optional)" hidden><div class="err" data-pickerr></div><div class="row"><button type="button" class="vtg-wa-sidebtn" data-start>Start chat</button><button type="button" class="vtg-wa-sidebtn ghost" data-cancel>Cancel</button></div>';
 }catch(e){picker.innerHTML='<h4>Start a chat</h4><div class="err">'+esc(e.message||'Contacts could not be loaded')+'</div><div class="row"><button type="button" class="vtg-wa-sidebtn ghost" data-cancel>Close</button></div>';}
}
picker.addEventListener('change',e=>{
 const boxes=[...picker.querySelectorAll('input[type=checkbox]')],on=boxes.filter(b=>b.checked);
 if(on.length>4){e.target.checked=false;picker.querySelector('[data-pickerr]').textContent='A chat can have at most 5 people including you.';return;}
 picker.querySelector('[data-pickerr]').textContent='';
 const gt=picker.querySelector('[data-grouptitle]');if(gt)gt.hidden=on.length<2;
});
picker.addEventListener('click',async e=>{
 if(e.target.closest('[data-cancel]')){picker.hidden=true;return;}
 if(!e.target.closest('[data-start]'))return;
 const ids=[...picker.querySelectorAll('input[type=checkbox]:checked')].map(b=>b.value),err=picker.querySelector('[data-pickerr]');
 if(!ids.length){err.textContent='Choose at least one partner.';return;}
 try{
  const title=picker.querySelector('[data-grouptitle]')?.value||null;
  const {data,error}=await client.rpc('vtg_open_conversation',{p_partner_ids:ids,p_title:title});if(error)throw error;
  picker.hidden=true;delete memberCache[data];await loadList();await openConv(data);
 }catch(ex){err.textContent=ex.message||'Chat could not be started';}
});

/* ---- sending */
form.addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;const typed=input.value.trim(),items=picker2?picker2.items():[];if(!typed&&!items.length)return;const replyTarget=replyTo;const body=typed||ATT;
 if(!activeId){empty(log,'Choose a chat first, or start a new one.');return;}
 if(body.length>4000){return;}
 busy=true;sendBtn.disabled=true;input.value='';input.style.height='';replyTo=null;host.querySelector('[data-reply]')?.remove();isTyping=false;setTyping(false);replyTo=null;host.querySelector('[data-reply]')?.remove();isTyping=false;setTyping(false);
 const temp={id:'tmp-'+Date.now(),sender_id:userId,body,reply_to_message_id:replyTarget?.id||null,created_at:new Date().toISOString(),pending:true,localAtt:items.length?items.map(it=>({name:it.file.name,mime:it.mime,size:it.file.size,kind:it.kind,file:it.file})):null};
 if(picker2)picker2.clear();
 messages.push(temp);draw();
 try{
  const sendArgs={p_conversation_id:activeId,p_body:body};
  const {data:sendResult,error:sendError}=await client.rpc(replyTarget?'vtg_send_message_with_reply':'vtg_send_message',replyTarget?{...sendArgs,p_reply_to_message_id:replyTarget.id}:sendArgs);
  if(sendError)throw sendError;
  if(!sendResult?.ok){messages=messages.filter(x=>x.id!==temp.id);draw();input.value=typed;flash((sendResult?.message||'This message was blocked by VTG content rules')+' Warning '+Number(sendResult?.warning_count||1)+' in the last 30 days.');return;}
  const {data,error:readError}=await client.from('messages').select('id,sender_id,body,created_at,edited_at,deleted_at,hidden_at,reply_to_message_id').eq('id',sendResult.message_id).is('hidden_at',null).single();
  if(readError)throw readError;
  const i=messages.findIndex(x=>x.id===temp.id);
  if(i>=0){if(messages.some(x=>String(x.id)===String(data.id)))messages.splice(i,1);else messages[i]=data;}else if(!messages.some(x=>String(x.id)===String(data.id)))messages.push(data);
  const activeConv=convs.find(x=>String(x.id)===activeId);if(activeConv){activeConv.last_message=body===ATT?'Attachment':body;activeConv.last_at=data.created_at;convs.sort((a,b)=>new Date(b.last_at)-new Date(a.last_at));renderList();}
  draw();
  if(items.length){try{const rows=await window.VTGAttach.attachToMessage(client,userId,activeId,data.id,items);rows.forEach(addAtt);draw();}catch(ae){flash('Your message was sent, but the files could not be attached: '+(ae.message||'upload failed'));}}
 }catch(err){
  messages=messages.filter(x=>x.id!==temp.id);draw();input.value=typed;if(picker2&&items.length)flash('Files were not sent. Please attach them again.');
  const note=document.createElement('div');note.className='vtg-wa-empty';note.textContent='Message not sent: '+(err.message||'request failed');log.append(note);log.scrollTop=log.scrollHeight;
 }finally{busy=false;sendBtn.disabled=false;input.focus();}
});
input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,130)+'px';if(!isTyping){isTyping=true;setTyping(true);}clearTimeout(typingTimer);typingTimer=setTimeout(()=>{isTyping=false;setTyping(false);},1200);});
chatSearch?.addEventListener('input',renderList);
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit();}});

/* ---- calls */
function startCall(kind){
 if(!window.VTGCalls||!activeId)return;
 const c=convs.find(x=>String(x.id)===activeId);
 window.VTGCalls.start({client,userId,conversationId:activeId,kind,members,title:c?convTitle(c):'Trade chat'});
}
const voiceNoteBtn=document.createElement('button');voiceNoteBtn.type='button';voiceNoteBtn.className='vtg-wa-iconbtn vtg-wa-voice-note';voiceNoteBtn.dataset.voiceNote='';voiceNoteBtn.textContent='Voice note';voiceNoteBtn.title='Record a voice note';form.insertBefore(voiceNoteBtn,sendBtn);voiceNoteBtn.addEventListener('click',()=>{if(voiceNoteBtn.dataset.recording!=='true')startVoiceNote();});
clearBtn.addEventListener('click',requestClear);
voiceBtn.addEventListener('click',()=>startCall('voice'));
videoBtn.addEventListener('click',()=>startCall('video'));
$('[data-joincall]').addEventListener('click',()=>{
 const live=liveCalls[activeId];if(!live||!window.VTGCalls)return;
 const c=convs.find(x=>String(x.id)===activeId);
 window.VTGCalls.start({client,userId,conversationId:activeId,kind:live.kind,members,title:c?convTitle(c):'Trade chat'});
});

host.addEventListener('click',e=>{
 const messageRow=e.target.closest('.vtg-wa-row[data-msg-id]');if(messageRow&&!e.target.closest('a,button,audio,video,input,textarea')){selectMessage(messageRow.dataset.msgId);return;}
 const open=e.target.closest('[data-open]');if(open){openConv(open.dataset.open);return;}
 if(e.target.closest('[data-new]')){picker.hidden?showPicker():picker.hidden=true;return;}
 if(e.target.closest('[data-refresh]')){Object.keys(memberCache).forEach(k=>delete memberCache[k]);loadList();return;}
 if(e.target.closest('[data-clear-response]')){const b=e.target.closest('[data-clear-response]');respondClear(b.dataset.requestId,b.dataset.clearResponse==='yes');return;}
 if(e.target.closest('[data-back]')){host.classList.remove('is-open');}
});
log.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.vtg-wa-row[data-msg-id]')){e.preventDefault();selectMessage(e.target.dataset.msgId);}});
window.VTGPeerMessages={refresh:loadList,open:openConv,openWithCall(conversationId){return openConv(conversationId);}};
empty(log,'Choose a chat to read its messages.');
const start=()=>loadList().then(()=>{if(client)listen();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
