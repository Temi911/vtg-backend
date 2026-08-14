(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  // Indicative currency rates relative to USD. NOT live/verified — clearly
  // labeled in the UI as estimates, per the "distinguish estimate vs
  // verified government rate" requirement in the VTG brief.
  const RATES = { USD: 1, NGN: 1550, GHS: 15.6, KES: 129, ZAR: 18.4, CNY: 7.2, GBP: 0.79, EUR: 0.92 };
  const SYMS = { USD: '$', NGN: '₦', GHS: '₵', KES: 'KSh', ZAR: 'R', CNY: '¥', GBP: '£', EUR: '€' };

  const PRODUCTS = {
    'Premium Vehicles': 18000,
    'Industrial Machinery': 45000,
    'Electronics & Technology': 1200,
    'Agriculture & Agro Equipment': 8000,
    'Pharmaceutical & Medical': 500,
    'Construction & Building': 12000,
    'Textiles & Consumer Goods': 300,
    'Shipping & Logistics': 2500
  };

  function fmt(usd, cur) {
    const v = usd * (RATES[cur] || 1);
    return (SYMS[cur] || '') + v.toLocaleString(undefined, { maximumFractionDigits: v > 1000 ? 0 : 2 });
  }

  function loadCart() { try { return JSON.parse(localStorage.getItem('vtg_cart') || '[]') } catch { return [] } }
  function saveCart(c) { localStorage.setItem('vtg_cart', JSON.stringify(c)) }
  function loadCurrency() { return localStorage.getItem('vtg_currency') || 'USD' }
  function saveCurrency(c) { localStorage.setItem('vtg_currency', c) }

  function ensureUI() {
    if ($('#cartBtn')) return;

    // --- Nav icons: inject Calculator and Cart buttons before "Enter VTG" ---
    const tools = $('.navtools');
    const joinBtn = $('#joinBtn');
    if (tools && joinBtn) {
      const calcBtn = document.createElement('button');
      calcBtn.className = 'iconBtn'; calcBtn.id = 'calcBtn';
      calcBtn.title = 'Open landed-cost calculator'; calcBtn.setAttribute('aria-label', 'Open landed-cost calculator');
      calcBtn.innerHTML = '<i data-lucide="calculator"></i>';
      const cartBtn = document.createElement('button');
      cartBtn.className = 'iconBtn'; cartBtn.id = 'cartBtn';
      cartBtn.title = 'Open cart'; cartBtn.setAttribute('aria-label', 'Open cart');
      cartBtn.innerHTML = '<i data-lucide="shopping-cart"></i><span class="dot" id="cartDot" style="display:none"></span>';
      tools.insertBefore(calcBtn, joinBtn);
      tools.insertBefore(cartBtn, joinBtn);
      calcBtn.onclick = () => toggleDrawer('calcDrawer');
      cartBtn.onclick = () => toggleDrawer('cartDrawer');
    }

    // --- Extra styles for the new drawers ---
    const style = document.createElement('style');
    style.textContent = `
    .vtgField{display:grid;gap:5px;margin-bottom:11px}.vtgField label{font-size:9px;font-weight:800;color:#4f6878}
    .vtgField input,.vtgField select{width:100%;border:1px solid var(--line);border-radius:10px;padding:10px;background:#fbfdfe;font-size:11px}
    .vtgCalcOut{margin-top:16px;border:1px solid var(--line);border-radius:14px;background:#fff;padding:14px}
    .vtgCalcRow{display:flex;justify-content:space-between;font-size:10px;padding:6px 0;border-bottom:1px solid #eef2f4;color:#526d7e}
    .vtgCalcRow.total{border-bottom:0;font-weight:800;color:var(--navy);font-size:13px;padding-top:10px}
    .vtgCalcNote{font-size:8px;color:var(--muted);margin-top:10px;line-height:1.6}
    .vtgCartItem{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;padding:10px;border:1px solid var(--line);border-radius:12px;margin-bottom:8px;background:#fff}
    .vtgCartItem b{font-size:10px}.vtgCartItem small{display:block;color:var(--muted);font-size:8px;margin-top:2px}
    .vtgCartItem .qty{display:flex;align-items:center;gap:6px}.vtgCartItem .qty button{width:22px;height:22px;border:1px solid var(--line);background:#fff;border-radius:6px;font-weight:800}
    .vtgCartItem .rm{border:0;background:none;color:#c0392b;font-size:8px;font-weight:800}
    .vtgCartTotal{display:flex;justify-content:space-between;align-items:center;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--soft);margin-top:12px}
    .vtgCartTotal b{font-size:16px;color:var(--navy)}
    .vtgEmpty{font-size:10px;color:var(--muted);text-align:center;padding:30px 10px}
    .vtgAddBtn{border:0;background:var(--teal);color:#fff;border-radius:7px;width:22px;height:22px;font-size:13px;font-weight:800;flex:none;cursor:pointer}
    `;
    document.head.appendChild(style);

    // --- Calculator drawer ---
    const calc = document.createElement('div');
    calc.className = 'drawer'; calc.id = 'calcDrawer';
    calc.innerHTML = `<aside class="drawerPanel">
      <div class="drawerTop"><div><span class="eyebrow">Landed cost</span><h2>Import cost calculator</h2></div>
      <button class="close" id="calcClose" aria-label="Close calculator"><i data-lucide="x"></i></button></div>
      <div class="vtgField"><label>Currency</label><select id="calcCurrency">${Object.keys(RATES).map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
      <div class="vtgField"><label>Product price (per unit, USD)</label><input id="calcPrice" type="number" min="0" value="1000"></div>
      <div class="vtgField"><label>Quantity</label><input id="calcQty" type="number" min="1" value="1"></div>
      <div class="vtgField"><label>Shipping & freight (USD)</label><input id="calcShip" type="number" min="0" value="300"></div>
      <div class="vtgField"><label>Estimated customs duty (%)</label><input id="calcDuty" type="number" min="0" value="10"></div>
      <div class="vtgField"><label>Estimated VAT (%)</label><input id="calcVat" type="number" min="0" value="7.5"></div>
      <div class="vtgCalcOut" id="calcOut"></div>
      <div class="vtgCalcNote">These are estimated figures for planning purposes only, not verified government rates. Actual customs duty and VAT depend on your country, product classification (HS code) and current regulations — confirm with local customs or a licensed clearing agent before committing to a transaction.</div>
    </aside>`;
    document.body.appendChild(calc);
    $('#calcClose').onclick = () => toggleDrawer('calcDrawer', false);
    ['calcCurrency', 'calcPrice', 'calcQty', 'calcShip', 'calcDuty', 'calcVat'].forEach(id => $('#' + id).addEventListener('input', renderCalc));
    renderCalc();

    // --- Cart drawer ---
    const cart = document.createElement('div');
    cart.className = 'drawer'; cart.id = 'cartDrawer';
    cart.innerHTML = `<aside class="drawerPanel">
      <div class="drawerTop"><div><span class="eyebrow">Your selections</span><h2>Cart</h2></div>
      <button class="close" id="cartClose" aria-label="Close cart"><i data-lucide="x"></i></button></div>
      <div class="vtgField"><label>Display currency</label><select id="cartCurrency">${Object.keys(RATES).map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
      <div id="cartItems"></div>
      <div class="vtgCartTotal"><span>Estimated total</span><b id="cartTotal"></b></div>
      <div class="vtgCalcNote">Totals are indicative, based on approximate currency conversion. Final pricing and shipping are confirmed directly with each supplier.</div>
    </aside>`;
    document.body.appendChild(cart);
    $('#cartClose').onclick = () => toggleDrawer('cartDrawer', false);
    $('#cartCurrency').value = loadCurrency();
    $('#cartCurrency').addEventListener('change', e => { saveCurrency(e.target.value); renderCart() });

    if (window.lucide) window.lucide.createIcons();
    injectAddButtons();
    renderCart();
  }

  function toggleDrawer(id, on) {
    const el = $('#' + id);
    const willOpen = on === undefined ? !el.classList.contains('open') : on;
    el.classList.toggle('open', willOpen);
    document.body.style.overflow = willOpen ? 'hidden' : '';
  }

  function renderCalc() {
    const cur = $('#calcCurrency').value;
    const price = +$('#calcPrice').value || 0, qty = +$('#calcQty').value || 1;
    const ship = +$('#calcShip').value || 0, dutyPct = +$('#calcDuty').value || 0, vatPct = +$('#calcVat').value || 0;
    const subtotal = price * qty;
    const duty = subtotal * (dutyPct / 100);
    const vat = (subtotal + duty + ship) * (vatPct / 100);
    const total = subtotal + ship + duty + vat;
    $('#calcOut').innerHTML = `
      <div class="vtgCalcRow"><span>Product subtotal</span><span>${fmt(subtotal, cur)}</span></div>
      <div class="vtgCalcRow"><span>Shipping & freight</span><span>${fmt(ship, cur)}</span></div>
      <div class="vtgCalcRow"><span>Estimated duty (${dutyPct}%)</span><span>${fmt(duty, cur)}</span></div>
      <div class="vtgCalcRow"><span>Estimated VAT (${vatPct}%)</span><span>${fmt(vat, cur)}</span></div>
      <div class="vtgCalcRow total"><span>Estimated landed cost</span><span>${fmt(total, cur)}</span></div>`;
  }

  function injectAddButtons() {
    const tryAdd = () => {
      $$('.vtgProductChip').forEach(chip => {
        if (chip.querySelector('.vtgAddBtn')) return;
        const nameEl = chip.querySelector('b'); if (!nameEl) return;
        const name = nameEl.textContent.trim();
        const price = PRODUCTS[name]; if (price == null) return;
        const btn = document.createElement('button');
        btn.className = 'vtgAddBtn'; btn.title = 'Add to cart'; btn.textContent = '+';
        btn.onclick = e => { e.stopPropagation(); addToCart(name, price) };
        chip.appendChild(btn);
      });
    };
    tryAdd();
    // visual-enhancer.js builds the product strip asynchronously after its
    // own load — retry briefly until the chips exist.
    let tries = 0; const iv = setInterval(() => { tryAdd(); if (++tries > 20) clearInterval(iv) }, 300);
  }

  function addToCart(name, priceUsd) {
    const cart = loadCart();
    const existing = cart.find(i => i.name === name);
    if (existing) existing.qty += 1; else cart.push({ name, priceUsd, qty: 1 });
    saveCart(cart); renderCart(); toggleDrawer('cartDrawer', true);
  }

  function renderCart() {
    const cur = ($('#cartCurrency') && $('#cartCurrency').value) || loadCurrency();
    const cart = loadCart();
    const dot = $('#cartDot');
    if (dot) dot.style.display = cart.length ? 'block' : 'none';
    const itemsEl = $('#cartItems'); if (!itemsEl) return;
    if (!cart.length) { itemsEl.innerHTML = '<div class="vtgEmpty">Your cart is empty. Add products from the marketplace section.</div>'; }
    else {
      itemsEl.innerHTML = cart.map((item, i) => `
        <div class="vtgCartItem">
          <div><b>${item.name}</b><small>${fmt(item.priceUsd, cur)} each</small></div>
          <div class="qty"><button data-dec="${i}">−</button><span>${item.qty}</span><button data-inc="${i}">+</button></div>
          <button class="rm" data-rm="${i}">Remove</button>
        </div>`).join('');
      itemsEl.querySelectorAll('[data-inc]').forEach(b => b.onclick = () => { const c = loadCart(); c[+b.dataset.inc].qty++; saveCart(c); renderCart() });
      itemsEl.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => { const c = loadCart(); const it = c[+b.dataset.dec]; it.qty = Math.max(1, it.qty - 1); saveCart(c); renderCart() });
      itemsEl.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { const c = loadCart(); c.splice(+b.dataset.rm, 1); saveCart(c); renderCart() });
    }
    const totalUsd = cart.reduce((s, i) => s + i.priceUsd * i.qty, 0);
    const totalEl = $('#cartTotal'); if (totalEl) totalEl.textContent = fmt(totalUsd, cur);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureUI);
  else ensureUI();
})();
