(() => {
  const init = () => {
    const landing = document.getElementById('landing');
    const hero = landing?.querySelector('.hero');
    const market = landing?.querySelector('#market');
    if (!landing || !hero || !market || landing.dataset.vtgApprovedLanding === '1') return;
    landing.dataset.vtgApprovedLanding = '1';

    const style = document.createElement('style');
    style.id = 'vtg-approved-minimal-landing';
    style.textContent = `
      #landing .hero { min-height: 620px; background-image: linear-gradient(90deg,rgba(7,24,39,.48),rgba(7,24,39,.18) 58%,rgba(7,24,39,.04)),url('https://images.pexels.com/photos/20821680/pexels-photo-20821680.jpeg?auto=compress&cs=tinysrgb&w=2200') !important; background-position:center; background-size:cover; }
      #landing .hero:before, #landing .heroMapWrap, #landing .hero .visual, #landing .hero .tradeNetworkVisual, #landing .hero .heroCore, #landing .hero .heroStats, #landing .hero .newsPreview { display:none !important; }
      #landing .heroIn { display:block !important; max-width:1320px; min-height:620px; padding:150px 30px 105px; }
      #landing .heroIn>div:first-child { max-width:760px; }
      #landing .hero h1 { max-width:820px; font-size:clamp(42px,6.2vw,78px); letter-spacing:-.055em; line-height:1.04; }
      #landing .hero p { max-width:620px; font-size:15px; line-height:1.8; color:#f3f6f8; }
      #landing .heroActions { margin-top:28px; }
      #landing .heroActions a { display:inline-flex; align-items:center; gap:8px; padding:13px 18px; background:#702a30; border:1px solid #702a30; color:#fff; }
      #landing .navlinks { display:none !important; }
      #landing .navin { max-width:1320px; padding:12px 24px; }
      #landing .navtools { margin-left:auto; }
      #landing #market { background:#f3f6f8; }
      #landing #market .section { max-width:1320px; margin:auto; padding:78px 24px 82px; }
      #landing #market .sectionHead { display:block; text-align:center; margin:0 auto 20px; }
      #landing #market .sectionHead .eyebrow { justify-content:center; }
      #landing #market .sectionHead h2 { font-size:clamp(30px,4vw,48px); color:#17191b; margin:8px 0; }
      #landing #market .sectionHead p, #landing #market .trust, #landing #market .section>div[style] { display:none !important; }
      #landing #market #vtgProductCarousel { margin-top:22px; }
      #landing .vtgCategoryGroups { display:none !important; }
      .vtgMinimalAbout { background:linear-gradient(180deg,#f7f9fa,#eef2f4); padding:88px 24px; display:grid; grid-template-columns:minmax(0,560px) minmax(0,660px); justify-content:center; gap:64px; align-items:center; border-top:1px solid rgba(112,42,48,.1); border-bottom:1px solid rgba(23,25,27,.08); }
      .vtgMinimalAbout .copy { max-width:560px; }
      .vtgMinimalAbout .kicker,.vtgMinimalAtlas .kicker,.vtgMinimalAICopy .kicker { color:#702a30; font-size:10px; font-weight:800; letter-spacing:.17em; text-transform:uppercase; }
      .vtgMinimalAbout h2,.vtgMinimalAtlas h2,.vtgMinimalAICopy h2 { font-size:clamp(30px,4vw,48px); line-height:1.08; letter-spacing:-.04em; margin:13px 0 16px; }
      .vtgMinimalAbout h2 { color:#17191b; }
      .vtgMinimalAbout p { color:#515b64; font-size:13px; line-height:1.85; }
      .vtgMinimalAbout .tradeNetworkVisual { height:430px; }
      .vtgMinimalAtlas { background:#07131c; color:#fff; }
      .vtgMinimalAtlasInner { max-width:1320px; margin:auto; padding:88px 24px; display:grid; grid-template-columns:1fr 1fr; gap:60px; align-items:center; }
      .vtgMinimalAtlas h2 { color:#fff; }
      .vtgMinimalAtlas p { color:#c6d2dc; font-size:13px; line-height:1.85; max-width:520px; }
      .vtgGlobeFrame { height:410px; border-radius:24px; overflow:hidden; position:relative; background:#02070b; border:1px solid rgba(255,255,255,.1); }
      .vtgGlobeFrame img { width:118%; height:118%; max-width:none; object-fit:cover; position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); }
      .vtgGlobeShade { position:absolute; inset:0; background:radial-gradient(circle at 60% 45%,transparent 0 28%,rgba(2,7,11,.7) 100%); }
      .vtgMinimalAI { background:#f3efe6; color:#17191b; border-block:1px solid rgba(112,42,48,.12); }
      .vtgMinimalAIInner { max-width:1120px; margin:auto; padding:76px 24px; display:grid; grid-template-columns:180px 1fr; gap:46px; align-items:center; }
      .vtgAIOrb { width:160px; height:160px; border:1px solid rgba(112,42,48,.35); border-radius:50%; display:grid; place-items:center; position:relative; background:radial-gradient(circle,#fff,#f3efe6 70%); }
      .vtgAIOrb span { font-size:30px; font-weight:800; color:#702a30; letter-spacing:-.08em; }
      .vtgAIOrb i { position:absolute; inset:13px; border:1px solid rgba(180,154,112,.7); border-radius:50%; }
      .vtgMinimalAICopy h2 { color:#17191b; }
      .vtgMinimalAICopy p { color:#51565a; font-size:13px; line-height:1.8; max-width:590px; margin-bottom:22px; }
      .vtgMinimalCta { max-width:1320px; margin:auto; padding:90px 24px 100px; text-align:center; }
      .vtgMinimalCta h2 { color:#17191b; font-size:clamp(36px,5vw,60px); line-height:1.04; letter-spacing:-.05em; margin:10px 0 16px; }
      .vtgMinimalCta h2 span { color:#702a30; }
      .vtgMinimalCta p { color:#58636b; max-width:650px; margin:0 auto 30px; font-size:13px; line-height:1.8; }
      .vtgCtaActions { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; max-width:980px; margin:auto; text-align:left; }
      .vtgCtaAction { min-height:84px; display:grid; grid-template-columns:42px 1fr 18px; align-items:center; gap:10px; padding:16px; border:1px solid #dce2e6; border-radius:14px; background:#fff; color:#17191b; cursor:pointer; text-align:left; }
      .vtgCtaAction>span { grid-row:1/3; width:42px; height:42px; display:grid; place-items:center; border-radius:12px; background:#f3efe6; color:#702a30; }
      .vtgCtaAction b { font-size:11px; }
      .vtgCtaAction small { grid-column:2; font-size:9px; color:#66717a; }
      .vtgCtaAction>svg:last-child { grid-column:3; grid-row:1/3; width:15px; }
      .vtgCtaAction.primaryCta { background:#17191b; border-color:#17191b; color:#fff; }
      .vtgCtaAction.primaryCta small { color:#c6c1b8; }
      .vtgCtaAction.primaryCta>span { background:rgba(255,255,255,.1); color:#f0a5a4; }
      html[data-theme="dark"] .vtgMinimalAbout { background:#101720; border-color:#293540; }
      html[data-theme="dark"] .vtgMinimalAbout h2,html[data-theme="dark"] .vtgMinimalAbout p { color:#f3f6f8; }
      html[data-theme="dark"] .vtgMinimalAtlas { background:#080e14; }
      html[data-theme="dark"] .vtgMinimalAI { background:#17191b; color:#f3efe6; }
      html[data-theme="dark"] .vtgMinimalAICopy h2 { color:#f3efe6; }
      html[data-theme="dark"] .vtgMinimalAICopy p { color:#c6c1b8; }
      html[data-theme="dark"] .vtgAIOrb { background:#26282a; }
      html[data-theme="dark"] .vtgAIOrb span { color:#f0a5a4; }
      html[data-theme="dark"] .vtgMinimalCta h2 { color:#f3efe6; }
      html[data-theme="dark"] .vtgMinimalCta p { color:#c6c1b8; }
      html[data-theme="dark"] .vtgCtaAction { background:#20262c; border-color:#3a4650; color:#f3efe6; }
      @media(max-width:900px) { .vtgMinimalAbout,.vtgMinimalAtlasInner { grid-template-columns:1fr; gap:34px; padding-top:66px; padding-bottom:66px; } .vtgGlobeFrame,.vtgMinimalAbout .tradeNetworkVisual { height:330px; } .vtgCtaActions { grid-template-columns:1fr; } }
      @media(max-width:700px) { #landing .heroIn { min-height:550px; padding:112px 20px 72px; } #landing .hero h1 { font-size:clamp(38px,10vw,50px); } #landing .hero p { font-size:13px; } .vtgMinimalAIInner { grid-template-columns:1fr; gap:22px; padding:58px 20px; } .vtgAIOrb { width:112px; height:112px; } .vtgAIOrb span { font-size:23px; } .vtgAIOrb i { inset:9px; } .vtgMinimalCta { padding:65px 18px 72px; } }
    `;
    document.head.appendChild(style);

    ['#how','#network','#contact','#intelligence'].forEach(selector => landing.querySelector(selector)?.remove());
    landing.querySelectorAll('.vtgTradeJourney,.vtgValueStrip,.vtgEcosystem,.vtgCategoryGroups').forEach(el => el.remove());
    const heroCopy = hero.querySelector('.heroIn>div:first-child');
    if (heroCopy) {
      const h1 = heroCopy.querySelector('h1');
      if (h1) h1.textContent = 'One intelligent place for trade across borders.';
      heroCopy.querySelector('.heroCore')?.remove();
      heroCopy.querySelector('.heroStats')?.remove();
      heroCopy.querySelector('.visual')?.remove();
    }
    const marketHeading = market.querySelector('.sectionHead h2');
    if (marketHeading) marketHeading.textContent = 'Discover What Moves Business.';
    market.querySelector('.sectionHead p')?.remove();
    market.querySelector('.trust')?.remove();
    market.querySelector('.section>div[style]')?.remove();

    landing.querySelectorAll('.vtgMinimalAbout,.vtgMinimalAtlas,.vtgMinimalAI,.vtgMinimalCta').forEach(el => el.remove());
    const about = document.createElement('section');
    about.className = 'vtgMinimalAbout';
    about.innerHTML = `
      <div class="copy"><span class="kicker">WHAT VTG IS</span><h2>Connected trade ecosystem</h2><p>VTG connects buyers, verified suppliers, financial partners and logistics providers across Africa, China and South Korea — bringing sourcing, verification, finance and movement into one connected trade ecosystem.</p></div>
      <div class="tradeNetworkVisual" aria-label="VTG trade network connecting Africa, China and South Korea"><div class="networkGlow"></div><div class="networkFlowHint">Technology-powered global trade network</div><div class="networkOrbit one"></div><div class="networkOrbit two"></div><div class="networkOrbitLabel inner">Source • Verify • Finance</div><div class="networkOrbitLabel outer">Ship • Customs • Deliver • Track</div><div class="networkNode nodeAfrica"><strong>Africa</strong><small>Buyer markets</small></div><div class="networkNode nodeChina"><strong>China</strong><small>Supplier network</small></div><div class="networkNode nodeKorea"><strong>South Korea</strong><small>Trade & technology</small></div><div class="networkCenter"><strong>VTG</strong><span>Trade Network</span></div><div class="networkRouteBadge"><span>Connected corridor</span><b>Africa ↔ Asia</b></div></div>
    `;
    market.insertAdjacentElement('afterend', about);

    const atlas = document.createElement('section');
    atlas.className = 'vtgMinimalAtlas';
    atlas.innerHTML = `<div class="vtgMinimalAtlasInner"><div><span class="kicker">TRADE ATLAS</span><h2>Explore the world of trade.</h2><p>Preview the routes, ports and business locations connecting Africa and Asia. Open the VTG Trade Atlas to explore the wider trade network.</p><a class="primary" href="/trade-atlas.html">Open Trade Atlas <i data-lucide="globe-2"></i></a></div><div class="vtgGlobeFrame"><img loading="lazy" decoding="async" src="https://images.unsplash.com/photo-1770723965031-65f135a58636?auto=format&fit=crop&w=1600&q=88" alt="Earth from space showing Africa and Europe"><div class="vtgGlobeShade"></div></div></div>`;
    about.insertAdjacentElement('afterend', atlas);

    const ai = document.createElement('section');
    ai.className = 'vtgMinimalAI';
    ai.innerHTML = `<div class="vtgMinimalAIInner"><div class="vtgAIOrb" aria-hidden="true"><span>VTG</span><i></i></div><div class="vtgMinimalAICopy"><span class="kicker">VTG AI</span><h2>Clarity for every trade decision.</h2><p>Get help exploring suppliers, understanding trade steps and navigating the VTG ecosystem.</p><a class="primary" href="/vtg-ai.html">Explore VTG AI <i data-lucide="arrow-up-right"></i></a></div></div>`;
    atlas.insertAdjacentElement('afterend', ai);

    const cta = document.createElement('section');
    cta.className = 'vtgMinimalCta';
    cta.innerHTML = `<div class="vtgCtaInner"><span class="eyebrow">YOUR NEXT TRADE STARTS HERE</span><h2>Turn an idea into a <span>real trade.</span></h2><p>VTG brings sourcing, verification, finance, logistics and trade intelligence together so you can move from discovery to action with one connected ecosystem.</p><div class="vtgCtaActions"><button class="vtgCtaAction" type="button" data-go-market><span><i data-lucide="store"></i></span><b>Explore the Marketplace</b><small>Find products and trade opportunities.</small><i data-lucide="arrow-up-right"></i></button><a class="vtgCtaAction primaryCta" href="/signin.html"><span><i data-lucide="log-in"></i></span><b>Enter VTG</b><small>Access the workspace built for your role.</small><i data-lucide="arrow-up-right"></i></a><a class="vtgCtaAction" href="/partnerships.html"><span><i data-lucide="handshake"></i></span><b>Become a VTG Partner</b><small>Explore partnership opportunities.</small><i data-lucide="arrow-up-right"></i></a></div></div>`;
    ai.insertAdjacentElement('afterend', cta);
    cta.querySelector('[data-go-market]')?.addEventListener('click', () => market.scrollIntoView({behavior:'smooth',block:'start'}));

    const footer = landing.querySelector('#vtgFooter');
    if (footer) footer.style.marginTop = '0';
    if (window.lucide?.createIcons) window.lucide.createIcons({attrs:{'stroke-width':1.85}});
    document.documentElement.dataset.vtgLandingRestored = 'approved-minimal';
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();