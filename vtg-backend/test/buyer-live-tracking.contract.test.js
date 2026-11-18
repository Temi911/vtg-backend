const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..','..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const fn=read('supabase/functions/vtg-live-tracking/index.ts');
const ui=read('vtg-buyer-live-tracking.js');

test('buyer tracking readiness is derived from complete provider configuration',()=>{
 assert.match(fn,/const cargoReady = \(provider: CargoProvider\) => \{[\s\S]*configured\(cfg\) && Boolean\(env\(cfg\.pollPath\)\)/);
 assert.match(fn,/const liveCargoEnabled = Object\.values\(cargo\)\.some\(Boolean\)/);
 assert.match(fn,/const liveAisEnabled = Object\.values\(ais\)\.some\(Boolean\)/);
 assert.match(fn,/const liveDataEnabled = liveCargoEnabled \|\| liveAisEnabled/);
 assert.doesNotMatch(fn,/liveDataEnabled:\s*false/);
});

test('cargo references are not sent to a provider until registration and polling endpoints are configured',()=>{
 assert.match(fn,/if\(!configured\(cfg\) \|\| !env\(cfg\.pollPath\)\)[\s\S]*no live request was sent/);
});

test('tracking never labels sandbox records as live carrier data',()=>{
 assert.match(fn,/mode:\s*"sandbox"/);
 assert.match(fn,/Test-only event\. Not a carrier or port update\./);
 assert.match(ui,/SANDBOX · TEST DATA/);
 assert.match(ui,/PROVIDER REPORTED/);
});

test('tracking Edge Function authenticates active buyer ownership before shipment operations',()=>{
 assert.match(fn,/auth\.getUser\(token\)/);
 assert.match(fn,/profile\?\.role !== "buyer"/);
 assert.match(fn,/profile\?\.is_active !== true/);
 assert.match(fn,/order\.buyer_id !== buyerId/);
});
