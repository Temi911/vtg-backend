(function(){
'use strict';
// One Show / Hide control per password field. Adopts a toggle the page already has instead of adding a second one on top of it.
var css='.vtg-pw-wrap{position:relative;display:block;width:100%}'
+'.vtg-pw-wrap>input{padding-right:70px!important}'
+'.vtg-pw-toggle{position:absolute!important;right:8px!important;left:auto!important;top:50%!important;transform:translateY(-50%)!important;width:auto!important;min-width:0!important;height:auto!important;margin:0!important;padding:6px 10px!important;border:0!important;border-radius:6px!important;background:transparent!important;box-shadow:none!important;color:#1558D6!important;font:700 12px/1 inherit!important;letter-spacing:0!important;text-transform:none!important;cursor:pointer;z-index:2}'
+'.vtg-pw-toggle:hover{background:rgba(21,88,214,.1)!important}.vtg-pw-toggle:focus-visible{outline:2px solid #FFB81C;outline-offset:1px}'

var st=document.createElement('style');st.id='vtg-pw-toggle-css';st.textContent=css;(document.head||document.documentElement).appendChild(st);
function bgLum(el){var layers=[];for(var e=el;e;e=e.parentElement){var m=getComputedStyle(e).backgroundColor.match(/rgba?\(([^)]+)\)/);if(m){var p=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);var al=p.length<4?1:p[3];if(al>0){layers.push([p[0],p[1],p[2],al]);if(al>=1)break;}}}
 var c=[255,255,255];for(var i=layers.length-1;i>=0;i--){var l=layers[i];c=[l[0]*l[3]+c[0]*(1-l[3]),l[1]*l[3]+c[1]*(1-l[3]),l[2]*l[3]+c[2]*(1-l[3])];}
 var f=function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]);}
function tone(b,input){b.style.setProperty('color',bgLum(input)<0.35?'#9CC2FF':'#1558D6','important');}
var toggles=[];function retone(){toggles.forEach(function(t){tone(t[0],t[1]);});}
new MutationObserver(retone).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','data-skin','class']});addEventListener('load',function(){retone();setTimeout(retone,400);setTimeout(retone,1500);var n=0,iv=setInterval(function(){retone();if(++n>16)clearInterval(iv);},250);});document.addEventListener('transitionend',function(e){if(e.target&&e.target.tagName==='INPUT')retone();},true);
function label(b,on){b.textContent=on?'Hide':'Show';b.setAttribute('aria-label',on?'Hide password':'Show password');b.setAttribute('aria-pressed',String(on));}
function existing(input){
 var p=input.parentElement;if(!p)return null;
 var c=p.querySelector('[data-password-toggle],.vtg-pw-toggle,button.toggle,#toggle,.togglePw,.passwordToggle,.pw-toggle,.show-password');
 if(c)return c;
 var bs=[].slice.call(p.querySelectorAll('button')).filter(function(b){return /^(show|hide)$/i.test((b.textContent||'').trim());});
 return bs[0]||null;
}
function enhance(input){
 if(input.dataset.vtgPwToggle)return;input.dataset.vtgPwToggle='1';
 var ex=existing(input);
 if(ex){ // adopt: make it the single toggle and style it to sit inside the field
  ex.classList.add('vtg-pw-toggle');ex.type='button';
  var w=input.parentElement;if(getComputedStyle(w).position==='static')w.classList.add('vtg-pw-wrap');else w.classList.add('vtg-pw-wrap');
  input.style.setProperty('padding-right','70px','important');
  label(ex,input.type!=='password');toggles.push([ex,input]);tone(ex,input);
  ex.onclick=function(e){e.preventDefault();e.stopImmediatePropagation();var on=input.type==='password';input.type=on?'text':'password';label(ex,on);};
  return;
 }
 var wrap=document.createElement('span');wrap.className='vtg-pw-wrap';
 input.parentNode.insertBefore(wrap,input);wrap.append(input);
 var b=document.createElement('button');b.type='button';b.className='vtg-pw-toggle';label(b,false);toggles.push([b,input]);
 b.addEventListener('click',function(){var on=input.type==='password';input.type=on?'text':'password';label(b,on);});
 wrap.append(b);tone(b,input);
}
function scan(root){(root||document).querySelectorAll('input[type="password"],input[data-vtg-pw-toggle]').forEach(enhance);}
var start=function(){scan(document);new MutationObserver(function(){scan(document);}).observe(document.body,{childList:true,subtree:true});};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();
})();
