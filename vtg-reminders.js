/* Reminder pop-ups. Reminders are created by the signed-in user's VTG AI. While a dashboard is open this checks
   for due reminders, turns them into notifications (server side, own records only) and shows a pop-up. */
(function(){
'use strict';
if(window.__vtgReminders)return;window.__vtgReminders=true;
var client=null,timer=null,busy=false,shown={};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
var host=document.createElement('div');host.setAttribute('aria-live','assertive');host.style.cssText='position:fixed;z-index:10060;right:16px;bottom:16px;display:flex;flex-direction:column;gap:10px;width:min(360px,calc(100vw - 32px));pointer-events:none';
function mount(){if(!host.parentNode)document.body.appendChild(host);}
function popup(r){
  if(shown[r.id])return;shown[r.id]=true;mount();
  var el=document.createElement('div');el.setAttribute('role','alert');
  el.style.cssText='pointer-events:auto;background:var(--panel,#fff);color:var(--ink,#17212b);border:1px solid var(--line,#d7dee7);border-left:5px solid #FFB81C;border-radius:12px;box-shadow:0 12px 32px rgba(10,88,202,.22);padding:12px 14px;font:13px/1.45 system-ui,sans-serif';
  var when='';try{when=new Date(r.remind_at).toLocaleString([], {dateStyle:'medium',timeStyle:'short'});}catch(e){}
  el.innerHTML='<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><strong style="color:#1558D6">Reminder</strong><button type="button" data-x aria-label="Dismiss reminder" style="border:0;background:none;font-size:18px;line-height:1;cursor:pointer;color:inherit">&times;</button></div>'
   +'<div style="font-weight:700;margin-top:2px">'+esc(r.title)+'</div>'+(r.note&&r.note!==r.title?'<div style="margin-top:3px;opacity:.85">'+esc(r.note)+'</div>':'')
   +'<div style="margin-top:6px;font-size:11px;opacity:.7">'+esc(when)+'</div>'
   +'<div style="margin-top:8px;display:flex;gap:8px"><button type="button" data-ok style="border:0;border-radius:8px;padding:6px 12px;background:#1558D6;color:#fff;font-weight:700;cursor:pointer">Got it</button><button type="button" data-open style="border:1px solid var(--line,#d7dee7);border-radius:8px;padding:6px 12px;background:transparent;color:inherit;cursor:pointer">Notifications</button></div>';
  function close(){try{client.from('vtg_reminders').update({status:'dismissed'}).eq('id',r.id).then(function(){});}catch(e){}el.remove();}
  el.querySelector('[data-x]').onclick=close;el.querySelector('[data-ok]').onclick=close;
  el.querySelector('[data-open]').onclick=function(){if(window.VTGNotifications)window.VTGNotifications.open();};
  host.appendChild(el);
  try{if('Notification' in window&&Notification.permission==='granted'&&document.hidden)new Notification('VTG reminder: '+r.title,{body:r.note||''});}catch(e){}
}
async function check(){
  if(busy||!client)return;busy=true;
  try{
    var res=await client.rpc('vtg_fire_due_reminders');
    if(res&&Array.isArray(res.data)&&res.data.length){res.data.forEach(popup);if(window.VTGNotifications&&window.VTGNotifications.refresh&&!document.getElementById('vtgLiveNotifications')?.hidden)window.VTGNotifications.refresh();}
  }catch(e){}finally{busy=false;}
}
async function start(){
  try{
    var auth=await window.VTG_AUTH_READY;client=(auth&&auth.client)||window.VTG_SUPABASE;
    if(!client||!client.auth)return;
    var s=await client.auth.getSession();if(!s.data||!s.data.session)return;
    try{if('Notification' in window&&Notification.permission==='default'){document.addEventListener('click',function ask(){document.removeEventListener('click',ask);try{Notification.requestPermission();}catch(e){}},{once:true});}}catch(e){}
    check();timer=setInterval(check,30000);
    document.addEventListener('visibilitychange',function(){if(!document.hidden)check();});
    window.VTGReminders={check:check};
  }catch(e){}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
