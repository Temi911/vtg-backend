const assert=require('node:assert/strict');
const base=process.env.VTG_SMOKE_BASE_URL||'http://127.0.0.1:3000';
async function get(path){const r=await fetch(base+path);const text=await r.text();let body;try{body=JSON.parse(text)}catch{body=text}return {status:r.status,headers:r.headers,body}}
(async()=>{
 const live=await get('/health/live');assert.equal(live.status,200);assert.equal(live.body.status,'alive');
 const health=await get('/health');assert.equal(health.status,200);assert.equal(health.body.status,'ok');
 console.log('VTG production smoke checks passed:',base);
})().catch(err=>{console.error('VTG smoke check failed:',err);process.exit(1)});
