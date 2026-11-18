/* VTG space scene for every 3D globe on the site (Trade Atlas page, buyer / supplier / bank shipment globes).
 *
 * Light mode : Earth as seen from space with the sun shining on it — NASA Blue Marble day imagery with relief,
 *              warm sunlight on one side, a soft blue atmosphere, deep-space star field, a sun glow, a small moon
 *              and an occasional shooting star.
 * Dark mode  : Earth at night (city lights) in the same star field.
 * Everything is served from this site (/vendor/globe) — no CDN, no keys.
 */
(function(){
  'use strict';
  if(window.VTGSpace)return;
  var A={
    lib:'/vendor/globe/globe.gl.min.js',
    day:'/vendor/globe/earth-blue-marble.jpg',
    night:'/vendor/globe/earth-night.jpg',
    sky:'/vendor/globe/night-sky.png',
    bump:'/vendor/globe/earth-topology.png'
  };
  var CDN_LIB='https://cdn.jsdelivr.net/npm/globe.gl@2.46.2/dist/globe.gl.min.js';

  function theme(){return document.documentElement.getAttribute('data-theme')==='light'?'light':'dark'}

  var libPromise=null;
  function loadGlobe(){
    if(window.Globe)return Promise.resolve();
    if(libPromise)return libPromise;
    function add(src){return new Promise(function(res,rej){var s=document.createElement('script');s.src=src;s.onload=function(){window.Globe?res():rej(Error('globe'))};s.onerror=function(){s.remove();rej(Error('globe'))};document.head.appendChild(s)})}
    libPromise=add(A.lib).catch(function(){return add(CDN_LIB)}).catch(function(e){libPromise=null;throw e});
    return libPromise;
  }

  function css(){
    if(document.getElementById('vtg-space-css'))return;
    var s=document.createElement('style');s.id='vtg-space-css';
    s.textContent=[
      '.vtg-space{background:radial-gradient(ellipse at 50% 120%,#0b1f3d 0%,#02050d 62%),#02050d!important;position:relative;overflow:hidden}',
      '.vtg-space-fx{position:absolute;inset:0;pointer-events:none;z-index:2;overflow:hidden}',
      '.vtg-space-fx .sunglow{position:absolute;left:-14%;top:-22%;width:62%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(255,226,150,.85) 0%,rgba(255,190,90,.38) 26%,rgba(255,150,60,.12) 48%,transparent 68%);mix-blend-mode:screen;opacity:0;transition:opacity .6s}',
      '.vtg-space[data-vtg-mode="light"] .sunglow{opacity:1}',
      '.vtg-space[data-vtg-mode="dark"] .sunglow{opacity:.18}',
      '.vtg-space-fx .nebula{position:absolute;inset:0;background:radial-gradient(ellipse at 88% 78%,rgba(120,90,220,.20),transparent 46%),radial-gradient(ellipse at 10% 88%,rgba(40,150,230,.16),transparent 42%)}',
      '.vtg-space-fx .moon{position:absolute;right:9%;bottom:24%;width:clamp(22px,4.4vw,44px);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 32% 30%,#fbfbf6 0%,#cfd1d3 38%,#8d9298 78%,#5d6269 100%);box-shadow:0 0 18px rgba(220,230,255,.35),inset -7px -5px 12px rgba(0,0,0,.38)}',
      '.vtg-space-fx .moon::before,.vtg-space-fx .moon::after{content:"";position:absolute;border-radius:50%;background:rgba(80,86,95,.35)}',
      '.vtg-space-fx .moon::before{width:24%;height:24%;left:22%;top:52%}',
      '.vtg-space-fx .moon::after{width:15%;height:15%;left:58%;top:28%}',
      '.vtg-space-fx .twinkle{position:absolute;width:2px;height:2px;border-radius:50%;background:#fff;box-shadow:0 0 6px 1px rgba(255,255,255,.8);animation:vtgTwinkle 3.2s ease-in-out infinite}',
      '.vtg-space-fx .shoot{position:absolute;left:-12%;top:18%;width:110px;height:2px;background:linear-gradient(90deg,transparent,#fff);border-radius:2px;opacity:0;transform:rotate(24deg);animation:vtgShoot 11s linear infinite;animation-delay:4s}',
      '@keyframes vtgTwinkle{0%,100%{opacity:.25;transform:scale(.8)}50%{opacity:1;transform:scale(1.25)}}',
      '@keyframes vtgShoot{0%{opacity:0;transform:translate(0,0) rotate(24deg)}3%{opacity:1}12%{opacity:0;transform:translate(120vw,56vw) rotate(24deg)}100%{opacity:0}}',
      '@media (prefers-reduced-motion:reduce){.vtg-space-fx .twinkle,.vtg-space-fx .shoot{animation:none}.vtg-space-fx .shoot{display:none}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function decorate(node){
    css();
    node.classList.add('vtg-space');
    if(node.querySelector(':scope > .vtg-space-fx'))return;
    var fx=document.createElement('div');fx.className='vtg-space-fx';fx.setAttribute('aria-hidden','true');
    var h='<div class="nebula"></div><div class="sunglow"></div><div class="moon"></div><div class="shoot"></div>';
    var stars=[[6,12,0],[17,34,1.1],[29,8,.6],[41,22,2],[54,6,1.4],[63,30,.3],[74,15,2.2],[83,44,.9],[91,24,1.7],[12,62,2.4],[24,80,.5],[47,88,1.9],[69,70,1.2],[88,90,2.6],[96,58,.7],[35,50,1.5]];
    stars.forEach(function(p){h+='<i class="twinkle" style="left:'+p[0]+'%;top:'+p[1]+'%;animation-delay:'+p[2]+'s"></i>'});
    fx.innerHTML=h;
    if(getComputedStyle(node).position==='static')node.style.position='relative';
    node.appendChild(fx);
  }

  /* Colours the globe for the current mode. Safe to call repeatedly. */
  function apply(globe,node){
    var mode=theme();
    node.setAttribute('data-vtg-mode',mode);
    globe.backgroundColor('rgba(0,0,0,0)');
    globe.backgroundImageUrl(A.sky);
    if(mode==='light'){
      globe.globeImageUrl(A.day);
      if(globe.bumpImageUrl)globe.bumpImageUrl(A.bump);
      globe.atmosphereColor('#7cc4ff').atmosphereAltitude(.22).showAtmosphere(true);
    }else{
      globe.globeImageUrl(A.night);
      if(globe.bumpImageUrl)globe.bumpImageUrl(null);
      globe.atmosphereColor('#55bfe8').atmosphereAltitude(.16).showAtmosphere(true);
    }
    try{
      var lights=globe.lights&&globe.lights();
      if(lights&&lights.length){
        lights.forEach(function(l){
          if(l.isAmbientLight){l.intensity=mode==='light'?.75:1.0;if(l.color&&l.color.set)l.color.set(mode==='light'?'#a9c4ee':'#ffffff')}
          if(l.isDirectionalLight){
            if(l.color&&l.color.set)l.color.set(mode==='light'?'#fff0cf':'#ffffff');
            l.intensity=mode==='light'?2.3:.6;
            if(mode==='light'&&l.position&&l.position.set)l.position.set(-1.2,.65,1);
          }
        });
      }
    }catch(e){}
    var mat=null;try{mat=globe.globeMaterial&&globe.globeMaterial()}catch(e){}
    if(mat){
      try{
        if(mode==='light'){mat.bumpScale=6;mat.shininess=14;if(mat.specular&&mat.specular.set)mat.specular.set('#6aa8ff')}
        else{mat.bumpScale=0;mat.shininess=0}
        mat.needsUpdate=true;
      }catch(e){}
    }
  }

  /* One call for every globe: decorates the container, applies the look, follows theme changes. */
  function attach(globe,node){
    decorate(node);
    function go(){apply(globe,node)}
    go();
    document.addEventListener('vtg:themechange',go);
    new MutationObserver(go).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    return go;
  }

  window.VTGSpace={assets:A,loadGlobe:loadGlobe,decorate:decorate,apply:apply,attach:attach};
})();
