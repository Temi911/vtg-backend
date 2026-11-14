/* "Continue with Google" buttons: <div data-vtg-google data-role="buyer|supplier|bank|auto" data-label="..."></div> */
(function(){
'use strict';
const G='<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.5-4.1 7-10.2 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';
function role(box){
 const r=box.dataset.role;
 if(r&&r!=='auto')return r;
 const active=document.querySelector('[data-role].active');
 return active&&active.dataset.role||'buyer';
}
function mount(box){
 box.classList.add('vtg-google');
 const label=box.dataset.label||'Continue with Google';
 box.innerHTML='<button type="button" class="vtg-google-btn">'+G+'<span></span></button><p class="vtg-google-msg" role="alert" hidden></p>'+(box.dataset.note?'<p class="vtg-google-note"></p>':'')+'<div class="vtg-google-or">or use your email</div>';
 box.querySelector('span').textContent=label;
 const note=box.querySelector('.vtg-google-note');if(note)note.textContent=box.dataset.note;
 const btn=box.querySelector('button'),msg=box.querySelector('.vtg-google-msg');
 btn.addEventListener('click',async()=>{
  msg.hidden=true;btn.disabled=true;
  try{
   const auth=await window.VTG_AUTH_READY;
   if(window.VTGLoader)window.VTGLoader.show('Opening Google','You will return to VTG after you choose your account.');
   await auth.signInWithGoogle(role(box));
  }catch(e){
   if(window.VTGLoader)window.VTGLoader.hide();
   msg.textContent=e.message||'Google sign-in could not start.';msg.hidden=false;btn.disabled=false;
  }
 });
}
function start(){document.querySelectorAll('[data-vtg-google]').forEach(mount);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('pageshow',e=>{if(e.persisted){document.querySelectorAll('.vtg-google-btn').forEach(b=>b.disabled=false);window.VTGLoader&&window.VTGLoader.hide();}});
})();
