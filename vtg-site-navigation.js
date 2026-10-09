/* VTG shared navigation and canonical footer. */
(function () {
  'use strict';
  var HOME = '/frontend-v3.html';
  var FOOTER_ID = 'vtgSiteFooter';
  var FOOTER_HTML = [
    '<footer id="vtgSiteFooter" class="vtg-site-footer" aria-label="VTG site footer">',
    '<div class="vtg-site-footer__top">',
    '<a class="vtg-site-footer__brand" href="/frontend-v3.html" aria-label="Vintage Trade Global homepage"><img src="/assets/vtg-logo.svg" alt="Vintage Trade Global"><span>Connecting Africa, China and the world through intelligent trade.</span></a>',
    '<div class="vtg-site-footer__links">',
    '<div class="vtg-site-footer__group"><h4>Explore</h4><a data-navkey="marketplace" href="/frontend-v3.html#market">Marketplace</a><a data-navkey="atlas" href="/frontend-v3.html#vtgAtlasPreview">Trade Atlas</a><a id="footAi" data-navkey="ai" href="/frontend-v3.html#aiLaunch">VTG AI</a><a id="footIntel" data-navkey="intelligence" href="/market-intelligence.html">Market Intelligence</a><a id="footTradeFeed" data-navkey="trade-feed" href="/trade-feed.html">Trade Feed</a></div>',
    '<div class="vtg-site-footer__group"><h4>Trade</h4><a data-navkey="how" href="/frontend-v3.html#how">How VTG Works</a><a data-navkey="verification" href="/product-verification.html">Product Verification</a><a data-navkey="logistics" href="/logistics-shipping.html">Logistics &amp; Shipping</a><a data-navkey="workspace" href="/trade-workspace.html">Trade Workspace</a></div>',
    '<div class="vtg-site-footer__group"><h4>Business</h4><a data-navkey="sourcing" href="/sourcing-suppliers.html">Sourcing &amp; Suppliers</a><a data-navkey="finance" href="/finance-payments.html">Finance &amp; Payments</a><a data-navkey="guide" href="/trade-guide.html">Trade Guide</a><a data-navkey="agent" href="/agent.html">Become an Agent</a></div>',
    '<div class="vtg-site-footer__group"><h4>Company</h4><a data-navkey="about" href="/about-vintage.html">About VTG</a><a data-navkey="partnerships" href="/partnerships.html">Partnerships</a><a data-navkey="contact" href="/contact.html">Contact VTG</a></div>',
    '</div></div>',
    '<div class="vtg-site-footer__bottom"><span>© 2026 Vintage Trade Global · Powered by Folayele Global Resources Limited</span><div class="vtg-site-footer__legal"><a data-navkey="privacy" href="/privacy.html">Privacy</a><a data-navkey="terms" href="/terms.html">Terms</a><a data-navkey="conduct" href="/code-of-conduct.html">Code of Conduct</a></div></div>',
    '</footer>'
  ].join('');
  var CSS = [
    '.vtg-site-footer{position:relative;z-index:1;background:#240b09;color:#c9b4b1;border-top:1px solid rgba(255,255,255,.08);font-family:Manrope,Arial,sans-serif}',
    '.vtg-site-footer *{box-sizing:border-box}',
    '.vtg-site-footer__top{max-width:1260px;margin:0 auto;padding:38px 22px 32px;display:grid;grid-template-columns:minmax(170px,.9fr) minmax(0,2.1fr);gap:38px}',
    '.vtg-site-footer__brand{display:flex;flex-direction:column;align-items:flex-start;gap:15px;text-decoration:none!important;min-width:0}',
    '.vtg-site-footer__brand img{display:block;width:158px;max-width:100%;height:auto;object-fit:contain}',
    '.vtg-site-footer__brand span{max-width:245px;font-size:11px;line-height:1.75;color:#c0b1b0}',
    '.vtg-site-footer__links{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}',
    '.vtg-site-footer__group h4{margin:2px 0 11px;color:#fff;font-size:11px;font-weight:800;letter-spacing:.035em}',
    '.vtg-site-footer__group a,.vtg-site-footer__legal a{position:relative;display:table;width:fit-content;max-width:100%;margin:6px 0;padding:2px 0;color:#c4c8ce;text-decoration:none;font-size:10px;line-height:1.65;transition:color .16s ease,background .16s ease}',
    '.vtg-site-footer__group a:hover,.vtg-site-footer__legal a:hover{color:#fff}',
    '.vtg-site-footer__group a[aria-current="page"],.vtg-site-footer__legal a[aria-current="page"]{color:#ff8b82;font-weight:800}',
    '.vtg-site-footer__group a[aria-current="page"]:after,.vtg-site-footer__legal a[aria-current="page"]:after{content:"";position:absolute;left:0;right:0;bottom:-2px;height:2px;border-radius:3px;background:#ff8b82}',
    '.vtg-site-footer__bottom{max-width:1260px;margin:0 auto;border-top:1px solid rgba(255,255,255,.13);padding:15px 22px 18px;display:flex;justify-content:space-between;align-items:center;gap:18px;color:#aeb7bf;font-size:9px;line-height:1.6}',
    '.vtg-site-footer__legal{display:flex;align-items:center;gap:18px;flex-wrap:wrap}.vtg-site-footer__legal a{margin:0}',
    '.vtg-page-nav{position:fixed;left:14px;bottom:14px;z-index:1200;display:flex;gap:6px;padding:5px;border:1px solid rgba(255,255,255,.15);border-radius:13px;background:rgba(20,10,10,.94);box-shadow:0 8px 26px rgba(0,0,0,.24);backdrop-filter:blur(12px);font-family:Manrope,Arial,sans-serif}',
    '.vtg-page-nav button,.vtg-page-nav a{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:35px;padding:0 11px;border:1px solid transparent;border-radius:9px;background:transparent;color:#f4eeee;text-decoration:none;font:700 10px/1.2 Manrope,Arial,sans-serif;cursor:pointer;white-space:nowrap}',
    '.vtg-page-nav button:hover,.vtg-page-nav a:hover,.vtg-page-nav button:focus-visible,.vtg-page-nav a:focus-visible{outline:none;background:#45201e;border-color:#77403b;color:#ffaaa2}.vtg-page-nav button:disabled{opacity:.55;cursor:default}',
    '@media(max-width:800px){.vtg-site-footer__top{grid-template-columns:1fr;gap:25px;padding:30px 18px}.vtg-site-footer__links{grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 16px}.vtg-site-footer__bottom{align-items:flex-start;flex-direction:column;padding:14px 18px 22px}.vtg-site-footer__legal{gap:14px}}',
    '@media(max-width:420px){.vtg-site-footer__links{grid-template-columns:repeat(2,minmax(0,1fr))}.vtg-page-nav{left:8px;bottom:8px}.vtg-page-nav button,.vtg-page-nav a{padding:0 9px;font-size:9px}.vtg-site-footer__brand img{width:142px}}',
    '@media(prefers-reduced-motion:reduce){.vtg-site-footer *,.vtg-page-nav *{transition:none!important}}'
  ].join('\n');
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
    var path = window.location.pathname || '/'; if (path.length > 1 && path.charAt(path.length - 1) === '/') path = path.slice(0, -1);
    var isHome = path === '/' || path === HOME || path.endsWith('/frontend-v3.html');
    if (!isHome) return;
    var homeAnchors = { marketplace: '#market', atlas: '#vtgAtlasPreview', ai: '#aiLaunch', how: '#how' };
    Object.keys(homeAnchors).forEach(function (key) {
      var link = document.querySelector('#' + FOOTER_ID + ' [data-navkey="' + key + '"]');
      if (link) link.setAttribute('href', homeAnchors[key]);
    });
    var aiLink = document.getElementById('footAi');
    if (aiLink && !aiLink.dataset.vtgAiBound) {
      aiLink.dataset.vtgAiBound = '1';
      aiLink.addEventListener('click', function (event) {
        event.preventDefault();
        var launcher = document.getElementById('aiLaunch');
        if (launcher) launcher.click(); else window.location.hash = 'aiLaunch';
      });
    }
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