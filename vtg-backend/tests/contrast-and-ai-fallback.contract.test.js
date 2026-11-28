const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
const R=p=>fs.readFileSync(path.join(__dirname,'..','..',p),'utf8');
test('password toggle retones on theme/transition',()=>{const s=R('vtg-password-toggle.js');assert.match(s,/#9CC2FF/);assert.match(s,/transitionend/);});
test('dark filled buttons keep white text on brand blue',()=>{assert.match(R('vtg-polish.css'),/data-theme="dark"\] body :is\(\.actionButton\.primary/);assert.match(R('vtg-auth.css'),/\.au-card \.primary\{background:#1558D6/);});
test('public AI chat answers offline instead of 503',()=>{const s=R('api/ai/public-chat.js');assert.match(s,/_local-answer/);assert.match(s,/mode:\s*'offline'/);});
