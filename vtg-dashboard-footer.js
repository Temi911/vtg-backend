/* VTG shared dashboard header — unified workspace controls and preferences. */
(function(){
  'use strict';
  if (!document.querySelector('link[data-vtg-typography]')) {
    const typography = document.createElement('link');
    typography.rel = 'stylesheet';
    typography.href = '/vtg-typography.css?v=20261020-4';
    typography.setAttribute('data-vtg-typography', '1');
    document.head.appendChild(typography);
  }
  const path=(location.pathname.split('/').pop()||'frontend-v3.html').toLowerCase();
  const pages=[
    ['Home','/frontend-v3.html','frontend-v3.html'],
    ['Buyer','/signin.html?role=buyer','buyer-dashboard.html'],
    ['Supplier','/supplier-dashboard.html','supplier-dashboard.html'],
    ['Bank','/bank-trade-os.html?preview=1','bank-trade-os.html'],
    ['Admin','/admin-dashboard-preview.html','admin-dashboard-preview.html'],
    ['Staff','/workforce-dashboard.html?preview=1','workforce-dashboard.html'],
    ['Agent','/agent-dashboard.html?preview=1','agent-dashboard.html'],
    ['Agent Network','/agent-network-dashboard.html','agent-network-dashboard.html'],
    ['VTG AI','/vtg-ai-dashboard.html','vtg-ai-dashboard.html'],
  ];
  const activePath=path;
  const active=pages.find(p=>p[2]===activePath);
  const root=document.documentElement;
  const get=(k,f='')=>{try{return localStorage.getItem(k)||f}catch(e){return f}};
  const set=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
  const supportedLangs=['en','fr','zh','ko','es','ar'];
  const langNames={en:'English',fr:'Français',zh:'中文',ko:'한국어',es:'Español',ar:'العربية'};
  const skins=[
    ['executive','Executive'],['ocean-finance','Ocean Finance'],['emerald-trade','Emerald Trade'],
    ['copper-ledger','Copper Ledger'],['indigo-intel','Indigo Intelligence'],['crimson-ops','Crimson Operations'],
    ['mono-pro','Monochrome Pro'],['sandstone','Sandstone'],['arctic-blue','Arctic Blue'],['midnight-harbor','Midnight Harbor']
  ];
  const style=document.createElement('style');
  style.textContent=`
  #vtg-shared-footer{position:fixed;z-index:9998;left:0;right:0;top:0;background:var(--panel,var(--surface,#fff));color:var(--ink,#0B1F3A);border-bottom:1px solid var(--line,#D5E0EE);font:14px/1.4 Manrope,Inter,system-ui,sans-serif}
  #vtg-shared-footer::after{content:"";position:absolute;left:0;bottom:-1px;width:72px;height:3px;background:#FFB81C}
  #vtg-shared-footer *{box-sizing:border-box}
  #vtg-shared-footer .vf-main{max-width:none;height:64px;padding:0 clamp(12px,2.2vw,28px);display:flex;align-items:center;gap:16px}
  #vtg-shared-footer .vf-logo{display:flex;align-items:center;flex:none;padding:0}
  #vtg-shared-footer .vf-logo img{height:32px;width:auto;display:block}
  #vtg-shared-footer .vf-logo .logo-light{display:none}
  html[data-theme="dark"] #vtg-shared-footer .vf-logo .logo-dark{display:none}
  html[data-theme="dark"] #vtg-shared-footer .vf-logo .logo-light{display:block}
  #vtg-shared-footer .vf-divider{width:1px;height:28px;background:var(--line,#D5E0EE);flex:none}
  #vtg-shared-footer .vf-title{display:flex;flex-direction:column;min-width:0;line-height:1.2}
  #vtg-shared-footer .vf-title small{font-size:12px;font-weight:700;color:var(--muted,#52667E);letter-spacing:.02em}
  #vtg-shared-footer .vf-title strong{font-size:16px;font-weight:800;color:var(--ink,#0B1F3A);letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #vtg-shared-footer .vf-links{display:none!important}
  #vtg-shared-footer .vf-controls{display:flex;align-items:center;gap:8px;margin-left:auto;flex:none}
  #vtg-shared-footer .vf-icon,#vtg-shared-footer .vf-prefs>summary{width:40px;height:40px;display:grid;place-items:center;border-radius:10px;border:1px solid var(--line,#D5E0EE);background:var(--panel,#fff);color:var(--ink,#0B1F3A);cursor:pointer;padding:0;list-style:none;font:inherit}
  #vtg-shared-footer .vf-prefs>summary::-webkit-details-marker{display:none}
  #vtg-shared-footer .vf-icon:hover,#vtg-shared-footer .vf-prefs>summary:hover,#vtg-shared-footer .vf-prefs[open]>summary{border-color:var(--accent,var(--red,#1558D6));color:var(--accent,var(--red,#1558D6))}
  #vtg-shared-footer .vf-icon svg,#vtg-shared-footer .vf-prefs>summary svg{width:19px;height:19px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  #vtg-shared-footer .vf-prefs{position:relative}
  #vtg-shared-footer .vf-pop{position:absolute;right:0;top:calc(100% + 10px);width:280px;max-width:calc(100vw - 24px);padding:16px;border-radius:14px;background:var(--panel,#fff);border:1px solid var(--line,#D5E0EE);box-shadow:0 18px 50px rgba(11,31,58,.18);display:grid;gap:14px}
  #vtg-shared-footer .vf-pop label{display:grid;gap:6px;font-size:13px;font-weight:700;color:var(--ink,#0B1F3A)}
  #vtg-shared-footer select{width:100%;min-height:42px;background:var(--panel,#fff);color:var(--ink,#0B1F3A);border:1px solid var(--line,#D5E0EE);border-radius:10px;padding:0 10px;font:inherit;font-size:14px}
  #vtg-shared-footer .vf-home{display:inline-flex;align-items:center;min-height:40px;padding:0 14px;border-radius:10px;border:1px solid var(--line,#D5E0EE);font-weight:800;font-size:14px;color:var(--ink,#0B1F3A);text-decoration:none;white-space:nowrap}
  #vtg-shared-footer .vf-home:hover{border-color:var(--accent,var(--red,#1558D6));color:var(--accent,var(--red,#1558D6))}
  #vtg-shared-footer .vf-switch{padding:12px 0 0;border-top:1px solid var(--line,#D5E0EE);display:grid;gap:6px}
  #vtg-shared-footer .vf-switch b{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted,#52667E)}
  #vtg-shared-footer .vf-switch div{display:flex;flex-wrap:wrap;gap:6px}
  #vtg-shared-footer .vf-switch a{padding:7px 10px;border-radius:8px;border:1px solid var(--line,#D5E0EE);font-size:13px;font-weight:700;color:var(--ink,#0B1F3A);text-decoration:none}
  #vtg-shared-footer .vf-switch a[aria-current=page]{background:var(--soft,#E4EEFC);border-color:var(--accent,var(--red,#1558D6));color:var(--accent,var(--red,#1558D6))}
  #vtg-shared-footer .vf-status{position:absolute;right:clamp(12px,2.2vw,28px);top:72px;display:none;padding:10px 14px;border-radius:10px;background:var(--ink,#0B1F3A);color:var(--bg,#fff);font-size:13px;font-weight:700;box-shadow:0 12px 30px rgba(0,0,0,.2)}
  body{padding-top:64px!important;padding-bottom:0!important}header.topbar,header.top,div.topbar,div.top{display:none!important}
  #vtg-shared-footer .vf-menu{display:none}@media(max-width:1000px){#vtg-shared-footer .vf-menu:not([hidden]){display:inline-flex}}
  @media(max-width:720px){#vtg-shared-footer .vf-main{height:58px;gap:10px}#vtg-shared-footer .vf-logo img{height:26px}#vtg-shared-footer .vf-divider{display:none}#vtg-shared-footer .vf-title small{display:none}#vtg-shared-footer .vf-title strong{font-size:15px}#vtg-shared-footer .vf-home{display:none}#vtg-shared-footer .vf-controls{gap:6px}#vtg-shared-footer .vf-icon,#vtg-shared-footer .vf-prefs>summary{width:38px;height:38px}body{padding-top:58px!important}}
  @media(max-width:380px){#vtg-shared-footer #vf-notifications{display:none}}
  `;
  document.head.appendChild(style);
  const footer=document.createElement('header');footer.id='vtg-shared-footer';footer.setAttribute('aria-label','VTG workspace header');
  const workspace=({ 'supplier-dashboard.html':'Supplier workspace','buyer-dashboard.html':'Buyer workspace','bank-trade-os.html':'Finance workspace','agent-dashboard.html':'Agent workspace','agent-network-dashboard.html':'Agent Network','workforce-dashboard.html':'Staff & Operations','admin-dashboard-preview.html':'Admin workspace','vtg-ai-dashboard.html':'VTG AI workspace'})[path]||'VTG workspace';
  footer.innerHTML='<div class="vf-main"><button class="vf-icon vf-menu" id="vf-menu" type="button" aria-label="Open navigation" aria-expanded="false" hidden><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button><a class="vf-logo" href="/frontend-v3.html" aria-label="Vintage Trade Global home"><img class="logo-dark" src="/assets/vtg-logo.svg" alt="Vintage Trade Global"><img class="logo-light" src="/assets/vtg-logo-light.svg" alt="" aria-hidden="true"></a><span class="vf-divider"></span><div class="vf-title"><small>'+workspace+'</small><strong>Command centre</strong></div><nav class="vf-links" aria-label="VTG workspaces"></nav><div class="vf-controls"><button class="vf-icon" id="vf-notifications" type="button" title="Notifications" aria-label="Notifications"><svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg></button><button class="vf-icon" id="vf-theme-toggle" type="button" title="Switch light or dark mode" aria-label="Switch light or dark mode"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg></button><details class="vf-prefs"><summary aria-label="Preferences" title="Preferences"><svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg></summary><div class="vf-pop"><label>Appearance<select id="vf-theme-mode" aria-label="Appearance mode"><option value="auto">Automatic (by local time)</option><option value="light">Light</option><option value="dark">Dark</option></select></label><label>Accent colour<select id="vf-skin" aria-label="Workspace theme">'+skins.map(s=>'<option value="'+s[0]+'">'+s[1]+'</option>').join('')+'</select></label><label>Language<select id="vf-language" aria-label="Language preference">'+supportedLangs.map(l=>'<option value="'+l+'">'+langNames[l]+'</option>').join('')+'</select></label></div></details><a class="vf-home" href="/frontend-v3.html" aria-label="Home">Home</a></div></div><div class="vf-status" id="vf-status" role="status" aria-live="polite"></div>';
  document.body.insertBefore(footer,document.body.firstChild);
  document.querySelectorAll('header.topbar,header.top,div.topbar,div.top').forEach(el=>{if(el!==footer){el.setAttribute('aria-hidden','true');el.style.display='none'}});
  document.querySelectorAll('body footer').forEach(el=>el.remove());
  const status=document.getElementById('vf-status');
  function say(s){status.textContent=s;status.style.display='block';clearTimeout(say.t);say.t=setTimeout(()=>status.style.display='none',4500)}
  const palettes={executive:'#1558D6','ocean-finance':'#176b87','emerald-trade':'#18734d','copper-ledger':'#985b3d','indigo-intel':'#6258b8','crimson-ops':'#bd344c','mono-pro':'#586575',sandstone:'#92733e','arctic-blue':'#356fc0','midnight-harbor':'#167d99'};
  let currentSkin='executive';
  function applyPalette(mode){const accent=palettes[currentSkin]||palettes.executive;const dark=mode==='dark';const values={'--red':accent,'--accent':accent,'--skin-accent':accent,'--soft':dark?accent+'33':accent+'12','--skin-soft':dark?accent+'33':accent+'12','--redSoft':dark?accent+'33':accent+'12','--bg':dark?'#0b1016':'#f4f6f8','--surface':dark?'#141b23':'#ffffff','--card':dark?'#141b23':'#ffffff','--panel':dark?'#141b23':'#ffffff','--ink':dark?'#f3f5f7':'#20252d','--muted':dark?'#b4c0cb':'#687586','--line':dark?'#2b3743':'#e1e6ed'};Object.entries(values).forEach(([k,v])=>root.style.setProperty(k,v));}
  function resolveTheme(mode){return mode==='auto'?((new Date().getHours()>=6&&new Date().getHours()<18)?'light':'dark'):mode}
  function applyTheme(mode,save=true){
    if(!['auto','light','dark'].includes(mode))mode='auto';
    const actual=resolveTheme(mode);root.dataset.theme=actual;root.style.colorScheme=actual;applyPalette(actual);
    if(save){['vtg-theme-preference','vtg-theme','vtg-supplier-os-theme-mode','vtg-ai-theme-mode'].forEach(k=>set(k,mode));set('vtg-theme-mode',mode)}
    document.dispatchEvent(new CustomEvent('vtg:themechange',{detail:{theme:actual,preference:mode}}));
    const existing=document.getElementById('appearance')||document.getElementById('settingsTheme');
    if(existing&&[...existing.options].some(o=>o.value===mode))existing.value=mode;
  }
  function applySkin(id,save=true){
    if(!skins.some(s=>s[0]===id))id='executive';
    currentSkin=id;root.dataset.skin=id;root.dataset.vtgSkin=id;applyPalette(root.dataset.theme||'light');
    if(save){['vtg-buyer-os-skin','vtg-admin-skin','vtg-supplier-os-skin','vtg-workspace-skin'].forEach(k=>set(k,id))}
    const existing=document.getElementById('workspaceSkin')||document.getElementById('settingsSkin')||document.getElementById('skinSelect');
    if(existing&&[...existing.options].some(o=>o.value===id))existing.value=id;
    document.dispatchEvent(new CustomEvent('vtg:skinchange',{detail:{skin:id}}));
  }
  function applyLanguage(lang,save=true){
    if(!supportedLangs.includes(lang))lang='en';
    if(save){['vtg-language','vtg-admin-language','vtg-supplier-os-language','vtg-agent-language','vtg-workspace-language'].forEach(k=>set(k,lang))}
    root.lang=lang==='zh'?'zh-CN':lang;root.dir=lang==='ar'?'rtl':'ltr';
    const selects=['language2','languageSelect','settingsLanguage','language'];
    let applied=false;
    for(const id of selects){const el=document.getElementById(id);if(!el)continue;
      const map={zh:['zh','zh-CN'],ar:['ar'],es:['es'],en:['en'],fr:['fr'],ko:['ko']};
      const option=[...el.options].find(o=>(map[lang]||[lang]).includes(o.value));
      if(option){el.value=option.value;el.dispatchEvent(new Event('change',{bubbles:true}));applied=true;break}
    }
    if(lang==='zh')set('vtg-language','zh');
    say(applied?'Language preference applied to this workspace.':'Language preference saved. Full interface translation is not yet implemented on this page.');
  }
  const mode=get('vtg-theme-preference',get('vtg-theme-mode',get('vtg-supplier-os-theme-mode',get('vtg-ai-theme-mode','auto'))));
  document.getElementById('vf-theme-mode').value=['auto','light','dark'].includes(mode)?mode:'auto';
  document.getElementById('vf-skin').value=skins.some(s=>s[0]===get('vtg-buyer-os-skin',get('vtg-admin-skin',get('vtg-supplier-os-skin','executive'))))?get('vtg-buyer-os-skin',get('vtg-admin-skin',get('vtg-supplier-os-skin','executive'))):'executive';
  document.getElementById('vf-language').value=supportedLangs.includes(get('vtg-language',get('vtg-admin-language',get('vtg-supplier-os-language','en'))))?get('vtg-language',get('vtg-admin-language',get('vtg-supplier-os-language','en'))):'en';
  applyTheme(document.getElementById('vf-theme-mode').value,false);
  applySkin(document.getElementById('vf-skin').value,false);
  document.getElementById('vf-theme-mode').addEventListener('change',e=>{applyTheme(e.target.value);say(e.target.value==='auto'?'Appearance follows your device local time.':'Appearance set to '+e.target.value+'.')});
  document.getElementById('vf-theme-toggle').addEventListener('click',()=>{const next=(root.dataset.theme||'light')==='dark'?'light':'dark';document.getElementById('vf-theme-mode').value=next;applyTheme(next);say('Appearance set to '+next+'.')});
  document.getElementById('vf-skin').addEventListener('change',e=>{applySkin(e.target.value);say('Workspace theme preference saved.')});
  document.getElementById('vf-language').addEventListener('change',e=>applyLanguage(e.target.value));
  ['appearance','settingsTheme'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('change',()=>{const v=el.value;if(['auto','light','dark'].includes(v)){document.getElementById('vf-theme-mode').value=v;applyTheme(v)}})});
  ['skinSelect','workspaceSkin','settingsSkin'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('change',()=>{if(skins.some(s=>s[0]===el.value)){document.getElementById('vf-skin').value=el.value;applySkin(el.value)}})});
  ['language','language2','languageSelect','settingsLanguage'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('change',()=>{const map={'zh-CN':'zh'};const v=map[el.value]||el.value;if(supportedLangs.includes(v)){document.getElementById('vf-language').value=v;['vtg-language','vtg-admin-language','vtg-supplier-os-language','vtg-workspace-language'].forEach(k=>set(k,v));root.lang=v==='zh'?'zh-CN':v;root.dir=v==='ar'?'rtl':'ltr'}})});
  document.getElementById('vf-notifications').addEventListener('click',()=>{const n=document.getElementById('notifBtn')||document.getElementById('notificationBtn')||document.querySelector('[aria-label*="notification" i]');if(n&&n!==document.getElementById('vf-notifications'))n.click();else say('No shared notification feed is connected on this workspace yet.')});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&document.getElementById('vf-theme-mode').value==='auto')applyTheme('auto',false)});
  window.addEventListener('focus',()=>{if(document.getElementById('vf-theme-mode').value==='auto')applyTheme('auto',false)});
  setInterval(()=>{if(document.getElementById('vf-theme-mode').value==='auto')applyTheme('auto',false)},60000);

  // Preferences popover: close on outside click or Escape.
  (function(){const prefs=footer.querySelector('.vf-prefs');if(!prefs)return;
    document.addEventListener('click',e=>{if(prefs.open&&!prefs.contains(e.target))prefs.open=false});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&prefs.open){prefs.open=false;prefs.querySelector('summary').focus()}});})();
  // Sidebar: keep the group that holds the current page open so navigation is visible.
  (function(){const open=()=>{const groups=[...document.querySelectorAll('.sidebar .items')];if(!groups.length)return;
      let target=groups.find(g=>g.querySelector('a.active,a[aria-current="page"]'))||groups[0];
      groups.forEach(g=>{if(g===target){g.classList.remove('closed');const b=g.previousElementSibling;if(b&&b.setAttribute)b.setAttribute('aria-expanded','true')}});};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(open,0),{once:true});else setTimeout(open,0);})();

  (function(){
    var btn=document.getElementById('vf-menu');if(!btn)return;
    var own=['menuBtn','mobileMenu','mobilemenu'].map(function(i){return document.getElementById(i)}).filter(Boolean)[0];
    var side=document.getElementById('sidebar')||document.querySelector('aside.sidebar,aside.side,.side,aside');
    if(!own&&!side)return;
    btn.hidden=false;
    btn.addEventListener('click',function(){
      if(own){own.click();}
      else if(side){side.classList.toggle('open');side.classList.toggle('mobileOpen');}
      setTimeout(function(){var o=side&&(side.classList.contains('open')||side.classList.contains('mobileOpen'));btn.setAttribute('aria-expanded',o?'true':'false');},50);
    });
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&side){side.classList.remove('open','mobileOpen');btn.setAttribute('aria-expanded','false');}});
  })();
})();