/* VTG voice + video calls — up to 5 people. Media is peer-to-peer (WebRTC mesh); Supabase only carries call state
   and signalling (offer/answer/ICE) through RLS-protected tables and RPCs. Add TURN servers via window.VTG_RTC_CONFIG
   = {iceServers:[...]} for users behind strict NATs. */
(function(){
'use strict';
if(!window.VTGChat||window.VTGCalls)return;
const C=window.VTGChat,I=C.icons,esc=C.esc;
const MAX=5;
let session=null,banner=null;

function iceConfig(){return window.VTG_RTC_CONFIG||{iceServers:[{urls:'stun:stun.l.google.com:19302'}]};}
function tileFor(id,name,local){
 const t=document.createElement('div');t.className='vtg-call-tile'+(local?' local':'');t.dataset.user=id;
 t.innerHTML='<div class="av">'+esc(C.initials(name))+'</div><span class="nm">'+esc(local?'You':name)+'</span><span class="st">'+(local?'':'connecting…')+'</span>';
 return t;
}
function setStream(tile,stream,local){
 let v=tile.querySelector('video');
 if(!v){v=document.createElement('video');v.autoplay=true;v.playsInline=true;if(local)v.muted=true;tile.prepend(v);}
 if(v.srcObject!==stream)v.srcObject=stream;
 const hasVideo=tile.dataset.camstate!=='off'&&stream.getVideoTracks().some(t=>t.readyState==='live'&&t.enabled&&(local||!t.muted));
 v.style.display=hasVideo?'block':'none';
 tile.querySelector('.av').style.display=hasVideo?'none':'grid';
 const st=tile.querySelector('.st');if(st&&!local)st.textContent='';
}
function layout(){if(!session)return;const g=session.grid;g.dataset.n=String(g.children.length);session.count.textContent=session.live.size+1+' / '+MAX;}

async function start(opts){
 if(session){return;}
 const {client,userId,conversationId,kind,members,title}=opts;
 const names=id=>members?.[id]?.name||'Participant';
 const ui=document.createElement('div');ui.className='vtg-wa vtg-call';ui.setAttribute('role','dialog');ui.setAttribute('aria-label',(kind==='video'?'Video':'Voice')+' call');
 ui.innerHTML='<div class="vtg-call-top"><div><strong>'+esc(title||'Call')+'</strong><br><small><span data-kindlabel>'+(kind==='video'?'Video call':'Voice call')+'</span> · <span data-time>connecting…</span></small></div><span class="sp"></span><span class="vtg-call-badge" data-count>1 / '+MAX+'</span></div>'
  +'<div class="vtg-call-msg" data-msg hidden></div><div class="vtg-call-grid" data-grid></div>'
  +'<div class="vtg-call-bar"><button class="vtg-call-btn" data-mic aria-label="Mute microphone">'+I.mic+'</button><button class="vtg-call-btn'+(kind==='video'?'':' off')+'" data-cam aria-label="'+(kind==='video'?'Turn camera off':'Switch to video: turn camera on')+'" title="'+(kind==='video'?'Turn camera off':'Switch to video (only you decide whether your camera is on)')+'">'+(kind==='video'?I.video:I.camoff)+'</button><button class="vtg-call-btn end" data-end aria-label="Leave call">'+I.hangup+'</button></div>';
 document.body.append(ui);
 const grid=ui.querySelector('[data-grid]'),msg=ui.querySelector('[data-msg]');
 session={ui,grid,count:ui.querySelector('[data-count]'),live:new Map(),peers:new Map(),callId:null,stream:null,channels:[],seen:new Set(),pending:new Map(),started:0,timer:null,client,userId,ended:false};
 const s=session;
 const fail=text=>{msg.hidden=false;msg.textContent=text;};
 try{
  s.stream=await navigator.mediaDevices.getUserMedia({audio:true,video:kind==='video'?{width:{ideal:640},height:{ideal:480}}:false});
 }catch(e){
  fail(e?.name==='NotAllowedError'?'Microphone'+(kind==='video'?' / camera':'')+' permission was blocked. Allow access in your browser and try again.':'Could not access your '+(kind==='video'?'camera or ':'')+'microphone: '+(e?.message||e));
  ui.querySelector('[data-end]').onclick=()=>cleanup(false);return;
 }
 const me=tileFor(userId,'You',true);grid.append(me);setStream(me,s.stream,true);layout();
 ui.querySelector('[data-mic]').onclick=e=>{const t=s.stream.getAudioTracks()[0];if(!t)return;t.enabled=!t.enabled;e.currentTarget.classList.toggle('off',!t.enabled);e.currentTarget.innerHTML=t.enabled?I.mic:I.micoff;};
 const camBtn=ui.querySelector('[data-cam]');
 /* Each person chooses for themselves whether their camera is on. The video m-line is negotiated in every call,
    so switching voice <-> video is just replaceTrack(): no renegotiation, and nobody else is forced to turn on video. */
 const setCam=on=>{camBtn.classList.toggle('off',!on);camBtn.innerHTML=on?I.video:I.camoff;camBtn.setAttribute('aria-label',on?'Turn camera off':'Switch to video: turn camera on');ui.querySelector('[data-kindlabel]').textContent=on||[...s.peers.values()].some(p=>p.tile?.querySelector('video')?.style.display==='block')?'Video call':'Voice call';};
 camBtn.onclick=async()=>{
  const cur=s.stream.getVideoTracks()[0];
  if(cur){cur.stop();s.stream.removeTrack(cur);s.peers.forEach(e=>e.vsender?.replaceTrack(null).catch(()=>{}));setStream(me,s.stream,true);setCam(false);s.peers.forEach(e=>e.sendCam?.());return;}
  try{
   const cam=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480}}});
   const vt=cam.getVideoTracks()[0];s.stream.addTrack(vt);
   s.peers.forEach(e=>e.vsender?.replaceTrack(vt).catch(()=>{}));
   setStream(me,s.stream,true);setCam(true);s.peers.forEach(e=>e.sendCam?.());
  }catch(err){fail(err?.name==='NotAllowedError'?'Camera permission was blocked. You are still on the voice call.':'Could not start your camera: '+(err?.message||err));}
 };
 ui.querySelector('[data-end]').onclick=()=>cleanup(true);

 function peer(id,initiator){
  if(s.peers.has(id))return s.peers.get(id);
  const pc=new RTCPeerConnection(iceConfig());
  const entry={pc,tile:null,remoteSet:false,queue:s.pending.get(id)||[],vsender:null};s.pending.delete(id);s.peers.set(id,entry);
  s.stream.getAudioTracks().forEach(t=>pc.addTrack(t,s.stream));
  // The video m-line exists in every call (also voice-only), so a camera can be switched on later with replaceTrack().
  // The offerer creates it; the answerer adopts the one in the offer after setRemoteDescription (see adoptVideo()).
  if(initiator){const vTr=pc.addTransceiver('video',{direction:'sendrecv',streams:[s.stream]});entry.vsender=vTr.sender;
   const vt0=s.stream.getVideoTracks()[0];if(vt0)vTr.sender.replaceTrack(vt0).catch(()=>{});}
  // tiny negotiated channel carrying only camera on/off, so the other side switches avatar <-> video instantly
  const dc=pc.createDataChannel('vtg-state',{negotiated:true,id:1});entry.dc=dc;
  const sendCam=()=>{if(dc.readyState==='open')dc.send(JSON.stringify({cam:s.stream.getVideoTracks().some(t=>t.readyState==='live')}));};
  entry.sendCam=sendCam;dc.onopen=sendCam;
  dc.onmessage=ev=>{try{const m=JSON.parse(ev.data);if(typeof m.cam==='boolean'&&entry.tile){entry.tile.dataset.camstate=m.cam?'on':'off';entry.stream&&setStream(entry.tile,entry.stream,false);}}catch(_){}};
  pc.onicecandidate=e=>{if(e.candidate)signal(id,'candidate',e.candidate.toJSON());};
  pc.ontrack=e=>{
   if(!entry.tile){entry.tile=tileFor(id,names(id),false);grid.append(entry.tile);layout();}
   const st=e.streams[0]||new MediaStream([e.track]);entry.stream=st;setStream(entry.tile,st,false);
   e.track.onunmute=()=>setStream(entry.tile,st,false);e.track.onmute=()=>setStream(entry.tile,st,false);
   if(!entry.audio){entry.audio=new Audio();entry.audio.autoplay=true;}entry.audio.srcObject=st;
  };
  pc.onconnectionstatechange=()=>{
   if(pc.connectionState==='failed'){const st=entry.tile?.querySelector('.st');if(st)st.textContent='connection failed';}
   if(pc.connectionState==='connected'&&!s.started){s.started=Date.now();ui.querySelector('[data-time]').textContent='00:00';s.timer=setInterval(()=>{const sec=Math.floor((Date.now()-s.started)/1000);ui.querySelector('[data-time]').textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');},1000);}
  };
  if(!entry.tile){entry.tile=tileFor(id,names(id),false);grid.append(entry.tile);layout();}
  return entry;
 }
 async function signal(to,kind2,payload){
  const {error}=await client.rpc('vtg_send_call_signal',{p_call_id:s.callId,p_to_user:to,p_kind:kind2,p_payload:payload});
  if(error&&!s.ended)fail('Signalling failed: '+error.message);
 }
 async function offerTo(id){
  const e=peer(id,true);const o=await e.pc.createOffer();await e.pc.setLocalDescription(o);
  await signal(id,'offer',{type:o.type,sdp:o.sdp});
 }
function adoptVideo(entry){
  const t=entry.pc.getTransceivers().find(x=>x.receiver.track.kind==='video'&&x.mid!==null);
  if(!t)return;
  try{t.direction='sendrecv';t.sender.setStreams?.(s.stream);}catch(_){}
  entry.vsender=t.sender;const vt=s.stream.getVideoTracks()[0];if(vt)t.sender.replaceTrack(vt).catch(()=>{});
 }
 async function drain(entry){entry.remoteSet=true;for(const c of entry.queue.splice(0))await entry.pc.addIceCandidate(c).catch(()=>{});}
 async function onSignal(row){
  if(!row||s.seen.has(row.id)||String(row.call_id)!==String(s.callId))return;s.seen.add(row.id);
  const from=row.from_user,p=row.payload;
  try{
   if(row.kind==='offer'){
    const e=peer(from,false);await e.pc.setRemoteDescription(p);adoptVideo(e);await drain(e);
    const a=await e.pc.createAnswer();await e.pc.setLocalDescription(a);await signal(from,'answer',{type:a.type,sdp:a.sdp});
   }else if(row.kind==='answer'){
    const e=s.peers.get(from);if(e&&e.pc.signalingState==='have-local-offer'){await e.pc.setRemoteDescription(p);await drain(e);}
   }else if(row.kind==='candidate'){
    const e=s.peers.get(from);if(!e){const q=s.pending.get(from)||[];q.push(p);s.pending.set(from,q);}else if(e.remoteSet)await e.pc.addIceCandidate(p).catch(()=>{});else e.queue.push(p);
   }
  }catch(err){fail('Call negotiation problem: '+(err?.message||err));}
 }
 function dropPeer(id){
  const e=s.peers.get(id);if(!e)return;e.pc.close();e.tile?.remove();if(e.audio)e.audio.srcObject=null;s.peers.delete(id);s.live.delete(id);layout();
 }

 // 1) listen for signalling + participant changes BEFORE joining, so nothing is missed
 const sub=ch=>new Promise((res,rej)=>{ch.subscribe(st=>{if(st==='SUBSCRIBED')res();if(st==='CHANNEL_ERROR'||st==='TIMED_OUT')rej(new Error('Realtime connection failed'));});});
 try{
  const sigCh=client.channel('vtg-sig-'+userId+'-'+Date.now()).on('postgres_changes',{event:'INSERT',schema:'public',table:'vtg_call_signals',filter:'to_user=eq.'+userId},p=>onSignal(p.new));
  const partCh=client.channel('vtg-part-'+conversationId+'-'+Date.now()).on('postgres_changes',{event:'*',schema:'public',table:'vtg_call_participants'},p=>{
   const r=p.new||{};if(String(r.call_id)!==String(s.callId)||String(r.user_id)===String(userId))return;
   if(r.left_at){dropPeer(r.user_id);} else {s.live.set(r.user_id,r.joined_at);layout();}
  }).on('postgres_changes',{event:'UPDATE',schema:'public',table:'vtg_calls'},p=>{if(String(p.new?.id)===String(s.callId)&&p.new.status==='ended')cleanup(false);});
  s.channels.push(sigCh,partCh);
  await Promise.all([sub(sigCh),sub(partCh)]);
  // 2) join / start the call (database enforces the 5-person cap)
  const {data:callId,error}=await client.rpc('vtg_start_call',{p_conversation_id:conversationId,p_kind:kind});
  if(error)throw error;
  s.callId=callId;
  // 3) offer to everyone who joined before me (total order by joined_at, then id) so exactly one side offers
  const {data:parts,error:pe}=await client.from('vtg_call_participants').select('user_id,joined_at').eq('call_id',callId).is('left_at',null);
  if(pe)throw pe;
  const mine=parts.find(x=>String(x.user_id)===String(userId));
  const before=u=>{const a=new Date(u.joined_at).getTime(),b=new Date(mine.joined_at).getTime();return a<b||(a===b&&String(u.user_id)<String(userId));};
  parts.filter(x=>String(x.user_id)!==String(userId)).forEach(x=>s.live.set(x.user_id,x.joined_at));
  layout();
  for(const u of parts.filter(x=>String(x.user_id)!==String(userId)&&before(x)))await offerTo(u.user_id);
  if(!parts.some(x=>String(x.user_id)!==String(userId)))ui.querySelector('[data-time]').textContent='waiting for others to join…';
 }catch(e){fail(e?.message||'Could not start the call.');setTimeout(()=>cleanup(!!s.callId),2500);}
}
async function cleanup(leave){
 const s=session;if(!s||s.ended)return;s.ended=true;
 clearInterval(s.timer);
 s.peers.forEach(e=>{try{e.pc.close();}catch(_){}if(e.audio)e.audio.srcObject=null;});
 s.stream?.getTracks().forEach(t=>t.stop());
 s.channels.forEach(ch=>{try{s.client.removeChannel(ch);}catch(_){}});
 if(leave&&s.callId){try{await s.client.rpc('vtg_leave_call',{p_call_id:s.callId});}catch(_){}}
 s.ui.remove();session=null;
}
function incoming(call,title){
 if(session||banner)return;
 const lead=call.kind==='video'?'video':'voice';
 banner=document.createElement('div');banner.className='vtg-wa vtg-call-incoming';
 banner.innerHTML='<span>Incoming '+lead+' call · '+esc(title||'Trade chat')+'</span><button class="join">Open chat</button><button class="x">Dismiss</button>';
 document.body.append(banner);
 const close=()=>{banner?.remove();banner=null;};
 banner.querySelector('.x').onclick=close;
 banner.querySelector('.join').onclick=()=>{close();window.VTGPeerMessages?.open?.(call.conversation_id);};
 setTimeout(close,45000);
}
window.addEventListener('pagehide',()=>{if(session?.callId&&!session.ended){try{session.client.rpc('vtg_leave_call',{p_call_id:session.callId});}catch(_){}}});
window.VTGCalls={start,incoming,max:MAX,active:()=>!!session};
})();
