(function(){
'use strict';
// "Change my login details": a signed-in buyer, supplier or bank user asks for a secure link. The server
// confirms the account and emails the link to the registered address; nothing is changed from this page.
function build(){
 const card=document.createElement('section');card.className='panel vtg-login-change';card.id='vtgLoginChange';
 card.style.cssText='margin-top:16px;padding:18px;border:1px solid rgba(120,130,150,.3);border-radius:14px';
 card.innerHTML='<h2 style="margin:0 0 6px;font-size:16px">Change login details</h2>'
  +'<p style="margin:0 0 12px;font-size:13px;line-height:1.6;opacity:.8">To change your password or other sign-in details, we email a secure link to your registered email address. Open it on this device to choose a new password.</p>'
  +'<button type="button" id="vtgLoginChangeBtn" style="border:0;border-radius:10px;padding:11px 16px;background:#1558D6;color:#fff;font-weight:800;cursor:pointer">Email me a secure link</button>'
  +'<p id="vtgLoginChangeMsg" role="status" style="margin:10px 0 0;font-size:13px"></p>';
 const btn=card.querySelector('#vtgLoginChangeBtn'),msg=card.querySelector('#vtgLoginChangeMsg');
 btn.addEventListener('click',async()=>{
  btn.disabled=true;msg.textContent='Sending…';msg.style.color='';
  try{
   const auth=await window.VTG_AUTH_READY;const {data}=await auth.client.auth.getSession();
   const token=data?.session?.access_token;if(!token)throw new Error('Please sign in again first.');
   const r=await fetch(auth.projectUrl+'/functions/v1/vtg-staff-access',{method:'POST',headers:{'Content-Type':'application/json',apikey:auth.publishableKey,Authorization:'Bearer '+token},body:JSON.stringify({kind:'self'})});
   const j=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(j.error||'The link could not be sent. Please try again.');
   msg.textContent=j.message||'A secure link has been sent to your registered email address.';msg.style.color='#1d6b3a';
  }catch(e){msg.textContent=e.message;msg.style.color='#b3261e';}
  finally{btn.disabled=false;}
 });
 return card;
}
function mount(){
 if(document.getElementById('vtgLoginChange'))return true;
 const host=document.querySelector('#page-settings')||document.querySelector('#view-settings')||document.querySelector('#page-profile');
 if(!host)return false;
 host.append(build());return true;
}
const start=()=>{if(!mount()){let n=0;const t=setInterval(()=>{if(mount()||++n>40)clearInterval(t);},500);}};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();
})();
