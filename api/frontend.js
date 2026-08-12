const fs = require('fs');
const path = require('path');

const HARDENING = String.raw`<style id="vtg-ai-hardening-style">
.ai-launcher{display:none !important;}
.ai-launcher.visible{display:flex !important;}
.ai-panel{display:none !important;}
.ai-panel.open{display:flex !important;}
</style>
<script>
(function(){
  var userOpened = false;
  var originalToggle = null;

  function botSvg(){
    return '<svg class="ai-bot-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 7v5" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><circle cx="24" cy="5" r="2.2" fill="currentColor"/><rect x="8" y="12" width="32" height="27" rx="10" stroke="currentColor" stroke-width="2.8"/><circle cx="18" cy="25" r="2.7" fill="currentColor"/><circle cx="30" cy="25" r="2.7" fill="currentColor"/><path d="M17 32c2.2 2 4.5 3 7 3s4.8-1 7-3" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M8 22H5M43 22h-3" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg><span class="ai-launcher-dot"></span>';
  }

  function harden(){
    if(!window.AIChat || typeof window.AIChat.build !== 'function') return false;
    try{
      window.AIChat.build();
      var launcher=document.getElementById('ai-launcher');
      var panel=document.getElementById('ai-panel');
      if(launcher){
        launcher.classList.add('visible');
        launcher.style.setProperty('display','flex','important');
        launcher.setAttribute('aria-label','Chat with VTG AI Assistant');
        launcher.title='Chat with VTG AI Assistant';
        launcher.innerHTML=botSvg();
        if(!launcher.__vtgBound){
          launcher.__vtgBound=true;
          launcher.addEventListener('click',function(){ userOpened=true; },true);
        }
      }
      if(panel && !userOpened){
        panel.classList.remove('open');
        panel.style.setProperty('display','none','important');
      }
      return true;
    }catch(e){
      console.warn('[VTG AI] hardening failed',e);
      return false;
    }
  }

  function installGuard(){
    if(!window.AIChat) return false;
    if(!window.AIChat.__vtgGuardInstalled){
      originalToggle=window.AIChat.toggle.bind(window.AIChat);
      window.AIChat.toggle=function(){
        userOpened=true;
        return originalToggle();
      };
      var originalOpen=window.AIChat.openPublicAssistant && window.AIChat.openPublicAssistant.bind(window.AIChat);
      if(originalOpen){
        window.AIChat.openPublicAssistant=function(){
          if(!userOpened){
            window.AIChat.showLauncher();
            var p=document.getElementById('ai-panel');
            if(p){p.classList.remove('open');p.style.setProperty('display','none','important');}
            return;
          }
          return originalOpen();
        };
      }
      window.AIChat.__vtgGuardInstalled=true;
    }
    return true;
  }

  function boot(){
    var tries=0;
    var timer=setInterval(function(){
      tries++;
      if(harden()){
        installGuard();
        harden();
        if(tries>3) clearInterval(timer);
      }
      if(tries>=60) clearInterval(timer);
    },100);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  window.addEventListener('load',function(){
    installGuard();
    harden();
    setTimeout(function(){ if(!userOpened) harden(); },800);
  });
})();
</script>`;

module.exports = (req, res) => {
  try {
    const file = path.join(process.cwd(), 'index.html');
    let html = fs.readFileSync(file, 'utf8');
    html = html.replace('</body>', HARDENING + '\n</body>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).send('VTG frontend could not be loaded.');
  }
};