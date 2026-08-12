const fs = require('fs');
const path = require('path');

const HARDENING = String.raw`<script>
(function(){
  function ensureVTGAIAssistant(){
    if(typeof window.AIChat !== 'object' || !window.AIChat) return false;
    try{
      window.AIChat.build();
      var launcher=document.getElementById('ai-launcher');
      var panel=document.getElementById('ai-panel');
      if(launcher){ launcher.classList.add('visible'); launcher.style.display='flex'; }
      if(panel){ panel.classList.remove('open'); panel.style.removeProperty('display'); }
      return true;
    }catch(e){ console.warn('[VTG AI] Assistant initialization failed:', e); return false; }
  }
  function boot(){
    if(ensureVTGAIAssistant()) return;
    var attempts=0;
    var timer=setInterval(function(){
      attempts++;
      if(ensureVTGAIAssistant() || attempts>=40) clearInterval(timer);
    },250);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  window.addEventListener('load',function(){
    var panel=document.getElementById('ai-panel');
    var launcher=document.getElementById('ai-launcher');
    if(panel){ panel.classList.remove('open'); panel.style.removeProperty('display'); }
    if(launcher){ launcher.classList.add('visible'); launcher.style.display='flex'; }
  });
})();
</script>`;

module.exports = (req, res) => {
  try {
    const file = path.join(process.cwd(), 'index.html');
    let html = fs.readFileSync(file, 'utf8');
    if (!html.includes('VTG AI Assistant hardening: closed on startup, launcher always available')) {
      html = html.replace('</body>', HARDENING + '\n</body>');
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).send('VTG frontend could not be loaded.');
  }
};
