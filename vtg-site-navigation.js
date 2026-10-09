/* VTG navigation. The homepage footer markup and visual system are the single source of truth site-wide. */
(function () {
  'use strict';
  var HOME = '/frontend-v3.html';
  var FOOTER_ID = 'vtgFooter';
  var FOOTER_HTML = [
    '<footer class="footer vtgCompactFooter" id="vtgFooter" aria-label="VTG site footer">',
    '<div class="footerIn vtgFooterTop">',
    '<div class="vtgFooterBrand"><a href="/frontend-v3.html" aria-label="Vintage Trade Global homepage"><img src="/assets/vtg-logo.svg" alt="Vintage Trade Global"></a><p>Connecting Africa, China and the world through intelligent trade.</p></div>',
    '<div class="vtgFooterLinks">',
    '<div><h4>Explore</h4><a data-navkey="marketplace" href="/frontend-v3.html#market">Marketplace</a><a data-navkey="atlas" href="/frontend-v3.html#vtgAtlasPreview">Trade Atlas</a><a id="footAi" data-navkey="ai" href="/vtg-ai.html">VTG AI</a><a id="footIntel" data-navkey="intelligence" href="/market-intelligence.html">Market Intelligence</a><a id="footTradeFeed" data-navkey="trade-feed" href="/trade-feed.html">Trade Feed</a></div>',
    '<div><h4>Trade</h4><a data-navkey="how" href="/frontend-v3.html#how">How VTG Works</a><a data-navkey="verification" href="/product-verification.html">Product Verification</a><a data-navkey="logistics" href="/logistics-shipping.html">Logistics &amp; Shipping</a><a data-navkey="workspace" href="/trade-workspace.html">Trade Workspace</a></div>',
    '<div><h4>Business</h4><a data-navkey="sourcing" href="/sourcing-suppliers.html">Sourcing &amp; Suppliers</a><a data-navkey="finance" href="/finance-payments.html">Finance &amp; Payments</a><a data-navkey="guide" href="/trade-guide.html">Trade Guide</a><a data-navkey="agent" href="/agent.html">Become an Agent</a></div>',
    '<div><h4>Company</h4><a data-navkey="about" href="/about-vintage.html">About VTG</a><a data-navkey="partnerships" href="/partnerships.html">Partnerships</a><a data-navkey="contact" href="/contact.html">Contact VTG</a></div>',
    '</div></div>',
    '<div class="copyright vtgFooterBottom"><span>© 2026 Vintage Trade Global • Powered by Folayele Global Resources Limited</span><div><a data-navkey="privacy" href="/privacy.html">Privacy</a><a data-navkey="terms" href="/terms.html">Terms</a><a data-navkey="conduct" href="/code-of-conduct.html">Code of Conduct</a></div></div>',
    '</footer>'
  ].join('');
  var CSS = [
    '.vtgCompactFooter{display:block!important;position:relative;z-index:1;width:100%;margin:0!important;padding:0!important;background:#0b1016!important;color:#d7dde3;border-top:1px solid rgba(255,255,255,.08);font-family:Manrope,Arial,sans-serif}',
    '.vtgCompactFooter *{box-sizing:border-box}',
    '.vtgCompactFooter .vtgFooterTop{width:100%;max-width:1260px;margin:0 auto;display:grid;grid-template-columns:minmax(220px,.9fr) minmax(0,2fr);gap:42px;padding:38px 24px 30px}',
    '.vtgCompactFooter .vtgFooterBrand img{display:block;width:auto;max-width:150px;height:auto;max-height:38px;object-fit:contain;margin-bottom:13px}',
    '.vtgCompactFooter .vtgFooterBrand p{max-width:290px;margin:0 0 18px;color:#9eabb5;font-size:11px;line-height:1.7}',
    '.vtgCompactFooter .vtgFooterLinks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px}',
    '.vtgCompactFooter .vtgFooterLinks h4{margin:3px 0 12px;color:#f1f4f6;font-size:10px;letter-spacing:.04em;text-transform:uppercase}',
    '.vtgCompactFooter .vtgFooterLinks a{position:relative;display:table;width:fit-content;max-width:100%;color:#9eabb5;text-decoration:none;font-size:10px;line-height:1.55;margin:0 0 8px;padding:1px 0;transition:color .18s}',
    '.vtgCompactFooter .vtgFooterLinks a:hover,.vtgCompactFooter .vtgFooterBottom a:hover{color:#fff}',
    '.vtgCompactFooter [data-navkey][aria-current="page"]{color:#ff8b82!important;font-weight:800}',
    '.vtgCompactFooter .vtgFooterLinks [data-navkey][aria-current="page"]:after,.vtgCompactFooter .vtgFooterBottom [data-navkey][aria-current="page"]:after{content:"";position:absolute;left:0;right:0;bottom:-2px;height:2px;border-radius:2px;background:#ff8b82}',
    '.vtgCompactFooter .vtgFooterBottom{position:relative;width:100%;max-width:1260px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;gap:18px;border-top:1px solid rgba(255,255,255,.07);padding:13px 24px;color:#71808b;font-size:8.5px;text-align:left}',
    '.vtgCompactFooter .vtgFooterBottom div{display:flex;gap:16px;flex-wrap:wrap}',
    '.vtgCompactFooter .vtgFooterBottom a{position:relative;color:#8c99a3;text-decoration:none;padding:1px 0}',
    '.vtg-page-nav{position:fixed;left:14px;bottom:14px;z-index:1200;display:flex;gap:6px;padding:5px;border:1px solid rgba(255,255,255,.15);border-radius:13px;background:rgba(12,16,22,.95);box-shadow:0 8px 26px rgba(0,0,0,.24);backdrop-filter:blur(12px);font-family:Manrope,Arial,sans-serif}',
    '.vtg-page-nav button,.vtg-page-nav a{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:35px;padding:0 11px;border:1px solid transparent;border-radius:9px;background:transparent;color:#f4f6f8;text-decoration:none;font:700 10px/1.2 Manrope,Arial,sans-serif;cursor:pointer;white-space:nowrap}',
    '.vtg-page-nav button:hover,.vtg-page-nav a:hover,.vtg-page-nav button:focus-visible,.vtg-page-nav a:focus-visible{outline:none;background:#211a1b;border-color:#77403b;color:#ffaaa2}.vtg-page-nav button:disabled{opacity:.55;cursor:default}',
    '@media(max-width:800px){.vtgCompactFooter .vtgFooterTop{grid-template-columns:1fr;gap:25px;padding:30px 16px 22px}.vtgCompactFooter .vtgFooterLinks{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 15px}.vtgCompactFooter .vtgFooterBottom{padding:12px 16px;align-items:flex-start;flex-direction:column;gap:8px}}',
    '@media(max-width:420px){.vtgCompactFooter .vtgFooterLinks{grid-template-columns:1fr 1fr}.vtg-page-nav{left:8px;bottom:8px}.vtg-page-nav button,.vtg-page-nav a{padding:0 9px;font-size:9px}}',
    '@media(prefers-reduced-motion:reduce){.vtgCompactFooter *,.vtg-page-nav *{transition:none!important}}'
  ].join('\\n');
  function addStyle() {
    if (document.getElementById('vtg-site-navigation-style')) return;
    var style = document.createElement('style');
    style.id = 'vtg-site-navigation-style';
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  function renderFooter() {
    var old = Array.prototype.slice.call(document.querySelectorAll('footer'));
    var host = document.createElement('div');
    host.innerHTML = FOOTER_HTML;
    var footer = host.firstElementChild;
    if (old.length) {
      old[0].replaceWith(footer);
      old.slice(1).forEach(function (extra) { extra.remove(); });
    } else {
      document.body.appendChild(footer);
    }
  }
  function setActiveFooterLink() {
    var path = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
    var hash = (window.location.hash || '').toLowerCase();
    var home = path === '/' || path === HOME || path.endsWith('/frontend-v3.html');
    var routeMap = {
      marketplace: ['/marketplace.html'],
      atlas: ['/trade-atlas.html'],
      ai: ['/vtg-ai.html'],
      intelligence: ['/market-intelligence.html', '/intelligence-centre.html'],
      'trade-feed': ['/trade-feed.html', '/account-trade-feed.html'],
      how: [],
      verification: ['/product-verification.html', '/inspection-request.html', '/inspection-payment-callback.html'],
      logistics: ['/logistics-shipping.html'],
      workspace: ['/trade-workspace.html', '/trade-os.html', '/supplier-dashboard.html', '/workspace.html'],
      sourcing: ['/sourcing-suppliers.html', '/supplier.html'],
      finance: ['/finance-payments.html'],
      guide: ['/trade-guide.html'],
      agent: ['/agent.html', '/agent-dashboard.html'],
      about: ['/about-vintage.html'],
      partnerships: ['/partnerships.html', '/partnership-application.html', '/partnership-finance.html', '/partnership-logistics.html', '/partnership-strategic.html', '/partnership-supply.html', '/partnership-technology.html', '/partnership-trade.html', '/partnership-warehouse.html', '/network.html'],
      contact: ['/contact.html'],
      privacy: ['/privacy.html'],
      terms: ['/terms.html'],
      conduct: ['/code-of-conduct.html']
    };
    var hashMap = {'#market':'marketplace','#vtgatlaspreview':'atlas','#ailaunch':'ai','#vtgintellaunch':'intelligence','#how':'how'};
    var active = home && hashMap[hash] ? hashMap[hash] : '';
    Object.keys(routeMap).forEach(function (key) { if (routeMap[key].indexOf(path) !== -1) active = key; });
    document.querySelectorAll('#' + FOOTER_ID + ' [data-navkey]').forEach(function (link) {
      if (link.getAttribute('data-navkey') === active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }
  function adaptHomeAnchors() {
    var path = window.location.pathname || '/';
    if (path.length > 1 && path.charAt(path.length - 1) === '/') path = path.slice(0, -1);
    var isHome = path === '/' || path === HOME || path.endsWith('/frontend-v3.html');
    if (!isHome) return;
    var homeAnchors = { marketplace: '#market', atlas: '#vtgAtlasPreview', how: '#how' };
    Object.keys(homeAnchors).forEach(function (key) {
      var link = document.querySelector('#' + FOOTER_ID + ' [data-navkey="' + key + '"]');
      if (link) link.setAttribute('href', homeAnchors[key]);
    });

  }
  function addPageNavigation() {
    if (document.getElementById('vtgPageNavigation')) return;
    var nav = document.createElement('nav');
    nav.id = 'vtgPageNavigation';
    nav.className = 'vtg-page-nav';
    nav.setAttribute('aria-label', 'Page navigation');
    nav.innerHTML = '<button type="button" id="vtgPreviousPage" aria-label="Return to previous VTG page">← Previous</button><a href="' + HOME + '" aria-label="Return to VTG homepage">Home</a>';
    document.body.appendChild(nav);
    document.getElementById('vtgPreviousPage').addEventListener('click', function () {
      var canReturn = false;
      try {
        if (document.referrer) {
          var previous = new URL(document.referrer, window.location.href);
          canReturn = previous.origin === window.location.origin &&
            (previous.pathname !== window.location.pathname || previous.search !== window.location.search || previous.hash !== window.location.hash);
        }
      } catch (_) {}
      if (canReturn && window.history.length > 1) window.history.back();
      else window.location.href = HOME;
    });
  }
  function init() {
    addStyle();
    renderFooter();
    adaptHomeAnchors();
    addPageNavigation();
    setActiveFooterLink();
    window.addEventListener('hashchange', setActiveFooterLink);
    window.addEventListener('popstate', setActiveFooterLink);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
