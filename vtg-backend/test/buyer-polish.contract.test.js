const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..','..');
const html=fs.readFileSync(path.join(root,'buyer-dashboard.html'),'utf8');
const trk=fs.readFileSync(path.join(root,'vtg-buyer-live-tracking.js'),'utf8');
test('empty states span the whole product grid',()=>{
  assert.match(html,/\.productGrid>\.empty[^{]*\{grid-column:1\/-1;text-align:center\}/);
});
test('buyers are not shown internal tracking provider names',()=>{
  assert.doesNotMatch(trk,/Vizion: |VesselFinder: |MarineTraffic: |Not configured/);
  assert.match(trk,/Container tracking is not available yet/);
});
