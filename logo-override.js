(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const qs = selector => document.querySelector(selector);
  const qsa = selector => [...document.querySelectorAll(selector)];

  function applyBranding() {
    qsa('.brand').forEach(brand => {
      qsa('.brandLogo,.brandFallback,.brandText', brand).forEach(el => el.remove());
      let img = qs('img[data-vtg-final-logo]', brand);
      if (!img) {
        img = document.createElement('img');
        img.setAttribute('data-vtg-final-logo', 'true');
        brand.prepend(img);
      }
      img.src = '/assets/vtg-logo-final.webp?v=20260815';
      img.alt = 'Vintage Trade Global — Africa Trade Platform';
      img.style.cssText = 'height:46px;width:auto;max-width:180px;object-fit:contain;object-position:left center;display:block;';
    });
    if (!document.getElementById('vtgSansFontOverride')) {
      const style = document.createElement('style');
      style.id = 'vtgSansFontOverride';
      style.textContent = 'html,body,body *,button,input,select,textarea{font-family:Arial,Helvetica,sans-serif!important}';
      document.head.appendChild(style);
    }
  }

  function loadScript(src, marker) {
    return new Promise(resolve => {
      if (document.querySelector(`script[data-vtg-loader="${marker}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.dataset.vtgLoader = marker;
      s.onload = () => resolve();
      s.onerror = () => resolve();
      document.head.appendChild(s);
    });
  }

  function loadCommerce() {
    return loadScript('/vtg-cart-calculator.js?v=20260815', 'commerce');
  }

  function openDrawer(id) {
    const el = $(id);
    if (!el) return;
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer(id) {
    const el = $(id);
    if (!el) return;
    el.classList.remove('open');
    document.body.style.overflow = '';
  }

  function bindOnce(el, event, handler, key) {
    if (!el || el.dataset[key]) return;
    el.dataset[key] = '1';
    el.addEventListener(event, handler);
  }

  function bindDrawers() {
    bindOnce($('newsBtn'), 'click', () => openDrawer('newsDrawer'), 'vtgRuntimeClick');
    bindOnce($('newsOpen'), 'click', () => openDrawer('newsDrawer'), 'vtgRuntimeClick');
    bindOnce($('heroNews'), 'click', () => openDrawer('newsDrawer'), 'vtgRuntimeClick');
    bindOnce($('footNews'), 'click', e => { e.preventDefault(); openDrawer('newsDrawer'); }, 'vtgRuntimeClick');

    bindOnce($('mapBtn'), 'click', async () => {
      openDrawer('mapDrawer');
      await loadScript('/map-enhancer.js?v=4', 'map-enhancer');
      try { window.VTGInitMap?.(); } catch (err) { console.warn('VTG map init failed', err); }
    }, 'vtgRuntimeClick');
    bindOnce($('footMap'), 'click', e => {
      e.preventDefault();
      $('mapBtn')?.click();
    }, 'vtgRuntimeClick');

    bindOnce($('aiLaunch'), 'click', () => {
      const panel = $('aiPanel');
      if (!panel) return;
      panel.classList.add('open');
      $('aiInput')?.focus();
    }, 'vtgRuntimeClick');
    bindOnce($('aiClose'), 'click', () => $('aiPanel')?.classList.remove('open'), 'vtgRuntimeClick');
    bindOnce($('footAi'), 'click', e => {
      e.preventDefault();
      $('aiLaunch')?.click();
    }, 'vtgRuntimeClick');

    qsa('[data-close]').forEach(el => bindOnce(el, 'click', () => closeDrawer(el.dataset.close), 'vtgRuntimeClick'));
    qsa('.drawer').forEach(drawer => bindOnce(drawer, 'click', e => {
      if (e.target === drawer) closeDrawer(drawer.id);
    }, 'vtgRuntimeBackdrop'));

    if (!document.body.dataset.vtgRuntimeEscape) {
      document.body.dataset.vtgRuntimeEscape = '1';
      document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        qsa('.drawer.open').forEach(d => closeDrawer(d.id));
        $('aiPanel')?.classList.remove('open');
        $('authModal')?.classList.remove('open');
        document.body.style.overflow = '';
      });
    }
  }

  function bindPortal() {
    const showPortal = () => {
      const landing = $('landing'), portal = $('portal');
      if (!landing || !portal) return;
      window.scrollTo(0, 0);
      landing.style.display = 'none';
      portal.classList.add('active');
      window.lucide?.createIcons?.();
    };
    const showLanding = () => {
      const landing = $('landing'), portal = $('portal');
      if (!landing || !portal) return;
      portal.classList.remove('active');
      landing.style.display = 'block';
      window.scrollTo(0, 0);
    };
    bindOnce($('joinBtn'), 'click', showPortal, 'vtgRuntimeClick');
    bindOnce($('heroJoin'), 'click', showPortal, 'vtgRuntimeClick');
    bindOnce($('portalBack'), 'click', showLanding, 'vtgRuntimeClick');
  }

  let authRole = 'buyer';
  let authMode = 'login';

  function renderAuth() {
    const title = $('authTitle'), submit = $('authSubmit'), switcher = $('switchAuth'), fields = $('signupFields');
    if (!title || !submit || !switcher || !fields) return;
    const labels = { buyer: 'Buyer / Importer', supplier: 'Supplier / Trading Company', bank: 'Bank / Financial Institution' };
    title.textContent = `${authMode === 'login' ? 'Sign in' : 'Create account'} — ${labels[authRole] || labels.buyer}`;
    submit.textContent = authMode === 'login' ? 'Sign in' : 'Create account';
    switcher.textContent = authMode === 'login' ? 'Create account instead' : 'Sign in instead';
    fields.innerHTML = '';
    if (authMode !== 'signup') return;
    fields.innerHTML = `<div class="formRow"><div><label>Full name *</label><input name="fullName" autocomplete="name" required></div><div><label>Phone number *</label><input name="phone" autocomplete="tel" required></div></div>${authRole === 'supplier' ? '<div><label>Company name *</label><input name="companyName" autocomplete="organization" required></div>' : ''}${authRole === 'bank' ? '<div><label>Bank / institution name *</label><input name="bankName" autocomplete="organization" required></div>' : ''}${authRole === 'buyer' ? '<div><label>Buyer type *</label><select name="buyerType" required><option value="">Select</option><option value="individual">Individual</option><option value="business">Business</option><option value="dealer">Dealer</option><option value="organisation">Organisation</option></select></div>' : ''}<div class="formRow"><div><label>Country *</label><input name="country" autocomplete="country-name" required value="Nigeria"></div><div><label>City *</label><input name="city" autocomplete="address-level2" required></div></div><div><label>Email verification code *</label><div class="verify"><input name="verificationCode" minlength="6" maxlength="6" required><button type="button" id="sendCode">Send code</button></div></div>`;
    bindVerification();
    window.lucide?.createIcons?.();
  }

  function openAuth(role) {
    authRole = role || 'buyer';
    authMode = 'login';
    renderAuth();
    $('authModal')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function bindVerification() {
    const button = $('sendCode');
    bindOnce(button, 'click', async () => {
      const email = qs('input[name="email"]')?.value.trim();
      const msg = $('authMsg');
      if (!email) { if (msg) msg.textContent = 'Enter your email first.'; return; }
      try {
        const r = await fetch('/api/auth/send-verification-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
        const d = await r.json().catch(() => ({}));
        if (msg) msg.textContent = r.ok ? 'Verification code sent. Check your email.' : (d.message || 'Could not send code.');
      } catch { if (msg) msg.textContent = 'Could not send code right now.'; }
    }, 'vtgRuntimeClick');
  }

  function bindAuth() {
    qsa('[data-role]').forEach(button => bindOnce(button, 'click', () => openAuth(button.dataset.role), 'vtgRuntimeClick'));
    bindOnce($('authClose'), 'click', () => { $('authModal')?.classList.remove('open'); document.body.style.overflow = ''; }, 'vtgRuntimeClick');
    bindOnce($('switchAuth'), 'click', () => { authMode = authMode === 'login' ? 'signup' : 'login'; renderAuth(); }, 'vtgRuntimeClick');
    bindOnce($('authForm'), 'submit', async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.currentTarget));
      const msg = $('authMsg');
      if (msg) { msg.className = 'formMsg'; msg.textContent = 'Working…'; }
      try {
        let endpoint = '/api/auth/login';
        let payload = { email: data.email, password: data.password };
        if (authMode === 'signup') {
          endpoint = `/api/auth/signup/${authRole}`;
          payload = { email: data.email, password: data.password, fullName: data.fullName, phone: data.phone, verificationCode: data.verificationCode, preferredLanguage: 'en', country: data.country, city: data.city };
          if (authRole === 'buyer') payload.buyerType = data.buyerType;
          if (authRole === 'supplier') payload.companyName = data.companyName;
          if (authRole === 'bank') payload.bankName = data.bankName;
        }
        const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.message || 'Request failed');
        if (d.accessToken) localStorage.setItem('vtg_access_token', d.accessToken);
        if (msg) { msg.className = 'formMsg ok'; msg.textContent = authMode === 'login' ? 'Signed in successfully.' : 'Account created successfully.'; }
        setTimeout(() => { window.location.href = '/index.html'; }, 500);
      } catch (err) {
        if (msg) { msg.className = 'formMsg'; msg.textContent = err.message || 'Something went wrong.'; }
      }
    }, 'vtgRuntimeSubmit');
  }

  function bindAI() {
    const form = $('aiForm');
    if (!form) return;
    if (!$('aiMsgs')?.children.length) {
      const d = document.createElement('div');
      d.className = 'msg bot';
      d.textContent = 'Hello. I’m VTG AI. Tell me what you want to buy, sell, ship or finance, and I’ll tailor the guidance to your request.';
      $('aiMsgs')?.appendChild(d);
    }
    bindOnce(form, 'submit', async e => {
      e.preventDefault();
      const input = $('aiInput'), msgs = $('aiMsgs');
      const q = input?.value.trim();
      if (!q || !msgs) return;
      const add = (role, text) => { const d=document.createElement('div'); d.className=`msg ${role === 'user' ? 'user' : 'bot'}`; d.textContent=text; msgs.appendChild(d); msgs.scrollTop=msgs.scrollHeight; };
      add('user', q); input.value = '';
      try {
        const r = await fetch('/api/ai/public-chat', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({message:q,history:[],country:'Nigeria',role:authRole,live:true,currentDate:new Date().toISOString(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,page:location.href}) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.message || 'AI service unavailable');
        add('bot', d.reply || d.output_text || 'I could not answer that right now.');
      } catch (err) { add('bot', 'I’m temporarily unable to connect. Please try again shortly.'); console.warn('VTG AI', err); }
    }, 'vtgRuntimeSubmit');
  }

  function repairImages() {
    const fallbacks = [
      'https://images.unsplash.com/photo-1519003722824-194d4455a60c?q=85&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?q=85&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1556761175-b413da4baf72?q=85&w=1200&auto=format&fit=crop'
    ];
    qsa('.tradeCard img').forEach((img, i) => {
      if (img.dataset.vtgImageRuntime) return;
      img.dataset.vtgImageRuntime = '1';
      img.addEventListener('error', () => { if (!img.dataset.vtgFallback) { img.dataset.vtgFallback='1'; img.src=fallbacks[i] || fallbacks[0]; } }, { once:true });
      if (img.complete && img.naturalWidth === 0) img.src = fallbacks[i] || fallbacks[0];
    });
  }

  function cleanupDuplicateCalculator() {
    const canonical = $('calcDrawer');
    const legacy = $('vtgLandedCost');
    if (canonical && legacy) legacy.remove();
  }

  function boot() {
    applyBranding();
    bindDrawers();
    bindPortal();
    bindAuth();
    bindAI();
    repairImages();
    loadCommerce().then(() => { cleanupDuplicateCalculator(); window.lucide?.createIcons?.(); });
    window.lucide?.createIcons?.();
    setTimeout(() => { applyBranding(); bindDrawers(); bindPortal(); bindAuth(); bindAI(); repairImages(); cleanupDuplicateCalculator(); window.lucide?.createIcons?.(); }, 900);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
