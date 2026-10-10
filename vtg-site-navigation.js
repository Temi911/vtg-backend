/* VTG navigation. The homepage footer markup and visual system are the single source of truth site-wide. */
/* 2026-10-10: non-home pages use the simplified logo / Previous / Home header. */
/* 2026-10-10: keep VTG AI in the shared footer and show a clear red active-page underline. */
(function () {
  'use strict';
  var HOME = '/frontend-v3.html';
  var FOOTER_ID = 'vtgFooter';
  var FOOTER_HTML = [
    '<footer class="footer vtgCompactFooter" id="vtgFooter" aria-label="VTG site footer">',
    '<div class="footerIn vtgFooterTop">',
    '<div class="vtgFooterBrand"><a href="/frontend-v3.html" aria-label="Vintage Trade Global homepage"><img src="/assets/vtg-logo.svg" alt="Vintage Trade Global"></a><p>Connecting Africa, China and the world through intelligent trade.</p></div>',
    '<div class="vtgFooterLinks">',
    '<div><h4>Explore</h4><a data-navkey="marketplace" href="/marketplace.html">Marketplace</a><a data-navkey="atlas" href="/trade-atlas.html">Trade Atlas</a><a data-navkey="ai" href="/vtg-ai.html">VTG AI</a><a id="footIntel" data-navkey="intelligence" href="/market-intelligence.html">Market Intelligence</a><a id="footTradeFeed" data-navkey="trade-feed" href="/trade-feed.html">Trade Feed</a></div>',
    '<div><h4>Trade</h4><a data-navkey="verification" href="/product-verification.html">Product Verification</a><a data-navkey="logistics" href="/logistics-shipping.html">Logistics &amp; Shipping</a><a data-navkey="workspace" href="/trade-workspace.html">Trade Workspace</a></div>',
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
    '#vtgFooter.vtgCompactFooter [data-navkey][aria-current="page"]{color:#ff8b82!important;font-weight:800!important}',
    '#vtgFooter.vtgCompactFooter .vtgFooterLinks a[data-navkey][aria-current="page"]:after,#vtgFooter.vtgCompactFooter .vtgFooterBottom a[data-navkey][aria-current="page"]:after{content:""!important;display:block!important;position:absolute!important;left:0!important;right:0!important;bottom:-3px!important;height:2px!important;border-radius:2px!important;background:#ff8b82!important;opacity:1!important}',
    '.vtgCompactFooter .vtgFooterBottom{position:relative;width:100%;max-width:1260px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;gap:18px;border-top:1px solid rgba(255,255,255,.07);padding:13px 24px;color:#71808b;font-size:8.5px;text-align:left}',
    '.vtgCompactFooter .vtgFooterBottom div{display:flex;gap:16px;flex-wrap:wrap}',
    '.vtgCompactFooter .vtgFooterBottom a{position:relative;color:#8c99a3;text-decoration:none;padding:1px 0}',
    'body.vtg-simple-header-page [data-vtg-replaced-header="true"]{display:none!important}',
    '.vtg-page-nav{position:relative;z-index:1200;display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:8px max(16px,calc((100vw - 1260px)/2));border-bottom:1px solid rgba(255,255,255,.10);background:#0b1016;font-family:Manrope,Arial,sans-serif;box-sizing:border-box}',
    '.vtg-page-nav button,.vtg-page-nav a{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:35px;padding:0 11px;border:1px solid transparent;border-radius:9px;background:transparent;color:#f4f6f8;text-decoration:none;font:700 10px/1.2 Manrope,Arial,sans-serif;cursor:pointer;white-space:nowrap}.vtg-page-nav .vtg-nav-brand{display:inline-flex;align-items:center;justify-content:flex-start;min-width:0;margin-right:auto;padding:0;border:0;background:transparent;flex:0 0 auto}.vtg-page-nav .vtg-nav-brand img{display:block;width:auto;max-width:132px;height:auto;max-height:34px;object-fit:contain}.vtg-page-nav .vtg-nav-actions{display:flex;align-items:center;justify-content:flex-end;gap:6px;margin-left:auto;flex:0 0 auto}',
    '.vtg-page-nav button:hover,.vtg-page-nav a:hover,.vtg-page-nav button:focus-visible,.vtg-page-nav a:focus-visible{outline:none;background:#211a1b;border-color:#77403b;color:#ffaaa2}.vtg-page-nav button:disabled{opacity:.55;cursor:default}',
    '@media(max-width:800px){.vtgCompactFooter .vtgFooterTop{grid-template-columns:1fr;gap:25px;padding:30px 16px 22px}.vtgCompactFooter .vtgFooterLinks{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 15px}.vtgCompactFooter .vtgFooterBottom{padding:12px 16px;align-items:flex-start;flex-direction:column;gap:8px}}',
    '@media(max-width:420px){.vtgCompactFooter .vtgFooterLinks{grid-template-columns:1fr 1fr}.vtg-page-nav{padding:7px 12px}.vtg-page-nav button,.vtg-page-nav a{padding:0 9px;font-size:9px}}',
    'footer#vtgFooter.vtgCompactFooter{display:block!important;float:none!important;clear:both!important;position:relative!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;overflow:visible!important;background:#0b1016!important;color:#9eabb5!important;border-top:1px solid rgba(255,255,255,.08)!important;font-family:Manrope,Arial,sans-serif!important;font-size:initial!important;line-height:normal!important;text-align:left!important;box-shadow:none!important;border-radius:0!important}',
        'footer#vtgFooter.vtgCompactFooter .footerIn.vtgFooterTop{display:grid!important;float:none!important;position:relative!important;width:100%!important;max-width:1260px!important;margin:0 auto!important;padding:38px 24px 30px!important;grid-template-columns:minmax(220px,.9fr) minmax(0,2fr)!important;gap:42px!important;align-items:start!important}',
        'footer#vtgFooter.vtgCompactFooter .vtgFooterBrand{display:block!important;min-width:0!important;float:none!important;margin:0!important;padding:0!important}',
        'footer#vtgFooter.vtgCompactFooter .vtgFooterBrand img{display:block!important;float:none!important;width:auto!important;max-width:150px!important;height:auto!important;max-height:38px!important;object-fit:contain!important;margin:0 0 13px!important}',
        'footer#vtgFooter.vtgCompactFooter .vtgFooterBrand p{display:block!important;max-width:290px!important;margin:0 0 18px!important;padding:0!important;color:#9eabb5!important;font-size:11px!important;line-height:1.7!important}',
        'footer#vtgFooter.vtgCompactFooter .vtgFooterLinks{display:grid!important;float:none!important;position:relative!important;width:100%!important;min-width:0!important;margin:0!important;padding:0!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:24px!important;align-items:start!important}',
        'footer#vtgFooter.vtgCompactFooter .vtgFooterLinks>div{display:block!important;min-width:0!important;float:none!important;margin:0!important;padding:0!important}',
        'footer#vtgFooter.vtgCompactFooter .vtgFooterLinks h4{display:block!important;margin:3px 0 12px!important;padding:0!important;color:#f1f4f6!important;font-size:10px!important;line-height:1.4!important;letter-spacing:.04em!important;text-transform:uppercase!important}',
        'footer#vtgFooter.vtgCompactFooter .vtgFooterLinks a{display:table!important;float:none!important;width:fit-content!important;max-width:100%!important;margin:0 0 8px!important;padding:1px 0!important;color:#9eabb5!important;font-size:10px!important;line-height:1.55!important;text-decoration:none!important;border:0!important;background:transparent!important;white-space:normal!important}',
        'footer#vtgFooter.vtgCompactFooter .vtgFooterBottom.copyright{display:flex!important;float:none!important;position:relative!important;width:100%!important;max-width:1260px!important;margin:0 auto!important;padding:13px 24px!important;justify-content:space-between!important;align-items:center!important;gap:18px!important;border-top:1px solid rgba(255,255,255,.07)!important;color:#71808b!important;font-size:8.5px!important;line-height:1.5!important;text-align:left!important;background:transparent!important}',
        'footer#vtgFooter.vtgCompactFooter .vtgFooterBottom>span{display:block!important;margin:0!important;padding:0!important;color:#71808b!important;font-size:8.5px!important;line-height:1.5!important}',
        'footer#vtgFooter.vtgCompactFooter .vtgFooterBottom>div{display:flex!important;float:none!important;gap:16px!important;flex-wrap:wrap!important;margin:0!important;padding:0!important}',
        'footer#vtgFooter.vtgCompactFooter .vtgFooterBottom a{display:inline-block!important;margin:0!important;padding:1px 0!important;color:#8c99a3!important;font-size:8.5px!important;line-height:1.5!important;text-decoration:none!important}',
        '@media(max-width:800px){footer#vtgFooter.vtgCompactFooter .footerIn.vtgFooterTop{grid-template-columns:1fr!important;gap:25px!important;padding:30px 16px 22px!important}footer#vtgFooter.vtgCompactFooter .vtgFooterLinks{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:20px 15px!important}footer#vtgFooter.vtgCompactFooter .vtgFooterBottom.copyright{padding:12px 16px!important;align-items:flex-start!important;flex-direction:column!important;gap:8px!important}footer#vtgFooter.vtgCompactFooter .vtgFooterBottom>div{gap:12px!important}}',
        '@media(max-width:420px){footer#vtgFooter.vtgCompactFooter .vtgFooterLinks{grid-template-columns:repeat(2,minmax(0,1fr))!important}footer#vtgFooter.vtgCompactFooter .vtgFooterBottom.copyright{font-size:8px!important}}',
    '@media(prefers-reduced-motion:reduce){.vtgCompactFooter *,.vtg-page-nav *{transition:none!important}}'
  ].join('\n');
  function addStyle() {
    if (document.getElementById('vtg-site-navigation-style')) return;
    var style = document.createElement('style');
    style.id = 'vtg-site-navigation-style';
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  function renderFooter() {
    var old = Array.prototype.slice.call(document.querySelectorAll('footer, .vtgCompactFooter, .site-footer, .footer'));
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
      intelligence: ['/market-intelligence.html', '/intelligence-centre.html'],
      ai: ['/vtg-ai.html', '/vtg-ai-dashboard.html'],
      'trade-feed': ['/trade-feed.html', '/account-trade-feed.html'],
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
    var hashMap = {'#market':'marketplace','#vtgatlaspreview':'atlas','#vtgintellaunch':'intelligence'};
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
    var homeAnchors = { atlas: '#vtgAtlasPreview' };
    Object.keys(homeAnchors).forEach(function (key) {
      var link = document.querySelector('#' + FOOTER_ID + ' [data-navkey="' + key + '"]');
      if (link) link.setAttribute('href', homeAnchors[key]);
    });

  }
  function isHomePage() {
    var path = window.location.pathname || '/';
    while (path.length > 1 && path.charAt(path.length - 1) === '/') path = path.slice(0, -1);
    return path === '/' || path === HOME || path.endsWith('/frontend-v3.html');
  }
  function simplifyPageHeader() {
    if (isHomePage()) {
      document.body.classList.add('vtg-home-page');
      return;
    }
    document.body.classList.add('vtg-simple-header-page');
    // Hide only top-level page headers; leave dashboard sidebars and page content untouched.
    [
      'body > header:not(#vtgPageNavigation)',
      'body > .topline',
      'body > .top',
      'body > .topbar',
      'body > .site-header',
      'body > .siteHeader',
      'body > .navbar',
      'body > .main-header',
      'body > .page-header'
    ].forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (el) {
        if (el.id !== 'vtgPageNavigation') el.setAttribute('data-vtg-replaced-header', 'true');
      });
    });
    document.querySelectorAll('body > div.header, body > div.navbar, body > div.navbar-wrap').forEach(function (el) {
      if (el.querySelector('a[href="/"], a[href="' + HOME + '"]') &&
          el.querySelector('img[alt*="Vintage Trade Global"], img[src*="vtg-logo"]')) {
        el.setAttribute('data-vtg-replaced-header', 'true');
      }
    });
  }
  function addPageNavigation() {
    if (isHomePage() || document.getElementById('vtgPageNavigation')) return;
    var nav = document.createElement('nav');
    nav.id = 'vtgPageNavigation';
    nav.className = 'vtg-page-nav';
    nav.setAttribute('aria-label', 'Page navigation');
    nav.innerHTML = '<a class="vtg-nav-brand" href="' + HOME + '" aria-label="Vintage Trade Global home"><img src="/assets/vtg-logo.svg" alt="Vintage Trade Global"></a><div class="vtg-nav-actions"><button type="button" id="vtgPreviousPage" aria-label="Return to previous VTG page"><span aria-hidden="true">←</span> Previous</button><a href="' + HOME + '" aria-label="Return to VTG homepage"><span aria-hidden="true">⌂</span> Home</a></div>';
    document.body.insertBefore(nav, document.body.firstChild);
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
  function applyTimeBasedTheme() {
    // VTG-wide theme policy: follow each visitor's own device-local clock.
    var root = document.documentElement;
    var lastTheme = '';
    var preferenceKey = 'vtg-theme-preference';
    function readPreference() {
      try { return window.localStorage.getItem(preferenceKey) || 'light'; }
      catch (error) { return 'auto'; }
    }
    function syncTheme() {
      var now = new Date();
      var hour = now.getHours(); // Browser local time, not server/Nigeria time.
      var preference = readPreference();
      var theme = preference === 'light' || preference === 'dark'
        ? preference
        : ((hour >= 6 && hour < 22) ? 'light' : 'dark');
      if (theme !== lastTheme || root.getAttribute('data-theme') !== theme) {
        root.setAttribute('data-theme', theme);
        root.style.colorScheme = theme;
        lastTheme = theme;
        var themeMeta = document.querySelector('meta[name="theme-color"]');
        if (themeMeta) themeMeta.setAttribute('content', theme === 'dark' ? '#0d1117' : '#f5f7fa');
        document.dispatchEvent(new CustomEvent('vtg:themechange', { detail: { theme: theme, hour: hour, preference: preference } }));
      }
      return theme;
    }
    window.vtgSyncTheme = syncTheme;
    window.vtgSetThemePreference = function (preference) {
      if (['auto', 'light', 'dark'].indexOf(preference) === -1) return;
      try { window.localStorage.setItem(preferenceKey, preference); } catch (error) {}
      lastTheme = '';
      syncTheme();
    };
    if (!document.getElementById('vtg-auto-theme-style')) {
      var style = document.createElement('style');
      style.id = 'vtg-auto-theme-style';
      style.textContent = [
        ':root{color-scheme:light;--vtg-auto-bg:#f5f7fa;--vtg-auto-surface:#fff;--vtg-auto-surface-2:#f0f3f6;--vtg-auto-text:#17212b;--vtg-auto-muted:#687586;--vtg-auto-line:#dfe5eb;--vtg-auto-shadow:0 12px 34px rgba(18,32,48,.08)}',
        'html[data-theme="light"] body{background:#f5f7fa!important;color:#17212b!important;color-scheme:light}',
        'html[data-theme="light"] body main,html[data-theme="light"] body .section,html[data-theme="light"] body .section.alt,html[data-theme="light"] body .page,html[data-theme="light"] body .pageMain,html[data-theme="light"] body .main-content,html[data-theme="light"] body .content-section{background-color:#f5f7fa!important;color:#17212b!important}',
        'html[data-theme="light"] body .card,html[data-theme="light"] body .panel,html[data-theme="light"] body .surface,html[data-theme="light"] body .tile,html[data-theme="light"] body .modal-content,html[data-theme="light"] body .form-card,html[data-theme="light"] body .portalCard,html[data-theme="light"] body .stat-card,html[data-theme="light"] body .node,html[data-theme="light"] body .path,html[data-theme="light"] body .feature-card,html[data-theme="light"] body .step-card,html[data-theme="light"] body .info-card,html[data-theme="light"] body .faq-item,html[data-theme="light"] body .callout,html[data-theme="light"] body .routeCard,html[data-theme="light"] body .route-card,html[data-theme="light"] body .selectedHub,html[data-theme="light"] body .accessCard,html[data-theme="light"] body .access-card{background-color:#fff!important;color:#17212b!important;border-color:#dfe5eb!important;box-shadow:0 10px 28px rgba(18,32,48,.07)}',
        'html[data-theme="light"] body .nav,html[data-theme="light"] body .site-nav,html[data-theme="light"] body .topbar,html[data-theme="light"] body .page-header,html[data-theme="light"] body .vtg-page-nav{background:#fff!important;color:#17212b!important;border-color:#dfe5eb!important;box-shadow:0 4px 20px rgba(18,32,48,.06)}',
        'html[data-theme="light"] body .nav a,html[data-theme="light"] body .site-nav a,html[data-theme="light"] body .topbar a,html[data-theme="light"] body .page-header a,html[data-theme="light"] body .vtg-page-nav a,html[data-theme="light"] body .vtg-page-nav button{color:#263746!important}',
        'html[data-theme="light"] body footer,html[data-theme="light"] body .footer,html[data-theme="light"] body .vtgCompactFooter,html[data-theme="light"] body #vtgFooter{background:#eef2f6!important;color:#344454!important;border-color:#d8e0e8!important}',
        'html[data-theme="light"] body footer p,html[data-theme="light"] body footer a,html[data-theme="light"] body .footer p,html[data-theme="light"] body .footer a,html[data-theme="light"] body .vtgCompactFooter h4,html[data-theme="light"] body .vtgCompactFooter a,html[data-theme="light"] body .vtgCompactFooter p,html[data-theme="light"] body .copyright{color:#526273!important}',
        'html[data-theme="light"] body h1,html[data-theme="light"] body h2,html[data-theme="light"] body h3,html[data-theme="light"] body h4,html[data-theme="light"] body h5,html[data-theme="light"] body h6{color:#17212b}',
        'html[data-theme="light"] body .hero h1,html[data-theme="light"] body .hero h2,html[data-theme="light"] body .hero h3,html[data-theme="light"] body .hero p,html[data-theme="light"] body .hero .eyebrow{color:#fff!important}',
        'html[data-theme="dark"] body .hero h1,html[data-theme="dark"] body .hero h2,html[data-theme="dark"] body .hero h3{color:#fff!important}',
        'html[data-theme="light"] body .dark:not(.hero){background-color:#fff!important;color:#17212b!important;border-color:#dfe5eb!important}',
        'html[data-theme="dark"] body .dark:not(.hero){background-color:#11161d!important;color:#eef3f6!important;border-color:#2b3640!important}',
        'html[data-theme="light"] body footer#vtgFooter.vtgCompactFooter,html[data-theme="light"] body footer#vtgFooter.vtgCompactFooter .vtgFooterTop,html[data-theme="light"] body footer#vtgFooter.vtgCompactFooter .vtgFooterBottom{background:#eef2f6!important;color:#526273!important;border-color:#d8e0e8!important}',
        'html[data-theme="light"] body footer#vtgFooter.vtgCompactFooter .vtgFooterLinks h4,html[data-theme="light"] body footer#vtgFooter.vtgCompactFooter .vtgFooterLinks a,html[data-theme="light"] body footer#vtgFooter.vtgCompactFooter .vtgFooterBottom a,html[data-theme="light"] body footer#vtgFooter.vtgCompactFooter .vtgFooterBrand p{color:#526273!important}',
        'html[data-theme="light"] body p,html[data-theme="light"] body li,html[data-theme="light"] body label,html[data-theme="light"] body .muted,html[data-theme="light"] body .subtitle,html[data-theme="light"] body .description,html[data-theme="light"] body .help-text{color:#526273}',
        'html[data-theme="light"] body input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),html[data-theme="light"] body select,html[data-theme="light"] body textarea{background-color:#fff!important;color:#17212b!important;border-color:#cbd5df!important}',
        'html[data-theme="light"] body input::placeholder,html[data-theme="light"] body textarea::placeholder{color:#758394!important}',
        'html[data-theme="light"] body table,html[data-theme="light"] body th,html[data-theme="light"] body td{border-color:#dfe5eb!important;color:#263746}',
        'html[data-theme="light"] body .drawerPanel,html[data-theme="light"] body .modalBox,html[data-theme="light"] body dialog,html[data-theme="light"] body [role="dialog"]{background:#fff!important;color:#17212b!important;border-color:#dfe5eb!important}',
        'html[data-theme="dark"] body main,html[data-theme="dark"] body .section,html[data-theme="dark"] body .section.alt,html[data-theme="dark"] body .page,html[data-theme="dark"] body .pageMain,html[data-theme="dark"] body .main-content,html[data-theme="dark"] body .content-section{background-color:#0d1117!important;color:#eef3f6!important}',
        'html[data-theme="dark"] body .card,html[data-theme="dark"] body .panel,html[data-theme="dark"] body .surface,html[data-theme="dark"] body .tile,html[data-theme="dark"] body .modal-content,html[data-theme="dark"] body .form-card,html[data-theme="dark"] body .portalCard,html[data-theme="dark"] body .stat-card,html[data-theme="dark"] body .node,html[data-theme="dark"] body .path,html[data-theme="dark"] body .feature-card,html[data-theme="dark"] body .step-card,html[data-theme="dark"] body .info-card,html[data-theme="dark"] body .faq-item,html[data-theme="dark"] body .callout,html[data-theme="dark"] body .routeCard,html[data-theme="dark"] body .route-card,html[data-theme="dark"] body .selectedHub,html[data-theme="dark"] body .accessCard,html[data-theme="dark"] body .access-card{background-color:#11161d!important;color:#eef3f6!important;border-color:#2b3640!important;box-shadow:0 10px 28px rgba(0,0,0,.2)}',
        'html[data-theme="dark"] body .nav,html[data-theme="dark"] body .site-nav,html[data-theme="dark"] body .topbar,html[data-theme="dark"] body .page-header,html[data-theme="dark"] body .vtg-page-nav{background:#0b1016!important;color:#eef3f6!important;border-color:#2b3640!important}',
        'html[data-theme="dark"] body footer,html[data-theme="dark"] body .footer,html[data-theme="dark"] body .vtgCompactFooter,html[data-theme="dark"] body #vtgFooter{background:#080b0f!important;color:#b9c5ce!important;border-color:#2b3640!important}',
        'html[data-theme="dark"] body footer p,html[data-theme="dark"] body footer a,html[data-theme="dark"] body .footer p,html[data-theme="dark"] body .footer a,html[data-theme="dark"] body .vtgCompactFooter h4,html[data-theme="dark"] body .vtgCompactFooter a,html[data-theme="dark"] body .vtgCompactFooter p,html[data-theme="dark"] body .copyright{color:#b9c5ce!important}',
        'html[data-theme="dark"] body h1,html[data-theme="dark"] body h2,html[data-theme="dark"] body h3,html[data-theme="dark"] body h4,html[data-theme="dark"] body h5,html[data-theme="dark"] body h6{color:#eef3f6}',
        'html[data-theme="dark"] body p,html[data-theme="dark"] body li,html[data-theme="dark"] body label,html[data-theme="dark"] body .muted,html[data-theme="dark"] body .subtitle,html[data-theme="dark"] body .description,html[data-theme="dark"] body .help-text{color:#b9c5ce}',
        'html[data-theme="dark"] body .drawerPanel,html[data-theme="dark"] body .modalBox,html[data-theme="dark"] body dialog,html[data-theme="dark"] body [role="dialog"]{background:#11161d!important;color:#eef3f6!important;border-color:#2b3640!important}',
        'html[data-theme="dark"] body .tradeNetworkVisual,html[data-theme="dark"] body .hero,html[data-theme="light"] body .tradeNetworkVisual,html[data-theme="light"] body .hero{color:#fff}',
        'html[data-theme="dark"]{color-scheme:dark;--vtg-auto-bg:#0d1117;--vtg-auto-surface:#11161d;--vtg-auto-surface-2:#171d24;--vtg-auto-text:#eef3f6;--vtg-auto-muted:#b9c5ce;--vtg-auto-line:#2b3640;--vtg-auto-shadow:0 12px 34px rgba(0,0,0,.24)}',
        'html[data-theme="dark"] body{background-color:var(--vtg-auto-bg);color:var(--vtg-auto-text)}',
        'html[data-theme="dark"] input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),html[data-theme="dark"] select,html[data-theme="dark"] textarea{background-color:var(--vtg-auto-surface-2);color:var(--vtg-auto-text);border-color:var(--vtg-auto-line)}',
        'html[data-theme="dark"] input::placeholder,html[data-theme="dark"] textarea::placeholder{color:#93a1ad}',
        'html[data-theme="dark"] table,html[data-theme="dark"] th,html[data-theme="dark"] td{border-color:var(--vtg-auto-line)}',
        'html[data-theme="dark"] dialog,html[data-theme="dark"] [role="dialog"]{background:var(--vtg-auto-surface);color:var(--vtg-auto-text);border-color:var(--vtg-auto-line)}',
        'html[data-theme="dark"] .card,html[data-theme="dark"] .panel,html[data-theme="dark"] .surface,html[data-theme="dark"] .tile,html[data-theme="dark"] .modal-content,html[data-theme="dark"] .form-card,html[data-theme="dark"] .portalCard,html[data-theme="dark"] .stat-card{background-color:var(--vtg-auto-surface);color:var(--vtg-auto-text);border-color:var(--vtg-auto-line)}',
        'html[data-theme="dark"] .muted,html[data-theme="dark"] .subtitle,html[data-theme="dark"] .description,html[data-theme="dark"] .help-text{color:var(--vtg-auto-muted)}',
        'html[data-theme="light"] body{color-scheme:light}',
        'html[data-theme="light"] body :is(.section,.page,.pageMain,.main-content,.content-section,.role,.rolegrid,.cards,.card,.panel,.content-card,.feature-card,.form-card,.dashboard-card,.portCard,.portBody,.selectedHub,.faq-item,.callout,.info-card) :is(h1,h2,h3,h4,h5,h6,p,li,label,small,legend,figcaption,dt,dd){color:#263746!important}',
        'html[data-theme="dark"] body :is(.section,.page,.pageMain,.main-content,.content-section,.role,.rolegrid,.cards,.card,.panel,.content-card,.feature-card,.form-card,.dashboard-card,.portCard,.portBody,.selectedHub,.faq-item,.callout,.info-card) :is(h1,h2,h3,h4,h5,h6,p,li,label,small,legend,figcaption,dt,dd){color:#d5dfe7!important}',
        'html[data-theme="light"] body :is(.section,.page,.pageMain,.main-content,.content-section,.role,.rolegrid,.cards,.card,.panel,.content-card,.feature-card,.form-card,.dashboard-card,.portCard,.selectedHub,.faq-item,.callout,.info-card){border-color:#dce4eb}',
        'html[data-theme="dark"] body :is(.section,.page,.pageMain,.main-content,.content-section,.role,.rolegrid,.cards,.card,.panel,.content-card,.feature-card,.form-card,.dashboard-card,.portCard,.selectedHub,.faq-item,.callout,.info-card){border-color:#2b3640}',
        'html[data-theme="light"] body :is(.section,.page,.pageMain,.main-content,.content-section) :is(h1,h2,h3,h4,h5,h6){color:#17212b!important}',
        'html[data-theme="dark"] body :is(.section,.page,.pageMain,.main-content,.content-section) :is(h1,h2,h3,h4,h5,h6){color:#eef3f6!important}',
        'html[data-theme="light"] body .roleHint{color:#526273!important}',
        'html[data-theme="dark"] body .roleHint{color:#b9c5ce!important}',
        'html[data-theme="light"] body :is(h1,h2,h3,h4,h5,h6,p,li,label,small,legend,figcaption,dt,dd,summary,td,th){color:#263746!important}',
        'html[data-theme="dark"] body :is(h1,h2,h3,h4,h5,h6,p,li,label,small,legend,figcaption,dt,dd,summary,td,th){color:#d5dfe7!important}',
        'html[data-theme="light"] body .hero :is(h1,h2,h3,h4,h5,h6,p,li,label,small),html[data-theme="light"] body .tradeNetworkVisual :is(h1,h2,h3,h4,h5,h6,p,li,label,small),html[data-theme="light"] body .globeStage :is(h1,h2,h3,h4,h5,h6,p,li,label,small){color:#fff!important}',
        'html[data-theme="dark"] body .hero :is(h1,h2,h3,h4,h5,h6){color:#fff!important}',
        'html[data-theme="light"] body footer :is(h1,h2,h3,h4,h5,h6,p,li,label,small),html[data-theme="light"] body .footer :is(h1,h2,h3,h4,h5,h6,p,li,label,small){color:#344454!important}',
        'html[data-theme="dark"] body footer :is(h1,h2,h3,h4,h5,h6,p,li,label,small),html[data-theme="dark"] body .footer :is(h1,h2,h3,h4,h5,h6,p,li,label,small){color:#b9c5ce!important}',
        'html[data-theme="light"] body input,html[data-theme="light"] body select,html[data-theme="light"] body textarea{color:#17212b!important}',
        'html[data-theme="dark"] body input,html[data-theme="dark"] body select,html[data-theme="dark"] body textarea{color:#eef3f6!important}',
        'html[data-theme="light"] body .role,html[data-theme="light"] body .card,html[data-theme="light"] body .panel{background-color:#fff!important}',
        'html[data-theme="dark"] body .role,html[data-theme="dark"] body .card,html[data-theme="dark"] body .panel{background-color:#11161d!important}',
        '@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto!important}}'
      ].join('\n');
      document.head.appendChild(style);
    }
    syncTheme();
    // Re-check periodically so an open tab changes theme when local day/night changes.
    window.setInterval(syncTheme, 60000);
    window.addEventListener('focus', syncTheme);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) syncTheme(); });
  }
  function ensureThemeControl() {
    if (document.getElementById('vtgThemePreference')) return;
    var wrap = document.createElement('div');
    wrap.id = 'vtgThemeControl';
    wrap.innerHTML = '<label for="vtgThemePreference">Appearance</label><select id="vtgThemePreference" aria-label="Choose site appearance"><option value="light">Light mode</option><option value="dark">Dark mode</option><option value="auto">Automatic (local time)</option></select>';
    var style = document.createElement('style');
    style.id = 'vtg-theme-control-style';
    style.textContent = [
      '#vtgThemeControl{position:fixed;left:14px;bottom:16px;z-index:2147483000;display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid #d8e0e8;border-radius:12px;background:rgba(255,255,255,.97);color:#263746;box-shadow:0 8px 28px rgba(15,23,42,.16);font:600 12px/1.2 Manrope,Arial,sans-serif;backdrop-filter:blur(12px)}',
      '#vtgThemeControl label{margin:0;color:#526273!important;font:700 11px/1.2 Manrope,Arial,sans-serif}',
      '#vtgThemeControl select{max-width:130px;min-height:32px;padding:5px 24px 5px 8px;border:1px solid #cbd5df;border-radius:8px;background:#fff;color:#17212b;font:700 11px/1.2 Manrope,Arial,sans-serif;cursor:pointer}',
      '#vtgThemeControl select:focus-visible{outline:2px solid #c0392b;outline-offset:2px}',
      'html[data-theme="dark"] #vtgThemeControl{background:rgba(17,22,29,.97);border-color:#34404a;color:#eef3f6}',
      'html[data-theme="dark"] #vtgThemeControl label{color:#c1cbd3!important}',
      'html[data-theme="dark"] #vtgThemeControl select{background:#151b22;color:#eef3f6;border-color:#46535e}',
      '@media(max-width:480px){#vtgThemeControl{left:10px;bottom:10px;padding:6px 8px;gap:6px}#vtgThemeControl label{font-size:10px}#vtgThemeControl select{min-height:30px;font-size:10px}}',
      '@media(prefers-reduced-motion:reduce){#vtgThemeControl *{transition:none!important}}'
    ].join('\n');
    document.head.appendChild(style);
    document.body.appendChild(wrap);
    var select = wrap.querySelector('select');
    try { select.value = window.localStorage.getItem('vtg-theme-preference') || 'light'; }
    catch (error) { select.value = 'light'; }
    select.addEventListener('change', function () {
      if (window.vtgSetThemePreference) window.vtgSetThemePreference(select.value);
    });
    document.addEventListener('vtg:themechange', function (event) {
      wrap.setAttribute('data-current-theme', event.detail.theme);
    });
  }
  function init() {
    applyTimeBasedTheme();
    addStyle();
    ensureThemeControl();
    renderFooter();
    adaptHomeAnchors();
    simplifyPageHeader();
    addPageNavigation();
    setActiveFooterLink();
    window.addEventListener('hashchange', setActiveFooterLink);
    window.addEventListener('popstate', setActiveFooterLink);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
