const fs = require('fs');
const path = require('path');

const AI_WIDGET = String.raw`
<style id="vtg-ai-widget-v2">
  /* Hide the old assistant completely; V2 is self-contained. */
  #ai-launcher, #ai-panel { display:none !important; }
  #vtg-ai-launcher-v2 {
    position:fixed; right:20px; bottom:20px; width:60px; height:60px;
    border:0; border-radius:50%; background:linear-gradient(135deg,#1976C4,#1094A0);
    color:#fff; display:flex; align-items:center; justify-content:center;
    cursor:pointer; z-index:2147483000; box-shadow:0 10px 28px rgba(14,34,51,.28);
    transition:transform .18s ease, box-shadow .18s ease;
  }
  #vtg-ai-launcher-v2:hover { transform:scale(1.06); box-shadow:0 14px 34px rgba(14,34,51,.34); }
  #vtg-ai-launcher-v2 svg { width:32px; height:32px; }
  #vtg-ai-launcher-v2 .dot { position:absolute; right:3px; top:3px; width:12px; height:12px;
    border-radius:50%; background:#E0A93C; border:2px solid #fff; }
  #vtg-ai-panel-v2 {
    position:fixed; right:20px; bottom:92px; width:390px; height:560px;
    max-width:calc(100vw - 28px); max-height:calc(100vh - 120px);
    background:#F3F8FC; border:1px solid rgba(25,118,196,.2); border-radius:12px;
    box-shadow:0 22px 65px rgba(14,34,51,.28); overflow:hidden;
    z-index:2147482999; display:none; flex-direction:column;
    font-family:Arial, sans-serif;
  }
  #vtg-ai-panel-v2.open { display:flex; }
  .vtg-ai-head { padding:14px 16px; background:linear-gradient(120deg,#1976C4,#1B5D8F);
    color:#fff; display:flex; align-items:center; gap:10px; }
  .vtg-ai-head-icon { width:38px; height:38px; border-radius:50%; background:rgba(255,255,255,.15);
    display:flex; align-items:center; justify-content:center; }
  .vtg-ai-head-icon svg { width:26px; height:26px; }
  .vtg-ai-head-title { font-weight:700; font-size:15px; }
  .vtg-ai-head-sub { font-size:11px; opacity:.78; margin-top:2px; }
  .vtg-ai-close { margin-left:auto; border:0; background:transparent; color:#fff; font-size:24px; cursor:pointer; }
  .vtg-ai-messages { flex:1; overflow:auto; padding:14px; display:flex; flex-direction:column; gap:9px; background:#EAF4FB; }
  .vtg-ai-msg { max-width:86%; padding:9px 11px; border-radius:9px; font-size:13px; line-height:1.5; white-space:pre-wrap; }
  .vtg-ai-msg.bot { align-self:flex-start; background:#fff; color:#0E2233; border:1px solid rgba(25,118,196,.15); }
  .vtg-ai-msg.user { align-self:flex-end; background:#1976C4; color:#fff; }
  .vtg-ai-typing { align-self:flex-start; padding:9px 11px; background:#fff; border-radius:9px; color:#567; font-size:12px; }
  .vtg-ai-suggestions { padding:10px 12px 4px; display:flex; flex-wrap:wrap; gap:6px; background:#F3F8FC; }
  .vtg-ai-suggestion { border:1px solid rgba(25,118,196,.22); background:#fff; color:#2C4E64; border-radius:18px;
    padding:6px 9px; font-size:11px; cursor:pointer; }
  .vtg-ai-suggestion:hover { background:#1976C4; color:#fff; }
  .vtg-ai-input { display:flex; gap:7px; padding:10px; border-top:1px solid rgba(25,118,196,.15); background:#fff; }
  .vtg-ai-input input { flex:1; min-width:0; border:1px solid rgba(25,118,196,.22); border-radius:22px;
    padding:9px 12px; font-size:13px; outline:none; }
  .vtg-ai-input input:focus { border-color:#1976C4; }
  .vtg-ai-send { width:40px; height:40px; border:0; border-radius:50%; background:#1976C4; color:#fff; cursor:pointer; }
  .vtg-ai-send:disabled { opacity:.5; cursor:not-allowed; }
  @media(max-width:600px) {
    #vtg-ai-launcher-v2 { right:14px; bottom:14px; }
    #vtg-ai-panel-v2 { right:10px; bottom:84px; width:calc(100vw - 20px); height:70vh; }
  }
</style>

<button id="vtg-ai-launcher-v2" type="button" aria-label="Chat with VTG AI Assistant" title="Chat with VTG AI Assistant">
  <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path d="M24 7v5" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>
    <circle cx="24" cy="5" r="2.2" fill="currentColor"/>
    <rect x="8" y="12" width="32" height="27" rx="10" stroke="currentColor" stroke-width="2.8"/>
    <circle cx="18" cy="25" r="2.7" fill="currentColor"/>
    <circle cx="30" cy="25" r="2.7" fill="currentColor"/>
    <path d="M17 32c2.2 2 4.5 3 7 3s4.8-1 7-3" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M8 22H5M43 22h-3" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
  </svg>
  <span class="dot"></span>
</button>

<section id="vtg-ai-panel-v2" aria-label="VTG AI Assistant" aria-hidden="true">
  <header class="vtg-ai-head">
    <div class="vtg-ai-head-icon">
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <rect x="9" y="13" width="30" height="25" rx="9" stroke="currentColor" stroke-width="2.8"/>
        <path d="M24 7v6M17 26h.1M31 26h.1M17 32c2 1.6 4.3 2.4 7 2.4s5-0.8 7-2.4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
    </div>
    <div><div class="vtg-ai-head-title">VTG AI Assistant</div><div class="vtg-ai-head-sub">Ask about VTG, trade, logistics and your account</div></div>
    <button class="vtg-ai-close" id="vtg-ai-close-v2" type="button" aria-label="Close AI assistant">×</button>
  </header>
  <div class="vtg-ai-messages" id="vtg-ai-messages-v2"></div>
  <div class="vtg-ai-suggestions" id="vtg-ai-suggestions-v2">
    <button class="vtg-ai-suggestion" type="button" data-q="What services does VTG provide?">What services does VTG provide?</button>
    <button class="vtg-ai-suggestion" type="button" data-q="How does VTG help with shipping and logistics?">Shipping & logistics</button>
    <button class="vtg-ai-suggestion" type="button" data-q="How can I get started with VTG?">How do I get started?</button>
  </div>
  <form class="vtg-ai-input" id="vtg-ai-form-v2">
    <input id="vtg-ai-input-v2" type="text" maxlength="2000" autocomplete="off" placeholder="Ask VTG AI a question…" aria-label="Ask VTG AI"/>
    <button class="vtg-ai-send" id="vtg-ai-send-v2" type="submit" aria-label="Send">➤</button>
  </form>
</section>

<script>
(function(){
  var launcher=document.getElementById('vtg-ai-launcher-v2');
  var panel=document.getElementById('vtg-ai-panel-v2');
  var messages=document.getElementById('vtg-ai-messages-v2');
  var form=document.getElementById('vtg-ai-form-v2');
  var input=document.getElementById('vtg-ai-input-v2');
  var send=document.getElementById('vtg-ai-send-v2');
  var close=document.getElementById('vtg-ai-close-v2');
  var history=[];

  function add(role,text){
    var el=document.createElement('div');
    el.className='vtg-ai-msg '+(role==='user'?'user':'bot');
    el.textContent=text;
    messages.appendChild(el);
    messages.scrollTop=messages.scrollHeight;
  }
  function typing(){
    var el=document.createElement('div');
    el.className='vtg-ai-typing'; el.id='vtg-ai-typing-v2'; el.textContent='VTG AI is thinking…';
    messages.appendChild(el); messages.scrollTop=messages.scrollHeight;
  }
  function stopTyping(){var el=document.getElementById('vtg-ai-typing-v2'); if(el) el.remove();}
  function open(){panel.classList.add('open');panel.setAttribute('aria-hidden','false');input.focus();}
  function shut(){panel.classList.remove('open');panel.setAttribute('aria-hidden','true');}
  function ask(q){
    q=String(q||'').trim(); if(!q || send.disabled) return;
    add('user',q); history.push({role:'user',content:q}); input.value=''; send.disabled=true; typing();
    fetch('/api/ai/public-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,history:history.slice(-20),country:'Nigeria'})})
      .then(function(r){return r.json().then(function(data){if(!r.ok) throw new Error(data?.error?.message||data?.message||'AI request failed');return data;});})
      .then(function(data){stopTyping();var reply=data.reply||'I could not generate a response right now. Please try again.';add('assistant',reply);history.push({role:'assistant',content:reply});})
      .catch(function(err){stopTyping();add('assistant','I’m having trouble connecting right now. Please try again in a moment.');console.error('[VTG AI]',err);})
      .finally(function(){send.disabled=false;input.focus();});
  }
  launcher.addEventListener('click',open);
  close.addEventListener('click',shut);
  form.addEventListener('submit',function(e){e.preventDefault();ask(input.value);});
  document.querySelectorAll('#vtg-ai-suggestions-v2 .vtg-ai-suggestion').forEach(function(btn){btn.addEventListener('click',function(){open();ask(btn.getAttribute('data-q'));});});
  add('assistant','Hello! I’m VTG AI. Ask me about VTG services, trade finance, shipping, logistics, or how to get started.');
})();
</script>`;

module.exports = (req, res) => {
  try {
    const file = path.join(process.cwd(), 'index.html');
    let html = fs.readFileSync(file, 'utf8');
    html = html.replace('</body>', AI_WIDGET + '\n</body>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).send('VTG frontend could not be loaded.');
  }
};
