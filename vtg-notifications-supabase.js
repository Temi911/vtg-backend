(function(){
'use strict';
const buttons=['alerts','notificationBtn'].map(id=>document.getElementById(id)).filter(Boolean);
if(!buttons.length)return;
const role=String(document.documentElement.dataset.vtgRole||'').toLowerCase();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let client=null,userId='',channel=null,items=[],busy=false;
const panel=document.createElement('section');panel.id='vtgLiveNotifications';panel.hidden=true;panel.setAttribute('aria-label','Account notifications');
panel.style.cssText='position:fixed;z-index:10050;top:76px;right:18px;width:min(390px,calc(100vw - 24px));max-height:min(70vh,620px);overflow:auto;background:var(--panel,#fff);color:var(--ink,#17212b);border:1px solid var(--line,#dce2e8);border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.2);padding:14px';
panel.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px"><strong>Notifications</strong><button type="button" data-vtg-notif-refresh class="btn">Refresh</button></div><div data-vtg-notif-list class="rows"><div class="empty">Sign in to load notifications.</div></div>';
document.body.append(panel);
const list=panel.querySelector('[data-vtg-notif-list]');
const badge=document.createElement('span');badge.setAttribute('data-vtg-notif-count','');badge.style.cssText='display:none;min-width:16px;height:16px;padding:0 4px;border-radius:99px;background:#b32635;color:#fff;font-size:9px;font-weight:900;line-height:16px;text-align:center;margin-left:4px';
buttons.forEach(b=>{b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-expanded','false');b.append(badge.cloneNode(true));});
function setCount(n){buttons.forEach(b=>{const el=b.querySelector('[data-vtg-notif-count]');if(!el)return;el.textContent=n>99?'99+':String(n);el.style.display=n?'inline-block':'none';});}
function render(){
 if(!items.length){list.innerHTML='<div class="empty">No account notifications yet. Updates will appear here when VTG records an event for your account.</div>';return;}
 list.innerHTML=items.map(n=>'<article style="padding:11px 2px;border-bottom:1px solid var(--line);'+(n.read_at?'opacity:.7':'')+'"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><strong style="font-size:12px">'+esc(n.title||'VTG update')+'</strong><span class="chip">'+(n.read_at?'READ':'NEW')+'</span></div><p style="font-size:11px;line-height:1.6;margin:6px 0;color:var(--muted)">'+esc(n.body||'')+'</p><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><small style="color:var(--muted)">'+esc(n.created_at?new Date(n.created_at).toLocaleString():'')+'</small>'+(n.read_at?'':'<button class="btn" type="button" data-vtg-notif-read="'+esc(n.id)+'">Mark read</button>')+'</div></article>').join('');
}
async function session(){
 const auth=await window.VTG_AUTH_READY;client=auth?.client||window.VTG_SUPABASE;
 if(!client?.auth)throw new Error('VTG account service is unavailable. Refresh and sign in again.');
 const {data,error}=await client.auth.getSession();if(error)throw error;if(!data.session)throw new Error('Sign in to load account notifications.');
 userId=data.session.user.id;
 const {data:p,error:pe}=await client.from('profiles').select('role,is_active').eq('id',userId).single();
 if(pe)throw pe;if(p?.role!==role||p?.is_active!==true)throw new Error('An active '+role+' account is required.');
}
async function load(){
 if(busy)return;busy=true;list.innerHTML='<div class="empty">Loading account notifications…</div>';
 try{await session();const {data,error}=await client.from('vtg_notifications').select('id,title,body,notification_type,entity_type,entity_id,read_at,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(50);if(error)throw error;items=data||[];render();setCount(items.filter(x=>!x.read_at).length);if(!channel)channel=client.channel('vtg-notifications-'+userId).on('postgres_changes',{event:'*',schema:'public',table:'vtg_notifications',filter:'user_id=eq.'+userId},load).subscribe();}
 catch(e){list.innerHTML='<div class="empty">'+esc(e.message||'Notifications could not be loaded.')+' <button class="btn" type="button" data-vtg-notif-retry>Try again</button></div>';}
 finally{busy=false;}
}
async function markRead(id,b){
 b.disabled=true;try{await session();const {data,error}=await client.from('vtg_notifications').update({read_at:new Date().toISOString()}).eq('id',id).eq('user_id',userId).select('id,read_at').maybeSingle();if(error)throw error;if(!data)throw new Error('Notification was not found.');const row=items.find(x=>x.id===id);if(row)row.read_at=data.read_at;render();setCount(items.filter(x=>!x.read_at).length);}
 catch(e){b.disabled=false;const note=document.createElement('p');note.className='notice';note.textContent=e.message||'Could not mark notification as read.';list.prepend(note);}
}
function toggle(){const open=panel.hidden;panel.hidden=!open;buttons.forEach(b=>b.setAttribute('aria-expanded',String(open)));if(open)load();}
buttons.forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();toggle();},true));
panel.addEventListener('click',e=>{const r=e.target.closest('[data-vtg-notif-read]');if(r)markRead(r.dataset.vtgNotifRead,r);if(e.target.closest('[data-vtg-notif-refresh],[data-vtg-notif-retry]'))load();});
document.addEventListener('click',e=>{if(!panel.hidden&&!panel.contains(e.target)&&!buttons.some(b=>b.contains(e.target))){panel.hidden=true;buttons.forEach(b=>b.setAttribute('aria-expanded','false'));}});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){panel.hidden=true;buttons.forEach(b=>b.setAttribute('aria-expanded','false'));}});
window.VTGNotifications={refresh:load,open:()=>{panel.hidden=false;load();}};
})();