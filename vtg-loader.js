/* VTG loader: full-screen overlay + inline replacement for "Loading…" placeholders. */
(function(){
'use strict';
if(window.VTGLoader)return;
let n=0;
const PATH='M7 10H31L51 76L72 10H96L65 101H39Z';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PAT='<pattern id="ID" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#a20d12"/><path d="M11 2L19 11L11 20L3 11Z" fill="none" stroke="#ef9a88" stroke-width="1.7"/><path d="M11 6L15 11L11 16L7 11Z" fill="none" stroke="#f5c0a9" stroke-width="1.1"/><circle cx="11" cy="11" r="1.5" fill="#f3b49f"/><path d="M1 1L5 5M17 17L21 21M21 1L17 5M5 17L1 21" stroke="#d95545" stroke-width="1"/></pattern>';
function logoInner(id){
 return '<defs>'+PAT.replace('ID',id+'p')+'<clipPath id="'+id+'c"><path d="'+PATH+'"/></clipPath></defs>'
  +'<g clip-path="url(#'+id+'c)"><rect x="0" y="0" width="105" height="110" fill="url(#'+id+'p)"/></g>'
  +'<path d="'+PATH+'" fill="none" stroke="#b51a18" stroke-width="1"/>'
  +'<g fill="#b51a18" font-family="Georgia,\'Times New Roman\',serif" font-weight="700"><text x="108" y="42" font-size="27" letter-spacing="8">INTAGE</text><text x="104" y="76" font-size="27" letter-spacing="1.8">TRADE GLOBAL</text></g>'
  +'<text x="109" y="98" fill="#b51a18" font-family="Arial,Helvetica,sans-serif" font-size="8.3" letter-spacing="4.7">AFRICA TRADE PLATFORM</text>';
}
/* Full logo with a thin red line that keeps circling it until the page has loaded. */
function logoSvg(){
 const id='vtgl'+(++n);
 return '<svg translate="no" class="notranslate vtg-loader-v vtg-loader-full" viewBox="0 0 320 320" aria-hidden="true" focusable="false">'
  +'<circle class="vtg-v-ring-track" cx="160" cy="160" r="150"/><circle class="vtg-v-ring" cx="160" cy="160" r="150" pathLength="100"/>'
  +'<svg x="50" y="129.7" width="220" height="60.5" viewBox="0 0 400 110" overflow="visible">'+logoInner(id)+'</svg></svg>';
}
/* Small version (V mark + circling line) for inline "Loading…" placeholders. */
function vSvg(){
 const id='vtgv'+(++n);
 return '<svg translate="no" class="notranslate vtg-loader-v vtg-loader-mark" viewBox="-20 -16 143 143" aria-hidden="true" focusable="false"><defs>'+PAT.replace('ID',id+'p')+'<clipPath id="'+id+'c"><path d="'+PATH+'"/></clipPath></defs>'
  +'<g clip-path="url(#'+id+'c)"><rect x="0" y="0" width="105" height="110" fill="url(#'+id+'p)"/></g><path d="'+PATH+'" fill="none" stroke="#b51a18" stroke-width="1.5"/>'
  +'<circle class="vtg-v-ring-track" cx="51.5" cy="55.5" r="66"/><circle class="vtg-v-ring" cx="51.5" cy="55.5" r="66" pathLength="100"/></svg>';
}
function inline(text){return '<span class="vtg-loader-inline" data-vtg-loader role="status">'+vSvg()+'<span class="vtg-loader-text">'+esc(text)+'</span></span>';}
let overlay=null;
function show(title,sub){
 hide();
 overlay=document.createElement('div');overlay.className='vtg-loader';overlay.setAttribute('role','status');overlay.setAttribute('aria-live','polite');
 overlay.innerHTML=logoSvg()+'<p class="vtg-loader-title"></p><p class="vtg-loader-sub" hidden></p>';
 overlay.querySelector('.vtg-loader-title').textContent=title||'Loading';
 if(sub){const s=overlay.querySelector('.vtg-loader-sub');s.textContent=sub;s.hidden=false;}
 (document.body||document.documentElement).append(overlay);return overlay;
}
function hide(){if(overlay){overlay.remove();overlay=null;}}
/* Turns plain "Loading …" placeholders into the V loader, wherever the site writes them. */
const LOADING=/^\s*(loading|please wait|confirming)\b[^\n]{0,90}$/i;
const SKIP='button,input,select,option,textarea,script,style,title,label,a,[data-vtg-loader],.vtg-loader,.vtg-loader-inline,[contenteditable]';
function upgrade(el){
 if(!el||el.nodeType!==1||el.children.length||el.closest(SKIP))return;
 const t=el.textContent;if(!t||t.length>110||!LOADING.test(t))return;
 el.innerHTML=inline(t.trim());
}
function scan(root){
 if(!root||root.nodeType!==1)return;
 if(!root.children.length)upgrade(root);
 root.querySelectorAll('p,div,span,td,li,small,h3,h4,em').forEach(upgrade);
}
function start(){
 scan(document.body);
 new MutationObserver(list=>{for(const m of list){
  if(m.type==='characterData'){upgrade(m.target.parentElement);continue;}
  m.addedNodes.forEach(node=>{if(node.nodeType===1)scan(node);else if(node.nodeType===3)upgrade(node.parentElement);});
  if(m.type==='childList'&&m.target.nodeType===1&&!m.target.children.length)upgrade(m.target);
 }}).observe(document.body,{childList:true,subtree:true,characterData:true});
}
window.VTGLoader={show,hide,inline,markup:logoSvg};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else if(document.body)start();
})();
