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
/* Safe, lightweight Markdown for chat bubbles. Text is escaped before formatting is applied. */
function inlineMarkdown(value){
 let s=esc(value);
 s=s.replace(/`([^`]+)`/g,'<code>$1</code>');
 s=s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
 s=s.replace(/__([^_]+)__/g,'<u>$1</u>');
 s=s.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g,'$1<em>$2</em>');
 return s;
}
function markdown(value){
 const lines=String(value??'').replace(/\r/g,'').split('\n'),out=[];
 let paragraph=[],listType='',items=[],tableHeaders=[],tableItems=[];
 const flushP=()=>{if(paragraph.length){out.push('<p>'+paragraph.map(inlineMarkdown).join('<br>')+'</p>');paragraph=[];}};
 const flushL=()=>{if(items.length){out.push('<'+listType+'>'+items.map(x=>'<li>'+inlineMarkdown(x)+'</li>').join('')+'</'+listType+'>');items=[];listType='';}};
 const flushT=()=>{if(tableItems.length){out.push('<ul>'+tableItems.map(row=>'<li>'+tableHeaders.map((h,i)=>'<strong>'+inlineMarkdown(h)+':</strong> '+inlineMarkdown(row[i]||'')).join('; ')+'</li>').join('')+'</ul>');}tableHeaders=[];tableItems=[];};
 for(const line of lines){
  const s=line.trim();
  if(!s){flushP();flushL();flushT();continue;}
  if(s.startsWith('|')&&s.endsWith('|')){
   flushP();flushL();
   const cells=s.split('|').slice(1,-1).map(cell=>cell.trim());
   if(cells.every(cell=>/^:?-{3,}:?$/.test(cell)))continue;
   if(!tableHeaders.length)tableHeaders=cells;else tableItems.push(cells);
   continue;
  }
  flushT();
  const h=s.match(/^(#{1,3})\s+(.+)$/);
  if(h){flushP();flushL();const n=h[1].length;out.push('<h'+n+'>'+inlineMarkdown(h[2])+'</h'+n+'>');continue;}
  const bullet=s.match(/^(?:[-*•])\s+(.+)$/);
  const numbered=s.match(/^\d+[.)]\s+(.+)$/);
  if(bullet||numbered){flushP();const type=numbered?'ol':'ul';if(listType&&listType!==type)flushL();listType=type;items.push((bullet||numbered)[1]);continue;}
  flushL();paragraph.push(s);
 }
 flushP();flushL();flushT();
 return out.join('');
}
function bubbleRow(msg,first,onEdit){
 const row=document.createElement('div');
 row.className='vtg-wa-row '+(msg.mine?'is-self':'is-other')+(first?' first':'');
 row.dataset.tone=msg.ai?'ai':String(msg.tone??0);
 if(msg.id!=null)row.dataset.msgId=String(msg.id);
 const b=document.createElement('div');b.className='vtg-wa-bubble';
 if(!msg.mine&&first&&msg.name){const n=document.createElement('span');n.className='vtg-wa-name';n.textContent=msg.name;b.append(n);}
 const t=document.createElement('div');t.className='vtg-wa-text';t.innerHTML=markdown(msg.text);
 if(Array.isArray(msg.attachments)&&msg.attachments.length){
  const files=document.createElement('div');files.className='vtg-wa-attachments';
  msg.attachments.forEach(file=>{
   const url=typeof file.signed_url==='string'&&/^https:\/\//i.test(file.signed_url)?file.signed_url:'';
   if(!url)return;
   const item=document.createElement('div');item.className='vtg-wa-attachment';
   if(String(file.mime_type||'').startsWith('image/')){
    const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.className='vtg-wa-image-link';
    const img=document.createElement('img');img.src=url;img.alt=file.original_name||'Image attachment';img.loading='lazy';a.append(img);item.append(a);
   }else if(String(file.mime_type||'').startsWith('video/')){
    const video=document.createElement('video');video.src=url;video.controls=true;video.preload='metadata';video.className='vtg-wa-video';item.append(video);
    const label=document.createElement('span');label.textContent=file.original_name||'Video';item.append(label);
   }else{
    const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.className='vtg-wa-file-link';a.textContent='↗ '+(file.original_name||'Open attachment');item.append(a);
   }
   files.append(item);
  });
  if(files.childNodes.length)b.append(files);
 }
 const m=document.createElement('span');m.className='vtg-wa-meta';
 m.innerHTML='<span>'+esc(time(msg.at))+'</span>'+(msg.mine?'<span class="vtg-wa-tick'+(msg.pending?' pending':'')+'">'+(msg.pending?I.clock:I.tick)+'</span>':'');
 b.append(t);
 if(msg.mine&&msg.editable&&typeof onEdit==='function'){
  const edit=document.createElement('button');edit.type='button';edit.className='vtg-wa-edit';edit.textContent='Edit';
  edit.setAttribute('aria-label','Edit your message');edit.addEventListener('click',()=>onEdit(msg));b.append(edit);
 }
 b.append(m);row.append(b);return row;
}
/* Full re-render of a stream with day separators and name grouping. */
function renderStream(stream,msgs,emptyText,onEdit){
 stream.innerHTML='';
 if(!msgs.length){const e=document.createElement('div');e.className='vtg-wa-empty';e.textContent=emptyText||'No messages yet.';stream.append(e);return;}
 let lastDay='',lastKey='';
 msgs.forEach(m=>{
  const d=day(m.at);
  if(d!==lastDay){const s=document.createElement('div');s.className='vtg-wa-day';s.textContent=d;stream.append(s);lastDay=d;lastKey='';}
  const key=(m.mine?'me':String(m.senderId||m.name))+'|'+(m.ai?'ai':'');
  stream.append(bubbleRow(m,key!==lastKey,onEdit));lastKey=key;
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
window.VTGChat={esc,icons:I,initials,time,day,toneMap,bubbleRow,renderStream,markdown,clientReady};
})();
