/* VTG messenger — WhatsApp-style chats between trade-linked buyers, suppliers and banks.
   Your own messages sit on the RIGHT; everyone else's sit on the LEFT (named, own colour in groups).
   Click a message for: react, reply, copy, share, forward, edit, star, pin, info, delete.
   Voice notes record/play like WhatsApp. Clearing a chat needs everyone else's agreement and then
   PERMANENTLY deletes the messages for all participants. All writes go through database RPCs. */
(function(){
'use strict';
const host=document.querySelector('[data-vtg-peer-chat]');
if(!host||!window.VTGChat||window.VTGMessenger)return;
const C=window.VTGChat,esc=C.esc,I=C.icons;
const role=String(document.documentElement.dataset.vtgRole||'').toLowerCase();
const roleNames={buyer:'Buyer',supplier:'Supplier',bank:'Bank',admin:'VTG'};
const BUCKET='vtg-chat-attachments';
const EMOJI=['👍','❤️','😂','😮','😢','🙏'];
const ic={
 chev:'<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
 clip:'<svg viewBox="0 0 24 24"><path d="m21 11-9.2 9.2a5 5 0 0 1-7-7L14 4a3.3 3.3 0 0 1 4.7 4.7l-9.2 9.2a1.7 1.7 0 0 1-2.4-2.4L15 7"/></svg>',
 trash:'<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6"/></svg>',
 pause:'<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>',
 play:'<svg viewBox="0 0 24 24" style="fill:currentColor"><path d="M7 4v16l13-8z"/></svg>',
 star:'<svg viewBox="0 0 24 24"><path d="m12 2 3 6.3 7 .9-5.1 4.8 1.3 6.9L12 17.5 5.8 20.9l1.3-6.9L2 9.2l7-.9z"/></svg>',
 pin:'<svg viewBox="0 0 24 24"><path d="M12 17v5M9 3h6l-1 7 3 3v2H7v-2l3-3z"/></svg>',
 reply:'<svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 6 6v3"/></svg>',
 copy:'<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',
 fwd:'<svg viewBox="0 0 24 24"><path d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0-6 6v3"/></svg>',
 share:'<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>',
 edit:'<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
 info:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
 dots:'<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/></svg>',
 x:'<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>',
 file:'<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
 block:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/></svg>',
 search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>'
};
host.className='vtgm';
host.dataset.viewerRole=role;
host.innerHTML=
 '<aside class="vtgm-side"><div class="vtgm-sidehead"><strong>Chats</strong><div class="vtgm-sidebtns"><button type="button" class="vtgm-btn" data-new>'+I.plus+' New chat</button><button type="button" class="vtgm-btn ghost" data-refresh>Refresh</button></div></div>'
 +'<label class="vtgm-search">'+ic.search+'<input type="search" data-chat-search placeholder="Search chats" aria-label="Search chats"></label>'
 +'<div class="vtgm-picker" data-picker hidden></div><div class="vtgm-list" data-list role="list"></div></aside>'
 +'<section class="vtgm-main"><div class="vtgm-welcome" data-welcome><div class="vtgm-welcome-mark">'+I.send+'</div><h3>VTG Messages</h3><p>Pick a chat or start a new one with a partner linked to your trade records.</p></div>'
 +'<div class="vtgm-pane" data-pane hidden>'
 +'<header class="vtgm-head"><button type="button" class="vtgm-icon vtgm-back" data-back aria-label="Back to chats">'+I.back+'</button><div class="vtgm-avatar" data-avatar>V</div><div class="vtgm-title"><strong data-title>Chat</strong><small data-sub></small></div>'
 +'<div class="vtgm-actions"><button type="button" class="vtgm-icon" data-voicecall aria-label="Voice call" title="Voice call">'+I.phone+'</button><button type="button" class="vtgm-icon" data-videocall aria-label="Video call" title="Video call">'+I.video+'</button><button type="button" class="vtgm-icon" data-menu aria-label="Chat menu" title="More">'+ic.dots+'</button></div></header>'
 +'<div class="vtgm-callbar" data-callbar hidden><span data-calltext></span><button type="button" data-joincall>Join</button></div>'
 +'<div class="vtgm-pinbar" data-pinbar hidden></div><div class="vtgm-clearbar" data-clearbar hidden></div>'
 +'<div class="vtgm-stream" data-log role="log" aria-live="polite"></div>'
 +'<div class="vtgm-typing" data-typing hidden></div>'
 +'<div class="vtgm-replybar" data-replybar hidden></div><div class="vtgm-filesbar" data-filesbar hidden></div>'
 +'<form class="vtgm-compose" data-form><button type="button" class="vtgm-icon" data-attach aria-label="Attach files" title="Attach">'+ic.clip+'</button><input type="file" data-file multiple hidden accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"><textarea data-input rows="1" maxlength="4000" placeholder="Type a message" aria-label="Type a message"></textarea><button class="vtgm-round" data-action type="button" aria-label="Record voice message">'+I.mic+'</button></form>'
 +'<div class="vtgm-rec" data-rec hidden><button type="button" class="vtgm-icon danger" data-rec-cancel aria-label="Delete recording">'+ic.trash+'</button><span class="vtgm-rec-dot"></span><span class="vtgm-rec-time" data-rec-time>0:00</span><canvas class="vtgm-rec-wave" data-rec-wave width="240" height="32"></canvas><button type="button" class="vtgm-icon" data-rec-pause aria-label="Pause recording">'+ic.pause+'</button><button class="vtgm-round" data-rec-send type="button" aria-label="Send voice message">'+I.send+'</button></div>'
 +'<div class="vtgm-note">Only people in a chat can read or send messages, and you can only chat with partners linked to your trade records. Do not share passwords, one-time codes or bank credentials.</div>'
 +'</div></section><div class="vtgm-layer" data-layer hidden></div><div class="vtgm-toasts" data-toasts aria-live="polite"></div>';
const $=s=>host.querySelector(s);
const el={list:$('[data-list]'),picker:$('[data-picker]'),search:$('[data-chat-search]'),welcome:$('[data-welcome]'),pane:$('[data-pane]'),title:$('[data-title]'),sub:$('[data-sub]'),avatar:$('[data-avatar]'),
 log:$('[data-log]'),form:$('[data-form]'),input:$('[data-input]'),action:$('[data-action]'),file:$('[data-file]'),replybar:$('[data-replybar]'),filesbar:$('[data-filesbar]'),
 pinbar:$('[data-pinbar]'),clearbar:$('[data-clearbar]'),callbar:$('[data-callbar]'),typing:$('[data-typing]'),layer:$('[data-layer]'),toasts:$('[data-toasts]'),rec:$('[data-rec]'),recTime:$('[data-rec-time]'),recWave:$('[data-rec-wave]')};
const S={client:null,me:'',convs:[],active:'',messages:[],pending:null,replyTo:null,files:[],busy:false,live:{},urls:new Map(),sending:false};
const same=(a,b)=>String(a??'').trim().toLowerCase()===String(b??'').trim().toLowerCase();
const mine=m=>same(m.sender_id,S.me);
const conv=id=>S.convs.find(c=>String(c.id)===String(id||S.active));
function toast(text,kind){const n=document.createElement('div');n.className='vtgm-toast'+(kind?' '+kind:'');n.textContent=text;el.toasts.append(n);setTimeout(()=>n.remove(),5200);}
function err(e){return (e&&(e.message||e.error_description))||'Something went wrong. Please try again.';}
async function rpc(name,args){const {data,error}=await S.client.rpc(name,args||{});if(error)throw error;return data;}
function others(c){return (c?.members||[]).filter(m=>!same(m.user_id,S.me));}
function convTitle(c){return c?.title||others(c).map(m=>m.name).join(', ')||'Trade chat';}
function tones(c){return C.toneMap((c?.members||[]).map(m=>m.user_id),S.me);}
function fmtDur(ms){const s=Math.max(0,Math.round(ms/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
function snippet(l){if(!l)return 'No messages yet';if(l.deleted)return '🚫 This message was deleted';const who=same(l.sender_id,S.me)?'You: ':'';
 if(l.kind==='voice')return who+'🎤 Voice message';if(l.kind==='image')return who+'📷 '+(l.body||'Photo');if(l.kind==='file')return who+'📎 '+(l.body||'File');return who+l.body;}

/* ---------- boot + chat list ---------- */
async function boot(){
 if(S.client)return;
 const s=await C.clientReady();S.client=s.client;S.me=String(s.userId||'').trim();
 if(!S.me)throw new Error('Your signed-in VTG account could not be identified. Please sign in again.');
 host.dataset.viewerId=S.me;
}
function empty(node,text){node.innerHTML='<div class="vtgm-empty">'+esc(text)+'</div>';}
async function loadList(){
 try{
  await boot();
  {const rows=await rpc('vtg_list_conversations');S.convs=Array.isArray(rows)?rows:[];}
  S.live={};S.convs.forEach(c=>{if(c.live_call)S.live[c.id]=c.live_call;});
  renderList();
  if(S.active&&conv())header();
  const inc=Object.entries(S.live).find(([id,k])=>!same(k.started_by,S.me)&&!S.seenCalls?.has(k.id));
  if(inc){(S.seenCalls=S.seenCalls||new Set()).add(inc[1].id);window.VTGCalls?.incoming?.({...inc[1],conversation_id:inc[0]},convTitle(conv(inc[0])));}
 }catch(e){el.list.innerHTML='<div class="vtgm-empty">Chats could not be loaded: '+esc(err(e))+'<br><br><button type="button" class="vtgm-btn" data-refresh>Try again</button></div>';}
}
function renderList(){
 const q=(el.search.value||'').trim().toLowerCase();
 const rows=S.convs.filter(c=>(convTitle(c)+' '+snippet(c.last)).toLowerCase().includes(q));
 if(!S.convs.length){empty(el.list,'No chats yet. Tap “New chat” to message a partner linked to your trade records.');return;}
 if(!rows.length){empty(el.list,'No matching chats.');return;}
 el.list.innerHTML=rows.map(c=>{const t=convTitle(c),u=Number(c.unread||0),live=S.live[c.id];
  return '<button type="button" role="listitem" class="vtgm-item'+(String(c.id)===String(S.active)?' active':'')+'" data-open="'+esc(c.id)+'"><div class="vtgm-avatar">'+esc(C.initials(t))+'</div><div class="vtgm-item-body"><div class="vtgm-item-top"><strong>'+esc(t)+'</strong><time>'+(c.last?esc(C.time(c.last.created_at)):'')+'</time></div><div class="vtgm-item-bot"><span>'+(live?'📞 Call in progress':esc(snippet(c.last)))+'</span>'+(u?'<b class="vtgm-badge">'+(u>99?'99+':u)+'</b>':'')+'</div></div></button>';}).join('');
}
function header(){
 const c=conv();if(!c)return;const t=convTitle(c),n=(c.members||[]).length;
 el.title.textContent=t;el.avatar.textContent=C.initials(t);
 const o=others(c);
 el.sub.textContent=n>2?n+' people · '+(c.members||[]).map(m=>same(m.user_id,S.me)?'You':m.name).join(', '):(o[0]?(roleNames[o[0].role]||'Trade partner'):'Trade partner');
 const canCall=n>=2&&n<=5&&!!window.VTGCalls;$('[data-voicecall]').disabled=$('[data-videocall]').disabled=!canCall;
 const live=S.live[c.id];el.callbar.hidden=!live;if(live)$('[data-calltext]').textContent='A '+live.kind+' call is in progress in this chat.';
}

/* ---------- opening a chat + messages ---------- */
async function openChat(id){
 S.active=String(id);S.replyTo=null;S.files=[];S.pending=null;
 host.classList.add('chat-open');el.welcome.hidden=true;el.pane.hidden=false;
 el.input.value='';autosize();syncAction();drawReply();drawFiles();renderList();header();
 empty(el.log,'Loading messages…');
 await loadMessages();
 try{await rpc('vtg_mark_read',{p_conversation_id:S.active});}catch(_){}
 await loadClear();subscribeTyping();loadList();
}
async function loadMessages(){
 const id=S.active;if(!id)return;
 try{
  const rows=await rpc('vtg_get_messages',{p_conversation_id:id,p_limit:300});
  if(id!==S.active)return;
  S.messages=Array.isArray(rows)?rows:[];draw();drawPins();
 }catch(e){if(id===S.active)empty(el.log,'Messages could not be loaded: '+err(e));}
}
function groupName(c,m){const mem=(c?.members||[]).find(x=>same(x.user_id,m.sender_id));return mem?.name||'Trade partner';}
function statusIcon(m){if(!mine(m)||m.deleted)return '';const s=m.status||'sent';
 return '<span class="vtgm-ticks '+s+'" title="'+s+'">'+(s==='sent'?'<svg viewBox="0 0 24 24"><path d="m5 13 4 4L19 7"/></svg>':I.tick)+'</span>';}
function attHtml(m){
 const a=(m.attachments||[]);if(!a.length)return '';
 if(m.kind==='voice'&&a[0])return voiceHtml(m,a[0]);
 return '<div class="vtgm-atts">'+a.map(x=>{
  if(x.kind==='image')return '<button type="button" class="vtgm-img" data-img="'+esc(x.path)+'" aria-label="Open photo '+esc(x.name)+'"><img alt="'+esc(x.name)+'" data-src="'+esc(x.path)+'"></button>';
  return '<button type="button" class="vtgm-file" data-dl="'+esc(x.path)+'" data-name="'+esc(x.name)+'">'+ic.file+'<span><b>'+esc(x.name)+'</b><small>'+esc(window.VTGAttach?.size?.(x.size)||'')+'</small></span></button>';}).join('')+'</div>';
}
function voiceHtml(m,a){
 const wf=Array.isArray(m.voice_waveform)&&m.voice_waveform.length?m.voice_waveform:Array.from({length:32},(_,i)=>20+((i*37)%60));
 const max=Math.max(...wf,1);
 const bars=wf.map(v=>'<i style="height:'+Math.max(12,Math.round(v/max*100))+'%"></i>').join('');
 const heard=m.played||mine(m)&&m.played;
 return '<div class="vtgm-voice'+(heard?' heard':'')+'" data-voice="'+esc(m.id)+'" data-path="'+esc(a.path)+'" data-dur="'+(m.voice_duration_ms||0)+'"><button type="button" class="vtgm-vplay" data-vplay aria-label="Play voice message">'+ic.play+'</button><div class="vtgm-vbody"><div class="vtgm-vwave" data-vwave>'+bars+'<span class="vtgm-vknob" data-vknob></span></div><div class="vtgm-vmeta"><span data-vtime>'+fmtDur(m.voice_duration_ms||0)+'</span><button type="button" class="vtgm-vspeed" data-vspeed hidden>1×</button></div></div>'+(!mine(m)&&!m.played?'<span class="vtgm-vdot" title="Not played yet"></span>':'')+'</div>';
}
function replyHtml(m){
 const r=m.reply;if(!r)return '';
 const who=same(r.sender_id,S.me)?'You':groupName(conv(),r);
 const txt=r.deleted?'🚫 This message was deleted':r.kind==='voice'?'🎤 Voice message':r.kind==='image'?'📷 Photo':r.kind==='file'?'📎 File':r.body;
 return '<button type="button" class="vtgm-quote" data-jump="'+esc(r.id)+'"><b>'+esc(who)+'</b><span>'+esc(txt)+'</span></button>';
}
function reactHtml(m){
 const r=m.reactions||[];if(!r.length)return '';
 const by={};r.forEach(x=>{(by[x.emoji]=by[x.emoji]||[]).push(x.user_id);});
 return '<div class="vtgm-reacts">'+Object.entries(by).map(([e,u])=>'<button type="button" class="vtgm-react'+(u.some(x=>same(x,S.me))?' me':'')+'" data-react="'+esc(e)+'" data-mid="'+esc(m.id)+'">'+esc(e)+(u.length>1?'<small>'+u.length+'</small>':'')+'</button>').join('')+'</div>';
}
function rowHtml(m,prev,c,tn){
 const self=mine(m),isGroup=!!c?.is_group||(c?.members||[]).length>2;
 const side=self?'is-self':'is-other';
 const dayHdr=!prev||C.day(prev.created_at)!==C.day(m.created_at)?'<div class="vtgm-day"><span>'+esc(C.day(m.created_at))+'</span></div>':'';
 const first=!prev||prev.sender_id!==m.sender_id||dayHdr;
 const tone=tn[String(m.sender_id)]??0;
 let inner;
 if(m.deleted){inner='<div class="vtgm-del">'+ic.block+'<span>'+(self?'You deleted this message':'This message was deleted')+'</span></div>';}
 else{
  inner=(isGroup&&!self&&first?'<div class="vtgm-name tone'+tone+'">'+esc(groupName(c,m))+'</div>':'')
   +(m.forwarded?'<div class="vtgm-fwd">'+ic.fwd+' Forwarded</div>':'')+replyHtml(m)+attHtml(m)
   +(m.kind==='text'||m.body?'<div class="vtgm-text">'+C.markdown(m.body)+'</div>':'');
 }
 const foot='<span class="vtgm-meta">'+(m.starred?'<span class="vtgm-mstar">'+ic.star+'</span>':'')+(m.pinned?'<span class="vtgm-mpin">'+ic.pin+'</span>':'')+(m.edited_at&&!m.deleted?'<em>edited</em>':'')+'<time>'+esc(C.time(m.created_at))+'</time>'+statusIcon(m)+'</span>';
 return dayHdr+'<div class="vtgm-row '+side+(first?' first':'')+'" data-mid="'+esc(m.id)+'" data-side="'+(self?'outgoing':'incoming')+'" data-sender="'+esc(m.sender_id)+'" style="display:flex;justify-content:'+(self?'flex-end':'flex-start')+'">'
  +'<div class="vtgm-bubble'+(m.kind==='voice'?' voice':'')+(m.deleted?' deleted':'')+(isGroup&&!self?' tone'+tone:'')+'" role="button" tabindex="0" aria-haspopup="menu" aria-label="Message options">'+inner+(m.deleted?'':'<button type="button" class="vtgm-chev" data-chev aria-label="Message options">'+ic.chev+'</button>')+foot+reactHtml(m)+'</div></div>';
}
function draw(keep){
 const c=conv(),tn=tones(c),atBottom=el.log.scrollHeight-el.log.scrollTop-el.log.clientHeight<140;
 if(!S.messages.length&&!S.pending){empty(el.log,'No messages yet. Say hello below.');return;}
 const list=S.pending?S.messages.concat([S.pending]):S.messages;
 el.log.innerHTML=list.map((m,i)=>rowHtml(m,list[i-1],c,tn)).join('');
 hydrateMedia();
 if(!keep||atBottom)el.log.scrollTop=el.log.scrollHeight;
}
async function url(path){return window.VTGAttach.signedUrl(S.client,BUCKET,path);}
function hydrateMedia(){
 el.log.querySelectorAll('img[data-src]').forEach(async img=>{if(img.src)return;try{img.src=await url(img.dataset.src);}catch(_){img.alt='Photo unavailable';}});
}
function drawPins(){
 const p=S.messages.filter(m=>m.pinned&&!m.deleted);
 if(!p.length){el.pinbar.hidden=true;return;}
 el.pinbar.hidden=false;
 const m=p[p.length-1];
 el.pinbar.innerHTML=ic.pin+'<button type="button" data-jump="'+esc(m.id)+'"><b>Pinned message'+(p.length>1?' ('+p.length+')':'')+'</b><span>'+esc(m.kind==='voice'?'🎤 Voice message':m.body||'Attachment')+'</span></button>';
}

/* ---------- composer ---------- */
function autosize(){el.input.style.height='auto';el.input.style.height=Math.min(el.input.scrollHeight,130)+'px';}
function syncAction(){
 const has=el.input.value.trim().length>0||S.files.length>0;
 el.action.innerHTML=has?I.send:I.mic;el.action.dataset.mode=has?'send':'mic';
 el.action.setAttribute('aria-label',has?'Send message':'Record voice message');
}
function drawReply(){
 const r=S.replyTo;if(!r){el.replybar.hidden=true;el.replybar.innerHTML='';return;}
 const who=mine(r)?'You':groupName(conv(),r);
 el.replybar.hidden=false;
 el.replybar.innerHTML='<div><b>'+esc(who)+'</b><span>'+esc(r.kind==='voice'?'🎤 Voice message':r.body||'Attachment')+'</span></div><button type="button" class="vtgm-icon" data-cancel-reply aria-label="Cancel reply">'+ic.x+'</button>';
}
function drawFiles(){
 if(!S.files.length){el.filesbar.hidden=true;el.filesbar.innerHTML='';return;}
 el.filesbar.hidden=false;
 el.filesbar.innerHTML=S.files.map((f,i)=>'<span class="vtgm-chip">'+ic.file+esc(f.file.name)+' <small>'+esc(window.VTGAttach.size(f.file.size))+'</small><button type="button" data-rmfile="'+i+'" aria-label="Remove '+esc(f.file.name)+'">'+ic.x+'</button></span>').join('');
}
function addFiles(list){
 if(!window.VTGAttach){toast('Attachments are not available right now.','warn');return;}
 const {ok,errors}=window.VTGAttach.check(Array.from(list),'chat',S.files.length);
 errors.forEach(e=>toast(e,'warn'));S.files=S.files.concat(ok);drawFiles();syncAction();
}
function uid(){return crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random().toString(16).slice(2);}
function safe(n){return String(n||'file').normalize('NFKD').replace(/[^\w.\- ]+/g,'_').replace(/\s+/g,'_').replace(/^\.+/,'').slice(-90)||'file';}
async function sendCurrent(){
 if(S.sending||!S.active)return;
 const text=el.input.value.trim(),files=S.files.slice();
 if(!text&&!files.length)return;
 S.sending=true;el.action.disabled=true;
 const convId=S.active,reply=S.replyTo?.id||null;
 try{
  let res;
  if(files.length){
   const items=[];
   for(const f of files){
    const path=convId+'/'+S.me+'/'+uid()+'-'+safe(f.file.name);
    const {error}=await S.client.storage.from(BUCKET).upload(path,f.file,{contentType:f.mime,upsert:false});
    if(error)throw new Error(f.file.name+': '+err(error));
    items.push({path,name:f.file.name,mime:f.mime,size:f.file.size});
   }
   res=await rpc('vtg_send_file_message',{p_conversation_id:convId,p_files:items,p_caption:text,p_reply_to:reply,p_forwarded:false});
  }else{
   res=await rpc('vtg_send_message',{p_conversation_id:convId,p_body:text,p_reply_to:reply,p_forwarded:false});
  }
  if(res&&res.ok===false){toast(res.message||'Your message was not sent.','warn');return;}
  el.input.value='';S.files=[];S.replyTo=null;autosize();drawFiles();drawReply();syncAction();
  await loadMessages();loadList();
 }catch(e){toast('Message not sent: '+err(e),'warn');}
 finally{S.sending=false;el.action.disabled=false;el.input.focus();}
}

/* ---------- voice notes (WhatsApp-style recorder) ---------- */
const R={rec:null,stream:null,chunks:[],start:0,elapsed:0,paused:false,timer:null,raf:0,ctx:null,an:null,peaks:[],cancel:false};
function pickMime(){const t=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus'];return t.find(x=>window.MediaRecorder&&MediaRecorder.isTypeSupported?.(x))||'';}
async function recStart(){
 if(!window.MediaRecorder||!navigator.mediaDevices?.getUserMedia){toast('Voice messages are not supported in this browser.','warn');return;}
 try{R.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});}
 catch(_){toast('Allow microphone access in your browser to record a voice message.','warn');return;}
 R.chunks=[];R.peaks=[];R.cancel=false;R.paused=false;R.elapsed=0;R.start=Date.now();
 const mt=pickMime();R.rec=new MediaRecorder(R.stream,mt?{mimeType:mt}:undefined);
 R.rec.ondataavailable=e=>{if(e.data&&e.data.size)R.chunks.push(e.data);};
 R.rec.onstop=recFinish;R.rec.start(250);
 try{R.ctx=new (window.AudioContext||window.webkitAudioContext)();R.an=R.ctx.createAnalyser();R.an.fftSize=256;R.ctx.createMediaStreamSource(R.stream).connect(R.an);}catch(_){R.an=null;}
 el.form.hidden=true;el.rec.hidden=false;$('[data-rec-pause]').innerHTML=ic.pause;
 R.timer=setInterval(()=>{if(!R.paused){R.elapsed=Date.now()-R.start;el.recTime.textContent=fmtDur(R.elapsed);if(R.elapsed>=15*60*1000)recStop(false);}},200);
 recLoop();
}
function recLoop(){
 const cv=el.recWave,g=cv.getContext('2d');
 const buf=R.an?new Uint8Array(R.an.frequencyBinCount):null;
 let last=0;const bars=[];
 const step=t=>{
  if(!R.rec)return;
  if(R.an&&!R.paused){R.an.getByteTimeDomainData(buf);let m=0;for(const v of buf)m=Math.max(m,Math.abs(v-128));
   if(t-last>90){bars.push(m/128);if(bars.length>48)bars.shift();R.peaks.push(Math.round(m/128*100));last=t;}}
  g.clearRect(0,0,cv.width,cv.height);g.fillStyle=getComputedStyle(host).getPropertyValue('--m-muted')||'#64748b';
  bars.forEach((v,i)=>{const h=Math.max(3,v*cv.height);g.fillRect(i*5,(cv.height-h)/2,3,h);});
  R.raf=requestAnimationFrame(step);
 };
 R.raf=requestAnimationFrame(step);
}
function recCleanup(){
 clearInterval(R.timer);cancelAnimationFrame(R.raf);
 R.stream?.getTracks().forEach(t=>t.stop());try{R.ctx?.close();}catch(_){}
 R.stream=null;R.ctx=null;R.an=null;el.rec.hidden=true;el.form.hidden=false;
}
function recStop(cancel){R.cancel=!!cancel;if(R.rec&&R.rec.state!=='inactive')R.rec.stop();else{recCleanup();R.rec=null;}}
function sample(peaks,n){if(!peaks.length)return Array.from({length:n},()=>20);const out=[];const k=peaks.length/n;for(let i=0;i<n;i++){const a=Math.floor(i*k),b=Math.max(a+1,Math.floor((i+1)*k));out.push(Math.max(...peaks.slice(a,b)));}return out;}
async function recFinish(){
 const cancel=R.cancel,dur=R.elapsed||Date.now()-R.start,type=R.rec?.mimeType||'audio/webm',chunks=R.chunks,peaks=R.peaks.slice();
 recCleanup();R.rec=null;
 if(cancel||!chunks.length)return;
 if(dur<1000){toast('Hold on a little longer to record a voice message.');return;}
 const mime=(type.split(';')[0]||'audio/webm'),ext=mime.includes('mp4')?'m4a':mime.includes('ogg')?'ogg':'webm';
 const blob=new Blob(chunks,{type:mime}),convId=S.active;
 if(blob.size>10*1048576){toast('That voice message is too large (10 MB maximum).','warn');return;}
 const path=convId+'/'+S.me+'/'+uid()+'-voice-note.'+ext;
 S.pending={id:'pending',sender_id:S.me,kind:'voice',body:'',created_at:new Date().toISOString(),voice_duration_ms:dur,voice_waveform:sample(peaks,40),attachments:[],status:'sent',reactions:[]};
 draw();
 try{
  const {error}=await S.client.storage.from(BUCKET).upload(path,blob,{contentType:mime,upsert:false});
  if(error)throw error;
  const res=await rpc('vtg_send_voice_note',{p_conversation_id:convId,p_storage_path:path,p_duration_ms:Math.round(dur),p_waveform:sample(peaks,40),p_mime:mime,p_size:blob.size,p_reply_to:S.replyTo?.id||null,p_forwarded:false});
  if(res&&res.ok===false)throw new Error(res.message||'Voice message not sent.');
  S.replyTo=null;drawReply();
 }catch(e){toast('Voice message not sent: '+err(e),'warn');try{await S.client.storage.from(BUCKET).remove([path]);}catch(_){}}
 S.pending=null;await loadMessages();loadList();
}
function recTogglePause(){
 if(!R.rec)return;
 if(R.paused){R.rec.resume();R.start=Date.now()-R.elapsed;R.paused=false;$('[data-rec-pause]').innerHTML=ic.pause;}
 else{R.rec.pause();R.paused=true;$('[data-rec-pause]').innerHTML=ic.mic;}
}

/* voice playback */
let audio=null,playing=null;
function vUI(node){return {btn:node.querySelector('[data-vplay]'),time:node.querySelector('[data-vtime]'),knob:node.querySelector('[data-vknob]'),wave:node.querySelector('[data-vwave]'),speed:node.querySelector('[data-vspeed]')};}
function vStop(){if(audio){audio.pause();}if(playing){const u=vUI(playing);u.btn.innerHTML=ic.play;playing.classList.remove('playing');}}
async function vPlay(node){
 if(playing===node&&audio&&!audio.paused){audio.pause();vUI(node).btn.innerHTML=ic.play;node.classList.remove('playing');return;}
 if(playing===node&&audio&&audio.paused){await audio.play();vUI(node).btn.innerHTML=ic.pause;node.classList.add('playing');return;}
 vStop();playing=node;const u=vUI(node);
 try{
  audio=new Audio(await url(node.dataset.path));audio.playbackRate=Number(node.dataset.rate||1);
  const dur=Number(node.dataset.dur||0)/1000;
  audio.ontimeupdate=()=>{const d=audio.duration&&isFinite(audio.duration)?audio.duration:dur;const p=d?audio.currentTime/d:0;
   u.knob.style.left=Math.min(100,p*100)+'%';u.wave.style.setProperty('--p',Math.min(100,p*100)+'%');const bs=u.wave.querySelectorAll('i'),k=Math.floor(p*bs.length);bs.forEach((b,i)=>{b.style.opacity=i<k?'1':'';});u.time.textContent=fmtDur(audio.currentTime*1000);};
  audio.onended=()=>{u.btn.innerHTML=ic.play;node.classList.remove('playing');u.knob.style.left='0';u.wave.style.setProperty('--p','0%');u.wave.querySelectorAll('i').forEach(b=>{b.style.opacity='';});u.time.textContent=fmtDur(dur*1000);u.speed.hidden=true;playing=null;};
  await audio.play();u.btn.innerHTML=ic.pause;node.classList.add('playing');u.speed.hidden=false;
  const row=node.closest('[data-mid]');if(row?.dataset.side==='incoming'){node.classList.add('heard');node.querySelector('.vtgm-vdot')?.remove();try{await rpc('vtg_mark_played',{p_message_id:node.dataset.voice});}catch(_){}}
 }catch(e){toast('Could not play this voice message.','warn');vStop();}
}

/* ---------- message menu ---------- */
function closeLayer(){el.layer.hidden=true;el.layer.innerHTML='';el.layer.className='vtgm-layer';document.removeEventListener('keydown',escClose);}
function escClose(e){if(e.key==='Escape')closeLayer();}
function msgById(id){return S.messages.find(m=>String(m.id)===String(id));}
function openMenu(mid,anchor){
 const m=msgById(mid);if(!m||m.deleted)return;
 const self=mine(m),age=Date.now()-new Date(m.created_at).getTime();
 const items=[];
 items.push(['reply','Reply',ic.reply]);
 if(m.kind==='text'||m.body)items.push(['copy','Copy',ic.copy]);
 items.push(['share','Share',ic.share]);
 items.push(['forward','Forward',ic.fwd]);
 if(self&&m.kind==='text'&&age<15*60*1000)items.push(['edit','Edit',ic.edit]);
 items.push(['star',m.starred?'Unstar':'Star',ic.star]);
 items.push(['pin',m.pinned?'Unpin':'Pin',ic.pin]);
 if(self)items.push(['info','Message info',ic.info]);
 items.push(['delete','Delete',ic.trash,true]);
 el.layer.hidden=false;el.layer.className='vtgm-layer menu';
 const my=(m.reactions||[]).find(r=>same(r.user_id,S.me))?.emoji;
 el.layer.innerHTML='<div class="vtgm-scrim" data-close></div><div class="vtgm-menu" role="menu" aria-label="Message options"><div class="vtgm-emojis">'+EMOJI.map(e=>'<button type="button" data-emoji="'+e+'" class="'+(my===e?'on':'')+'" aria-label="React '+e+'">'+e+'</button>').join('')+'</div>'
  +items.map(([k,l,i,d])=>'<button type="button" role="menuitem" data-do="'+k+'" class="'+(d?'danger':'')+'">'+i+'<span>'+l+'</span></button>').join('')+'</div>';
 el.layer.dataset.mid=mid;
 const menu=el.layer.querySelector('.vtgm-menu');
 const hr=host.getBoundingClientRect(),ar=anchor?.getBoundingClientRect?.();
 if(ar&&window.innerWidth>760){let left=self?ar.right-hr.left-menu.offsetWidth:ar.left-hr.left,top=ar.bottom-hr.top+6;
  left=Math.max(8,Math.min(left,hr.width-menu.offsetWidth-8));top=Math.max(8,Math.min(top,hr.height-menu.offsetHeight-8));menu.style.left=left+'px';menu.style.top=top+'px';menu.classList.add('floating');}
 document.addEventListener('keydown',escClose);menu.querySelector('button')?.focus();
}
async function menuAction(kind,mid){
 const m=msgById(mid);if(!m)return;
 closeLayer();
 try{
  if(kind==='reply'){S.replyTo=m;drawReply();el.input.focus();}
  else if(kind==='copy'){await navigator.clipboard.writeText(m.body||'');toast('Copied');}
  else if(kind==='share'){const t=m.kind==='voice'?'Voice message from VTG':(m.body||'');
   if(navigator.share){try{await navigator.share({title:'VTG message',text:t});}catch(_){}}else{await navigator.clipboard.writeText(t);toast('Message copied so you can share it anywhere.');}}
  else if(kind==='forward')openForward(m);
  else if(kind==='edit')openEdit(m);
  else if(kind==='star'){await rpc('vtg_toggle_star',{p_message_id:mid});await loadMessages();}
  else if(kind==='pin'){await rpc('vtg_toggle_pin',{p_message_id:mid});await loadMessages();}
  else if(kind==='info')openInfo(m);
  else if(kind==='delete')openDelete(m);
 }catch(e){toast(err(e),'warn');}
}
function dialog(html,cls){el.layer.hidden=false;el.layer.className='vtgm-layer dialog'+(cls?' '+cls:'');el.layer.innerHTML='<div class="vtgm-scrim" data-close></div><div class="vtgm-dialog" role="dialog" aria-modal="true">'+html+'</div>';document.addEventListener('keydown',escClose);el.layer.querySelector('.vtgm-dialog button,.vtgm-dialog textarea')?.focus();}
function openDelete(m){
 const canAll=mine(m)&&Date.now()-new Date(m.created_at).getTime()<48*3600*1000;
 dialog('<h4>Delete message?</h4><div class="vtgm-dlg-actions col">'+(canAll?'<button type="button" class="danger" data-del="everyone">Delete for everyone</button>':'')+'<button type="button" class="danger" data-del="me">Delete for me</button><button type="button" data-close>Cancel</button></div>');
 el.layer.dataset.mid=m.id;
}
function openEdit(m){
 dialog('<h4>Edit message</h4><textarea data-edit-text maxlength="4000" rows="4">'+esc(m.body)+'</textarea><div class="vtgm-dlg-actions"><button type="button" data-close>Cancel</button><button type="button" class="primary" data-edit-save>Save</button></div>');
 el.layer.dataset.mid=m.id;
}
async function openInfo(m){
 dialog('<h4>Message info</h4><div data-info class="vtgm-info">Loading…</div><div class="vtgm-dlg-actions"><button type="button" data-close>Close</button></div>');
 try{
  const d=await rpc('vtg_message_info',{p_message_id:m.id});
  const f=t=>t?new Date(t).toLocaleString([], {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'—';
  el.layer.querySelector('[data-info]').innerHTML='<p>Sent '+esc(f(d.sent_at))+'</p>'+(d.recipients||[]).map(r=>'<div class="vtgm-info-row"><b>'+esc(r.name)+'</b><span>Delivered: '+esc(f(r.delivered_at))+'</span><span>Read: '+esc(f(r.read_at))+'</span>'+(m.kind==='voice'?'<span>Played: '+esc(f(r.played_at))+'</span>':'')+'</div>').join('');
 }catch(e){el.layer.querySelector('[data-info]').textContent=err(e);}
}
function openForward(m){
 const list=S.convs.map(c=>'<button type="button" class="vtgm-fwd-item" data-fwdto="'+esc(c.id)+'"><div class="vtgm-avatar">'+esc(C.initials(convTitle(c)))+'</div><span>'+esc(convTitle(c))+'</span></button>').join('')||'<p>You have no other chats yet.</p>';
 dialog('<h4>Forward to…</h4><div class="vtgm-fwd-list">'+list+'</div><div class="vtgm-dlg-actions"><button type="button" data-close>Cancel</button></div>');
 el.layer.dataset.mid=m.id;
}
async function doForward(toId){
 const m=msgById(el.layer.dataset.mid);closeLayer();if(!m)return;
 try{
  if(m.kind==='voice'||(m.attachments||[]).length){toast('Only text messages can be forwarded for now.','warn');return;}
  const r=await rpc('vtg_send_message',{p_conversation_id:toId,p_body:m.body,p_reply_to:null,p_forwarded:true});
  if(r&&r.ok===false){toast(r.message||'Not forwarded.','warn');return;}
  toast('Message forwarded');loadList();if(String(toId)===S.active)loadMessages();
 }catch(e){toast(err(e),'warn');}
}

/* ---------- clear chat (everyone must agree, then permanently deleted) ---------- */
let pendingClear=null;
async function loadClear(){
 const id=S.active;if(!id)return;
 try{pendingClear=await rpc('vtg_pending_chat_clear',{p_conversation_id:id});}catch(_){pendingClear=null;}
 if(id!==S.active)return;drawClear();
}
function drawClear(){
 const p=pendingClear,bar=el.clearbar;
 if(!p){bar.hidden=true;bar.innerHTML='';return;}
 bar.hidden=false;
 if(p.mine)bar.innerHTML='<span>You asked to clear this chat. It is permanently deleted for everyone once the other '+(p.total>2?'participants agree ('+p.approvals+' of '+p.total+' agreed).':'person agrees.')+'</span><button type="button" data-clear-cancel="'+esc(p.id)+'">Cancel request</button>';
 else if(p.i_approved)bar.innerHTML='<span>You agreed to clear this chat. Waiting for the others ('+p.approvals+' of '+p.total+').</span>';
 else bar.innerHTML='<span><b>'+esc(p.requester_name)+'</b> wants to clear this chat for everyone. Agreeing permanently deletes all messages for all participants.</span><button type="button" class="primary" data-clear-yes="'+esc(p.id)+'">Agree</button><button type="button" data-clear-no="'+esc(p.id)+'">Decline</button>';
}
function openClearConfirm(){
 const c=conv(),n=(c?.members||[]).length;
 dialog('<h4>Clear this chat?</h4><p>'+(n>2?'Every other participant must agree. ':'The other person must agree. ')+'Once everyone agrees, all messages, voice notes and files are <b>permanently deleted for everyone</b> and cannot be recovered.</p><div class="vtgm-dlg-actions"><button type="button" data-close>Cancel</button><button type="button" class="danger" data-clear-send>Send clear request</button></div>');
}
async function clearRespond(id,approve){
 try{const r=await rpc('vtg_respond_chat_clear',{p_request_id:id,p_approve:approve});toast(r?.message||'Done',r?.ok===false?'warn':'');await afterClear();}
 catch(e){toast(err(e),'warn');}
}
async function afterClear(){
 await loadClear();await loadMessages();await loadList();
 if(S.active)sweepFiles(S.active);
}
async function sweepFiles(convId){
 try{const paths=await rpc('vtg_claim_orphan_chat_files',{p_conversation_id:convId});if(paths?.length)await S.client.storage.from(BUCKET).remove(paths);}catch(_){}
}
/* A clear request in ANY of my chats pops up for me even if I am looking at another chat. */
function popupClear(req){
 if(same(req.requested_by,S.me)||req.status!=='pending')return;
 const c=conv(req.conversation_id),who=c?(c.members||[]).find(m=>same(m.user_id,req.requested_by))?.name:'A participant';
 const n=document.createElement('div');n.className='vtgm-toast ask';
 n.innerHTML='<b>'+esc(who||'A participant')+'</b> wants to clear the chat “'+esc(c?convTitle(c):'Trade chat')+'” for everyone.<div class="vtgm-toast-actions"><button type="button" class="primary" data-ty>Agree</button><button type="button" data-tn>Decline</button><button type="button" data-tv>View</button></div>';
 n.querySelector('[data-ty]').onclick=()=>{n.remove();clearRespond(req.id,true);};
 n.querySelector('[data-tn]').onclick=()=>{n.remove();clearRespond(req.id,false);};
 n.querySelector('[data-tv]').onclick=()=>{n.remove();document.querySelector('[data-page="messages"],[data-nav="messages"],[data-view="messages"]')?.click?.();openChat(req.conversation_id);};
 el.toasts.append(n);
}

/* ---------- new chat ---------- */
async function openPicker(){
 el.picker.hidden=false;el.picker.innerHTML='<div class="vtgm-empty">Loading partners…</div>';
 try{
  await boot();const rawp=await rpc('vtg_chat_contacts');const people=Array.isArray(rawp)?rawp:[];
  if(!people.length){el.picker.innerHTML='<div class="vtgm-empty">No linked partners yet. Partners appear here after a quote, order or finance request links your accounts.</div><button type="button" class="vtgm-btn ghost" data-picker-close>Close</button>';return;}
  el.picker.innerHTML='<div class="vtgm-picker-head"><strong>Start a chat</strong><small>Pick 1 partner, or up to 4 for a group.</small></div><div class="vtgm-picker-list">'+people.map(p=>'<label class="vtgm-pick"><input type="checkbox" value="'+esc(p.user_id)+'"><span><b>'+esc(p.display_name)+'</b><small>'+esc(roleNames[p.role]||p.role)+'</small></span></label>').join('')+'</div><input class="vtgm-gtitle" data-gtitle maxlength="80" placeholder="Group name (optional)" hidden><div class="vtgm-picker-actions"><button type="button" class="vtgm-btn" data-picker-go>Start chat</button><button type="button" class="vtgm-btn ghost" data-picker-close>Cancel</button></div>';
 }catch(e){el.picker.innerHTML='<div class="vtgm-empty">'+esc(err(e))+'</div><button type="button" class="vtgm-btn ghost" data-picker-close>Close</button>';}
}
async function startChat(){
 const ids=Array.from(el.picker.querySelectorAll('input[type=checkbox]:checked')).map(x=>x.value);
 if(!ids.length||ids.length>4){toast('Choose between 1 and 4 partners.','warn');return;}
 try{const id=await rpc('vtg_open_conversation',{p_partner_ids:ids,p_title:el.picker.querySelector('[data-gtitle]')?.value||null});el.picker.hidden=true;await loadList();await openChat(id);}
 catch(e){toast(err(e),'warn');}
}

/* ---------- realtime ---------- */
let rtTimer=null,typingCh=null,typingTimer=null,lastTypingSent=0;
function later(fn,ms){clearTimeout(rtTimer);rtTimer=setTimeout(fn,ms||350);}
async function listen(){
 await boot();
 const ch=S.client.channel('vtgm-'+S.me);
 const watch=(table,fn)=>ch.on('postgres_changes',{event:'*',schema:'public',table},fn);
 const refresh=()=>later(async()=>{await loadList();if(S.active){await loadMessages();try{await rpc('vtg_mark_delivered',{p_conversation_id:S.active});}catch(_){}if(!document.hidden&&host.offsetParent)try{await rpc('vtg_mark_read',{p_conversation_id:S.active});}catch(_){}}});
 ['messages','vtg_message_receipts','vtg_message_reactions','vtg_conversation_pins','vtg_chat_attachments'].forEach(t=>watch(t,refresh));
 watch('vtg_chat_clear_requests',p=>{
  const r=p.new||{};
  if(p.eventType==='INSERT')popupClear(r);
  if(p.eventType==='UPDATE'&&r.status==='approved'){toast('The chat was cleared for everyone.');if(String(r.conversation_id)===S.active){S.messages=[];draw();}sweepFiles(r.conversation_id);}
  if(p.eventType==='UPDATE'&&r.status==='declined')toast('A clear request was declined. Nothing was deleted.');
  later(async()=>{await loadList();if(String(r.conversation_id)===S.active){await loadClear();await loadMessages();}},200);
 });
 watch('vtg_chat_clear_responses',()=>later(loadClear,250));
 watch('vtg_calls',p=>{const r=p.new||{};later(loadList,200);
  if(p.eventType==='INSERT'&&r.status==='active'&&!same(r.started_by,S.me)){(S.seenCalls=S.seenCalls||new Set()).add(r.id);window.VTGCalls?.incoming?.(r,convTitle(conv(r.conversation_id)));}});
 ch.subscribe();
 setInterval(()=>{if(!document.hidden&&host.offsetParent){loadList();if(S.active){loadMessages();loadClear();}}},20000);
}
function subscribeTyping(){
 if(typingCh){try{S.client.removeChannel(typingCh);}catch(_){}typingCh=null;}
 el.typing.hidden=true;const id=S.active;if(!id)return;
 typingCh=S.client.channel('vtgm-typing-'+id,{config:{broadcast:{self:false}}});
 typingCh.on('broadcast',{event:'typing'},({payload})=>{if(same(payload?.user,S.me)||id!==S.active)return;
  el.typing.hidden=false;el.typing.textContent=(payload.name||'Someone')+' is typing…';clearTimeout(typingTimer);typingTimer=setTimeout(()=>{el.typing.hidden=true;},3000);}).subscribe();
}
function sendTyping(){
 if(!typingCh||Date.now()-lastTypingSent<2000)return;lastTypingSent=Date.now();
 const me=(conv()?.members||[]).find(m=>same(m.user_id,S.me));
 try{typingCh.send({type:'broadcast',event:'typing',payload:{user:S.me,name:me?.name||'Someone'}});}catch(_){}
}

/* ---------- events ---------- */
host.addEventListener('click',async e=>{
 const t=e.target;const q=s=>t.closest(s);
 if(q('[data-new]')){el.picker.hidden?openPicker():(el.picker.hidden=true);return;}
 if(q('[data-picker-close]')){el.picker.hidden=true;return;}
 if(q('[data-picker-go]')){startChat();return;}
 if(q('[data-refresh]')){loadList();if(S.active){loadMessages();loadClear();}return;}
 if(q('[data-back]')){host.classList.remove('chat-open');S.active='';el.pane.hidden=true;el.welcome.hidden=false;renderList();return;}
 const open=q('[data-open]');if(open){openChat(open.dataset.open);return;}
 if(q('[data-close]')&&!q('[data-jump]')){closeLayer();return;}
 const emoji=q('[data-emoji]');if(emoji){const mid=el.layer.dataset.mid;closeLayer();try{await rpc('vtg_toggle_reaction',{p_message_id:mid,p_emoji:emoji.dataset.emoji});await loadMessages();}catch(x){toast(err(x),'warn');}return;}
 const doit=q('[data-do]');if(doit){menuAction(doit.dataset.do,el.layer.dataset.mid);return;}
 const del=q('[data-del]');if(del){const mid=el.layer.dataset.mid;closeLayer();try{await rpc('vtg_delete_message',{p_message_id:mid,p_for_everyone:del.dataset.del==='everyone'});await loadMessages();loadList();if(del.dataset.del==='everyone')sweepFiles(S.active);}catch(x){toast(err(x),'warn');}return;}
 if(q('[data-edit-save]')){const mid=el.layer.dataset.mid,v=el.layer.querySelector('[data-edit-text]').value.trim();if(!v)return;closeLayer();try{const r=await rpc('vtg_edit_message',{p_message_id:mid,p_body:v});if(r&&r.ok===false)toast(r.message||'Edit not saved.','warn');await loadMessages();}catch(x){toast(err(x),'warn');}return;}
 const fwd=q('[data-fwdto]');if(fwd){doForward(fwd.dataset.fwdto);return;}
 if(q('[data-clear-send]')){closeLayer();try{const r=await rpc('vtg_request_chat_clear',{p_conversation_id:S.active});toast(r?.message||'Request sent',r?.ok===false?'warn':'');await afterClear();}catch(x){toast(err(x),'warn');}return;}
 const cy=q('[data-clear-yes]');if(cy){clearRespond(cy.dataset.clearYes,true);return;}
 const cn=q('[data-clear-no]');if(cn){clearRespond(cn.dataset.clearNo,false);return;}
 const cc=q('[data-clear-cancel]');if(cc){try{await rpc('vtg_cancel_chat_clear',{p_request_id:cc.dataset.clearCancel});await loadClear();}catch(x){toast(err(x),'warn');}return;}
 if(q('[data-menu]')){
  dialog('<h4>Chat options</h4><div class="vtgm-dlg-actions col"><button type="button" data-clearopen>Clear chat…</button><button type="button" data-starred>Starred messages</button><button type="button" data-close>Close</button></div>');return;}
 if(q('[data-clearopen]')){openClearConfirm();return;}
 if(q('[data-starred]')){const s=S.messages.filter(m=>m.starred&&!m.deleted);dialog('<h4>Starred messages</h4><div class="vtgm-starred">'+(s.map(m=>'<button type="button" data-jump="'+esc(m.id)+'" data-close><b>'+esc(mine(m)?'You':groupName(conv(),m))+'</b><span>'+esc(m.kind==='voice'?'🎤 Voice message':m.body||'Attachment')+'</span></button>').join('')||'<p>No starred messages in this chat.</p>')+'</div><div class="vtgm-dlg-actions"><button type="button" data-close>Close</button></div>');return;}
 const jump=q('[data-jump]');if(jump){if(!el.layer.hidden)closeLayer();const row=el.log.querySelector('[data-mid="'+CSS.escape(jump.dataset.jump)+'"]');if(row){row.scrollIntoView({block:'center',behavior:'smooth'});row.classList.add('flash');setTimeout(()=>row.classList.remove('flash'),1600);}return;}
 if(q('[data-cancel-reply]')){S.replyTo=null;drawReply();return;}
 const rm=q('[data-rmfile]');if(rm){S.files.splice(Number(rm.dataset.rmfile),1);drawFiles();syncAction();return;}
 if(q('[data-attach]')){el.file.click();return;}
 if(q('[data-voicecall]')||q('[data-videocall]')){const kind=q('[data-videocall]')?'video':'voice',c=conv();if(!c||!window.VTGCalls)return;
  const members={};tones(c);(c.members||[]).forEach(m=>{members[m.user_id]={id:m.user_id,name:m.name,role:m.role,tone:tones(c)[String(m.user_id)]??0,me:same(m.user_id,S.me)};});
  window.VTGCalls.start({client:S.client,userId:S.me,conversationId:c.id,kind,members,title:convTitle(c)});return;}
 if(q('[data-joincall]')){const live=S.live[S.active],c=conv();if(!live||!c||!window.VTGCalls)return;
  const members={};(c.members||[]).forEach(m=>{members[m.user_id]={id:m.user_id,name:m.name,role:m.role,tone:tones(c)[String(m.user_id)]??0,me:same(m.user_id,S.me)};});
  window.VTGCalls.start({client:S.client,userId:S.me,conversationId:c.id,kind:live.kind,members,title:convTitle(c)});return;}
 /* voice player */
 const vp=q('[data-vplay]');if(vp){vPlay(vp.closest('[data-voice]'));return;}
 const vs=q('[data-vspeed]');if(vs){const n=vs.closest('[data-voice]'),rates=[1,1.5,2],cur=Number(n.dataset.rate||1),nx=rates[(rates.indexOf(cur)+1)%3];n.dataset.rate=nx;vs.textContent=nx+'×';if(audio&&playing===n)audio.playbackRate=nx;return;}
 const vw=q('[data-vwave]');if(vw){const n=vw.closest('[data-voice]');if(playing===n&&audio){const r=vw.getBoundingClientRect(),p=(e.clientX-r.left)/r.width,d=audio.duration&&isFinite(audio.duration)?audio.duration:Number(n.dataset.dur)/1000;audio.currentTime=Math.max(0,Math.min(d,p*d));}else vPlay(n);return;}
 const im=q('[data-img]');if(im){try{window.open(await url(im.dataset.img),'_blank','noopener');}catch(x){toast(err(x),'warn');}return;}
 const dl=q('[data-dl]');if(dl){try{const a=document.createElement('a');a.href=await url(dl.dataset.dl);a.target='_blank';a.rel='noopener';a.download=dl.dataset.name||'file';a.click();}catch(x){toast(err(x),'warn');}return;}
 const rc=q('[data-react]');if(rc){try{await rpc('vtg_toggle_reaction',{p_message_id:rc.dataset.mid,p_emoji:rc.dataset.react});await loadMessages();}catch(x){toast(err(x),'warn');}return;}
 if(q('[data-rec-cancel]')){recStop(true);return;}
 if(q('[data-rec-send]')){recStop(false);return;}
 if(q('[data-rec-pause]')){recTogglePause();return;}
 /* click on a message bubble opens its menu (WhatsApp-style) */
 const bub=q('.vtgm-bubble');if(bub&&!q('a')&&!q('.vtgm-quote')&&!q('.vtgm-react')){const row=bub.closest('[data-mid]');if(row&&row.dataset.mid!=='pending'&&!bub.classList.contains('deleted')){openMenu(row.dataset.mid,q('[data-chev]')||bub);}return;}
});
host.addEventListener('keydown',e=>{
 if((e.key==='Enter'||e.key===' ')&&e.target.classList?.contains('vtgm-bubble')){e.preventDefault();e.target.click();}
});
el.action.addEventListener('click',()=>{if(el.action.dataset.mode==='send')sendCurrent();else recStart();});
el.form.addEventListener('submit',e=>{e.preventDefault();sendCurrent();});
el.input.addEventListener('input',()=>{autosize();syncAction();sendTyping();});
el.input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&window.innerWidth>760){e.preventDefault();sendCurrent();}});
el.file.addEventListener('change',()=>{addFiles(el.file.files);el.file.value='';});
el.search.addEventListener('input',renderList);
el.picker.addEventListener('change',()=>{const n=el.picker.querySelectorAll('input[type=checkbox]:checked').length;const g=el.picker.querySelector('[data-gtitle]');if(g)g.hidden=n<2;});
el.form.addEventListener('dragover',e=>e.preventDefault());
el.log.addEventListener('dragover',e=>e.preventDefault());
el.log.addEventListener('drop',e=>{e.preventDefault();if(e.dataTransfer?.files?.length)addFiles(e.dataTransfer.files);});
el.input.addEventListener('paste',e=>{const f=Array.from(e.clipboardData?.files||[]);if(f.length){e.preventDefault();addFiles(f);}});

function startCallFor(c,kind){if(!c||!window.VTGCalls)return;const members={};(c.members||[]).forEach(m=>{members[m.user_id]={id:m.user_id,name:m.name,role:m.role,tone:tones(c)[String(m.user_id)]??0,me:same(m.user_id,S.me)};});
 window.VTGCalls.start({client:S.client,userId:S.me,conversationId:c.id,kind,members,title:convTitle(c)});}
async function openWithCall(id){await boot();if(!S.convs.length||!conv(id))await loadList();await openChat(id);const live=S.live[String(id)];if(live)startCallFor(conv(id),live.kind);}
window.VTGMessenger={open:openChat,refresh:loadList,_state:S};
window.VTGPeerMessages={openWithCall};
(async()=>{try{await loadList();await listen();}catch(e){empty(el.list,'Messages are unavailable: '+err(e));}})();
})();
