/* VTG shell v1 — header, footer, theme and mobile menu for redesigned pages.
   Place <div id="vsHeader" data-active="marketplace"></div> then this script at the top of <body>,
   and <div id="vsFooter"></div> at the end. Presentation only: no business logic lives here. */
(function () {
  'use strict';
  var KEY = 'vtg-theme-preference';
  var root = document.documentElement;

  function stored() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function systemDark() { return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); }
  function resolve(pref) {
    if (pref === 'dark' || pref === 'light') return pref;
    return systemDark() ? 'dark' : 'light';
  }
  function apply(theme) {
    root.setAttribute('data-theme', theme);
    var logos = document.querySelectorAll('img[data-vs-logo]');
    for (var i = 0; i < logos.length; i++) logos[i].src = theme === 'dark' ? '/assets/vtg-logo-light.svg' : '/assets/vtg-logo.svg';
    var btn = document.getElementById('vsTheme');
    if (btn) {
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      btn.innerHTML = theme === 'dark' ? ICON.sun : ICON.moon;
    }
    try { document.dispatchEvent(new CustomEvent('vtg:themechange', { detail: { theme: theme } })); } catch (e) {}
  }

  var ICON = {
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  var NAV = [
    ['marketplace', '/marketplace.html', 'Marketplace'],
    ['sourcing', '/sourcing-suppliers.html', 'Sourcing'],
    ['atlas', '/trade-atlas.html', 'Trade Atlas'],
    ['ai', '/vtg-ai.html', 'VTG AI'],
    ['about', '/about-vintage.html', 'About']
  ];

  function token() { try { return localStorage.getItem('vtg_access_token') || ''; } catch (e) { return ''; } }

  function renderHeader() {
    var host = document.getElementById('vsHeader');
    if (!host) return;
    var dark = root.getAttribute('data-theme') === 'dark';
    host.innerHTML =
      '<style id="vtg-inner-nav-style">' +
      '.vtg-inner-nav{position:relative;z-index:1200;display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;padding:10px max(16px,calc((100vw - 1260px)/2));background:#0b1016;border-bottom:1px solid rgba(255,255,255,.10);box-sizing:border-box;font-family:Manrope,Arial,sans-serif}' +
      '.vtg-inner-nav .vtg-inner-logo img{display:block;width:auto;max-width:150px;max-height:38px;object-fit:contain}' +
      '.vtg-inner-actions{display:flex;align-items:center;gap:8px}' +
      '.vtg-inner-actions button,.vtg-inner-actions a{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:0 13px;border:1px solid rgba(255,255,255,.16);border-radius:8px;background:transparent;color:#f4f6f8;text-decoration:none;font:700 10px/1.2 Manrope,Arial,sans-serif;cursor:pointer}' +
      '.vtg-inner-actions button:hover,.vtg-inner-actions a:hover{background:#211a1b;border-color:#77403b;color:#ffaaa2}' +
      '@media(max-width:480px){.vtg-inner-nav{padding:8px 12px}.vtg-inner-nav .vtg-inner-logo img{max-width:112px;max-height:32px}.vtg-inner-actions{gap:5px}.vtg-inner-actions button,.vtg-inner-actions a{min-height:33px;padding:0 9px;font-size:9px}}' +
      '</style>' +
      '<header class="vtg-inner-nav">' +
      '<a class="vtg-inner-logo" href="/frontend-v3.html" aria-label="Vintage Trade Global home"><img data-vs-logo src="' + (dark ? '/assets/vtg-logo-light.svg' : '/assets/vtg-logo.svg') + '" alt="Vintage Trade Global"></a>' +
      '<div class="vtg-inner-actions"><button type="button" id="vtgPageBack">Previous</button><a href="/frontend-v3.html">Home</a></div>' +
      '</header>';
    apply(root.getAttribute('data-theme') || 'light');
    var back = document.getElementById('vtgPageBack');
    if (back) back.addEventListener('click', function () {
      try {
        if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) history.back();
        else location.href = '/frontend-v3.html';
      } catch (e) { location.href = '/frontend-v3.html'; }
    });
  }

  var FOOTER = '<footer class="vs-footer"><div class="vs-wrap vs-footer-in">' +
    '<div class="vs-footer-brand"><a href="/frontend-v3.html" aria-label="Vintage Trade Global home"><img data-vs-logo src="/assets/vtg-logo.svg" alt="Vintage Trade Global"></a><p>Connecting Africa, China and the world through intelligent trade.</p></div>' +
    '<div><h4>Explore</h4><ul><li><a href="/marketplace.html">Marketplace</a></li><li><a href="/trade-atlas.html">Trade Atlas</a></li><li><a href="/market-intelligence.html">Market Intelligence</a></li><li><a href="/vtg-ai.html">VTG AI</a></li><li><a href="/trade-feed.html">Trade Feed</a></li><li><a href="/africa-markets.html">Africa Markets</a></li></ul></div>' +
    '<div><h4>Trade</h4><ul><li><a href="/sourcing-suppliers.html">Sourcing &amp; Suppliers</a></li><li><a href="/product-verification.html">Product Verification</a></li><li><a href="/logistics-shipping.html">Logistics &amp; Shipping</a></li><li><a href="/finance-payments.html">Finance &amp; Payments</a></li></ul></div>' +
    '<div><h4>Business</h4><ul><li><a href="/trade-guide.html">Trade Guide</a></li><li><a href="/partnerships.html">Partnerships</a></li><li><a href="/agent.html">Become an Agent</a></li><li><a href="/workforce-access.html">Workforce &amp; Staff Access</a></li></ul></div>' +
    '<div><h4>Company</h4><ul><li><a href="/about-vintage.html">About VTG</a></li><li><a href="/contact.html">Contact</a></li><li><a href="/privacy.html">Privacy</a></li><li><a href="/terms.html">Terms</a></li><li><a href="/code-of-conduct.html">Code of Conduct</a></li></ul></div>' +
    '</div><div class="vs-footer-base"><div class="vs-wrap"><span>&copy; 2026 Vintage Trade Global &middot; Powered by Folayele Global Resources Limited</span></div></div></footer>';

  function renderFooter() {
    var host = document.getElementById('vsFooter');
    if (host) { host.innerHTML = FOOTER; apply(root.getAttribute('data-theme') || 'light'); }
  }

  apply(resolve(stored()));
  renderHeader();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderFooter, { once: true });
  else renderFooter();
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function () { var s = stored(); if (s !== 'dark' && s !== 'light') apply(resolve(s)); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
  }
})();
