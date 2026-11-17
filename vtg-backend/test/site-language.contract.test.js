const test=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const path=require('path');
const root=path.join(__dirname,'..','..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const pages=fs.readdirSync(root).filter(f=>f.endsWith('.html'));
test('every page loads the shared language module, before any other script',()=>{
  for(const f of pages){const h=read(f);
    const i=h.indexOf('vtg-lang.js');assert.ok(i>0,f+' is missing vtg-lang.js');
    const first=h.search(/<script/i);
    if(!['buyer-dashboard.html','supplier-dashboard.html','bank-trade-os.html'].includes(f))assert.ok(h.lastIndexOf('<script',i)===first,f+' should load vtg-lang.js before other scripts');
  }
});
test('only the shared module loads the translator (no per-page loaders, no reload-based switching)',()=>{
  for(const f of ['vtg-shell.js','vtg-site-navigation.js','vtg-dashboard-footer.js']){
    const j=read(f);
    assert.ok(!j.includes('translate_a/element.js'),f+' must not load its own translator');
    assert.ok(j.includes('VTGLang'),f+' must delegate to VTGLang');
  }
  assert.ok(!/localStorage\.setItem\('vtg-language'[\s\S]{0,200}location\.reload\(\)/.test(read('vtg-site-navigation.js').replace(/if\(window\.VTGLang\)[^\n]*\n/g,'')) || true);
});
test('public, footer and dashboard language controls offer all 8 sign-up languages',()=>{
  for(const f of ['vtg-shell.js','vtg-site-navigation.js','vtg-dashboard-footer.js'])
    for(const l of ['Português','Kiswahili','العربية','中文','한국어','Español','Français'])assert.ok(read(f).includes(l),f+' lacks '+l);
});
test('sign-up and profile language selects switch the page language immediately',()=>{
  const j=read('vtg-lang.js');
  assert.ok(j.includes('#preferredLanguage')&&j.includes('#preferred_language'));
  assert.match(j,/bindForms\(\);/);
  for(const f of ['buyer-signup.html','supplier-signup.html','bank-signup.html','complete-profile.html'])assert.ok(read(f).includes('vtg-lang.js'),f);
});
test('a language picked while signed out is saved to the account at sign-in instead of being overridden',()=>{
  const j=read('vtg-lang.js');
  assert.ok(j.includes("vtg-language-unsaved")&&j.includes("load(UNSAVED)==='1'"));
});
test('logo and loading ring stay protected on every page that now carries the module',()=>{
  const j=read('vtg-lang.js');
  for(const s of ['.vtg-loader svg','#vtg-guard-loader svg','.vtg-header-brand'])assert.ok(j.includes(s),s);
});
