/* VTG navigation. Shared header/footer, day/night mode and preset styling apply site-wide except buyer/supplier dashboards. */
/* 2026-10-10: non-home pages use the simplified logo / Previous / Home header. */
/* 2026-10-17: persist visitor presets site-wide; enforce themed headers/footers and dark-by-default. */
(function () {
  'use strict';
  var HOME = '/frontend-v3.html';
  var FOOTER_ID = 'vtgFooter';
  var FOOTER_HTML = [
    '<footer class="footer vtgCompactFooter" id="vtgFooter">',
    '<div class="footerIn vtgFooterTop"><div class="vtgFooterBrand"><a href="/frontend-v3.html" aria-label="Vintage Trade Global homepage"><img src="/assets/vtg-logo.svg" alt="Vintage Trade Global"></a><p>Connecting Africa, China and the world through intelligent trade.</p></div><div class="vtgFooterLinks">',
    '<div><h4>Explore</h4><a data-navkey="marketplace" href="/marketplace.html">Marketplace</a><a data-navkey="atlas" href="/trade-atlas.html" id="footAtlas">Trade Atlas</a><a data-navkey="intelligence" href="/market-intelligence.html" id="footIntel">Market Intelligence</a><a data-navkey="ai" href="/vtg-ai.html" id="footAi">VTG AI</a><a data-navkey="trade-feed" href="/trade-feed.html" id="footTradeFeed">Trade Feed</a><a data-navkey="africa-markets" href="/africa-markets.html" id="footAfricaMarkets">Africa Markets</a></div>',
    '<div><h4>Trade</h4><a data-navkey="verification" href="/product-verification.html">Product Verification</a><a data-navkey="logistics" href="/logistics-shipping.html">Logistics &amp; Shipping</a></div>',
    '<div><h4>Business</h4><a data-navkey="sourcing" href="/sourcing-suppliers.html">Sourcing &amp; Suppliers</a><a data-navkey="finance" href="/finance-payments.html">Finance &amp; Payments</a><a data-navkey="guide" href="/trade-guide.html">Trade Guide</a><a data-navkey="agent" href="/agent.html">Become an Agent</a></div>',
    '<div><h4>Company</h4><a data-navkey="about" href="/about-vintage.html">About VTG</a><a data-navkey="partnerships" href="/partnerships.html">Partnerships</a><a data-navkey="contact" href="/contact.html">Contact VTG</a><a data-navkey="workforce" href="/workforce-access.html">Workforce &amp; Staff Access</a></div>',
    '</div></div>',
    '<div class="copyright vtgFooterBottom"><span>© 2026 Vintage Trade Global • Powered by Folayele Global Resources Limited</span><div><a data-navkey="privacy" href="/privacy.html">Privacy</a><a data-navkey="terms" href="/terms.html">Terms</a><a data-navkey="conduct" href="/code-of-conduct.html">Code of Conduct</a></div></div>',
    '</footer>'
  ].join(''); 
  var CSS = [
    '.vtgCompactFooter{display:block!important;position:relative;z-index:1;width:100%;margin:0!important;padding:0!important;background:#0b1016!important;color:#d7dde3;border-top:1px solid rgba(255,255,255,.08);font-family:Manrope,Arial,sans-serif}',
    '.vtgCompactFooter *{box-sizing:border-box}',
    '.vtgCompactFooter .vtgFooterTop{width:100%;max-width:1260px;margin:0 auto;display:grid;grid-template-columns:minmax(220px,.9fr) minmax(0,2fr);gap:42px;padding:38px 24px 30px}',
    '.vtgCompactFooter .vtgFooterBrand img{display:block;width:auto;max-width:150px;height:auto;max-height:38px;object-fit:contain;margin-bottom:13px}',
    '.vtgCompactFooter .vtgFooterBrand p{max-width:290px;margin:0 0 18px;color:#98a2b3;font-size:9px;line-height:1.7}',
    '.vtgCompactFooter .vtgFooterLinks{display:contents}',
    '.vtgCompactFooter .vtgFooterLinks h4{margin:0 0 10px;color:#fff;font-size:16px;letter-spacing:normal;text-transform:none}',
    '.vtgCompactFooter .vtgFooterLinks a{position:relative;display:block;width:fit-content;max-width:100%;color:#98a2b3;text-decoration:none;font-size:9px;line-height:1.7;margin:4px 0;padding:0;transition:color .18s}',
    '.vtgCompactFooter .vtgFooterLinks a:hover,.vtgCompactFooter .vtgFooterBottom a:hover{color:#fff}',
    '#vtgFooter.vtgCompactFooter [data-navkey][aria-current="page"]{color:#ff8b82!important;font-weight:800!important}',
    '#vtgFooter.vtgCompactFooter .vtgFooterLinks a[data-navkey][aria-current="page"]:after,#vtgFooter.vtgCompactFooter .vtgFooterBottom a[data-navkey][aria-current="page"]:after{content:""!important;display:block!important;position:absolute!important;left:0!important;right:0!important;bottom:-3px!important;height:2px!important;border-radius:2px!important;background:#ff8b82!important;opacity:1!important}',
    '.vtgCompactFooter .vtgFooterBottom{position:relative;width:100%;max-width:none;margin:0 auto;display:block;justify-content:initial;align-items:initial;gap:0;border-top:1px solid rgba(255,255,255,.08);padding:14px;text-align:center;color:#98a2b3;font-size:8px}',
    '.vtgCompactFooter .vtgFooterBottom div{display:flex;justify-content:center;gap:16px;flex-wrap:wrap}',
    '.vtgCompactFooter .vtgFooterBottom a{position:relative;color:#8c99a3;text-decoration:none;padding:1px 0}',
    'body.vtg-simple-header-page [data-vtg-replaced-header="true"]{display:none!important}',
    '.vtg-page-nav{position:relative;z-index:1200;display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:8px max(16px,calc((100vw - 1260px)/2));border-bottom:1px solid rgba(255,255,255,.10);background:#0b1016;font-family:Manrope,Arial,sans-serif;box-sizing:border-box}',
    '.vtg-page-nav button,.vtg-page-nav a{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:35px;padding:0 11px;border:1px solid transparent;border-radius:9px;background:transparent;color:#f4f6f8;text-decoration:none;font:700 10px/1.2 Manrope,Arial,sans-serif;cursor:pointer;white-space:nowrap}.vtg-page-nav .vtg-nav-brand{display:inline-flex;align-items:center;justify-content:flex-start;min-width:0;margin-right:auto;padding:0;border:0;background:transparent;flex:0 0 auto}.vtg-page-nav .vtg-nav-brand img{display:block;width:auto;max-width:132px;height:auto;max-height:34px;object-fit:contain}.vtg-page-nav .vtg-nav-actions{display:flex;align-items:center;justify-content:flex-end;gap:6px;margin-left:auto;flex:0 0 auto}',
    '.vtg-page-nav button:hover,.vtg-page-nav a:hover,.vtg-page-nav button:focus-visible,.vtg-page-nav a:focus-visible{outline:none;background:#211a1b;border-color:#77403b;color:#ffaaa2}.vtg-page-nav button:disabled{opacity:.55;cursor:default}',
    '@media(max-width:800px){.vtgCompactFooter .vtgFooterTop{grid-template-columns:1fr 1fr;gap:22px;padding:30px 16px 22px}.vtgCompactFooter .vtgFooterBrand{grid-column:1/-1}.vtgCompactFooter .vtgFooterBottom{padding:14px;text-align:center}.vtgCompactFooter .vtgFooterBottom div{justify-content:center}}',
    '@media(max-width:420px){.vtgCompactFooter .vtgFooterLinks{grid-template-columns:1fr 1fr}.vtg-page-nav{padding:7px 12px}.vtg-page-nav button,.vtg-page-nav a{padding:0 9px;font-size:9px}}',
    'footer#vtgFooter.vtgCompactFooter{display:block!important;float:none!important;clear:both!important;position:relative!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;overflow:visible!important;background:#0b1016!important;color:#9eabb5!important;border-top:1px solid rgba(255,255,255,.08)!important;font-family:Manrope,Arial,sans-serif!important;font-size:initial!important;line-height:normal!important;text-align:left!important;box-shadow:none!important;border-radius:0!important}',
        'footer#vtgFooter.vtgCompactFooter .footerIn.vtgFooterTop{display:grid!important;float:none!important;position:relative!important;width:100%!important;max-width:1260px!important;margin:0 auto!important;padding:38px 24px 30px!important;grid-template-columns:minmax(220px,.9fr) minmax(0,2fr)!important;gap:42px!important;align-items:start!important}',
        'footer#vtgFooter.vtgCompactFooter .vtgFooterBrand{display:block!important;min-width:0!important;float:none!important;margin:0!important;padding:0!important}',
        'footer#vtgFooter.vtgCompactFooter .vtgFooterBrand img{display:block!important;float:none!important;width:auto!important;max-width:150px!important;height:auto!important;max-height:38px!important;object-fit:contain!important;margin:0 0 13px!important}',
        'footer#vtgFooter.vtgCompactFooter .vtgFooterBrand p{display:block!important;max-width:290px!important;margin:0 0 18px!important;padding:0!important;color:#98a2b3!important;font-size:9px!important;line-height:1.7!important}',
        'footer#vtgFooter.vtgCompactFooter .vtgFooterLinks{display:grid!important;float:none!important;position:relative!important;width:100%!important;min-width:0!important;margin:0!important;padding:0!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:24px!important}',
        'footer#vtgFooter.vtgCompactFooter .vtgFooterLinks>div{display:block!important;min-width:0!important;float:none!important;margin:0!important;padding:0!important}',
        'footer#vtgFooter.vtgCompactFooter .vtgFooterLinks h4{display:block!important;margin:3px 0 12px!important;padding:0!important;color:#f1f4f6!important;font-size:10px!important;line-height:1.4!important;letter-spacing:.04em!important;text-transform:uppercase!important}',
        'footer#vtgFooter.vtgCompactFooter .vtgFooterLinks a{display:table!important;float:none!important;width:fit-content!important;max-width:100%!important;margin:0 0 8px!important;padding:1px 0!important;color:#9eabb5!important;font-size:10px!important;line-height:1.55!important;text-decoration:none!important;border:0!important;background:transparent!important;white-space:normal!important}',
        'footer#vtgFooter.vtgCompactFooter .vtgFooterBottom.copyright{display:flex!important;float:none!important;position:relative!important;width:100%!important;max-width:1260px!important;margin:0 auto!important;padding:13px 24px!important;justify-content:space-between!important;align-items:center!important;gap:18px!important;border-top:1px solid rgba(255,255,255,.07)!important;color:#71808b!important;font-size:8.5px!important;line-height:1.5!important;text-align:left!important;background:transparent!important}',
        'footer#vtgFooter.vtgCompactFooter .vtgFooterBottom>span{display:block!important;margin:0!important;padding:0!important;color:#71808b!important;font-size:8.5px!important;line-height:1.5!important}',
        'footer#vtgFooter.vtgCompactFooter .vtgFooterBottom>div{display:flex!important;float:none!important;gap:16px!important;flex-wrap:wrap!important;margin:0!important;padding:0!important}',
        'footer#vtgFooter.vtgCompactFooter .vtgFooterBottom a{display:inline-block!important;margin:0!important;padding:1px 0!important;color:#8c99a3!important;font-size:8.5px!important;line-height:1.5!important;text-decoration:none!important}',
        '@media(max-width:800px){footer#vtgFooter.vtgCompactFooter .footerIn.vtgFooterTop{grid-template-columns:1fr!important;gap:25px!important;padding:30px 16px 22px!important}footer#vtgFooter.vtgCompactFooter .vtgFooterLinks{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:20px 15px!important}footer#vtgFooter.vtgCompactFooter .vtgFooterBottom.copyright{padding:12px 16px!important;align-items:flex-start!important;flex-direction:column!important;gap:8px!important}footer#vtgFooter.vtgCompactFooter .vtgFooterBottom>div{gap:12px!important}}',
        '@media(max-width:420px){footer#vtgFooter.vtgCompactFooter .vtgFooterLinks{grid-template-columns:repeat(2,minmax(0,1fr))!important}footer#vtgFooter.vtgCompactFooter .vtgFooterBottom.copyright{font-size:8px!important}}',
    '@media(prefers-reduced-motion:reduce){.vtgCompactFooter *,.vtg-page-nav *{transition:none!important}}',
    'html[data-vtg-skin][data-theme="light"] body :is(.nav,.site-nav,.site-header,.siteHeader,.topbar,.top-bar,.page-header,.pageHeader,.vtg-page-nav,#vtgPageNavigation){background:#fff!important;background-color:#fff!important;color:#17212b!important;border-color:#dedede!important}',
    'html[data-vtg-skin][data-theme="dark"] body :is(.nav,.site-nav,.site-header,.siteHeader,.topbar,.top-bar,.page-header,.pageHeader,.vtg-page-nav,#vtgPageNavigation){background:#000!important;background-color:#000!important;color:#fff!important;border-color:#303030!important}',
    'html[data-vtg-skin][data-theme="light"] body :is(.nav,.site-nav,.site-header,.siteHeader,.topbar,.top-bar,.page-header,.pageHeader,.vtg-page-nav,#vtgPageNavigation) :is(a,button,span,strong,small){color:#17212b!important}',
    'html[data-vtg-skin][data-theme="dark"] body :is(.nav,.site-nav,.site-header,.siteHeader,.topbar,.top-bar,.page-header,.pageHeader,.vtg-page-nav,#vtgPageNavigation) :is(a,button,span,strong,small){color:#fff!important}',
    'html[data-vtg-skin][data-theme="light"] body footer#vtgFooter.vtgCompactFooter{background:#240b09!important;background-color:#240b09!important;color:#c9b4b1!important;border-color:rgba(255,255,255,.08)!important}',
    'html[data-vtg-skin][data-theme="dark"] body footer#vtgFooter.vtgCompactFooter{background:#080b0f!important;background-color:#080b0f!important;color:#aeb9c2!important;border-color:#2b3640!important}',
    'html[data-vtg-skin][data-theme="light"] body footer#vtgFooter.vtgCompactFooter :is(h1,h2,h3,h4,h5,h6){color:#fff!important}html[data-vtg-skin][data-theme="light"] body footer#vtgFooter.vtgCompactFooter .vtgFooterBrand p,html[data-vtg-skin][data-theme="light"] body footer#vtgFooter.vtgCompactFooter .vtgFooterLinks a{color:#98a2b3!important}',
    'html[data-vtg-skin][data-theme="dark"] body footer#vtgFooter.vtgCompactFooter :is(h1,h2,h3,h4,h5,h6){color:#f3f6f8!important}html[data-vtg-skin][data-theme="dark"] body footer#vtgFooter.vtgCompactFooter .vtgFooterBrand p,html[data-vtg-skin][data-theme="dark"] body footer#vtgFooter.vtgCompactFooter .vtgFooterLinks a{color:#aeb9c2!important}'
  ].join('\\n');
  var CONTRAST_CSS = [
    /* Shared contrast baseline for all VTG pages; image overlays and branded dark sections retain their own palettes. */
    'html[data-theme="light"] body{background-color:#f5f7fa;color:#17212b}',
    'html[data-theme="dark"] body{background-color:#0d1117;color:#eef3f6}',
    'html[data-theme="light"] body :is(.card,.panel,.surface,.tile,.modal-content,.form-card,.portalCard,.stat-card,.feature-card,.step-card,.info-card,.faq-item,.callout,.routeCard,.route-card,.accessCard,.access-card,.partnership-card,.partner-card,.service-card,.content-card,.feature,.info-panel,.detail-card,.application-card,.news-card,.market-card){color:#17212b}',
    'html[data-theme="dark"] body :is(.card,.panel,.surface,.tile,.modal-content,.form-card,.portalCard,.stat-card,.feature-card,.step-card,.info-card,.faq-item,.callout,.routeCard,.route-card,.accessCard,.access-card,.partnership-card,.partner-card,.service-card,.content-card,.feature,.info-panel,.detail-card,.application-card,.news-card,.market-card){color:#eef3f6}',
    'html[data-theme="light"] body :is(.card,.panel,.surface,.tile,.modal-content,.form-card,.portalCard,.stat-card,.feature-card,.step-card,.info-card,.faq-item,.callout,.routeCard,.route-card,.accessCard,.access-card,.partnership-card,.partner-card,.service-card,.content-card,.feature,.info-panel,.detail-card,.application-card,.news-card,.market-card) :is(h1,h2,h3,h4,h5,h6,p,span,small,strong,b,label,li,dt,dd,figcaption){color:inherit}',
    'html[data-theme="dark"] body :is(.card,.panel,.surface,.tile,.modal-content,.form-card,.portalCard,.stat-card,.feature-card,.step-card,.info-card,.faq-item,.callout,.routeCard,.route-card,.accessCard,.access-card,.partnership-card,.partner-card,.service-card,.content-card,.feature,.info-panel,.detail-card,.application-card,.news-card,.market-card) :is(h1,h2,h3,h4,h5,h6,p,span,small,strong,b,label,li,dt,dd,figcaption){color:inherit}',
    'html[data-theme="light"] body :is(.card,.panel,.surface,.tile,.modal-content,.form-card,.portalCard,.stat-card,.feature-card,.step-card,.info-card,.faq-item,.callout,.routeCard,.route-card,.accessCard,.access-card,.partnership-card,.partner-card,.service-card,.content-card,.feature,.info-panel,.detail-card,.application-card,.news-card,.market-card) :is(p,small,.muted,.subtitle,.description,.eyebrow,.meta,.caption){color:#526273}',
    'html[data-theme="dark"] body :is(.card,.panel,.surface,.tile,.modal-content,.form-card,.portalCard,.stat-card,.feature-card,.step-card,.info-card,.faq-item,.callout,.routeCard,.route-card,.accessCard,.access-card,.partnership-card,.partner-card,.service-card,.content-card,.feature,.info-panel,.detail-card,.application-card,.news-card,.market-card) :is(p,small,.muted,.subtitle,.description,.eyebrow,.meta,.caption){color:#c2ccd5}',
    'html[data-theme="light"] body :is(.media-copy,.image-copy,.text-content,.image-content,.content-row,.feature-row,.split-content,.section-content) :is(h1,h2,h3,h4,h5,h6,p,li,figcaption){color:#17212b}',
    'html[data-theme="dark"] body :is(.media-copy,.image-copy,.text-content,.image-content,.content-row,.feature-row,.split-content,.section-content) :is(h1,h2,h3,h4,h5,h6,p,li,figcaption){color:#eef3f6}',
    'html[data-theme="light"] body :is(input,select,textarea){background:#fff;color:#17212b;border-color:#cbd5df}',
    'html[data-theme="dark"] body :is(input,select,textarea){background:#151b22;color:#eef3f6;border-color:#46535f}',
    'html[data-theme="dark"] body :is(input,select,textarea)::placeholder{color:#aab6c1;opacity:1}',
    'html[data-theme="light"] body :is(.card,.panel,.surface,.tile,.modal-content,.form-card,.portalCard,.stat-card,.feature-card,.step-card,.info-card,.faq-item,.callout,.routeCard,.route-card,.accessCard,.access-card,.partnership-card,.partner-card,.service-card,.content-card,.feature,.info-panel,.detail-card,.application-card,.news-card,.market-card){border-color:#d9e1e8}',
    'html[data-theme="dark"] body :is(.card,.panel,.surface,.tile,.modal-content,.form-card,.portalCard,.stat-card,.feature-card,.step-card,.info-card,.faq-item,.callout,.routeCard,.route-card,.accessCard,.access-card,.partnership-card,.partner-card,.service-card,.content-card,.feature,.info-panel,.detail-card,.application-card,.news-card,.market-card){border-color:#35414c}',
    'html[data-theme="light"] body :is(.card,.panel,.surface,.tile,.modal-content,.form-card,.portalCard,.stat-card,.feature-card,.step-card,.info-card,.faq-item,.callout,.routeCard,.route-card,.accessCard,.access-card,.partnership-card,.partner-card,.service-card,.content-card,.feature,.info-panel,.detail-card,.application-card,.news-card,.market-card) a:not(.primary):not(.btn-primary){color:#8f1d17}',
    'html[data-theme="dark"] body :is(.card,.panel,.surface,.tile,.modal-content,.form-card,.portalCard,.stat-card,.feature-card,.step-card,.info-card,.faq-item,.callout,.routeCard,.route-card,.accessCard,.access-card,.partnership-card,.partner-card,.service-card,.content-card,.feature,.info-panel,.detail-card,.application-card,.news-card,.market-card) a:not(.primary):not(.btn-primary){color:#ff9a91}',
    /* Text-only hero/intro wrappers should sit on the page or hero background, not become extra cards. */
    'html body :is(.hero-copy,.heroCopy,.hero-text,.heroText,.hero-content,.heroContent,.intro-copy,.introCopy,.page-intro,.pageIntro,.section-copy,.sectionCopy,.text-card,.textCard,.copy-card,.copyCard){background:transparent!important;background-image:none!important;border:0!important;border-radius:0!important;box-shadow:none!important;backdrop-filter:none!important}',
    'html[data-theme="light"] body :is(.hero-copy,.heroCopy,.hero-text,.heroText,.hero-content,.heroContent,.intro-copy,.introCopy,.page-intro,.pageIntro,.section-copy,.sectionCopy,.text-card,.textCard,.copy-card,.copyCard) :is(h1,h2,h3,h4,h5,h6,p,span,small,strong,b,li){color:#17212b}',
    'html[data-theme="dark"] body :is(.hero-copy,.heroCopy,.hero-text,.heroText,.intro-copy,.introCopy,.page-intro,.pageIntro,.section-copy,.sectionCopy,.text-card,.textCard,.copy-card,.copyCard) :is(h1,h2,h3,h4,h5,h6,p,span,small,strong,b,li){color:#eef3f6}',
    'html body :is(.hero-copy,.heroCopy,.hero-text,.heroText,.hero-content,.heroContent,.intro-copy,.introCopy,.page-intro,.pageIntro,.section-copy,.sectionCopy,.text-card,.textCard,.copy-card,.copyCard) :is(h1,h2,h3,h4,h5,h6,p,span,small,strong,b,li){-webkit-text-fill-color:currentColor!important;opacity:1!important;visibility:visible!important;text-shadow:none}',
    'html[data-theme="light"] body :is(.card,.panel,.surface,.tile,.modal-content,.form-card,.portalCard,.stat-card,.feature-card,.step-card,.info-card,.faq-item,.route-card,.access-card,.partnership-card,.partner-card,.service-card,.content-card,.info-panel,.detail-card,.application-card,.news-card,.market-card){background-color:#fff}',
    'html[data-theme="dark"] body :is(.card,.panel,.surface,.tile,.modal-content,.form-card,.portalCard,.stat-card,.feature-card,.step-card,.info-card,.faq-item,.route-card,.access-card,.partnership-card,.partner-card,.service-card,.content-card,.info-panel,.detail-card,.application-card,.news-card,.market-card){background-color:#11161d}',
    '@media(prefers-reduced-motion:reduce){html[data-theme] body *{scroll-behavior:auto}}'
  ].join('\n');
  function addStyle() {
    if (document.getElementById('vtg-site-navigation-style')) return;
    var style = document.createElement('style');
    style.id = 'vtg-site-navigation-style';
    style.textContent = CSS + '\n' + CONTRAST_CSS;
    document.head.appendChild(style);
  }
  function syncBrandLogos() {
    var path = (window.location.pathname || '').toLowerCase();
    if (path.endsWith('/buyer-dashboard.html') || path.endsWith('/buyer-dashboard-preview.html') || path.endsWith('/supplier-dashboard.html')) return;
    var darkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    document.querySelectorAll('img[src*="vtg-logo"], img[alt*="Vintage Trade Global"], img[alt="VTG"]').forEach(function (img) {
      var src = darkMode ? '/assets/vtg-logo-light.svg' : '/assets/vtg-logo.svg';
      if (img.getAttribute('src') !== src) img.setAttribute('src', src);
      img.setAttribute('data-vtg-theme-logo', darkMode ? 'light-on-dark' : 'dark-on-light');
    });
  }
  function renderFooter() {
    if (!vtgPublicShellPage && !isWorkspaceDashboardPage()) {
      document.querySelectorAll('footer, .vtgCompactFooter, .site-footer, .footer').forEach(function (item) { item.remove(); }); return;
    }
    var old = Array.prototype.slice.call(document.querySelectorAll('footer, .vtgCompactFooter, .site-footer, .footer'));
    var host = document.createElement('div'); host.innerHTML = FOOTER_HTML; var footer = host.firstElementChild;
    if (old.length) { old[0].replaceWith(footer); old.slice(1).forEach(function (extra) { extra.remove(); }); } else document.body.appendChild(footer);
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
      sourcing: ['/sourcing-suppliers.html', '/supplier.html'],
      finance: ['/finance-payments.html'],
      guide: ['/trade-guide.html'],
      agent: ['/agent.html', '/agent-dashboard.html'],
      workforce: ['/workforce-access.html', '/workforce-signin.html', '/workforce-dashboard.html', '/admin-signin.html'],
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
    var homeAnchors = { atlas: '/trade-atlas.html' };
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
  function isWorkspaceDashboardPage() {
    var path = (window.location.pathname || '').toLowerCase();
    return /(?:^|\/)(?:buyer-dashboard(?:-preview)?|supplier-dashboard|bank-trade-os|workforce-dashboard|agent-dashboard|agent-network-dashboard|vtg-ai-dashboard|admin-dashboard-preview|inspection-admin)\.html$/.test(path);
  }
  function hasDownstreamPageLinks() {
    if (isHomePage() || isWorkspaceDashboardPage()) return true;
    var current = (window.location.pathname || '').toLowerCase();
    return Array.prototype.slice.call(document.querySelectorAll('body a[href]')).some(function (anchor) {
      if (anchor.closest('header, footer, nav, #vtgFooter, #vtgPageNavigation, .header, .footer, .site-header, .siteHeader, .site-nav, .navbar, .topbar, .top, .topline, .main-header, .page-header')) return false;
      var raw = (anchor.getAttribute('href') || '').trim();
      if (!raw || raw.charAt(0) === '#' || /^(?:mailto:|tel:|javascript:|https?:\/\/|\/\/)/i.test(raw)) return false;
      var url; try { url = new URL(raw, window.location.href); } catch (_) { return false; }
      if (url.origin !== window.location.origin || !/\.html?$/i.test(url.pathname)) return false;
      var target = url.pathname.toLowerCase();
      return target !== current && target !== '/' && !target.endsWith('/frontend-v3.html');
    });
  }
  var vtgPublicShellPage = hasDownstreamPageLinks();
  function removePublicShellElements() {
    document.querySelectorAll('#vtgPageNavigation, #vtgFooter, #vtgThemeControl, #vtgThemePresetControl, footer, .vtgCompactFooter, .site-footer, .footer').forEach(function (el) { el.remove(); });
    document.querySelectorAll('body > header, body > .topline, body > .top, body > .topbar, body > .site-header, body > .siteHeader, body > .navbar, body > .main-header, body > .page-header, body > div.header, body > div.navbar, body > div.navbar-wrap').forEach(function (el) { el.remove(); });
    document.body.classList.add('vtg-leaf-page');
  }
  function simplifyPageHeader() {
    if (isHomePage()) { document.body.classList.add('vtg-home-page'); return; }
    document.body.classList.add('vtg-simple-header-page');
    document.querySelectorAll('body > header, body > .topline, body > .top, body > .topbar, body > .site-header, body > .siteHeader, body > .navbar, body > .main-header, body > .page-header, body > div.header, body > div.navbar, body > div.navbar-wrap').forEach(function (el) { el.remove(); });
    if (!vtgPublicShellPage) removePublicShellElements();
  }
  function addPageNavigation() {
    if (isHomePage() || document.getElementById('vtgPageNavigation')) return;
    if (isWorkspaceDashboardPage()) {
      var workspaceNav = document.createElement('nav'); workspaceNav.id = 'vtgPageNavigation'; workspaceNav.className = 'vtg-page-nav'; workspaceNav.setAttribute('aria-label', 'Page navigation');
      workspaceNav.innerHTML = '<a class="vtg-nav-brand" href="' + HOME + '" aria-label="Vintage Trade Global home"><img src="/assets/vtg-logo.svg" alt="Vintage Trade Global"></a><div class="vtg-nav-actions"><button type="button" id="vtgPreviousPage" aria-label="Return to previous VTG page"><span aria-hidden="true">←</span> Previous</button><a href="' + HOME + '" aria-label="Return to VTG homepage"><span aria-hidden="true">⌂</span> Home</a></div>';
      document.body.insertBefore(workspaceNav, document.body.firstChild);
      document.getElementById('vtgPreviousPage').addEventListener('click', function () { var canReturn = false; try { if (document.referrer) { var previous = new URL(document.referrer, window.location.href); canReturn = previous.origin === window.location.origin && (previous.pathname !== window.location.pathname || previous.search !== window.location.search || previous.hash !== window.location.hash); } } catch (_) {} if (canReturn && window.history.length > 1) window.history.back(); else window.location.href = HOME; });
      return;
    }
    if (!vtgPublicShellPage) return;
    var nav = document.createElement('header'); nav.id = 'vtgPageNavigation'; nav.className = 'nav vtg-public-header'; nav.setAttribute('aria-label', 'VTG site header');
    nav.innerHTML = '<div class="navin"><a class="brand" href="/frontend-v3.html#top" aria-label="Vintage Trade Global"><img src="/assets/vtg-logo.svg" alt="Vintage Trade Global"></a><div class="navtools" aria-label="VTG quick access"><label class="vtg-language-wrap" aria-label="Choose site language"><span>Language</span><select id="vtgLanguagePicker" aria-label="Choose site language"><option value="en">English</option><option value="fr">Français</option><option value="zh-CN">中文</option><option value="ko">한국어</option><option value="es">Español</option><option value="ar">العربية</option></select></label><a class="headerFeatureBtn" id="atlasHeaderBtn" href="/trade-atlas.html" title="Open Trade Atlas" aria-label="Open Trade Atlas"><i data-lucide="globe-2"></i><span>Trade Atlas</span></a><a class="primary headerEnterBtn" id="joinBtn" href="/signin.html" aria-label="Enter VTG and sign in"><i data-lucide="arrow-up-right"></i><span>Enter VTG</span></a></div></div>';
    if (!document.getElementById('vtg-public-header-style')) {
      var style = document.createElement('style'); style.id = 'vtg-public-header-style';
      style.textContent = '.vtg-public-header{position:sticky;top:0;z-index:100;background:rgba(13,17,23,.96);backdrop-filter:blur(18px);border-bottom:1px solid rgba(255,255,255,.09);box-shadow:0 8px 30px rgba(0,0,0,.14)}.vtg-public-header .navin{max-width:1320px;margin:auto;padding:11px 24px;display:flex;align-items:center;justify-content:space-between;gap:24px;min-height:68px}.vtg-public-header .brand{display:flex;align-items:center;min-width:0}.vtg-public-header .brand img{max-height:42px;width:auto}.vtg-public-header .navtools{display:flex;align-items:center;gap:9px;margin-left:auto}.vtg-public-header .vtg-language-wrap{display:flex;align-items:center;gap:6px;color:#eef3f6;font-size:10px;font-weight:700}.vtg-public-header .vtg-language-wrap select{max-width:120px;height:38px;padding:0 8px;border:1px solid rgba(255,255,255,.18);border-radius:10px;background:#171d24;color:#eef3f6;font:700 11px Manrope,sans-serif}.vtg-public-header .headerFeatureBtn,.vtg-public-header .headerEnterBtn{height:42px;border-radius:12px;padding:0 14px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:10px;font-weight:800;text-decoration:none}.vtg-public-header .headerFeatureBtn{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.045);color:#eef3f6}.vtg-public-header .headerEnterBtn{background:#c0392b;color:#fff;padding:0 17px}.vtg-public-header .headerEnterBtn *{color:#fff!important}@media(max-width:900px){.vtg-public-header .navin{padding:10px 14px;gap:10px}.vtg-public-header .brand img{max-height:38px}.vtg-public-header .navtools{gap:6px}.vtg-public-header .headerFeatureBtn,.vtg-public-header .headerEnterBtn{height:38px;padding:0 10px;font-size:9px}}@media(max-width:560px){.vtg-public-header .vtg-language-wrap span{display:none}.vtg-public-header .vtg-language-wrap select{max-width:82px;font-size:10px}.vtg-public-header .headerFeatureBtn{width:40px;padding:0}.vtg-public-header .headerFeatureBtn span{display:none}.vtg-public-header .headerEnterBtn{padding:0 10px;white-space:nowrap}}';
      document.head.appendChild(style);
    }
    document.body.insertBefore(nav, document.body.firstChild);
    var picker = document.getElementById('vtgLanguagePicker');
    if (picker) { var stored = 'en'; try { stored = localStorage.getItem('vtg-language') || 'en'; } catch (_) {} picker.value = stored === 'zh' ? 'zh-CN' : stored; picker.addEventListener('change', function () { var selected = picker.value; try { localStorage.setItem('vtg-language', selected === 'zh-CN' ? 'zh' : selected); } catch (_) {} if (selected === 'en') { document.cookie = 'googtrans=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'; document.cookie = 'googtrans=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + location.hostname; } else { var value = '/en/' + selected; document.cookie = 'googtrans=' + value + ';path=/;max-age=31536000;SameSite=Lax'; } location.reload(); }); }
    if (picker && !window.googleTranslateElementInit && !document.querySelector('script[data-vtg-google-translate]')) {
      window.googleTranslateElementInit = function () { if (window.google && window.google.translate) new window.google.translate.TranslateElement({pageLanguage:'en',includedLanguages:'en,fr,zh-CN,ko,es,ar',autoDisplay:false}, 'google_translate_element'); };
      if (!document.getElementById('google_translate_element')) { var translateHost = document.createElement('div'); translateHost.id = 'google_translate_element'; translateHost.hidden = true; document.body.appendChild(translateHost); }
      var translateScript = document.createElement('script'); translateScript.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'; translateScript.async = true; translateScript.setAttribute('data-vtg-google-translate','1'); document.head.appendChild(translateScript);
    }
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }
  function applyTimeBasedTheme() {
    // VTG-wide theme policy: follow each visitor's own device-local clock.
    var root = document.documentElement;
    var lastTheme = '';
    var preferenceKey = 'vtg-theme-preference';
    function readPreference() {
      try { return window.localStorage.getItem(preferenceKey) || 'dark'; }
      catch (error) { return 'dark'; }
    }
    function syncTheme() {
      var now = new Date();
      var hour = now.getHours(); // Browser local time, not server/Nigeria time.
      var preference = readPreference();
      var theme = preference === 'light' || preference === 'dark'
        ? preference
        : ((hour >= 6 && hour < 18) ? 'light' : 'dark');
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
        'html[data-theme="light"] body{background:#fff!important;color:#17212b!important;color-scheme:light}',
        'html[data-theme="light"] body main,html[data-theme="light"] body .section,html[data-theme="light"] body .section.alt,html[data-theme="light"] body .page,html[data-theme="light"] body .pageMain,html[data-theme="light"] body .main-content,html[data-theme="light"] body .content-section{background-color:#fff!important;color:#17212b!important}',
        'html[data-theme="light"] body .card,html[data-theme="light"] body .panel,html[data-theme="light"] body .surface,html[data-theme="light"] body .tile,html[data-theme="light"] body .modal-content,html[data-theme="light"] body .form-card,html[data-theme="light"] body .portalCard,html[data-theme="light"] body .stat-card,html[data-theme="light"] body .node,html[data-theme="light"] body .path,html[data-theme="light"] body .feature-card,html[data-theme="light"] body .step-card,html[data-theme="light"] body .info-card,html[data-theme="light"] body .faq-item,html[data-theme="light"] body .callout,html[data-theme="light"] body .routeCard,html[data-theme="light"] body .route-card,html[data-theme="light"] body .selectedHub,html[data-theme="light"] body .accessCard,html[data-theme="light"] body .access-card{background-color:#fff!important;color:#17212b!important;border-color:#dfe5eb!important;box-shadow:0 10px 28px rgba(18,32,48,.07)}',
        'html[data-theme="light"] body .nav,html[data-theme="light"] body .site-nav,html[data-theme="light"] body .topbar,html[data-theme="light"] body .page-header,html[data-theme="light"] body .vtg-page-nav{background:#fff!important;color:#17212b!important;border-color:#dfe5eb!important;box-shadow:0 4px 20px rgba(18,32,48,.06)}',
        'html[data-theme="light"] body .nav a,html[data-theme="light"] body .site-nav a,html[data-theme="light"] body .topbar a,html[data-theme="light"] body .page-header a,html[data-theme="light"] body .vtg-page-nav a,html[data-theme="light"] body .vtg-page-nav button{color:#263746!important}',
        'html[data-theme="light"] body footer,html[data-theme="light"] body .footer,html[data-theme="light"] body .vtgCompactFooter,html[data-theme="light"] body #vtgFooter{background:#eef2f6!important;color:#344454!important;border-color:#d8e0e8!important}',
        'html[data-theme="light"] body footer p,html[data-theme="light"] body footer a,html[data-theme="light"] body .footer p,html[data-theme="light"] body .footer a,html[data-theme="light"] body .vtgCompactFooter h4,html[data-theme="light"] body .vtgCompactFooter a,html[data-theme="light"] body .vtgCompactFooter p,html[data-theme="light"] body .copyright{color:#526273!important}',
        'html[data-theme="light"] body h1,html[data-theme="light"] body h2,html[data-theme="light"] body h3,html[data-theme="light"] body h4,html[data-theme="light"] body h5,html[data-theme="light"] body h6{color:#17212b}',
        'html[data-theme="light"] body .hero h1,html[data-theme="light"] body .hero h2,html[data-theme="light"] body .hero h3,html[data-theme="light"] body .hero p,html[data-theme="light"] body .hero .eyebrow{color:#fff!important}',
        'html[data-theme="light"] body:has(.pathways) .hero h1,html[data-theme="light"] body:has(.heroAside) .hero h1,html[data-theme="light"] body:has(.pathways) .hero h2,html[data-theme="light"] body:has(.heroAside) .hero h2,html[data-theme="light"] body:has(.pathways) .hero h3,html[data-theme="light"] body:has(.heroAside) .hero h3{color:#17212b!important}',
        'html[data-theme="light"] body:has(.pathways) .hero p,html[data-theme="light"] body:has(.heroAside) .hero p{color:#526273!important}',
        'html[data-theme="light"] body:has(.pathways) .hero .eyebrow,html[data-theme="light"] body:has(.heroAside) .hero .eyebrow{color:#d71920!important}',
        'html[data-theme="dark"] body:has(.pathways) .hero h1,html[data-theme="dark"] body:has(.heroAside) .hero h1,html[data-theme="dark"] body:has(.pathways) .hero h2,html[data-theme="dark"] body:has(.heroAside) .hero h2,html[data-theme="dark"] body:has(.pathways) .hero h3,html[data-theme="dark"] body:has(.heroAside) .hero h3{color:#eef3f6!important}',
        'html[data-theme="dark"] body:has(.pathways) .hero p,html[data-theme="dark"] body:has(.heroAside) .hero p{color:#c1cbd3!important}',
        'html[data-theme="dark"] body:has(.pathways) .hero .eyebrow,html[data-theme="dark"] body:has(.heroAside) .hero .eyebrow{color:#ff6269!important}',
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
        '/* Site-wide contrast guardrails for card copy, image-adjacent text and controls */',
        'html[data-theme="light"] body :is(.card,.helpCard,.routeStep,.step,.feature,.featureCard,.feature-card,.infoCard,.info-card,.benefitCard,.benefit-card,.serviceCard,.service-card,.pathwayCard,.pathway-card,.statCard,.stat-card,.tradeCard,.trade-card,.categoryCard,.category-card,.marketCard,.market-card,.newsCard,.news-card,.contentCard,.content-card,.roleCard,.role-card,.portalCard,.portal-card,.faq-item,.callout){background-color:#fff!important;color:#17212b!important;border-color:#dce4eb!important}',
        'html[data-theme="dark"] body :is(.card,.helpCard,.routeStep,.step,.feature,.featureCard,.feature-card,.infoCard,.info-card,.benefitCard,.benefit-card,.serviceCard,.service-card,.pathwayCard,.pathway-card,.statCard,.stat-card,.tradeCard,.trade-card,.categoryCard,.category-card,.marketCard,.market-card,.newsCard,.news-card,.contentCard,.content-card,.roleCard,.role-card,.portalCard,.portal-card,.faq-item,.callout){background-color:#11161d!important;color:#eef3f6!important;border-color:#2b3640!important}',
        'html[data-theme="light"] body :is(.card,.helpCard,.routeStep,.step,.feature,.featureCard,.feature-card,.infoCard,.info-card,.benefitCard,.benefit-card,.serviceCard,.service-card,.pathwayCard,.pathway-card,.statCard,.stat-card,.tradeCard,.trade-card,.categoryCard,.category-card,.marketCard,.market-card,.newsCard,.news-card,.contentCard,.content-card,.roleCard,.role-card,.portalCard,.portal-card,.faq-item,.callout) :is(h1,h2,h3,h4,h5,h6,strong,b,small,label,li,span,dt,dd,figcaption){color:#263746!important}',
        'html[data-theme="light"] body :is(.card,.helpCard,.routeStep,.step,.feature,.featureCard,.feature-card,.infoCard,.info-card,.benefitCard,.benefit-card,.serviceCard,.service-card,.pathwayCard,.pathway-card,.statCard,.stat-card,.tradeCard,.trade-card,.categoryCard,.category-card,.marketCard,.market-card,.newsCard,.news-card,.contentCard,.content-card,.roleCard,.role-card,.portalCard,.portal-card,.faq-item,.callout) :is(p,.muted,.description,.subtitle,.help-text,.meta){color:#526273!important}',
        'html[data-theme="dark"] body :is(.card,.helpCard,.routeStep,.step,.feature,.featureCard,.feature-card,.infoCard,.info-card,.benefitCard,.benefit-card,.serviceCard,.service-card,.pathwayCard,.pathway-card,.statCard,.stat-card,.tradeCard,.trade-card,.categoryCard,.category-card,.marketCard,.market-card,.newsCard,.news-card,.contentCard,.content-card,.roleCard,.role-card,.portalCard,.portal-card,.faq-item,.callout) :is(h1,h2,h3,h4,h5,h6,strong,b,small,label,li,span,dt,dd,figcaption){color:#eef3f6!important}',
        'html[data-theme="dark"] body :is(.card,.helpCard,.routeStep,.step,.feature,.featureCard,.feature-card,.infoCard,.info-card,.benefitCard,.benefit-card,.serviceCard,.service-card,.pathwayCard,.pathway-card,.statCard,.stat-card,.tradeCard,.trade-card,.categoryCard,.category-card,.marketCard,.market-card,.newsCard,.news-card,.contentCard,.content-card,.roleCard,.role-card,.portalCard,.portal-card,.faq-item,.callout) :is(p,.muted,.description,.subtitle,.help-text,.meta){color:#b9c5ce!important}',
        'html[data-theme="light"] body .hero:has(img) :is(h1,h2,h3,h4,h5,h6){color:#17212b!important}html[data-theme="light"] body .hero:has(img) p{color:#526273!important}html[data-theme="light"] body .hero:has(img) .eyebrow{color:#b83227!important}',
        'html[data-theme="dark"] body .hero:has(img) :is(h1,h2,h3,h4,h5,h6){color:#eef3f6!important}html[data-theme="dark"] body .hero:has(img) p{color:#c1cbd3!important}html[data-theme="dark"] body .hero:has(img) .eyebrow{color:#ff777d!important}',
        'html[data-theme="light"] body :is(.heroGrid,.heroCopy,.imageCopy,.image-copy,.mediaCopy,.media-copy,.splitContent,.split-content,.copyBlock,.copy-block,.textBesideImage,.text-beside-image,.aboutGrid,.about-grid,.two,.twoCol,.two-column,.imageText,.image-text,.textImage,.text-image,.imageTextGrid,.image-text-grid,.storyGrid,.story-grid,.split,.splitGrid,.split-grid,.contentSplit,.content-split) :is(h1,h2,h3,h4,h5,h6,p,li,small,strong,span){color:#263746!important}',
        'html[data-theme="dark"] body :is(.heroGrid,.heroCopy,.imageCopy,.image-copy,.mediaCopy,.media-copy,.splitContent,.split-content,.copyBlock,.copy-block,.textBesideImage,.text-beside-image,.aboutGrid,.about-grid,.two,.twoCol,.two-column,.imageText,.image-text,.textImage,.text-image,.imageTextGrid,.image-text-grid,.storyGrid,.story-grid,.split,.splitGrid,.split-grid,.contentSplit,.content-split) :is(h1,h2,h3,h4,h5,h6,p,li,small,strong,span){color:#d5dfe7!important}',
        'html[data-theme="light"] body :is(input,select,textarea,option){background-color:#fff!important;color:#17212b!important;border-color:#cbd5df!important}html[data-theme="dark"] body :is(input,select,textarea,option){background-color:#171d24!important;color:#eef3f6!important;border-color:#46535e!important}',
        'html[data-theme="light"] body :is(button,a).outline,html[data-theme="light"] body :is(button,a).secondary{color:#263746!important}html[data-theme="dark"] body :is(button,a).outline,html[data-theme="dark"] body :is(button,a).secondary{color:#eef3f6!important}',
        "/* VTG global contrast safeguards for both themes */\nhtml[data-theme=\"light\"] body :is(.card,.helpCard,.routeStep,.step,.feature,.featureCard,.feature-card,.infoCard,.info-card,.benefitCard,.benefit-card,.serviceCard,.service-card,.pathwayCard,.pathway-card,.statCard,.stat-card,.tradeCard,.trade-card,.categoryCard,.category-card,.marketCard,.market-card,.newsCard,.news-card,.contentCard,.content-card,.roleCard,.role-card,.portalCard,.portal-card,.faq-item,.callout){background:#fff!important;color:#17212b!important;border-color:#dce4eb!important}\nhtml[data-theme=\"dark\"] body :is(.card,.helpCard,.routeStep,.step,.feature,.featureCard,.feature-card,.infoCard,.info-card,.benefitCard,.benefit-card,.serviceCard,.service-card,.pathwayCard,.pathway-card,.statCard,.stat-card,.tradeCard,.trade-card,.categoryCard,.category-card,.marketCard,.market-card,.newsCard,.news-card,.contentCard,.content-card,.roleCard,.role-card,.portalCard,.portal-card,.faq-item,.callout){background:#11161d!important;color:#eef3f6!important;border-color:#2b3640!important}\nhtml[data-theme=\"light\"] body :is(.card,.helpCard,.routeStep,.step,.feature,.featureCard,.feature-card,.infoCard,.info-card,.benefitCard,.benefit-card,.serviceCard,.service-card,.pathwayCard,.pathway-card,.statCard,.stat-card,.tradeCard,.trade-card,.categoryCard,.category-card,.marketCard,.market-card,.newsCard,.news-card,.contentCard,.content-card,.roleCard,.role-card,.portalCard,.portal-card,.faq-item,.callout) :is(h1,h2,h3,h4,h5,h6,strong,b,small,label,li,span,dt,dd,figcaption){color:#263746!important}\nhtml[data-theme=\"light\"] body :is(.card,.helpCard,.routeStep,.step,.feature,.featureCard,.feature-card,.infoCard,.info-card,.benefitCard,.benefit-card,.serviceCard,.service-card,.pathwayCard,.pathway-card,.statCard,.stat-card,.tradeCard,.trade-card,.categoryCard,.category-card,.marketCard,.market-card,.newsCard,.news-card,.contentCard,.content-card,.roleCard,.role-card,.portalCard,.portal-card,.faq-item,.callout) :is(p,.muted,.description,.subtitle,.help-text,.meta){color:#526273!important}\nhtml[data-theme=\"dark\"] body :is(.card,.helpCard,.routeStep,.step,.feature,.featureCard,.feature-card,.infoCard,.info-card,.benefitCard,.benefit-card,.serviceCard,.service-card,.pathwayCard,.pathway-card,.statCard,.stat-card,.tradeCard,.trade-card,.categoryCard,.category-card,.marketCard,.market-card,.newsCard,.news-card,.contentCard,.content-card,.roleCard,.role-card,.portalCard,.portal-card,.faq-item,.callout) :is(h1,h2,h3,h4,h5,h6,strong,b,small,label,li,span,dt,dd,figcaption){color:#eef3f6!important}\nhtml[data-theme=\"dark\"] body :is(.card,.helpCard,.routeStep,.step,.feature,.featureCard,.feature-card,.infoCard,.info-card,.benefitCard,.benefit-card,.serviceCard,.service-card,.pathwayCard,.pathway-card,.statCard,.stat-card,.tradeCard,.trade-card,.categoryCard,.category-card,.marketCard,.market-card,.newsCard,.news-card,.contentCard,.content-card,.roleCard,.role-card,.portalCard,.portal-card,.faq-item,.callout) :is(p,.muted,.description,.subtitle,.help-text,.meta){color:#b9c5ce!important}\nhtml[data-theme=\"light\"] body .hero:has(img) :is(h1,h2,h3,h4,h5,h6){color:#17212b!important}\nhtml[data-theme=\"light\"] body .hero:has(img) p{color:#526273!important}\nhtml[data-theme=\"light\"] body .hero:has(img) .eyebrow{color:#b83227!important}\nhtml[data-theme=\"dark\"] body .hero:has(img) :is(h1,h2,h3,h4,h5,h6){color:#eef3f6!important}\nhtml[data-theme=\"dark\"] body .hero:has(img) p{color:#c1cbd3!important}\nhtml[data-theme=\"dark\"] body .hero:has(img) .eyebrow{color:#ff777d!important}\nhtml[data-theme=\"light\"] body :is(.heroGrid,.heroCopy,.imageCopy,.image-copy,.mediaCopy,.media-copy,.splitContent,.split-content,.copyBlock,.copy-block,.textBesideImage,.text-beside-image,.aboutGrid,.about-grid) :is(h1,h2,h3,h4,h5,h6,p,li,small,strong,span){color:#263746!important}\nhtml[data-theme=\"dark\"] body :is(.heroGrid,.heroCopy,.imageCopy,.image-copy,.mediaCopy,.media-copy,.splitContent,.split-content,.copyBlock,.copy-block,.textBesideImage,.text-beside-image,.aboutGrid,.about-grid) :is(h1,h2,h3,h4,h5,h6,p,li,small,strong,span){color:#d5dfe7!important}\nhtml[data-theme=\"light\"] body :is(input,select,textarea,option){background:#fff!important;color:#17212b!important;border-color:#cbd5df!important}\nhtml[data-theme=\"dark\"] body :is(input,select,textarea,option){background:#171d24!important;color:#eef3f6!important;border-color:#46535e!important}",
        '/* Final site-wide contrast pass: cards, image-adjacent copy, CTA panels, and controls */',
        'html[data-theme="light"] body :is(.card,.helpCard,.routeStep,.step,.feature,.featureCard,.feature-card,.infoCard,.info-card,.benefitCard,.benefit-card,.serviceCard,.service-card,.pathwayCard,.pathway-card,.statCard,.stat-card,.tradeCard,.trade-card,.categoryCard,.category-card,.marketCard,.market-card,.newsCard,.news-card,.contentCard,.content-card,.roleCard,.role-card,.portalCard,.portal-card,.faq-item,.callout,.metric,.metricCard,.metric-card,.item,.status,.trustitem,.trustItem,.cta,.enquiry,.noticeCard,.notice-card){background-color:#fff!important;color:#17212b!important;border-color:#dce4eb!important}',
        'html[data-theme="dark"] body :is(.card,.helpCard,.routeStep,.step,.feature,.featureCard,.feature-card,.infoCard,.info-card,.benefitCard,.benefit-card,.serviceCard,.service-card,.pathwayCard,.pathway-card,.statCard,.stat-card,.tradeCard,.trade-card,.categoryCard,.category-card,.marketCard,.market-card,.newsCard,.news-card,.contentCard,.content-card,.roleCard,.role-card,.portalCard,.portal-card,.faq-item,.callout,.metric,.metricCard,.metric-card,.item,.status,.trustitem,.trustItem,.cta,.enquiry,.noticeCard,.notice-card){background-color:#11161d!important;color:#eef3f6!important;border-color:#2b3640!important}',
        'html[data-theme="light"] body :is(.card,.helpCard,.routeStep,.step,.feature,.featureCard,.feature-card,.infoCard,.info-card,.benefitCard,.benefit-card,.serviceCard,.service-card,.pathwayCard,.pathway-card,.statCard,.stat-card,.tradeCard,.trade-card,.categoryCard,.category-card,.marketCard,.market-card,.newsCard,.news-card,.contentCard,.content-card,.roleCard,.role-card,.portalCard,.portal-card,.faq-item,.callout,.metric,.metricCard,.metric-card,.item,.status,.trustitem,.trustItem,.cta,.enquiry,.noticeCard,.notice-card) :is(h1,h2,h3,h4,h5,h6,strong,b,label,legend,figcaption,dt,dd){color:#17212b!important}',
        'html[data-theme="light"] body :is(.card,.helpCard,.routeStep,.step,.feature,.featureCard,.feature-card,.infoCard,.info-card,.benefitCard,.benefit-card,.serviceCard,.service-card,.pathwayCard,.pathway-card,.statCard,.stat-card,.tradeCard,.trade-card,.categoryCard,.category-card,.marketCard,.market-card,.newsCard,.news-card,.contentCard,.content-card,.roleCard,.role-card,.portalCard,.portal-card,.faq-item,.callout,.metric,.metricCard,.metric-card,.item,.status,.trustitem,.trustItem,.cta,.enquiry,.noticeCard,.notice-card) :is(p,li,small,.muted,.description,.subtitle,.help-text,.meta){color:#526273!important}',
        'html[data-theme="dark"] body :is(.card,.helpCard,.routeStep,.step,.feature,.featureCard,.feature-card,.infoCard,.info-card,.benefitCard,.benefit-card,.serviceCard,.service-card,.pathwayCard,.pathway-card,.statCard,.stat-card,.tradeCard,.trade-card,.categoryCard,.category-card,.marketCard,.market-card,.newsCard,.news-card,.contentCard,.content-card,.roleCard,.role-card,.portalCard,.portal-card,.faq-item,.callout,.metric,.metricCard,.metric-card,.item,.status,.trustitem,.trustItem,.cta,.enquiry,.noticeCard,.notice-card) :is(h1,h2,h3,h4,h5,h6,strong,b,label,legend,figcaption,dt,dd){color:#eef3f6!important}',
        'html[data-theme="dark"] body :is(.card,.helpCard,.routeStep,.step,.feature,.featureCard,.feature-card,.infoCard,.info-card,.benefitCard,.benefit-card,.serviceCard,.service-card,.pathwayCard,.pathway-card,.statCard,.stat-card,.tradeCard,.trade-card,.categoryCard,.category-card,.marketCard,.market-card,.newsCard,.news-card,.contentCard,.content-card,.roleCard,.role-card,.portalCard,.portal-card,.faq-item,.callout,.metric,.metricCard,.metric-card,.item,.status,.trustitem,.trustItem,.cta,.enquiry,.noticeCard,.notice-card) :is(p,li,small,.muted,.description,.subtitle,.help-text,.meta){color:#c1cbd3!important}',
        'html[data-theme="light"] body :is(.card,.helpCard,.routeStep,.step,.feature,.featureCard,.feature-card,.infoCard,.info-card,.benefitCard,.benefit-card,.serviceCard,.service-card,.pathwayCard,.pathway-card,.statCard,.stat-card,.tradeCard,.trade-card,.categoryCard,.category-card,.marketCard,.market-card,.newsCard,.news-card,.contentCard,.content-card,.roleCard,.role-card,.portalCard,.portal-card,.faq-item,.callout,.metric,.metricCard,.metric-card,.item,.status,.trustitem,.trustItem,.cta,.enquiry,.noticeCard,.notice-card) a:not(.btn):not(.primary):not(.verified){color:#b4232b!important}',
        'html[data-theme="dark"] body :is(.card,.helpCard,.routeStep,.step,.feature,.featureCard,.feature-card,.infoCard,.info-card,.benefitCard,.benefit-card,.serviceCard,.service-card,.pathwayCard,.pathway-card,.statCard,.stat-card,.tradeCard,.trade-card,.categoryCard,.category-card,.marketCard,.market-card,.newsCard,.news-card,.contentCard,.content-card,.roleCard,.role-card,.portalCard,.portal-card,.faq-item,.callout,.metric,.metricCard,.metric-card,.item,.status,.trustitem,.trustItem,.cta,.enquiry,.noticeCard,.notice-card) a:not(.btn):not(.primary):not(.verified){color:#ff8b82!important}',
        'html[data-theme="light"] body :is(.heroGrid,.heroCopy,.imageCopy,.image-copy,.mediaCopy,.media-copy,.splitContent,.split-content,.copyBlock,.copy-block,.textBesideImage,.text-beside-image,.aboutGrid,.about-grid,.two,.twoCol,.two-column,.imageText,.image-text,.textImage,.text-image,.imageTextGrid,.image-text-grid,.storyGrid,.story-grid,.split,.splitGrid,.split-grid,.contentSplit,.content-split,.copy,.copyBlock,.copy-block,.imagePanel,.image-panel,.mediaText,.media-text) :is(h1,h2,h3,h4,h5,h6,strong,b,label,small,li,figcaption){color:#17212b!important}',
        'html[data-theme="light"] body :is(.heroGrid,.heroCopy,.imageCopy,.image-copy,.mediaCopy,.media-copy,.splitContent,.split-content,.copyBlock,.copy-block,.textBesideImage,.text-beside-image,.aboutGrid,.about-grid,.two,.twoCol,.two-column,.imageText,.image-text,.textImage,.text-image,.imageTextGrid,.image-text-grid,.storyGrid,.story-grid,.split,.splitGrid,.split-grid,.contentSplit,.content-split,.copy,.copyBlock,.copy-block,.imagePanel,.image-panel,.mediaText,.media-text) :is(p,ul,ol,blockquote){color:#526273!important}',
        'html[data-theme="dark"] body :is(.heroGrid,.heroCopy,.imageCopy,.image-copy,.mediaCopy,.media-copy,.splitContent,.split-content,.copyBlock,.copy-block,.textBesideImage,.text-beside-image,.aboutGrid,.about-grid,.two,.twoCol,.two-column,.imageText,.image-text,.textImage,.text-image,.imageTextGrid,.image-text-grid,.storyGrid,.story-grid,.split,.splitGrid,.split-grid,.contentSplit,.content-split,.copy,.copyBlock,.copy-block,.imagePanel,.image-panel,.mediaText,.media-text) :is(h1,h2,h3,h4,h5,h6,strong,b,label,small,li,figcaption){color:#eef3f6!important}',
        'html[data-theme="dark"] body :is(.heroGrid,.heroCopy,.imageCopy,.image-copy,.mediaCopy,.media-copy,.splitContent,.split-content,.copyBlock,.copy-block,.textBesideImage,.text-beside-image,.aboutGrid,.about-grid,.two,.twoCol,.two-column,.imageText,.image-text,.textImage,.text-image,.imageTextGrid,.image-text-grid,.storyGrid,.story-grid,.split,.splitGrid,.split-grid,.contentSplit,.content-split,.copy,.copyBlock,.copy-block,.imagePanel,.image-panel,.mediaText,.media-text) :is(p,ul,ol,blockquote){color:#c1cbd3!important}',
        'html[data-theme="light"] body .cta .btn,html[data-theme="light"] body .cta a.btn{background:#d71920!important;color:#fff!important;border-color:#d71920!important}html[data-theme="dark"] body .cta .btn,html[data-theme="dark"] body .cta a.btn{background:#d71920!important;color:#fff!important;border-color:#ff777d!important}',
        'html[data-theme="light"] body :is(.cta,.callout) :is(h1,h2,h3,p){color:#17212b!important}html[data-theme="dark"] body :is(.cta,.callout) :is(h1,h2,h3,p){color:#eef3f6!important}',
        'html[data-theme="light"] body :is(input,select,textarea,option){background-color:#fff!important;color:#17212b!important;border-color:#cbd5df!important}html[data-theme="dark"] body :is(input,select,textarea,option){background-color:#171d24!important;color:#eef3f6!important;border-color:#46535e!important}',
        'html[data-theme="light"] body input::placeholder,html[data-theme="light"] body textarea::placeholder{color:#687586!important}html[data-theme="dark"] body input::placeholder,html[data-theme="dark"] body textarea::placeholder{color:#a9b6c1!important}',
        '/* Landing-page contrast fix: preserve Enter VTG visibility after using semantic links. */',
        'html[data-theme="light"] body .nav a#joinBtn.headerEnterBtn,html[data-theme="light"] body .nav a#joinBtn.headerEnterBtn:visited,html[data-theme="light"] body .hero a#heroJoin,html[data-theme="light"] body .hero a#heroJoin:visited{background:#a92722!important;background-image:none!important;color:#fff!important;-webkit-text-fill-color:#fff!important;border:2px solid #a92722!important;opacity:1!important;visibility:visible!important;text-decoration:none!important}',
        'html[data-theme="light"] body .nav a#joinBtn.headerEnterBtn *,html[data-theme="light"] body .hero a#heroJoin *{color:#fff!important;-webkit-text-fill-color:#fff!important;stroke:#fff!important;opacity:1!important;visibility:visible!important}',
        'html[data-theme="dark"] body .nav a#joinBtn.headerEnterBtn,html[data-theme="dark"] body .nav a#joinBtn.headerEnterBtn:visited,html[data-theme="dark"] body .hero a#heroJoin,html[data-theme="dark"] body .hero a#heroJoin:visited{background:#a92722!important;background-image:none!important;color:#fff!important;-webkit-text-fill-color:#fff!important;border:2px solid #ff8178!important;opacity:1!important;visibility:visible!important;text-decoration:none!important}',
        'html[data-theme="dark"] body .nav a#joinBtn.headerEnterBtn *,html[data-theme="dark"] body .hero a#heroJoin *{color:#fff!important;-webkit-text-fill-color:#fff!important;stroke:#fff!important;opacity:1!important;visibility:visible!important}',
        'html[data-theme="dark"] body .heroIn>div>p{color:#f0f4f7!important;text-shadow:0 1px 3px rgba(0,0,0,.35)!important}',
        'html[data-theme="light"] body .heroIn>div>p{color:#f7fafc!important;-webkit-text-fill-color:#f7fafc!important;text-shadow:0 1px 3px rgba(0,0,0,.65)!important;opacity:1!important;visibility:visible!important}',
        '/* Landing page: explicit contrast for the four reported visibility issues. */',
        'html[data-theme="light"] body header.nav #atlasHeaderBtn,html[data-theme="light"] body header.nav #atlasHeaderBtn span,html[data-theme="light"] body header.nav #atlasHeaderBtn .lucide{color:#fff!important;-webkit-text-fill-color:#fff!important;stroke:currentColor!important;opacity:1!important;visibility:visible!important}',
        'html[data-theme="light"] body header.nav #atlasHeaderBtn{background:#171d24!important;border-color:#46535e!important}',
        'html[data-theme="light"] body .hero .heroActions a#heroJoin,html[data-theme="light"] body .hero .heroActions a#heroJoin:visited,html[data-theme="light"] body .hero .heroActions a#heroJoin *{background-color:#a92722!important;background-image:none!important;color:#fff!important;-webkit-text-fill-color:#fff!important;stroke:#fff!important;border-color:#a92722!important;opacity:1!important;visibility:visible!important;text-decoration:none!important}',
        'html[data-theme="light"] body #vtgAtlasPreview h2,html[data-theme="light"] body #vtgAtlasPreview .kicker{color:#fff!important;-webkit-text-fill-color:#fff!important;opacity:1!important;visibility:visible!important;text-shadow:0 1px 4px rgba(0,0,0,.45)!important}',
        'html[data-theme="light"] body #vtgAtlasPreview p{color:#e4edf2!important;-webkit-text-fill-color:#e4edf2!important;opacity:1!important;visibility:visible!important;text-shadow:0 1px 3px rgba(0,0,0,.55)!important}',
        'html[data-theme="dark"] body #vtgAtlasPreview h2,html[data-theme="dark"] body #vtgAtlasPreview .kicker{color:#fff!important;-webkit-text-fill-color:#fff!important;opacity:1!important;visibility:visible!important}',
        'html[data-theme="dark"] body #vtgAtlasPreview p{color:#dce6ec!important;-webkit-text-fill-color:#dce6ec!important;opacity:1!important;visibility:visible!important}',
        'html[data-theme="dark"] body .hero .heroIn > div:first-child > p{color:#f3f6f8!important;-webkit-text-fill-color:#f3f6f8!important;opacity:1!important;visibility:visible!important;text-shadow:0 1px 4px rgba(0,0,0,.7)!important}',
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
    if (!isWorkspaceDashboardPage() && !vtgPublicShellPage) return;
    if (document.getElementById('vtgThemePreference')) return;
    var wrap = document.createElement('div');
    wrap.id = 'vtgThemeControl';
    wrap.innerHTML = '<label for="vtgThemePreference">Appearance</label><select id="vtgThemePreference" aria-label="Choose site appearance"><option value="light">Light mode</option><option value="dark">Dark mode</option><option value="auto">Automatic (local time)</option></select>';
    var style = document.createElement('style');
    style.id = 'vtg-theme-control-style';
    style.textContent = [
      '#vtgThemeControl{position:static;z-index:auto;display:flex;align-items:center;gap:8px;padding:0;margin:0 0 0 auto;border:0;border-radius:0;background:transparent;color:#263746;box-shadow:none;font:600 12px/1.2 Manrope,Arial,sans-serif;backdrop-filter:none;white-space:nowrap}',
      '#vtgThemeControl label{margin:0;color:#526273!important;font:700 11px/1.2 Manrope,Arial,sans-serif}',
      '#vtgThemeControl select{max-width:130px;min-height:32px;padding:5px 24px 5px 8px;border:1px solid #cbd5df;border-radius:8px;background:#fff;color:#17212b;font:700 11px/1.2 Manrope,Arial,sans-serif;cursor:pointer}',
      '#vtgThemeControl select:focus-visible{outline:2px solid #c0392b;outline-offset:2px}',
      'html[data-theme="dark"] #vtgThemeControl{background:transparent;border-color:transparent;color:#eef3f6}',
      'html[data-theme="dark"] #vtgThemeControl label{color:#c1cbd3!important}',
      'html[data-theme="dark"] #vtgThemeControl select{background:#151b22;color:#eef3f6;border-color:#46535e}',
      '@media(max-width:800px){#vtgThemeControl{margin:4px 0 0;white-space:normal}footer#vtgFooter .vtgFooterBottom.copyright{flex-wrap:wrap!important}}@media(max-width:480px){#vtgThemeControl{padding:0;gap:6px}#vtgThemeControl label{font-size:10px}#vtgThemeControl select{min-height:30px;font-size:10px;max-width:145px}}',
      '@media(prefers-reduced-motion:reduce){#vtgThemeControl *{transition:none!important}}'
    ].join('\n');
    document.head.appendChild(style);
    var footerHost = document.querySelector('#vtgFooter .vtgFooterBottom');
    if (footerHost) footerHost.appendChild(wrap);
    else document.body.appendChild(wrap);
    var select = wrap.querySelector('select');
    try { select.value = window.localStorage.getItem('vtg-theme-preference') || 'auto'; }
    catch (error) { select.value = 'auto'; }
    select.addEventListener('change', function () {
      if (window.vtgSetThemePreference) window.vtgSetThemePreference(select.value);
    });
    document.addEventListener('vtg:themechange', function (event) {
      wrap.setAttribute('data-current-theme', event.detail.theme);
    });
  }
  function ensureThemePresets() {
    if (!isWorkspaceDashboardPage() && !vtgPublicShellPage) return;
    var path = (window.location.pathname || '').toLowerCase();
    // Buyer and supplier dashboards retain their own workspace appearance controls.
    if (path.endsWith('/buyer-dashboard.html') || path.endsWith('/buyer-dashboard-preview.html') || path.endsWith('/supplier-dashboard.html')) return;
    if (document.getElementById('vtgThemePresetControl')) return;

    // The three visitor presets selected on the landing page follow every non-excluded page.
    // Only buyer and supplier dashboards keep their independent workspace appearance.
    var isWorkspace = false;
    var key = 'vtg-visitor-theme-preset';
    var presets = [
      ['trade-classic','Trade Classic','VTG red, clean and familiar'],
      ['ocean-route','Ocean Route','Ocean blue and teal'],
      ['graphite-port','Graphite Port','Quiet graphite and steel']
    ];

    var root = document.documentElement;
    var style = document.createElement('style');
    style.id = 'vtg-theme-presets-style';
    style.textContent = [
      'html[data-vtg-skin="trade-classic"]{--vtg-skin-accent:#a5232b;--vtg-skin-strong:#851d24;--vtg-skin-soft:#fff0ef;--vtg-skin-link:#a5232b;--vtg-skin-dark:#ff8e86}',
      'html[data-vtg-skin="ocean-route"]{--vtg-skin-accent:#087f9f;--vtg-skin-strong:#075d79;--vtg-skin-soft:#e5f7fb;--vtg-skin-link:#087f9f;--vtg-skin-dark:#64d8f0}',
      'html[data-vtg-skin="graphite-port"]{--vtg-skin-accent:#526777;--vtg-skin-strong:#354956;--vtg-skin-soft:#edf2f5;--vtg-skin-link:#405d70;--vtg-skin-dark:#a8c3d3}',
      'html[data-vtg-skin="executive"]{--vtg-skin-accent:#a5232b;--vtg-skin-strong:#851d24;--vtg-skin-soft:#fff0ef;--vtg-skin-link:#a5232b;--vtg-skin-dark:#ff8e86}',
      'html[data-vtg-skin="ocean-finance"]{--vtg-skin-accent:#087f9f;--vtg-skin-strong:#075d79;--vtg-skin-soft:#e5f7fb;--vtg-skin-link:#087f9f;--vtg-skin-dark:#64d8f0}',
      'html[data-vtg-skin="emerald-trade"]{--vtg-skin-accent:#16734a;--vtg-skin-strong:#105b3a;--vtg-skin-soft:#e8f7ef;--vtg-skin-link:#16734a;--vtg-skin-dark:#79d7ac}',
      'html[data-vtg-skin="copper-ledger"]{--vtg-skin-accent:#a45b2a;--vtg-skin-strong:#7c421d;--vtg-skin-soft:#fbefe5;--vtg-skin-link:#995123;--vtg-skin-dark:#f0b27d}',
      'html[data-vtg-skin="indigo-intel"]{--vtg-skin-accent:#5753b8;--vtg-skin-strong:#3e3a91;--vtg-skin-soft:#efeeff;--vtg-skin-link:#5753b8;--vtg-skin-dark:#aaa7ff}',
      'html[data-vtg-skin="crimson-ops"]{--vtg-skin-accent:#c52c37;--vtg-skin-strong:#941e29;--vtg-skin-soft:#fff0f1;--vtg-skin-link:#b4232b;--vtg-skin-dark:#ff9aa1}',
      'html[data-vtg-skin="mono-pro"]{--vtg-skin-accent:#48525b;--vtg-skin-strong:#29323a;--vtg-skin-soft:#eef1f3;--vtg-skin-link:#394956;--vtg-skin-dark:#c0cbd3}',
      'html[data-vtg-skin="sandstone"]{--vtg-skin-accent:#8b6b43;--vtg-skin-strong:#6b4f2e;--vtg-skin-soft:#f7f0e5;--vtg-skin-link:#79582f;--vtg-skin-dark:#e2c49a}',
      'html[data-vtg-skin="arctic-blue"]{--vtg-skin-accent:#2f6fb1;--vtg-skin-strong:#204e83;--vtg-skin-soft:#eaf3ff;--vtg-skin-link:#2f6fb1;--vtg-skin-dark:#9dcaff}',
      'html[data-vtg-skin="midnight-harbor"]{--vtg-skin-accent:#4f8da8;--vtg-skin-strong:#2f6279;--vtg-skin-soft:#e7f4f8;--vtg-skin-link:#377d9b;--vtg-skin-dark:#83d5f0}',
      'html[data-vtg-skin] body{accent-color:var(--vtg-skin-accent)}',
      'html[data-theme="light"][data-vtg-skin] body{background-color:#fff!important;color:#17212b!important}',
      'html[data-theme="dark"][data-vtg-skin] body{background-color:#000!important;color:#fff!important}',
      'html[data-vtg-skin] body :is(.nav,.site-nav,.topbar,.page-header,.vtg-page-nav){border-color:var(--vtg-skin-accent)!important}',
      'html[data-vtg-skin] body :is(.nav,.site-nav,.topbar,.page-header,.vtg-page-nav) a:not(.primary):not(.btn-primary):not(.btn):not(.button),html[data-vtg-skin] body #vtgFooter .vtgFooterLinks a,html[data-vtg-skin] body #vtgFooter .vtgFooterBottom a{color:var(--vtg-skin-link)!important}',
      'html[data-vtg-skin] body #vtgFooter{border-top:2px solid var(--vtg-skin-accent)!important}',
      'html[data-vtg-skin] body #vtgFooter .vtgFooterLinks h4{color:var(--vtg-skin-accent)!important}',
      'html[data-vtg-skin] body #vtgFooter [data-navkey][aria-current="page"]{color:var(--vtg-skin-accent)!important;font-weight:800!important}',
      'html[data-vtg-skin] body #vtgFooter [data-navkey][aria-current="page"]:after{background:var(--vtg-skin-accent)!important}',
      'html[data-vtg-skin] body #vtgFooter a:hover,html[data-vtg-skin] body :is(.nav,.site-nav,.topbar,.page-header,.vtg-page-nav) a:hover{color:var(--vtg-skin-accent)!important}',
      'html[data-vtg-skin] body .nav a.headerEnterBtn,html[data-vtg-skin] body .hero a#heroJoin,html[data-vtg-skin] body #vtgPageNavigation .vtg-nav-actions a,html[data-vtg-skin] body #vtgPageNavigation .vtg-nav-actions button{border-color:var(--vtg-skin-accent)!important}',
      'html[data-vtg-skin] body .nav a.headerEnterBtn,html[data-vtg-skin] body .hero a#heroJoin{background:var(--vtg-skin-accent)!important;color:#fff!important}',
      'html[data-vtg-skin] body #vtgPageNavigation .vtg-nav-actions a:hover,html[data-vtg-skin] body #vtgPageNavigation .vtg-nav-actions button:hover{background:var(--vtg-skin-accent)!important;color:#fff!important}',
      'html[data-vtg-skin] body :is(.primary,.btn-primary,.primary-btn,.btn.primary,button.primary,a.primary){background:var(--vtg-skin-accent)!important;border-color:var(--vtg-skin-accent)!important;color:#fff!important}',
      'html[data-vtg-skin] body a:not(.primary):not(.btn-primary):not(.btn):not(#vtgFooter a):not(.vtg-page-nav a):not(.nav a):not(.site-nav a){color:var(--vtg-skin-link)}',
      'html[data-theme="light"][data-vtg-skin] body :is(input,select,textarea){background:#fff!important;color:#17212b!important;border-color:#cbd5df!important}',
      'html[data-theme="dark"][data-vtg-skin] body :is(input,select,textarea){background:#171d24!important;color:#eef3f6!important;border-color:#46535e!important}',
      'html[data-vtg-skin] #vtgThemePresetControl{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 0 12px;padding:0;background:transparent;font:600 11px/1.3 Manrope,Arial,sans-serif}',
      'html[data-vtg-skin] #vtgThemePresetControl label{font-weight:800;color:inherit!important}',
      'html[data-vtg-skin] #vtgThemePresetControl select{max-width:205px;min-height:32px;padding:5px 26px 5px 9px;border:1px solid #cbd5df;border-radius:8px;background:#fff;color:#17212b;font:700 11px/1.3 Manrope,Arial,sans-serif}',
      'html[data-theme="dark"][data-vtg-skin] #vtgThemePresetControl select{background:#171d24;color:#eef3f6;border-color:#46535e}',
      'html[data-vtg-skin] body :is(button,.btn,.button,.action-button,[role="button"],[role="tab"],.tab,.chip,.pill,.badge,.tag,.step-indicator,.progress-bar,.slider-thumb,.checkbox:checked,.radio:checked){accent-color:var(--vtg-skin-accent)!important}',
      'html[data-vtg-skin] body :is(button,.btn,.button,.action-button,[role="button"],[role="tab"],.tab,.chip,.pill,.badge,.tag,.step-indicator,.progress-bar,.slider-thumb):is(.active,.selected,[aria-selected="true"],[aria-pressed="true"],[aria-current="page"]){background-color:var(--vtg-skin-accent)!important;border-color:var(--vtg-skin-accent)!important;color:#fff!important}',
      'html[data-vtg-skin] body :is(input,select,textarea,[contenteditable="true"],input[type="checkbox"],input[type="radio"],progress,meter){accent-color:var(--vtg-skin-accent)!important}',
      'html[data-vtg-skin] body :is(a:hover,button:hover,.btn:hover,.button:hover,[role="button"]:hover){text-decoration-color:var(--vtg-skin-accent)}',
      'html[data-vtg-skin] body :is(.active,.is-active,[aria-current="page"],[aria-selected="true"],[aria-pressed="true"],.selected,.checked){outline-color:var(--vtg-skin-accent)!important;--active-accent:var(--vtg-skin-accent)!important}',
      'html[data-theme="light"][data-vtg-skin] body :is(header,nav,.nav,.site-nav,.site-header,.siteHeader,.topbar,.top-bar,.page-header,.pageHeader,.toolbar,.sidebar,#vtgPageNavigation,main,.main-content,.content-section,.section,.page,.pageMain,.workspace,.workspace-panel,.card,.panel,.surface,.tile,.modal,.modal-content,.dialog,.dialog-content,.dropdown-menu,.popover,.drawer,.sheet,.form-card,.formCard,.stat-card,.feature-card,.info-card,.content-card,.application-card,.market-card,.news-card,.chart-card,.widget,.widget-card,.table-wrap,.table-responsive){background-color:#fff!important;color:#17212b!important}',
      'html[data-theme="dark"][data-vtg-skin] body :is(header,nav,.nav,.site-nav,.site-header,.siteHeader,.topbar,.top-bar,.page-header,.pageHeader,.toolbar,.sidebar,#vtgPageNavigation,main,.main-content,.content-section,.section,.page,.pageMain,.workspace,.workspace-panel,.card,.panel,.surface,.tile,.modal,.modal-content,.dialog,.dialog-content,.dropdown-menu,.popover,.drawer,.sheet,.form-card,.formCard,.stat-card,.feature-card,.info-card,.content-card,.application-card,.market-card,.news-card,.chart-card,.widget,.widget-card,.table-wrap,.table-responsive){background-color:#000!important;color:#fff!important;border-color:#303030!important}',
      'html[data-theme="light"][data-vtg-skin] body :is(h1,h2,h3,h4,h5,h6,p,span,small,strong,b,label,li,dt,dd,figcaption,th,td){color:inherit}',
      'html[data-theme="dark"][data-vtg-skin] body :is(h1,h2,h3,h4,h5,h6,p,span,small,strong,b,label,li,dt,dd,figcaption,th,td){color:inherit}',
      'html[data-vtg-skin] body :is(.primary,.btn-primary,.primary-btn,.btn.primary,button.primary,a.primary,[data-action="primary"]){background-color:var(--vtg-skin-accent)!important;border-color:var(--vtg-skin-accent)!important;color:#fff!important}',
      'html[data-vtg-skin] body :is(input,select,textarea,[contenteditable="true"]):focus{border-color:var(--vtg-skin-accent)!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--vtg-skin-accent) 20%,transparent)!important}',
      '#vtgFooter .vtgFooterBottom{flex-wrap:wrap!important;align-items:center!important}',
      '#vtgFooter .vtgFooterBottom>span{flex:1 1 230px}',
      '@media(max-width:800px){html[data-vtg-skin] #vtgThemePresetControl{margin:8px 0 0;flex-basis:100%}}'
    ].join('\n');
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.id = 'vtgThemePresetControl';
    var label = document.createElement('label');
    label.htmlFor = 'vtgThemePreset';
    label.textContent = isWorkspace ? 'Workspace theme' : 'Visitor theme';
    var select = document.createElement('select');
    select.id = 'vtgThemePreset';
    select.setAttribute('aria-label', isWorkspace ? 'Choose one of ten workspace themes' : 'Choose one of three visitor themes');
    presets.forEach(function (item) {
      var option = document.createElement('option');
      option.value = item[0];
      option.textContent = item[1];
      option.title = item[2];
      select.appendChild(option);
    });
    var selected = isWorkspace ? 'executive' : 'trade-classic';
    try { selected = window.localStorage.getItem(key) || selected; } catch (error) {}
    if (!presets.some(function (item) { return item[0] === selected; })) selected = isWorkspace ? 'executive' : 'trade-classic';
    select.value = selected;
    root.setAttribute('data-vtg-skin', selected);
    select.addEventListener('change', function () {
      root.setAttribute('data-vtg-skin', select.value);
      try { window.localStorage.setItem(key, select.value); } catch (error) {}
      document.dispatchEvent(new CustomEvent('vtg:skinchange', { detail: { skin: select.value, audience: isWorkspace ? 'workspace' : 'visitor' } }));
    });
    wrap.appendChild(label);
    wrap.appendChild(select);
    var host = document.querySelector('#vtgFooter .vtgFooterBottom') || document.querySelector('#vtgThemeControl') || document.body;
    host.appendChild(wrap);
  }

  function ensureTypographyStylesheet() {
    if (document.querySelector('link[data-vtg-typography]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/vtg-typography.css?v=20261020-2';
    link.setAttribute('data-vtg-typography', '1');
    document.head.appendChild(link);
  }

  function ensureInterfaceStylesheet() {
    var path = (window.location.pathname || '').toLowerCase();
    // Apply the shared interface system to all site pages except buyer/supplier dashboards.
    if (path.endsWith('/buyer-dashboard.html') || path.endsWith('/buyer-dashboard-preview.html') || path.endsWith('/supplier-dashboard.html')) return;
    if (document.querySelector('link[data-vtg-interface-system]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/vtg-interface-system.css?v=20261016-2';
    link.setAttribute('data-vtg-interface-system', '1');
    document.head.appendChild(link);
  }

  function enforceLandingShellLayout() {
    /* The landing page is the visual source of truth for every public-page shell. */
    if (!document.getElementById('vtg-landing-shell-parity')) {
      var parity = document.createElement('style');
      parity.id = 'vtg-landing-shell-parity';
      parity.textContent = [
        'body.vtg-public-shell-page #vtgPageNavigation.vtg-public-header{display:block!important;position:sticky!important;top:0!important;z-index:100!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;background:rgba(13,17,23,.94)!important;background-color:rgba(13,17,23,.94)!important;backdrop-filter:blur(18px)!important;border:0!important;border-bottom:1px solid rgba(255,255,255,.09)!important;border-radius:0!important;box-shadow:0 8px 30px rgba(0,0,0,.14)!important;font-family:Manrope,sans-serif!important}',
        'body.vtg-public-shell-page #vtgPageNavigation.vtg-public-header *{box-sizing:border-box}',
        'body.vtg-public-shell-page #vtgPageNavigation.vtg-public-header .navin{display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:space-between!important;gap:24px!important;width:100%!important;max-width:1320px!important;min-height:68px!important;margin:0 auto!important;padding:11px 24px!important}',
        'body.vtg-public-shell-page #vtgPageNavigation.vtg-public-header .brand{display:flex!important;align-items:center!important;justify-content:flex-start!important;flex:0 1 auto!important;min-width:0!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important}',
        'body.vtg-public-shell-page #vtgPageNavigation.vtg-public-header .brand img{display:block!important;width:auto!important;max-width:100%!important;max-height:42px!important;height:auto!important;object-fit:contain!important}',
        'body.vtg-public-shell-page #vtgPageNavigation.vtg-public-header .navtools{display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-end!important;gap:9px!important;flex:0 0 auto!important;width:auto!important;margin-left:auto!important;padding:0!important}',
        'body.vtg-public-shell-page #vtgPageNavigation.vtg-public-header .vtg-language-wrap{display:flex!important;flex-direction:row!important;align-items:center!important;gap:6px!important;margin:0!important;color:#eef3f6!important;font:700 10px/1.2 Manrope,sans-serif!important;white-space:nowrap!important}',
        'body.vtg-public-shell-page #vtgPageNavigation.vtg-public-header .vtg-language-wrap span{display:inline!important}',
        'body.vtg-public-shell-page #vtgPageNavigation.vtg-public-header .vtg-language-wrap select{width:auto!important;max-width:120px!important;height:38px!important;margin:0!important;padding:0 8px!important;border:1px solid rgba(255,255,255,.18)!important;border-radius:10px!important;background:#171d24!important;color:#eef3f6!important;font:700 11px Manrope,sans-serif!important}',
        'body.vtg-public-shell-page #vtgPageNavigation.vtg-public-header .headerFeatureBtn,body.vtg-public-shell-page #vtgPageNavigation.vtg-public-header .headerEnterBtn{display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:center!important;gap:8px!important;width:auto!important;min-width:0!important;height:42px!important;margin:0!important;padding:0 14px!important;border-radius:12px!important;font:800 10px/1.2 Manrope,sans-serif!important;text-decoration:none!important;white-space:nowrap!important}',
        'body.vtg-public-shell-page #vtgPageNavigation.vtg-public-header .headerFeatureBtn{border:1px solid rgba(255,255,255,.14)!important;background:rgba(255,255,255,.045)!important;color:#eef3f6!important}',
        'body.vtg-public-shell-page #vtgPageNavigation.vtg-public-header .headerEnterBtn{padding:0 17px!important;border:0!important;background:#c0392b!important;color:#fff!important;box-shadow:0 8px 22px rgba(192,57,43,.22)!important}',
        'body.vtg-public-shell-page #vtgPageNavigation.vtg-public-header .headerEnterBtn *{color:#fff!important;stroke:#fff!important}',
        'body.vtg-public-shell-page footer#vtgFooter.vtgCompactFooter{display:block!important;float:none!important;clear:both!important;position:relative!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;overflow:visible!important;background:#240b09!important;background-color:#240b09!important;color:#c9b4b1!important;border:0!important;border-top:1px solid rgba(255,255,255,.08)!important;border-radius:0!important;box-shadow:none!important;font-family:Manrope,sans-serif!important;text-align:left!important}',
        'body.vtg-public-shell-page footer#vtgFooter.vtgCompactFooter .footerIn.vtgFooterTop{display:grid!important;grid-template-columns:minmax(220px,.9fr) minmax(0,2fr)!important;align-items:start!important;gap:42px!important;width:100%!important;max-width:1260px!important;margin:0 auto!important;padding:42px 22px!important}',
        'body.vtg-public-shell-page footer#vtgFooter.vtgCompactFooter .vtgFooterBrand{display:block!important;grid-column:auto!important;min-width:0!important;margin:0!important;padding:0!important}',
        'body.vtg-public-shell-page footer#vtgFooter.vtgCompactFooter .vtgFooterBrand img{display:block!important;width:auto!important;max-width:150px!important;max-height:38px!important;height:auto!important;margin:0 0 13px!important;object-fit:contain!important}',
        'body.vtg-public-shell-page footer#vtgFooter.vtgCompactFooter .vtgFooterBrand p{display:block!important;max-width:290px!important;margin:0 0 18px!important;color:#98a2b3!important;font:400 12px/1.55 Manrope,sans-serif!important}',
        'body.vtg-public-shell-page footer#vtgFooter.vtgCompactFooter .vtgFooterLinks{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;align-items:start!important;gap:24px!important;width:100%!important;min-width:0!important;margin:0!important;padding:0!important}',
        'body.vtg-public-shell-page footer#vtgFooter.vtgCompactFooter .vtgFooterLinks>div{display:block!important;min-width:0!important;margin:0!important;padding:0!important}',
        'body.vtg-public-shell-page footer#vtgFooter.vtgCompactFooter .vtgFooterLinks h4{display:block!important;margin:0 0 10px!important;padding:0!important;color:#fff!important;font:800 12px/1.4 Manrope,sans-serif!important;letter-spacing:normal!important;text-transform:none!important}',
        'body.vtg-public-shell-page footer#vtgFooter.vtgCompactFooter .vtgFooterLinks a{display:block!important;width:fit-content!important;max-width:100%!important;margin:4px 0!important;padding:0!important;border:0!important;background:transparent!important;color:#98a2b3!important;font:400 12px/1.55 Manrope,sans-serif!important;text-decoration:none!important;white-space:normal!important}',
        'body.vtg-public-shell-page footer#vtgFooter.vtgCompactFooter .vtgFooterBottom.copyright{display:flex!important;flex-direction:row!important;justify-content:space-between!important;align-items:center!important;flex-wrap:wrap!important;gap:18px!important;width:100%!important;max-width:1260px!important;margin:0 auto!important;padding:14px 22px!important;border-top:1px solid rgba(255,255,255,.08)!important;background:transparent!important;color:#98a2b3!important;font:400 11px/1.5 Manrope,sans-serif!important;text-align:left!important}',
        'body.vtg-public-shell-page footer#vtgFooter.vtgCompactFooter .vtgFooterBottom>span{display:block!important;flex:1 1 300px!important;margin:0!important;padding:0!important;color:#98a2b3!important;font:400 11px/1.5 Manrope,sans-serif!important}',
        'body.vtg-public-shell-page footer#vtgFooter.vtgCompactFooter .vtgFooterBottom>div{display:flex!important;flex-direction:row!important;justify-content:flex-end!important;align-items:center!important;flex-wrap:wrap!important;gap:16px!important;margin:0!important;padding:0!important}',
        'body.vtg-public-shell-page footer#vtgFooter.vtgCompactFooter .vtgFooterBottom a{display:inline-block!important;margin:0!important;padding:1px 0!important;color:#98a2b3!important;font:400 11px/1.5 Manrope,sans-serif!important;text-decoration:none!important}',
        '@media(max-width:900px){body.vtg-public-shell-page #vtgPageNavigation.vtg-public-header .navin{gap:10px!important;padding:10px 14px!important}body.vtg-public-shell-page #vtgPageNavigation.vtg-public-header .brand img{max-height:38px!important}body.vtg-public-shell-page #vtgPageNavigation.vtg-public-header .navtools{gap:6px!important}body.vtg-public-shell-page #vtgPageNavigation.vtg-public-header .headerFeatureBtn,body.vtg-public-shell-page #vtgPageNavigation.vtg-public-header .headerEnterBtn{height:38px!important;padding:0 10px!important;font-size:9px!important}body.vtg-public-shell-page footer#vtgFooter.vtgCompactFooter .footerIn.vtgFooterTop{grid-template-columns:1fr 1fr!important;gap:22px!important;padding:30px 16px!important}body.vtg-public-shell-page footer#vtgFooter.vtgCompactFooter .vtgFooterBrand{grid-column:1/-1!important}body.vtg-public-shell-page footer#vtgFooter.vtgCompactFooter .vtgFooterLinks{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:20px 15px!important}body.vtg-public-shell-page footer#vtgFooter.vtgCompactFooter .vtgFooterBottom.copyright{padding:14px 16px!important}}',
        '@media(max-width:560px){body.vtg-public-shell-page #vtgPageNavigation.vtg-public-header .vtg-language-wrap span{display:none!important}body.vtg-public-shell-page #vtgPageNavigation.vtg-public-header .vtg-language-wrap select{max-width:82px!important;padding:0 5px!important;font-size:10px!important}body.vtg-public-shell-page #vtgPageNavigation.vtg-public-header .headerFeatureBtn{width:40px!important;padding:0!important}body.vtg-public-shell-page #vtgPageNavigation.vtg-public-header .headerFeatureBtn span{display:none!important}body.vtg-public-shell-page #vtgPageNavigation.vtg-public-header .headerEnterBtn{width:auto!important;min-width:92px!important;padding:0 10px!important;justify-content:center!important;gap:6px!important}body.vtg-public-shell-page #vtgPageNavigation.vtg-public-header .headerEnterBtn span{display:inline!important}body.vtg-public-shell-page footer#vtgFooter.vtgCompactFooter .footerIn.vtgFooterTop{grid-template-columns:1fr!important;gap:22px!important;padding:30px 16px 22px!important}body.vtg-public-shell-page footer#vtgFooter.vtgCompactFooter .vtgFooterBrand{grid-column:auto!important}body.vtg-public-shell-page footer#vtgFooter.vtgCompactFooter .vtgFooterLinks{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:20px 14px!important}body.vtg-public-shell-page footer#vtgFooter.vtgCompactFooter .vtgFooterBottom.copyright{flex-direction:column!important;align-items:flex-start!important;gap:8px!important}body.vtg-public-shell-page footer#vtgFooter.vtgCompactFooter .vtgFooterBottom>div{justify-content:flex-start!important;gap:12px!important}}'
      ].join('\n');
      document.head.appendChild(parity);
    }
  }

  function enforceShellTextContrast() {
    if (document.getElementById('vtg-shell-text-contrast-fix')) return;
    var style = document.createElement('style');
    style.id = 'vtg-shell-text-contrast-fix';
    style.textContent = [
      /* Keep shared public header readable against the selected theme. */
      'html[data-theme="light"] body #vtgPageNavigation.vtg-public-header{background:#fff!important;background-color:#fff!important;color:#17212b!important;border-color:#dedede!important}',
      'html[data-theme="light"] body #vtgPageNavigation.vtg-public-header :is(a,button,span,strong,small,label){color:#17212b!important;-webkit-text-fill-color:#17212b!important;opacity:1!important;visibility:visible!important}',
      'html[data-theme="light"] body #vtgPageNavigation.vtg-public-header :is(.headerEnterBtn,.headerFeatureBtn){background:#a5232b!important;color:#fff!important;-webkit-text-fill-color:#fff!important;border-color:#a5232b!important}',
      'html[data-theme="light"] body #vtgPageNavigation.vtg-public-header :is(.headerEnterBtn,.headerFeatureBtn) :is(span,svg,i){color:#fff!important;-webkit-text-fill-color:#fff!important;stroke:#fff!important}',
      'html[data-theme="dark"] body #vtgPageNavigation.vtg-public-header{background:#000!important;background-color:#000!important;color:#fff!important;border-color:#303030!important}',
      'html[data-theme="dark"] body #vtgPageNavigation.vtg-public-header :is(a,button,span,strong,small,label){color:#fff!important;-webkit-text-fill-color:#fff!important;opacity:1!important;visibility:visible!important}',
      'html[data-theme="dark"] body #vtgPageNavigation.vtg-public-header :is(.headerEnterBtn,.headerFeatureBtn){background:#a5232b!important;color:#fff!important;-webkit-text-fill-color:#fff!important;border-color:#a5232b!important}',
      /* Light mode uses a light footer surface and dark text; this overrides legacy footer rules. */
      'html[data-theme="light"] body footer#vtgFooter.vtgCompactFooter{background:#f3f5f7!important;background-color:#f3f5f7!important;color:#17212b!important;border-color:#d7dee5!important}',
      'html[data-theme="light"] body footer#vtgFooter.vtgCompactFooter :is(.vtgFooterBrand p,.vtgFooterLinks h4,.vtgFooterLinks a,.vtgFooterBottom,.vtgFooterBottom>span,.vtgFooterBottom a){color:#263746!important;-webkit-text-fill-color:#263746!important;opacity:1!important;visibility:visible!important;text-shadow:none!important}',
      'html[data-theme="light"] body footer#vtgFooter.vtgCompactFooter .vtgFooterLinks h4{color:#17212b!important;-webkit-text-fill-color:#17212b!important;font-weight:800!important}',
      'html[data-theme="light"] body footer#vtgFooter.vtgCompactFooter .vtgFooterLinks a:hover,html[data-theme="light"] body footer#vtgFooter.vtgCompactFooter .vtgFooterBottom a:hover{color:#8f1d27!important;-webkit-text-fill-color:#8f1d27!important}',
      'html[data-theme="light"] body footer#vtgFooter.vtgCompactFooter .vtgFooterBottom{border-color:#d7dee5!important}',
      /* Dark mode remains dark with high-contrast text. */
      'html[data-theme="dark"] body footer#vtgFooter.vtgCompactFooter{background:#080b0f!important;background-color:#080b0f!important;color:#eef3f6!important;border-color:#303030!important}',
      'html[data-theme="dark"] body footer#vtgFooter.vtgCompactFooter :is(.vtgFooterBrand p,.vtgFooterLinks a,.vtgFooterBottom,.vtgFooterBottom>span,.vtgFooterBottom a){color:#d5dde4!important;-webkit-text-fill-color:#d5dde4!important;opacity:1!important;visibility:visible!important}',
      'html[data-theme="dark"] body footer#vtgFooter.vtgCompactFooter .vtgFooterLinks h4{color:#fff!important;-webkit-text-fill-color:#fff!important}',
      /* Dashboard utility footer gets explicit colours in both modes. */
      'html[data-theme="light"] body #vtg-shared-footer{background:#fff!important;color:#17212b!important;border-color:#cbd5df!important}',
      'html[data-theme="light"] body #vtg-shared-footer :is(a,span,button,select){color:#17212b!important;-webkit-text-fill-color:#17212b!important;opacity:1!important;visibility:visible!important}',
      'html[data-theme="dark"] body #vtg-shared-footer{background:#10161d!important;color:#f3f6f8!important;border-color:#303944!important}',
      'html[data-theme="dark"] body #vtg-shared-footer :is(a,span,button,select){color:#f3f6f8!important;-webkit-text-fill-color:#f3f6f8!important;opacity:1!important;visibility:visible!important}',
      'html[data-theme="light"] body #vtg-shared-footer a[aria-current="page"],html[data-theme="light"] body #vtg-shared-footer span[aria-current="page"]{background:#fbe9e8!important;color:#851d24!important;-webkit-text-fill-color:#851d24!important}',
      'html[data-theme="dark"] body #vtg-shared-footer a[aria-current="page"],html[data-theme="dark"] body #vtg-shared-footer span[aria-current="page"]{background:#3a1d20!important;color:#ffd8d5!important;-webkit-text-fill-color:#ffd8d5!important}'
    ].join('\\n');
    document.head.appendChild(style);
  }

  function enforceFinalShellThemeAndSelection() {
    /* Final pass intentionally comes after landing-shell parity CSS so page-specific legacy rules cannot hide shared navigation in light mode. */
    if (!document.getElementById('vtg-final-shell-theme-selection')) {
      var style = document.createElement('style');
      style.id = 'vtg-final-shell-theme-selection';
      style.textContent = [
        'html[data-theme="light"] body #vtgPageNavigation,html[data-theme="light"] body #vtgPageNavigation.vtg-public-header,html[data-theme="light"] body #vtgPageNavigation.vtg-page-nav{background:#fff!important;background-color:#fff!important;color:#17212b!important;border-color:#d7dee5!important;box-shadow:0 4px 18px rgba(18,32,48,.08)!important}',
        'html[data-theme="light"] body #vtgPageNavigation :is(a,button,label,span,strong,small){color:#17212b!important;-webkit-text-fill-color:#17212b!important;opacity:1!important;visibility:visible!important;text-shadow:none!important}',
        'html[data-theme="light"] body #vtgPageNavigation :is(.headerEnterBtn,.headerFeatureBtn){background:#a5232b!important;border-color:#a5232b!important;color:#fff!important;-webkit-text-fill-color:#fff!important}',
        'html[data-theme="light"] body #vtgPageNavigation :is(.headerEnterBtn,.headerFeatureBtn) :is(span,svg,i){color:#fff!important;-webkit-text-fill-color:#fff!important;stroke:#fff!important}',
        'html[data-theme="light"] body #vtgPageNavigation select{background:#fff!important;color:#17212b!important;border-color:#cbd5df!important}',
        'html[data-theme="dark"] body #vtgPageNavigation,html[data-theme="dark"] body #vtgPageNavigation.vtg-public-header,html[data-theme="dark"] body #vtgPageNavigation.vtg-page-nav{background:#0b1016!important;background-color:#0b1016!important;color:#f3f6f8!important;border-color:#303944!important}',
        'html[data-theme="dark"] body #vtgPageNavigation :is(a,button,label,span,strong,small){color:#f3f6f8!important;-webkit-text-fill-color:#f3f6f8!important;opacity:1!important;visibility:visible!important}',
        'html[data-theme="dark"] body #vtgPageNavigation :is(.headerEnterBtn,.headerFeatureBtn){background:#a5232b!important;border-color:#a5232b!important;color:#fff!important;-webkit-text-fill-color:#fff!important}',
        'html[data-theme="dark"] body #vtgPageNavigation :is(.headerEnterBtn,.headerFeatureBtn) :is(span,svg,i){color:#fff!important;-webkit-text-fill-color:#fff!important;stroke:#fff!important}',
        'html[data-theme="dark"] body #vtgPageNavigation select{background:#171d24!important;color:#f3f6f8!important;border-color:#46535e!important}',
        'html[data-theme="light"] body footer#vtgFooter.vtgCompactFooter{background:#f3f5f7!important;background-color:#f3f5f7!important;color:#263746!important;border-color:#d7dee5!important}',
        'html[data-theme="light"] body footer#vtgFooter.vtgCompactFooter .vtgFooterTop,html[data-theme="light"] body footer#vtgFooter.vtgCompactFooter .vtgFooterBottom{background:transparent!important;color:#263746!important;border-color:#d7dee5!important}',
        'html[data-theme="light"] body footer#vtgFooter.vtgCompactFooter :is(.vtgFooterBrand p,.vtgFooterLinks h4,.vtgFooterLinks a,.vtgFooterBottom,.vtgFooterBottom>span,.vtgFooterBottom a,#vtgThemeControl label,#vtgThemePresetControl label){color:#344454!important;-webkit-text-fill-color:#344454!important;opacity:1!important;visibility:visible!important;text-shadow:none!important}',
        'html[data-theme="light"] body footer#vtgFooter.vtgCompactFooter .vtgFooterLinks h4{color:#17212b!important;-webkit-text-fill-color:#17212b!important;font-weight:800!important}',
        'html[data-theme="dark"] body footer#vtgFooter.vtgCompactFooter{background:#080b0f!important;background-color:#080b0f!important;color:#d5dde4!important;border-color:#303944!important}',
        'html[data-theme="dark"] body footer#vtgFooter.vtgCompactFooter .vtgFooterTop,html[data-theme="dark"] body footer#vtgFooter.vtgCompactFooter .vtgFooterBottom{background:transparent!important;color:#d5dde4!important;border-color:#303944!important}',
        'html[data-theme="dark"] body footer#vtgFooter.vtgCompactFooter :is(.vtgFooterBrand p,.vtgFooterLinks a,.vtgFooterBottom,.vtgFooterBottom>span,.vtgFooterBottom a,#vtgThemeControl label,#vtgThemePresetControl label){color:#c2ccd5!important;-webkit-text-fill-color:#c2ccd5!important;opacity:1!important;visibility:visible!important}',
        'html[data-theme="dark"] body footer#vtgFooter.vtgCompactFooter .vtgFooterLinks h4{color:#f3f6f8!important;-webkit-text-fill-color:#f3f6f8!important}',
        '#vtgFooter.vtgCompactFooter [data-navkey][aria-current="page"]{display:inline-block!important;position:relative!important;width:fit-content!important;padding:3px 7px!important;margin-left:-7px!important;border-radius:5px!important;font-weight:800!important;text-decoration:none!important}',
        'html[data-theme="light"] body #vtgFooter.vtgCompactFooter [data-navkey][aria-current="page"]{background:#fbe9e8!important;color:var(--vtg-skin-strong,#851d24)!important;-webkit-text-fill-color:var(--vtg-skin-strong,#851d24)!important;box-shadow:inset 3px 0 0 var(--vtg-skin-accent,#a5232b)!important}',
        'html[data-theme="dark"] body #vtgFooter.vtgCompactFooter [data-navkey][aria-current="page"]{background:#32191c!important;color:var(--vtg-skin-dark,#ff8e86)!important;-webkit-text-fill-color:var(--vtg-skin-dark,#ff8e86)!important;box-shadow:inset 3px 0 0 var(--vtg-skin-dark,#ff8e86)!important}',
        '#vtgFooter.vtgCompactFooter [data-navkey][aria-current="page"]:after{content:"SELECTED"!important;display:inline-block!important;position:static!important;height:auto!important;margin-left:7px!important;padding:2px 5px!important;border-radius:4px!important;background:var(--vtg-skin-accent,#a5232b)!important;color:#fff!important;-webkit-text-fill-color:#fff!important;font:800 8px/1.2 Manrope,Arial,sans-serif!important;vertical-align:middle!important;opacity:1!important}',
        'html[data-theme="dark"] body #vtgFooter.vtgCompactFooter [data-navkey][aria-current="page"]:after{background:var(--vtg-skin-dark,#ff8e86)!important;color:#101418!important;-webkit-text-fill-color:#101418!important}',
        'html[data-theme="light"] body #vtgFooter.vtgCompactFooter [data-navkey]:focus-visible,html[data-theme="light"] body #vtgFooter.vtgCompactFooter [data-navkey]:hover{color:var(--vtg-skin-strong,#851d24)!important;-webkit-text-fill-color:var(--vtg-skin-strong,#851d24)!important;text-decoration:underline!important;text-underline-offset:3px!important}',
        'html[data-theme="dark"] body #vtgFooter.vtgCompactFooter [data-navkey]:focus-visible,html[data-theme="dark"] body #vtgFooter.vtgCompactFooter [data-navkey]:hover{color:var(--vtg-skin-dark,#ff8e86)!important;-webkit-text-fill-color:var(--vtg-skin-dark,#ff8e86)!important;text-decoration:underline!important;text-underline-offset:3px!important}',
        'html[data-theme="light"] body #vtg-shared-footer{background:#fff!important;color:#17212b!important;border-color:#cbd5df!important}',
        'html[data-theme="light"] body #vtg-shared-footer :is(a,span,button,select){color:#17212b!important;-webkit-text-fill-color:#17212b!important;opacity:1!important;visibility:visible!important}',
        'html[data-theme="dark"] body #vtg-shared-footer{background:#10161d!important;color:#f3f6f8!important;border-color:#303944!important}',
        'html[data-theme="dark"] body #vtg-shared-footer :is(a,span,button,select){color:#f3f6f8!important;-webkit-text-fill-color:#f3f6f8!important;opacity:1!important;visibility:visible!important}',
        'html[data-theme="light"] body #vtg-shared-footer :is(a,span)[aria-current="page"]{background:#fbe9e8!important;color:#851d24!important;-webkit-text-fill-color:#851d24!important;box-shadow:inset 3px 0 0 #a5232b!important}',
        'html[data-theme="dark"] body #vtg-shared-footer :is(a,span)[aria-current="page"]{background:#3a1d20!important;color:#ffd8d5!important;-webkit-text-fill-color:#ffd8d5!important;box-shadow:inset 3px 0 0 #ff8e86!important}'
      ].join('\n');
      document.head.appendChild(style);
    }
  }

  function init() {
    ensureTypographyStylesheet();
    ensureInterfaceStylesheet();
    applyTimeBasedTheme();
    addStyle();
    renderFooter();
    syncBrandLogos();
    document.addEventListener('vtg:themechange', syncBrandLogos);
    if (!window.__vtgLogoObserver && window.MutationObserver) {
      window.__vtgLogoObserver = new MutationObserver(syncBrandLogos);
      window.__vtgLogoObserver.observe(document.documentElement, {subtree:true, childList:true, attributes:true, attributeFilter:['src','data-theme']});
    }
    ensureThemeControl();
    ensureThemePresets();
    adaptHomeAnchors();
    simplifyPageHeader();
    addPageNavigation();
    enforceShellTextContrast();
    if (vtgPublicShellPage && !isHomePage()) document.body.classList.add('vtg-public-shell-page');
    enforceLandingShellLayout();
    enforceFinalShellThemeAndSelection();
    setActiveFooterLink();
    window.addEventListener('hashchange', setActiveFooterLink);
    window.addEventListener('popstate', setActiveFooterLink);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
