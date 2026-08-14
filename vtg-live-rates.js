(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  async function fetchFX() {
    try {
      const r = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const d = await r.json();
      return d.rates || null;
    } catch { return null }
  }

  async function fetchBTC() {
    try {
      const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
      const d = await r.json();
      return d.bitcoin || null;
    } catch { return null }
  }

  function setRate(labelMatch, valueHtml) {
    $$('.rate').forEach(el => {
      const b = el.querySelector('b');
      if (b && b.textContent.trim() === labelMatch) {
        const small = el.querySelector('small');
        if (small) small.innerHTML = valueHtml;
      }
    });
  }

  async function run() {
    const [fx, btc] = await Promise.all([fetchFX(), fetchBTC()]);
    if (fx) {
      if (fx.NGN) setRate('USD / NGN', `₦${fx.NGN.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span style="color:#1d8a5a">● live</span>`);
      if (fx.CNY) setRate('USD / CNY', `¥${fx.CNY.toLocaleString(undefined, { maximumFractionDigits: 3 })} <span style="color:#1d8a5a">● live</span>`);
    } else {
      setRate('USD / NGN', 'Rate temporarily unavailable');
      setRate('USD / CNY', 'Rate temporarily unavailable');
    }
    if (btc && btc.usd) {
      const chg = btc.usd_24h_change;
      const chgTxt = chg != null ? ` (${chg >= 0 ? '+' : ''}${chg.toFixed(1)}% 24h)` : '';
      setRate('BTC / USD', `$${Math.round(btc.usd).toLocaleString()}${chgTxt} <span style="color:#1d8a5a">● live</span>`);
    } else {
      setRate('BTC / USD', 'Rate temporarily unavailable');
    }
  }

  // Only fetch once the news drawer is actually opened (it's not visible on
  // load), and refresh every 2 minutes while the tab stays open.
  let started = false;
  function watch() {
    const btn = $('#newsBtn'), open1 = $('#newsOpen'), open2 = $('#heroNews'), footNews = $('#footNews');
    [btn, open1, open2, footNews].forEach(el => {
      if (el) el.addEventListener('click', () => {
        if (started) return; started = true;
        run(); setInterval(run, 120000);
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch);
  else watch();
})();
