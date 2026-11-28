const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
const R=p=>fs.readFileSync(path.join(__dirname,'..','..',p),'utf8');
test('password toggle retones on theme/transition',()=>{const s=R('vtg-password-toggle.js');assert.match(s,/#9CC2FF/);assert.match(s,/transitionend/);});
test('dark filled buttons keep white text on brand blue',()=>{assert.match(R('vtg-polish.css'),/data-theme="dark"\] body :is\(\.actionButton\.primary/);assert.match(R('vtg-auth.css'),/\.au-card \.primary\{background:#1558D6/);});
test('public AI chat answers offline instead of 503',()=>{const s=R('api/ai/public-chat.js');assert.match(s,/_local-answer/);assert.match(s,/mode:\s*'offline'/);});
test('switching back to English restores the original page',()=>{const s=R('vtg-lang.js');assert.match(s,/location\.reload\(\)/);assert.match(s,/lang==='en'&&wasTranslated/);});
test('image placeholder script is loaded by shell and dashboards',()=>{assert.match(R('vtg-img-fallback.js'),/vtg-imgfb/);assert.match(R('vtg-shell.js'),/vtg-img-fallback\.js/);assert.match(R('vtg-user-id.js'),/vtg-img-fallback\.js/);});
test('admin midnight-harbor dark sidebar only in dark theme',()=>{assert.match(R('admin-dashboard.html'),/midnight-harbor"\]\[data-theme="dark"\] \.sidebar\{background:#111d29\}/);});
