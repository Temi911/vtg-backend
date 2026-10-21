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
    ['Buyer','/buyer-dashboard.html?preview=1','buyer-dashboard.html'],
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
  #vtg-shared-footer{position:fixed;z-index:9998;left:0;right:0;top:0;background:var(--surface,#fff);color:var(--ink,#20252d);border-top:1px solid var(--line,#dfe4e9);box-shadow:0 -5px 22px rgba(10,20,30,.08);font:11px/1.35 Manrope,Arial,sans-serif}
  #vtg-shared-footer *{box-sizing:border-box}
  #vtg-shared-footer .vf-main{max-width:1600px;margin:auto;min-height:58px;padding:8px 16px;display:flex;align-items:center;gap:12px}
  #vtg-shared-footer .vf-brand{font-weight:800;white-space:nowrap;color:var(--red,#a5232b);min-width:0}#vtg-shared-footer .vf-crumb{font-weight:700;white-space:nowrap;color:var(--ink,#20252d);margin-right:auto}#vtg-shared-footer .vf-links{display:none!important}#vtg-theme-mode{display:none!important}
  #vtg-shared-footer .vf-links{display:flex;align-items:center;gap:4px;flex:1;overflow-x:auto;scrollbar-width:thin}
  #vtg-shared-footer a{color:inherit;text-decoration:none;white-space:nowrap;padding:7px 8px;border-radius:7px;font-weight:700}
  #vtg-shared-footer a:hover{background:var(--soft,#fff0ef);color:var(--red,#a5232b)}
  #vtg-shared-footer a[aria-current=page],#vtg-shared-footer span[aria-current=page]{background:var(--soft,#fff0ef);color:var(--red,#a5232b);box-shadow:inset 0 -2px 0 var(--red,#a5232b)}
  #vtg-shared-footer .vf-links span[aria-current=page]{white-space:nowrap;padding:7px 8px;border-radius:7px;font-weight:800}\n  #vtg-shared-footer .vf-controls{display:flex;align-items:center;gap:6px;flex-shrink:0}
  #vtg-shared-footer select,#vtg-shared-footer button{max-width:160px;background:var(--surface,#fff);color:var(--ink,#20252d);border:1px solid var(--line,#dfe4e9);border-radius:7px;padding:7px 8px;font:inherit}
  #vtg-shared-footer button{font-weight:800;cursor:pointer}
  #vtg-shared-footer .vf-status{display:none;padding:0 16px 7px;color:var(--muted,#687586);font-size:10px}
  body{padding-top:58px!important;padding-bottom:0!important}header.topbar,header.top,div.topbar,div.top{display:none!important}
  @media(max-width:900px){#vtg-shared-footer .vf-main{flex-wrap:wrap;gap:6px;padding:7px 10px}#vtg-shared-footer .vf-controls{width:auto;max-width:100%;margin-left:auto}#vtg-shared-footer select{flex:0 1 auto;max-width:165px}body{padding-top:58px!important}}
  @media(max-width:520px){#vtg-shared-footer .vf-main{min-height:56px}#vtg-shared-footer .vf-brand{font-size:10px}#vtg-shared-footer .vf-crumb{display:none}#vtg-shared-footer .vf-controls{gap:4px}#vtg-shared-footer select{min-width:0;max-width:118px;font-size:10px;padding:7px 5px}#vtg-shared-footer #vf-language{max-width:92px}}
  `;
  document.head.appendChild(style);
  const footer=document.createElement('header');footer.id='vtg-shared-footer';footer.setAttribute('aria-label','VTG workspace header');
  const workspace=({ 'supplier-dashboard.html':'Supplier workspace','buyer-dashboard.html':'Buyer workspace','bank-trade-os.html':'Finance workspace','agent-dashboard.html':'Agent workspace','agent-network-dashboard.html':'Agent Network','workforce-dashboard.html':'Staff & Operations','admin-dashboard-preview.html':'Admin workspace','vtg-ai-dashboard.html':'VTG AI workspace'})[path]||'VTG workspace';
  footer.innerHTML='<div class="vf-main"><span class="vf-brand">VTG /</span><span class="vf-crumb">'+workspace+' / <strong>Command centre</strong></span><nav class="vf-links" aria-label="VTG workspaces"></nav><div class="vf-controls"><select id="vf-theme-mode" aria-label="Appearance mode" title="Automatic by local time, light or dark"><option value="auto">Theme: Auto</option><option value="light">Theme: Light</option><option value="dark">Theme: Dark</option></select><label for="vf-skin" style="font-weight:800;white-space:nowrap">Workspace theme</label><select id="vf-skin" aria-label="Workspace theme" title="Workspace colour theme">'+skins.map(s=>'<option value="'+s[0]+'">'+s[1]+'</option>').join('')+'</select><select id="vf-language" aria-label="Language preference" title="Language preference">'+supportedLangs.map(l=>'<option value="'+l+'">'+langNames[l]+'</option>').join('')+'</select><button id="vf-notifications" type="button" title="Notifications" aria-label="Notifications">♧</button><button id="vf-theme-toggle" type="button" title="Switch light or dark mode" aria-label="Switch light or dark mode">◐</button><a href="/frontend-v3.html" aria-label="Home" style="white-space:nowrap;padding:7px 8px;border:1px solid var(--line,#dfe4e9);border-radius:7px;font-weight:800">Home</a></div></div><div class="vf-status" id="vf-status" role="status" aria-live="polite"></div>';
  document.body.insertBefore(footer,document.body.firstChild);
  document.querySelectorAll('header.topbar,header.top,div.topbar,div.top').forEach(el=>{if(el!==footer){el.setAttribute('aria-hidden','true');el.style.display='none'}});\n  document.querySelectorAll('body footer').forEach(el=>el.remove());
  const status=document.getElementById('vf-status');
  function say(s){status.textContent=s;status.style.display='block';clearTimeout(say.t);say.t=setTimeout(()=>status.style.display='none',4500)}
  const palettes={executive:'#a5232b','ocean-finance':'#176b87','emerald-trade':'#18734d','copper-ledger':'#985b3d','indigo-intel':'#6258b8','crimson-ops':'#bd344c','mono-pro':'#586575',sandstone:'#92733e','arctic-blue':'#356fc0','midnight-harbor':'#167d99'};
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
})();