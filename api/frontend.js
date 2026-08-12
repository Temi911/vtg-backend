const fs = require('fs');
const path = require('path');

const HARDENING = String.raw`<style id="vtg-ai-hardening-style">
.ai-launcher{display:none !important;}
.ai-launcher.visible{display:flex !important;}
.ai-panel{display:none !important;}
.ai-panel.open{display:flex !important;}
.ai-launcher .ai-bot-icon{width:28px;height:28px;display:block;}
</style>
<script>
(function(){
  var userOpened = false;
  var guardInstalled = false;

  // AIChat is declared as a top-level const in index.html, so it is a
  // global lexical binding rather than a window property. Support both.
  function getAI(){
    try { if(typeof AIChat !== 'undefined' && AIChat) return AIChat; } catch(e) {}
    try { if(window.AIChat) return window.AIChat; } catch(e) {}
    return null;
  }

  function botSvg(){
    return '<svg class="ai-bot-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 7v5" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><circle cx="24" cy="5" r="2.2" fill="currentColor"/><rect x="8" y="12" width="32" height="27" rx="10" stroke="currentColor" stroke-width="2.8"/><circle cx="18" cy="25" r="2.7" fill="currentColor"/><circle cx="30" cy="25" r="2.7" fill="currentColor"/><path d="M17 32c2.2 2 4.5 3 7 3s4.8-1 7-3" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M8 22H5M43 22h-3" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg><span class="ai-launcher-dot"></span>';
  }

  function forceClosed(){
    var panel=document.getElementById('ai-panel');
    if(panel && !userOpened){
      panel.classList.remove('open');
      panel.style.setProperty('display','none','important');
    }
  }

  function forceLauncher(){
    var ai=getAI();
    if(!ai || typeof ai.build !== 'function') return false;
    try { ai.build(); } catch(e) { return false; }

    var launcher=document.getElementById('ai-launcher');
    if(!launcher) return false;

    launcher.classList.add('visible');
    launcher.style.setProperty('display','flex','important');
    launcher.setAttribute('aria-label','Chat with VTG AI Assistant');
    launcher.title='Chat with VTG AI Assistant';
    launcher.innerHTML=botSvg();

    if(!launcher.__vtgClickGuard){
      launcher.__vtgClickGuard=true;
      launcher.addEventListener('click',function(){
        userOpened=true;
      },true);
    }

    forceClosed();
    return true;
  }

  function installGuard(){
    var ai=getAI();
    if(!ai || guardInstalled) return !!ai;
    guardInstalled=true;

    if(typeof ai.toggle === 'function' && !ai.__vtgToggleWrapped){
      var originalToggle=ai.toggle.bind(ai);
      ai.toggle=function(){
        userOpened=true;
        return originalToggle();
      };
      ai.__vtgToggleWrapped=true;
    }

    if(typeof ai.openPublicAssistant === 'function' && !ai.__vtgPublicOpenWrapped){
      var originalPublicOpen=ai.openPublicAssistant.bind(ai);
      ai.openPublicAssistant=function(){
        if(!userOpened){
          try{ if(typeof ai.showLauncher==='function') ai.showLauncher(); }catch(e){}
          forceClosed();
          return;
        }
        return originalPublicOpen();
      };
      ai.__vtgPublicOpenWrapped=true;
    }

    return true;
  }

  function boot(){
    var attempts=0;
    var timer=setInterval(function(){
      attempts++;
      var ai=getAI();
      if(ai){
        installGuard();
        forceLauncher();
        forceClosed();
        if(attempts>=10) clearInterval(timer);
      }
      if(attempts>=100) clearInterval(timer);
    },100);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.addEventListener('load',function(){
    installGuard();
    forceLauncher();
    forceClosed();
    setTimeout(function(){
      if(!userOpened){
        forceLauncher();
        forceClosed();
      }
    },1200);
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