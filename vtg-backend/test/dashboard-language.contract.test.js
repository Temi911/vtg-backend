const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..','..');
const rd=f=>fs.readFileSync(path.join(root,f),'utf8');
const LANGS=['en','fr','pt','ar','sw','zh','ko','es'];
const DASH=['buyer-dashboard.html','supplier-dashboard.html','bank-trade-os.html'];
test('all three dashboards use the one shared language module and no private translator loader',()=>{
  for(const f of DASH){const h=rd(f);assert.match(h,/\/vtg-lang\.js/,f);assert.doesNotMatch(h,/googleTranslateElementInit=function/,f);}
});
test('shared module offers every sign-up language, applies the account language and sets direction',()=>{
  const js=rd('vtg-lang.js');
  for(const l of LANGS)assert.match(js,new RegExp("\\b"+l+":\\{g:'"),l);
  assert.match(js,/includedLanguages:GOOGLE_LIST/);
  assert.match(js,/GOOGLE_LIST='en,fr,pt,ar,sw,zh-CN,ko,es'/);
  assert.match(js,/h\.dir=LANGS\[lang\]\.rtl\?'rtl':'ltr'/);
  assert.match(js,/preferredLanguage/);
  assert.match(js,/update\(\{preferred_language:lang\}\)/);
});
test('language selects on sign-up and in dashboards list the same eight languages',()=>{
  const sel=(h,id)=>{const m=h.match(new RegExp('<select[^>]*id="'+id+'"[^>]*>(.*?)</select>','s'));assert.ok(m,id);return [...m[1].matchAll(/value="([a-z]{2})"/g)].map(x=>x[1]).sort().join();};
  const want=[...LANGS].sort().join();
  for(const [f,id] of [['buyer-signup.html','preferredLanguage'],['supplier-signup.html','preferredLanguage'],['bank-signup.html','preferredLanguage'],['buyer-dashboard.html','language'],['buyer-dashboard.html','language2'],['supplier-dashboard.html','languageSelect'],['supplier-dashboard.html','settingsLanguage'],['bank-trade-os.html','language']])assert.equal(sel(rd(f),id),want,f+'#'+id);
});
test('the logo and loading ring are shielded from translation and right-to-left mirroring',()=>{
  const js=rd('vtg-lang.js');
  assert.match(js,/\.vtg-loader svg/);assert.match(js,/direction:ltr!important/);assert.match(js,/translate'\)!=='no'/);
  assert.match(rd('vtg-loader.js'),/<svg translate="no" class="notranslate vtg-loader-v vtg-loader-full"/);
  assert.match(rd('vtg-agreement-guard.js'),/<svg translate="no" class="notranslate"/);
  assert.match(rd('vtg-agreement-guard.js'),/#vtg-guard-loader\{[^}]*direction:ltr/);
  assert.match(rd('vtg-loader.css'),/\.vtg-loader-v[^{]*\{direction:ltr/);
  assert.match(rd('auth-callback.html'),/<svg translate="no" class="notranslate vtg-loader-v/);
});
test('buyer shell keeps languages that have no built-in dictionary instead of resetting to English',()=>{
  const s=rd('vtg-buyer-shell.js');
  assert.match(s,/lang=window\.VTGLang\?window\.VTGLang\.normalize\(value\)/);
  assert.match(s,/vtg:languagechange/);
});
