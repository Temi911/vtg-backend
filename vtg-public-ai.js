/* VTG AI for visitors (landing page). General VTG and trade questions plus three limited free tools.
 * It never sees account data. Everything is themed from the page's own CSS variables, so light/dark and skins apply. */
(function () {
  'use strict';
  if (window.__vtgPublicAi) return; window.__vtgPublicAi = true;
  var css = [
    ':root{--vp-accent:#0A58CA;--vp-surface:#FFFFFF;--vp-alt:#F4F9FF;--vp-ink:#0C2340;--vp-muted:#3E5671;--vp-line:rgba(12,35,64,.16);--vp-head:#0C2340;--vp-sun:#FFB81C}',
    'html[data-theme="dark"]{--vp-accent:#1F6FEB;--vp-surface:#12294A;--vp-alt:#0A1B30;--vp-ink:#F2F8FF;--vp-muted:#B8CAE2;--vp-line:rgba(242,248,255,.2);--vp-head:#0A1B30}',
    '#vtgAiPublicLaunch{background:var(--vp-accent)!important;color:#fff!important;border:1px solid color-mix(in srgb,var(--vp-accent) 70%,#000)!important;box-shadow:0 14px 34px color-mix(in srgb,var(--vp-ink) 30%,transparent)!important;cursor:pointer}',
    '#vtgAiPublicLaunch:hover,#vtgAiPublicLaunch:focus-visible{background:var(--vp-head)!important;outline:none}',
    '#vtgAiPublicLaunch .lucide,#vtgAiPublicLaunch svg{stroke:#fff!important}',
    '.vtgIntelTools .vtgIntelTool{background:var(--vp-surface)!important;color:var(--vp-ink)!important;border-color:var(--vp-line)!important}',
    '.vtgIntelTools .vtgIntelTool .lucide,.vtgIntelTools .vtgIntelTool svg{stroke:var(--vp-accent)!important}',
    '.vtgIntelTools .vtgIntelTool:hover,.vtgIntelTools .vtgIntelTool:focus-visible{border-color:var(--vp-accent)!important}',
    '.vtgIntelHead,.vtgpa-head{background:linear-gradient(120deg,var(--vp-head),var(--vp-accent));color:#fff}',
    '.vtgpa{position:fixed;right:22px;bottom:86px;width:380px;max-width:calc(100vw - 28px);height:min(600px,calc(100vh - 120px));display:none;flex-direction:column;background:var(--vp-surface);color:var(--vp-ink);border:1px solid var(--vp-line);border-radius:18px;box-shadow:0 25px 80px color-mix(in srgb,var(--vp-ink) 35%,transparent);z-index:2000;overflow:hidden;font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}',
    '.vtgpa.open{display:flex}',
    '.vtgpa-head{color:#fff!important;display:flex;align-items:center;gap:10px;padding:13px 15px}.vtgpa-head b{display:block;font-size:15px}.vtgpa-head small{display:block;font-size:11.5px;opacity:.85}',
    '.vtgpa-x{margin-left:auto;border:0;background:transparent;color:inherit;font-size:24px;line-height:1;cursor:pointer;padding:2px 6px}',
    '.vtgpa-log{flex:1;overflow:auto;padding:13px;display:flex;flex-direction:column;gap:9px;background:var(--vp-alt)}',
    '.vtgpa-m{max-width:88%;padding:9px 11px;border-radius:12px;white-space:pre-wrap;word-break:break-word}',
    '.vtgpa-m.bot{align-self:flex-start;background:var(--vp-surface);color:var(--vp-ink);border:1px solid var(--vp-line)}',
    '.vtgpa-m.me{align-self:flex-end;background:var(--vp-accent);color:#fff}',
    '.vtgpa-card{align-self:stretch;max-width:100%;background:var(--vp-surface);border:1px solid var(--vp-line);border-left:4px solid var(--vp-accent);border-radius:12px;padding:11px 12px}',
    '.vtgpa-card h4{margin:0 0 6px;font-size:14px;color:var(--vp-ink)}.vtgpa-card dl{display:grid;grid-template-columns:auto 1fr;gap:3px 12px;margin:0}.vtgpa-card dt{color:var(--vp-muted)}.vtgpa-card dd{margin:0;text-align:right;font-variant-numeric:tabular-nums}.vtgpa-card dl.wide{grid-template-columns:1fr}.vtgpa-card dl.wide dd{text-align:left;margin-bottom:5px}',
    '.vtgpa-card p{margin:8px 0 0;font-size:12px;color:var(--vp-muted)}',
    '.vtgpa-form label{display:block;font-size:12px;color:var(--vp-muted);margin:6px 0 2px}.vtgpa-form input,.vtgpa-form select{width:100%;box-sizing:border-box;padding:8px 9px;border:1px solid var(--vp-line);border-radius:9px;background:var(--vp-surface);color:var(--vp-ink);font:inherit}',
    '.vtgpa-btn{display:inline-block;margin-top:9px;border:0;border-radius:9px;padding:9px 14px;background:var(--vp-accent)!important;color:#fff!important;font:600 13px system-ui,sans-serif;cursor:pointer;text-decoration:none}.vtgpa-btn.alt{background:var(--vp-alt)!important;color:var(--vp-ink)!important;border:1px solid var(--vp-line)}',
    '.vtgpa-cta{align-self:stretch;background:color-mix(in srgb,var(--vp-accent) 10%,var(--vp-surface));border:1px solid var(--vp-accent);border-radius:12px;padding:11px 12px;font-size:13px}',
    '.vtgpa-tools{display:flex;gap:6px;padding:8px 10px 0;background:var(--vp-surface);overflow-x:auto;border-top:1px solid var(--vp-line)}',
    '.vtgpa-chip{flex:0 0 auto;border:1px solid var(--vp-line);background:var(--vp-surface);color:var(--vp-ink);border-radius:999px;padding:6px 11px;font-size:12.5px;cursor:pointer}.vtgpa-chip:hover{border-color:var(--vp-accent);color:var(--vp-accent)}.vtgpa-chip b{color:var(--vp-accent)}',
    '.vtgpa-in{display:flex;gap:8px;padding:10px;background:var(--vp-surface)}.vtgpa-in input{flex:1;min-width:0;padding:10px 11px;border:1px solid var(--vp-line);border-radius:11px;background:var(--vp-surface);color:var(--vp-ink);font:inherit}.vtgpa-in button{border:0;border-radius:11px;padding:0 14px;background:var(--vp-accent);color:#fff;font-size:16px;cursor:pointer}',
    '.vtgpa-note{padding:0 12px 9px;font-size:11px;color:var(--vp-muted);background:var(--vp-surface)}',
    '.vtgpa .vtgpa-head *{color:#fff!important}.vtgpa a.vtgpa-btn{color:#fff!important;text-decoration:none!important}.vtgpa a.vtgpa-btn.alt{color:var(--vp-ink)!important}.vtgpa .vtgpa-chip{border:1px solid var(--vp-line)!important;color:var(--vp-ink)!important;background:var(--vp-surface)!important}.vtgpa .vtgpa-chip:hover{border-color:var(--vp-accent)!important;color:var(--vp-accent)!important}',
    'html body .vtgpa button.vtgpa-chip,html[data-vtg-skin] body .vtgpa button.vtgpa-chip{border:1px solid var(--vp-line)!important;color:var(--vp-ink)!important;background:var(--vp-surface)!important}html[data-vtg-skin] body .vtgpa button.vtgpa-chip:hover{border-color:var(--vp-accent)!important;color:var(--vp-accent)!important}html[data-vtg-skin] body .vtgpa .vtgpa-btn:not(.alt),html[data-vtg-skin] body .vtgpa .vtgpa-in button{background:var(--vp-accent)!important;border:0!important;color:#fff!important}html[data-vtg-skin] body .vtgpa .vtgpa-btn.alt{background:var(--vp-alt)!important;border:1px solid var(--vp-line)!important;color:var(--vp-ink)!important}',
    '#vtgPublicAiPanel .vtgpa-chip{border:1px solid var(--vp-line)!important;color:var(--vp-ink)!important;background:var(--vp-surface)!important}#vtgPublicAiPanel .vtgpa-chip:hover{border-color:var(--vp-accent)!important;color:var(--vp-accent)!important}#vtgPublicAiPanel .vtgpa-btn,#vtgPublicAiPanel .vtgpa-btn:visited{background:var(--vp-accent)!important;color:#fff!important;border:0!important}#vtgPublicAiPanel .vtgpa-btn.alt{background:var(--vp-alt)!important;color:var(--vp-ink)!important;border:1px solid var(--vp-line)!important}#vtgPublicAiPanel .vtgpa-in button{background:var(--vp-accent)!important;color:#fff!important}',
    '@media(max-width:600px){.vtgpa{right:10px;bottom:80px;width:calc(100vw - 20px)}}'
  ].join('');
  var st = document.createElement('style'); st.id = 'vtg-public-ai-css'; st.textContent = css; document.head.appendChild(st);

  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    // The site's skin layer recolours every button and link with layered !important rules; inline !important is the only thing that outranks it.
    var cls = ' ' + (attrs && attrs['class'] || '') + ' ', extra = '';
    if (cls.indexOf(' vtgpa-chip ') > -1) extra = 'border:1px solid var(--vp-line);color:var(--vp-ink);background:var(--vp-surface)';
    else if (cls.indexOf(' vtgpa-btn ') > -1 && cls.indexOf(' alt ') > -1) extra = 'border:1px solid var(--vp-line);color:var(--vp-ink);background:var(--vp-alt)';
    else if (cls.indexOf(' vtgpa-btn ') > -1) extra = 'border:0;color:#fff;background:var(--vp-accent)';
    if (extra) { var base = e.getAttribute('style') || ''; e.setAttribute('style', base + (base ? ';' : '') + extra.split(';').map(function (d) { return d + ' !important'; }).join(';')); }
    return e;
  }
  var panel = h('section', { id: 'vtgPublicAiPanel', 'class': 'vtgpa', role: 'dialog', 'aria-label': 'VTG AI for visitors', 'aria-hidden': 'true' });
  var closeBtn = h('button', { 'class': 'vtgpa-x', type: 'button', 'aria-label': 'Close VTG AI', text: '×' });
  var log = h('div', { 'class': 'vtgpa-log', 'aria-live': 'polite' });
  var tools = h('div', { 'class': 'vtgpa-tools' });
  var input = h('input', { type: 'text', maxlength: '2000', autocomplete: 'off', placeholder: 'Ask about VTG or international trade…', 'aria-label': 'Message VTG AI' });
  var send = h('button', { type: 'submit', 'aria-label': 'Send', text: '➤', style: 'background:var(--vp-accent) !important;color:#fff !important;border:0 !important' });
  var form = h('form', { 'class': 'vtgpa-in' }, [input, send]);
  panel.appendChild(h('div', { 'class': 'vtgpa-head' }, [h('div', {}, [h('b', { text: 'VTG AI' }), h('small', { text: 'General trade help · free to try' })]), closeBtn]));
  panel.appendChild(log); panel.appendChild(tools); panel.appendChild(form);
  panel.appendChild(h('div', { 'class': 'vtgpa-note', text: 'I answer general questions only and cannot see any account. Sign in for the assistant that works with your own trade records.' }));
  document.body.appendChild(panel);

  var history = [], asked = 0, nudged = false, busy = false;
  function say(role, text) { var m = h('div', { 'class': 'vtgpa-m ' + (role === 'user' ? 'me' : 'bot'), text: text }); log.appendChild(m); log.scrollTop = log.scrollHeight; return m; }
  function cta(c) {
    var box = h('div', { 'class': 'vtgpa-cta' }, [h('div', { text: c.text }), h('a', { 'class': 'vtgpa-btn', href: c.href, text: c.label }), h('a', { 'class': 'vtgpa-btn alt', href: '/signin.html', text: ' Sign in', style: 'margin-left:6px' })]);
    log.appendChild(box); log.scrollTop = log.scrollHeight;
  }
  var CTA_DEFAULT = { text: 'Want this on your own records? A free VTG account lets VTG AI compare your supplier quotes, track your orders and check your documents.', href: '/signup.html', label: 'Create free account' };

  function post(url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, status: r.status, data: d }; }); });
  }
  function ask(q) {
    q = String(q || '').trim(); if (!q || busy) return;
    busy = true; say('user', q); history.push({ role: 'user', content: q }); input.value = '';
    var wait = say('bot', 'Thinking…');
    post('/api/ai/public-chat', { message: q, history: history.slice(-12) }).then(function (r) {
      var a = (r.data && r.data.reply) || (r.data && r.data.error && r.data.error.message) || 'I could not answer just now. Please try again.';
      wait.textContent = a; history.push({ role: 'assistant', content: a });
      asked += 1;
      if (r.data && r.data.cta) { nudged = true; cta({ text: 'Ready to do this for real? Create a free VTG account and the VTG AI in your dashboard can prepare it for you to confirm.', href: r.data.cta.href, label: r.data.cta.label }); }
      else if (asked >= 3 && !nudged) { nudged = true; cta(CTA_DEFAULT); }
    }).catch(function () { wait.textContent = 'I am having trouble connecting. Please try again in a moment.'; }).then(function () { busy = false; });
  }
  function renderResult(d) {
    var r = d.result || {};
    if (r.error) { say('bot', r.error); return; }
    var wide = r.lines.some(function (l) { return String(l[1]).length > 28; });
    var dl = h('dl', { 'class': wide ? 'wide' : '' });
    r.lines.forEach(function (l) { dl.appendChild(h('dt', { text: l[0] })); dl.appendChild(h('dd', { text: typeof l[1] === 'number' ? l[1].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(l[1]) })); });
    log.appendChild(h('div', { 'class': 'vtgpa-card' }, [h('h4', { text: r.title }), dl, h('p', { text: r.note })]));
    log.scrollTop = log.scrollHeight;
    cta(d.cta || CTA_DEFAULT);
  }
  function runTool(tool, args) {
    if (busy) return; busy = true;
    post('/api/ai/public-tool', { tool: tool, args: args }).then(function (r) {
      if (r.status === 429) { say('bot', (r.data.error && r.data.error.message) || 'Free tries used.'); cta(r.data.cta || CTA_DEFAULT); }
      else if (!r.ok) say('bot', (r.data.error && r.data.error.message) || 'That tool is not available right now.');
      else renderResult(r.data);
    }).catch(function () { say('bot', 'I am having trouble connecting. Please try again in a moment.'); }).then(function () { busy = false; });
  }
  function field(label, name, type, ph, opts) {
    var el = opts ? h('select', { name: name }, opts.map(function (o) { return h('option', { value: o, text: o }); })) : h('input', { name: name, type: type || 'text', inputmode: type === 'number' ? 'decimal' : 'text', placeholder: ph || '' });
    return [h('label', { text: label }), el];
  }
  function toolForm(title, fields, tool, button) {
    var f = h('form', { 'class': 'vtgpa-form' }); fields.forEach(function (p) { p.forEach(function (n) { f.appendChild(n); }); });
    f.appendChild(h('button', { 'class': 'vtgpa-btn', type: 'submit', text: button }));
    f.addEventListener('submit', function (e) { e.preventDefault(); var a = {}; [].slice.call(f.elements).forEach(function (el) { if (el.name) a[el.name] = el.value; }); f.querySelector('button').disabled = true; runTool(tool, a); });
    log.appendChild(h('div', { 'class': 'vtgpa-card' }, [h('h4', { text: title }), f])); log.scrollTop = log.scrollHeight;
  }
  var TOOLS = [
    ['Landed cost', function () { toolForm('Landed-cost estimate', [field('Goods value (USD)', 'goods_subtotal', 'number', 'e.g. 10000'), field('Freight (USD)', 'shipping', 'number', 'optional'), field('Insurance (USD)', 'insurance', 'number', 'optional'), field('Import duty (%)', 'duty_percent', 'number', 'optional, e.g. 20')], 'landed_cost', 'Estimate'); }],
    ['Incoterms', function () { toolForm('Incoterms in plain words', [field('Which term?', 'code', 'text', '', ['FOB', 'CIF', 'CFR', 'EXW', 'FCA', 'CIP', 'DAP', 'DDP'])], 'incoterm', 'Explain'); }],
    ['Import documents', function () { toolForm('Typical import documents', [field('Destination country', 'country', 'text', '', ['Nigeria', 'Ghana', 'Kenya', 'South Africa'])], 'import_checklist', 'Show checklist'); }],
    ['Marketplace', function () { window.location.href = '/marketplace.html'; }]
  ];
  TOOLS.forEach(function (t) { var c = h('button', { 'class': 'vtgpa-chip', type: 'button', text: t[0] }); c.addEventListener('click', t[1]); tools.appendChild(c); });

  function open() { panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false'); input.focus(); }
  function close() { panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); }
  form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  // The launcher is created by vtg-interaction-recovery.js; take over its click and fall back to its link if this script fails.
  document.addEventListener('click', function (e) {
    var l = e.target.closest && e.target.closest('#vtgAiPublicLaunch');
    if (!l) return; e.preventDefault(); e.stopImmediatePropagation(); panel.classList.contains('open') ? close() : open();
  }, true);
  say('bot', 'Hi, I am VTG AI. Ask me about VTG, sourcing from China and South Korea, shipping, customs or trade finance. Or try a free tool below.');
})();
