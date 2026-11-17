const test=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const path=require('path');
const root=path.join(__dirname,'..','..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const SKINS=['executive','ocean-finance','emerald-trade','copper-ledger','indigo-intel','crimson-ops','mono-pro','sandstone','arctic-blue','midnight-harbor'];
const css=read('vtg-dashboard-themes.css');
test('every skin has a light and a dark palette that recolours surfaces, text and accent',()=>{
  for(const s of SKINS)for(const m of ['light','dark']){
    const sel=`html[data-skin="${s}"][data-theme="${m}"]:root`;
    const i=css.indexOf(sel);assert.ok(i>=0,`${s}/${m} missing`);
    const block=css.slice(i,css.indexOf('}',i));
    for(const v of ['--bg','--panel','--panel2','--surface','--ink','--muted','--line','--accent','--accent2','--soft','--t-side','--t-heroA','--t-heroB','--t-btn'])
      assert.ok(block.includes(v+':'),`${s}/${m} lacks ${v}`);
    assert.ok(block.includes(`html[data-skin="${s}"][data-theme="${m}"] body`)||css.slice(i,i+120).includes('body'),`${s}/${m} must also set variables on body`);
  }
});
test('palette variables are !important so inline/footer palette values cannot override the skin',()=>{
  const i=css.indexOf('html[data-skin="ocean-finance"][data-theme="dark"]:root');
  const block=css.slice(i,css.indexOf('}',i));
  assert.ok(/--panel:#[0-9a-f]{6}!important/i.test(block));
});
test('all three dashboards load the shared theme sheet last and default to a skin',()=>{
  for(const f of ['buyer-dashboard.html','supplier-dashboard.html','bank-trade-os.html']){
    const h=read(f);const li=h.indexOf('vtg-dashboard-themes.css');
    assert.ok(li>0,f+' missing theme sheet');
    assert.ok(li>h.lastIndexOf('<style'),f+' theme sheet must come after inline styles');
  }
  assert.match(read('buyer-dashboard.html'),/<html[^>]*data-skin=/);
});
test('theme rules cover sidebar, hero, cards, buttons and fields',()=>{
  for(const sel of ['.sidebar','.commandHero','.panel','.btn.primary','input','.topline'])assert.ok(css.includes(sel),sel);
});
test('brand colours are not locked in buyer card styles',()=>{
  const h=read('buyer-dashboard.html');
  assert.ok(!/radial-gradient\(ellipse at 78% 28%,#1558D6/.test(h));
});
