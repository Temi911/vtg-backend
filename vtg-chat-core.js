/* VTG chat core — shared helpers for the AI chat, account messages and calls. No network access here. */
(function(){
'use strict';
if(window.VTGChat)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const I={
 send:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>',
 phone:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
 video:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m23 7-7 5 7 5z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
 plus:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
 back:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
 mic:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4"/></svg>',
 micoff:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 2 20 20M9 9v2a3 3 0 0 0 5.1 2.1M15 9.3V5a3 3 0 0 0-5.9-.7M19 10v1a7 7 0 0 1-.9 3.4M5 10v1a7 7 0 0 0 11 5.7M12 18v4"/></svg>',
 camoff:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 2 20 20M16 11.5V7l7-3v12M10.7 5H14a2 2 0 0 1 2 2M1 7v10a2 2 0 0 0 2 2h11"/></svg>',
 hangup:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.7 13.3a16 16 0 0 1-2.7-3.4l1.3-1.2a2 2 0 0 0 .5-2.1 12 12 0 0 1-.7-2.8A2 2 0 0 0 7.1 2h-3A2 2 0 0 0 2.1 4.2a19.8 19.8 0 0 0 3.1 8.6M22 16.9v3M2 2l20 20"/></svg>',
 tick:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 13 4 4L16 6M10 15l2 2L22 6"/></svg>',
 clock:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
};
const initials=s=>String(s||'VTG').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'V';
const time=d=>new Date(d).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
function day(d){
 const x=new Date(d),t=new Date(),y=new Date();y.setDate(t.getDate()-1);
 const same=(a,b)=>a.toDateString()===b.toDateString();
 if(same(x,t))return 'Today';if(same(x,y))return 'Yesterday';
 return x.toLocaleDateString([], {weekday:'short',day:'numeric',month:'short',year:x.getFullYear()===t.getFullYear()?undefined:'numeric'});
}
/* Each other person in a conversation gets a stable colour: index in the sorted list of other member ids. */
function toneMap(memberIds,myId){
 const others=[...new Set(memberIds.filter(id=>String(id)!==String(myId)))].map(String).sort();
 const map={};others.forEach((id,i)=>{map[id]=i%6;});return map;
}
/* msg: {id, mine, name, tone, text, at, ai, pending} */
function bubbleRow(msg,first){
 const row=document.createElement('div');
 row.className='vtg-wa-row '+(msg.mine?'is-self':'is-other')+(first?' first':'');
 row.dataset.tone=msg.ai?'ai':String(msg.tone??0);
 if(msg.id!=null)row.dataset.msgId=String(msg.id);
 const b=document.createElement('div');b.className='vtg-wa-bubble';
 if(!msg.mine&&first&&msg.name){const n=document.createElement('span');n.className='vtg-wa-name';n.textContent=msg.name;b.append(n);}
 const t=document.createElement('span');t.className='vtg-wa-text';t.textContent=msg.text;
 const m=document.createElement('span');m.className='vtg-wa-meta';
 m.innerHTML='<span>'+esc(time(msg.at))+'</span>'+(msg.mine?'<span class="vtg-wa-tick'+(msg.pending?' pending':'')+'">'+(msg.pending?I.clock:I.tick)+'</span>':'');
 b.append(t,m);row.append(b);return row;
}
/* Full re-render of a stream with day separators and name grouping. */
function renderStream(stream,msgs,emptyText){
 stream.innerHTML='';
 if(!msgs.length){const e=document.createElement('div');e.className='vtg-wa-empty';e.textContent=emptyText||'No messages yet.';stream.append(e);return;}
 let lastDay='',lastKey='';
 msgs.forEach(m=>{
  const d=day(m.at);
  if(d!==lastDay){const s=document.createElement('div');s.className='vtg-wa-day';s.textContent=d;stream.append(s);lastDay=d;lastKey='';}
  const key=(m.mine?'me':String(m.senderId||m.name))+'|'+(m.ai?'ai':'');
  stream.append(bubbleRow(m,key!==lastKey));lastKey=key;
 });
 stream.scrollTop=stream.scrollHeight;
}
function clientReady(){
 return (async()=>{
  const auth=await window.VTG_AUTH_READY;
  const client=auth?.client||window.VTG_SUPABASE;
  if(!client?.auth)throw new Error('VTG sign-in service is unavailable. Refresh the dashboard and try again.');
  const {data,error}=await client.auth.getSession();if(error)throw error;
  if(!data.session)throw new Error('Please sign in to your VTG account first.');
  return {client,userId:data.session.user.id};
 })();
}
window.VTGChat={esc,icons:I,initials,time,day,toneMap,bubbleRow,renderStream,clientReady};
})();
