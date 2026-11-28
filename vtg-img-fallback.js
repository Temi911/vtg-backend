/* VTG image placeholders: a soft shimmer while pictures load, and a context-fitting icon if one is slow or missing. */
(function(){
if(window.__vtgImgFb)return;window.__vtgImgFb=1;
var css='img.vtg-imgwait{background:linear-gradient(100deg,rgba(120,140,170,.14) 30%,rgba(120,140,170,.26) 50%,rgba(120,140,170,.14) 70%);background-size:200% 100%;animation:vtgShim 1.3s linear infinite}'
+'@keyframes vtgShim{to{background-position:-200% 0}}'
+'.vtg-imgfb{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:rgba(21,88,214,.08);border:1px solid rgba(120,140,170,.3);color:#43576E;font:600 11px/1.3 Inter,Arial,sans-serif;text-align:center;border-radius:8px;overflow:hidden}'
+'html[data-theme="dark"] .vtg-imgfb{background:rgba(111,150,255,.12);color:#C4D2E6}'
+'.vtg-imgfb svg{width:34px;height:34px;opacity:.85}@media(prefers-reduced-motion:reduce){img.vtg-imgwait{animation:none}}';
var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
var ICONS={
 vehicle:'<path d="M3 15v-3l2-5h14l2 5v3M3 15h18M7 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm10 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>',
 ship:'<path d="M3 17l2 3h14l2-3-9-3-9 3zM12 14V4l5 5h-5M6 12l6-3"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
 building:'<path d="M4 21V5l8-3 8 3v16M9 9h2m2 0h2M9 13h2m2 0h2M9 17h6"/>',
 box:'<path d="M3 7l9-4 9 4v10l-9 4-9-4V7zm0 0l9 4m0 0l9-4m-9 4v10"/>'};
function kind(img){var t=((img.alt||'')+' '+(img.src||'')+' '+(img.className||'')).toLowerCase();
 if(/avatar|profile|person|user|agent|staff|team/.test(t))return 'user';
 if(/vehicle|truck|car|bus|tractor|excavator|loader|machine|equipment/.test(t))return 'vehicle';
 if(/ship|port|shipping|container|logistic|freight|vessel/.test(t))return 'ship';
 if(/bank|office|company|business|warehouse|factory|building/.test(t))return 'building';
 return 'box';}
function fallback(img){
 if(img.__vtgFb||img.closest('.vtg-imgfb'))return;img.__vtgFb=1;img.classList.remove('vtg-imgwait');
 var d=document.createElement('span');d.className='vtg-imgfb';d.setAttribute('role','img');
 var label=(img.alt||'').trim();d.setAttribute('aria-label',label||'Image unavailable');
 var w=img.getAttribute('width'),h=img.getAttribute('height');
 d.style.width=(w?w+'px':(img.clientWidth?img.clientWidth+'px':'100%'));d.style.height=(h?h+'px':(img.clientHeight?img.clientHeight+'px':'120px'));d.style.maxWidth='100%';
 d.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICONS[kind(img)]+'</svg>'+(label&&label.length<40?'<span>'+label.replace(/[<>&]/g,'')+'</span>':'');
 if(img.parentNode)img.parentNode.insertBefore(d,img);img.style.display='none';
 img.addEventListener('load',function(){if(img.naturalWidth){img.style.display='';d.remove();img.__vtgFb=0;}},{once:true});
}
function watch(img){
 if(!img||img.tagName!=='IMG'||img.__vtgW)return;img.__vtgW=1;
 if(img.complete){if(img.src&&!img.naturalWidth)fallback(img);return;}
 img.classList.add('vtg-imgwait');
 img.addEventListener('load',function(){img.classList.remove('vtg-imgwait');});
 img.addEventListener('error',function(){fallback(img);});
}
function scan(root){(root.querySelectorAll?root.querySelectorAll('img'):[]).forEach(watch);}
scan(document);
addEventListener('error',function(e){if(e.target&&e.target.tagName==='IMG')fallback(e.target);},true);
new MutationObserver(function(l){l.forEach(function(m){m.addedNodes.forEach(function(n){if(n.nodeType===1){if(n.tagName==='IMG')watch(n);else scan(n);}});});}).observe(document.documentElement,{childList:true,subtree:true});
})();
