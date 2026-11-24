(function(){
'use strict';
// Adds a Show / Hide control to every password field that does not already have one.
function enhance(input){
 if(input.dataset.vtgPwToggle||input.closest('.passwordWrap'))return;
 if(input.parentElement&&input.parentElement.querySelector('[data-password-toggle],.vtg-pw-toggle'))return;
 input.dataset.vtgPwToggle='1';
 const wrap=document.createElement('span');wrap.className='vtg-pw-wrap';wrap.style.cssText='position:relative;display:block;width:100%';
 input.parentNode.insertBefore(wrap,input);wrap.append(input);
 input.style.paddingRight='62px';
 const b=document.createElement('button');b.type='button';b.className='vtg-pw-toggle';b.textContent='Show';b.setAttribute('aria-label','Show password');b.setAttribute('aria-pressed','false');
 b.style.cssText='position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:transparent;color:#1558D6;font:700 12px/1 inherit;cursor:pointer;padding:6px 8px;border-radius:6px';
 b.addEventListener('click',()=>{const on=input.type==='password';input.type=on?'text':'password';b.textContent=on?'Hide':'Show';b.setAttribute('aria-label',on?'Hide password':'Show password');b.setAttribute('aria-pressed',String(on));});
 wrap.append(b);
}
function scan(root){(root||document).querySelectorAll('input[type="password"]').forEach(enhance);}
const start=()=>{scan(document);new MutationObserver(()=>scan(document)).observe(document.body,{childList:true,subtree:true});};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();
})();
