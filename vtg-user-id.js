/* Shows the signed-in user's permanent VTG user ID (e.g. VTG-100001) in their dashboard, with a copy button. */
(function(){
'use strict';
if(window.__vtgUserId)return;window.__vtgUserId=true;
const css=document.createElement('style');
css.textContent='.vtg-uid{display:inline-flex;align-items:center;gap:6px;margin-top:4px;padding:2px 8px;border:1px solid var(--line,rgba(127,127,127,.35));border-radius:999px;font-size:11px;line-height:1.6;color:var(--muted,inherit);background:transparent;white-space:nowrap;max-width:100%}'
 +'.vtg-uid b{font-weight:700;letter-spacing:.04em;color:var(--text,inherit)}'
 +'.vtg-uid button{all:unset;cursor:pointer;font-size:11px;font-weight:700;color:#1558D6;padding:0 2px}.vtg-uid button:focus-visible{outline:2px solid #1558D6;outline-offset:2px;border-radius:4px}'
 +'.vtg-uid--top{margin:0 8px 0 0}'
 +'.vtg-uid--bar{margin:0 8px 0 0;padding:4px 10px;border-color:#1558D6;font-size:12px;color:#fff}.vtg-uid--bar b{color:#fff}.vtg-uid--bar span{color:#c4d3ea}.vtg-uid--bar button{color:#8db4ff}@media(max-width:760px){.vtg-uid--bar{display:none}}'
 +'@media(max-width:760px){.vtg-uid--bar{display:none}}';
document.head.appendChild(css);
function chip(id,cls){
 const el=document.createElement('span');el.className='vtg-uid'+(cls?' '+cls:'');el.setAttribute('data-vtg-uid-chip','');el.title='Your VTG user ID. Quote it when you contact VTG support.';
 const lab=document.createElement('span');lab.textContent='User ID';
 const val=document.createElement('b');val.textContent=id;
 const btn=document.createElement('button');btn.type='button';btn.textContent='Copy';btn.setAttribute('aria-label','Copy your VTG user ID');
 btn.addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(id);btn.textContent='Copied';}catch(_){const r=document.createRange();r.selectNodeContents(val);const sel=getSelection();sel.removeAllRanges();sel.addRange(r);btn.textContent='Select + copy';}
  setTimeout(()=>{btn.textContent='Copy';},1600);
 });
 el.append(lab,val,btn);return el;
}
function mountBar(id,tries){
 const host=document.querySelector('.vf-controls');          // shared top bar (built by vtg-dashboard-footer.js)
 if(!host){if(tries<30)setTimeout(()=>mountBar(id,tries+1),150);return;}
 host.querySelectorAll('.vtg-uid--bar').forEach(n=>n.remove());
 host.insertBefore(chip(id,'vtg-uid--bar'),host.firstChild);
}
function mount(id){
 document.querySelectorAll('[data-vtg-uid-chip]').forEach(n=>n.remove());
 const spots=[];
 const email=document.getElementById('profileEmail');          // buyer sidebar
 if(email&&email.parentElement)spots.push(()=>email.parentElement.appendChild(chip(id)));
 const side=document.querySelector('.sidebar-bottom');          // supplier sidebar
 if(side)spots.push(()=>side.insertBefore(chip(id),side.firstChild));
 const av=document.getElementById('avatar');                    // bank top bar (when no profile block above)
 if(av&&!email&&av.parentElement)spots.push(()=>av.parentElement.insertBefore(chip(id,'vtg-uid--top'),av));
 document.querySelectorAll('[data-vtg-user-id]').forEach(h=>spots.push(()=>h.appendChild(chip(id))));
 spots.forEach(f=>f());
 mountBar(id,0);
}
async function start(){
 try{
  const auth=await window.VTG_AUTH_READY;if(!auth||!auth.getCurrent)return;
  const cur=await auth.getCurrent();const id=cur&&cur.user&&cur.user.vtgUserId;
  if(id&&/^VTG-\d{6,}$/.test(id))mount(id);
 }catch(_){/* never block the dashboard */}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
