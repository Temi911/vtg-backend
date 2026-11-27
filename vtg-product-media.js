/* VTG product media — photos and videos per product, shown large and clear.
   Photos auto-swap every 2 seconds; videos wait until clicked, play with controls, and the slideshow resumes after.
   Videos live in the same products.image_urls array (recognised by file extension), photos first. */
(function(){
'use strict';
if(window.VTGProductMedia)return;
var VIDEO_RE=/\.(mp4|webm|mov|m4v|ogv)(?:[?#].*)?$/i,SWAP_MS=2000;
var MAX_PHOTOS=10,MAX_VIDEOS=3,PHOTO_BYTES=5*1024*1024,VIDEO_BYTES=50*1024*1024;
var PHOTO_TYPES={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
var VIDEO_TYPES={'video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function safe(u){u=String(u||'').trim();return /^https?:\/\//i.test(u)?u:'';}
function isVideo(u){return VIDEO_RE.test(String(u||''));}
function clean(urls){return (Array.isArray(urls)?urls:[]).map(safe).filter(Boolean);}
function split(urls){var all=clean(urls),im=[],vi=[];all.forEach(function(u){(isVideo(u)?vi:im).push(u);});return {images:im,videos:vi,all:im.concat(vi)};}
function cover(urls){var s=split(urls);return s.images[0]||'';}
var ICON={play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.2v13.6a1 1 0 0 0 1.5.86l11-6.8a1 1 0 0 0 0-1.72l-11-6.8A1 1 0 0 0 8 5.2z"/></svg>',
 pause:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>',
 prev:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 next:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 close:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
 expand:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'};

/* Card cover: the first photo (big, uncropped); a video-only product shows the video's first frame. */
function cardHtml(urls,name){
 var s=split(urls),n=s.all.length;if(!n)return '<span class="vpm-none">Image not supplied</span>';
 var first=s.images[0],h;
 if(first)h='<img class="vpm-cover" loading="lazy" decoding="async" src="'+esc(first)+'" alt="'+esc(name||'Product')+' product image" onerror="this.remove()">';
 else h='<video class="vpm-cover" muted playsinline preload="metadata" src="'+esc(s.videos[0])+'#t=0.5" aria-label="'+esc(name||'Product')+' video"></video>';
 var badges='';
 if(s.videos.length)badges+='<span class="vpm-badge vpm-badge-play">'+ICON.play+(s.videos.length>1?s.videos.length:'')+'</span>';
 if(n>1)badges+='<span class="vpm-badge vpm-badge-count">1 / '+n+'</span>';
 return h+badges;
}
/* Wrap any container so that clicking it opens the viewer. */
function attrs(urls,name){var s=split(urls);return s.all.length?' data-vpm="'+esc(JSON.stringify(s.all))+'" data-vpm-name="'+esc(name||'')+'" tabindex="0" role="button" aria-label="View '+esc(name||'product')+' photos and videos"':'';}

/* The gallery: big stage + thumbnails. opts.onOpen → shows an enlarge button. */
function gallery(host,urls,name,opts){
 opts=opts||{};var s=split(urls),list=s.all;
 if(!list.length){host.innerHTML='<div class="vpm-empty">Product image not supplied</div>';return {destroy:function(){}};}
 var idx=0,timer=null,paused=false,playing=false,destroyed=false;
 host.classList.add('vpm-gallery');
 host.innerHTML='<div class="vpm-stage" data-stage></div>'
  +(list.length>1?'<button type="button" class="vpm-nav vpm-prev" data-prev aria-label="Previous">'+ICON.prev+'</button><button type="button" class="vpm-nav vpm-next" data-next aria-label="Next">'+ICON.next+'</button>':'')
  +'<div class="vpm-top"><span class="vpm-counter" data-counter></span>'
  +(list.length>1?'<button type="button" class="vpm-ctl" data-toggle aria-label="Pause slideshow" title="Pause slideshow">'+ICON.pause+'</button>':'')
  +(opts.expand?'<button type="button" class="vpm-ctl" data-expand aria-label="Full screen" title="Full screen">'+ICON.expand+'</button>':'')
  +'</div>'
  +(list.length>1?'<div class="vpm-progress"><i data-bar></i></div>':'')
  +(list.length>1?'<div class="vpm-thumbs" data-thumbs>'+list.map(function(u,i){return '<button type="button" class="vpm-thumb" data-go="'+i+'" aria-label="Show item '+(i+1)+'">'+(isVideo(u)?'<video muted playsinline preload="metadata" src="'+esc(u)+'#t=0.5"></video><span class="vpm-thumb-play">'+ICON.play+'</span>':'<img loading="lazy" src="'+esc(u)+'" alt="">')+'</button>';}).join('')+'</div>':'');
 var stage=host.querySelector('[data-stage]'),counter=host.querySelector('[data-counter]'),bar=host.querySelector('[data-bar]'),toggle=host.querySelector('[data-toggle]');
 function stopTimer(){if(timer){clearTimeout(timer);timer=null;}if(bar){bar.style.transition='none';bar.style.width='0';}}
 function schedule(){stopTimer();if(destroyed||paused||playing||list.length<2||isVideo(list[idx])||document.hidden)return;
  if(bar){void bar.offsetWidth;bar.style.transition='width '+SWAP_MS+'ms linear';bar.style.width='100%';}
  timer=setTimeout(function(){go(idx+1,true);},SWAP_MS);}
 function show(){
  var u=list[idx];playing=false;
  if(isVideo(u)){
   stage.innerHTML='<div class="vpm-video"><video playsinline preload="metadata" src="'+esc(u)+'#t=0.5" aria-label="'+esc(name||'Product')+' video"></video><button type="button" class="vpm-bigplay" data-play aria-label="Play video">'+ICON.play+'</button></div>';
   var v=stage.querySelector('video'),b=stage.querySelector('[data-play]');
   function start(){v.controls=true;b.hidden=true;var p=v.play();if(p&&p.catch)p.catch(function(){b.hidden=false;});}
   b.addEventListener('click',function(e){e.stopPropagation();start();});
   v.addEventListener('click',function(){if(!v.controls)start();});
   v.addEventListener('play',function(){playing=true;stopTimer();});
   v.addEventListener('pause',function(){if(!v.ended)playing=false;});
   v.addEventListener('ended',function(){playing=false;v.controls=false;b.hidden=false;if(list.length>1&&!paused)go(idx+1,true);});
  }else{
   stage.innerHTML='<img src="'+esc(u)+'" alt="'+esc(name||'Product')+' — photo '+(idx+1)+'" decoding="async">';
   var im=stage.querySelector('img');im.addEventListener('error',function(){if(list.length>1&&!destroyed)go(idx+1,true);});
  }
  counter.textContent=(idx+1)+' / '+list.length;
  host.querySelectorAll('.vpm-thumb').forEach(function(t,i){t.classList.toggle('on',i===idx);});
  var on=host.querySelector('.vpm-thumb.on');if(on&&on.scrollIntoView&&host.querySelector('[data-thumbs]')){var tr=host.querySelector('[data-thumbs]');tr.scrollLeft=on.offsetLeft-tr.clientWidth/2+on.clientWidth/2;}
  schedule();
 }
 function go(i,auto){var cur=stage.querySelector('video');if(cur&&!cur.paused)cur.pause();idx=(i+list.length)%list.length;show();}
 host.addEventListener('click',function(e){
  var t=e.target.closest('button');if(!t||!host.contains(t))return;
  if(t.hasAttribute('data-prev')){go(idx-1);}
  else if(t.hasAttribute('data-next')){go(idx+1);}
  else if(t.hasAttribute('data-go')){go(Number(t.getAttribute('data-go')));}
  else if(t.hasAttribute('data-toggle')){paused=!paused;t.innerHTML=paused?ICON.play:ICON.pause;t.setAttribute('aria-label',paused?'Resume slideshow':'Pause slideshow');t.title=t.getAttribute('aria-label');paused?stopTimer():schedule();}
  else if(t.hasAttribute('data-expand')&&opts.expand){opts.expand(idx);}
 });
 stage.addEventListener('click',function(e){if(opts.expand&&e.target.tagName==='IMG')opts.expand(idx);});
 var touchX=null;host.addEventListener('touchstart',function(e){touchX=e.touches[0].clientX;},{passive:true});
 host.addEventListener('touchend',function(e){if(touchX==null)return;var dx=e.changedTouches[0].clientX-touchX;touchX=null;if(Math.abs(dx)>45)go(idx+(dx<0?1:-1));},{passive:true});
 function vis(){if(document.hidden)stopTimer();else schedule();}document.addEventListener('visibilitychange',vis);
 show();
 return {destroy:function(){destroyed=true;stopTimer();document.removeEventListener('visibilitychange',vis);var v=stage.querySelector('video');if(v)v.pause();},go:go,index:function(){return idx;}};
}

/* Fullscreen viewer (lightbox). */
var current=null;
function open(urls,name,start){
 close();var s=split(urls);if(!s.all.length)return;
 var lb=document.createElement('div');lb.className='vpm-lightbox';lb.setAttribute('role','dialog');lb.setAttribute('aria-modal','true');lb.setAttribute('aria-label',(name||'Product')+' photos and videos');
 lb.innerHTML='<div class="vpm-lb-head"><strong>'+esc(name||'Product')+'</strong><button type="button" class="vpm-lb-close" aria-label="Close">'+ICON.close+'</button></div><div class="vpm-lb-body" data-body></div>';
 document.body.appendChild(lb);document.documentElement.classList.add('vpm-lock');
 var g=gallery(lb.querySelector('[data-body]'),s.all,name,{});if(start)g.go(start);
 function key(e){if(e.key==='Escape')close();else if(e.key==='ArrowRight')g.go(g.index()+1);else if(e.key==='ArrowLeft')g.go(g.index()-1);}
 lb.addEventListener('click',function(e){if(e.target===lb||e.target.closest('.vpm-lb-close'))close();});
 document.addEventListener('keydown',key);
 current={lb:lb,g:g,key:key};lb.querySelector('.vpm-lb-close').focus();
}
function close(){if(!current)return;current.g.destroy();document.removeEventListener('keydown',current.key);current.lb.remove();document.documentElement.classList.remove('vpm-lock');current=null;}

/* Click / Enter on any element carrying data-vpm opens the viewer. Capture phase so it wins over card handlers. */
function trigger(e){
 var t=e.target.closest&&e.target.closest('[data-vpm]');if(!t)return;
 if(e.type==='keydown'&&e.key!=='Enter'&&e.key!==' ')return;
 var u;try{u=JSON.parse(t.getAttribute('data-vpm'));}catch(_){return;}
 e.preventDefault();e.stopPropagation();open(u,t.getAttribute('data-vpm-name')||'',0);
}
document.addEventListener('click',trigger,true);document.addEventListener('keydown',trigger,true);

/* Upload picker: accumulate photos and videos, validate, preview, remove. Returns {files(), reset()}. */
function picker(host,input,opts){
 opts=opts||{};var picked=[];
 var list=document.createElement('div');list.className='vpm-picked';list.setAttribute('aria-live','polite');host.appendChild(list);
 var msg=document.createElement('div');msg.className='vpm-pick-msg';host.appendChild(msg);
 function counts(){var p=0,v=0;picked.forEach(function(x){x.video?v++:p++;});return {p:p,v:v};}
 function render(){
  list.innerHTML=picked.map(function(x,i){return '<div class="vpm-pick'+(x.video?' is-video':'')+'">'+(x.video?'<video muted playsinline preload="metadata" src="'+esc(x.url)+'#t=0.5"></video><span class="vpm-thumb-play">'+ICON.play+'</span>':'<img src="'+esc(x.url)+'" alt="">')+'<button type="button" data-rm="'+i+'" aria-label="Remove '+esc(x.file.name)+'">×</button></div>';}).join('');
  var c=counts();msg.textContent=picked.length?c.p+' photo'+(c.p===1?'':'s')+(c.v?' · '+c.v+' video'+(c.v===1?'':'s'):'')+' selected (max '+MAX_PHOTOS+' photos, '+MAX_VIDEOS+' videos).':'';
 }
 input.addEventListener('change',function(){
  var errs=[];
  Array.prototype.forEach.call(input.files||[],function(f){
   var video=!!VIDEO_TYPES[f.type],photo=!!PHOTO_TYPES[f.type],c=counts();
   if(!video&&!photo){errs.push(f.name+': use JPEG, PNG or WEBP photos, or MP4, WEBM or MOV videos.');return;}
   if(photo&&f.size>PHOTO_BYTES){errs.push(f.name+' is larger than 5 MB.');return;}
   if(video&&f.size>VIDEO_BYTES){errs.push(f.name+' is larger than 50 MB.');return;}
   if(photo&&c.p>=MAX_PHOTOS){errs.push('Only '+MAX_PHOTOS+' photos per product — "'+f.name+'" was skipped.');return;}
   if(video&&c.v>=MAX_VIDEOS){errs.push('Only '+MAX_VIDEOS+' videos per product — "'+f.name+'" was skipped.');return;}
   picked.push({file:f,video:video,url:URL.createObjectURL(f)});
  });
  input.value='';render();if(errs.length){msg.textContent=errs.join(' ');msg.classList.add('err');}else msg.classList.remove('err');
 });
 list.addEventListener('click',function(e){var b=e.target.closest('[data-rm]');if(!b)return;var x=picked.splice(Number(b.getAttribute('data-rm')),1)[0];if(x)URL.revokeObjectURL(x.url);msg.classList.remove('err');render();});
 return {files:function(){return picked.map(function(x){return x.file;});},reset:function(){picked.forEach(function(x){URL.revokeObjectURL(x.url);});picked=[];msg.classList.remove('err');render();}};
}
function extFor(f){return PHOTO_TYPES[f.type]||VIDEO_TYPES[f.type]||'bin';}
window.VTGProductMedia={isVideo:isVideo,split:split,cover:cover,cardHtml:cardHtml,attrs:attrs,gallery:gallery,open:open,close:close,picker:picker,extFor:extFor,esc:esc,
 limits:{photos:MAX_PHOTOS,videos:MAX_VIDEOS,photoBytes:PHOTO_BYTES,videoBytes:VIDEO_BYTES,swapMs:SWAP_MS}};
})();
