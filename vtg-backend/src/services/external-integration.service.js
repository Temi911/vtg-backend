const cache=new Map();
const TTL=30000;
const STALE_AFTER_MS=Math.max(60000,Number(process.env.VTG_DATA_STALE_AFTER_MS||300000));
function freshness(timestamp){const ageMs=timestamp?Math.max(0,Date.now()-Date.parse(timestamp)):Infinity;return {ageMs,status:ageMs<=STALE_AFTER_MS?'fresh':'stale'};}
const providers={
 vessel:{configured:()=>Boolean(process.env.VTG_TRACKING_API_KEY),provider:()=>String(process.env.VTG_TRACKING_PROVIDER||'none')},
 fx:{configured:()=>Boolean(process.env.VTG_FX_BASE_URL),provider:()=>String(process.env.VTG_FX_PROVIDER||'none')},
 news:{configured:()=>Boolean(process.env.VTG_NEWS_BASE_URL),provider:()=>String(process.env.VTG_NEWS_PROVIDER||'none')}
};
function get(k){const x=cache.get(k);return x&&Date.now()-x.at<TTL?x.value:null}
function put(k,v){cache.set(k,{at:Date.now(),value:v});return v}
async function requestJson(endpoint, params) {
 const url=new URL(endpoint);
 for(const [key,value] of Object.entries(params)) url.searchParams.set(key,String(value));
 const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000)});
 if(!response.ok) throw new Error('External provider returned HTTP '+response.status);
 return response.json();
}
async function fxRates(base='USD',symbols=['NGN','CNY','KRW']){
 const b=String(base).toUpperCase(),syms=symbols.map(x=>String(x).trim().toUpperCase()).filter(Boolean);
 const url=process.env.VTG_FX_BASE_URL;if(!url)return {available:false,provider:'none',reason:'No VTG_FX_BASE_URL configured.'};
 const k='fx:'+b+':'+syms.join(',');const hit=get(k);if(hit)return hit;
 try{const data=await requestJson(url,{base:b,symbols:syms.join(',')});const timestamp=new Date().toISOString();return put(k,{available:true,provider:String(process.env.VTG_FX_PROVIDER||'external'),base:b,rates:data?.rates||{},timestamp,...freshness(timestamp)});}
 catch(e){return {available:false,provider:String(process.env.VTG_FX_PROVIDER||'external'),reason:'FX provider request failed.'};}
}
async function news(){
 const url=process.env.VTG_NEWS_BASE_URL;if(!url)return {available:false,provider:'none',reason:'No VTG_NEWS_BASE_URL configured.'};
 const k='news';const hit=get(k);if(hit)return hit;
 try{const data=await requestJson(url,{q:'Africa China trade shipping logistics ports customs',limit:20});const timestamp=new Date().toISOString();return put(k,{available:true,provider:String(process.env.VTG_NEWS_PROVIDER||'external'),items:Array.isArray(data?.articles)?data.articles:Array.isArray(data)?data:[],timestamp,...freshness(timestamp)});}
 catch(e){return {available:false,provider:String(process.env.VTG_NEWS_PROVIDER||'external'),reason:'News provider request failed.'};}
}
async function status(){const rows={};for(const [k,v] of Object.entries(providers))rows[k]={configured:v.configured(),provider:v.provider()};return {generatedAt:new Date().toISOString(),providers:rows};}
module.exports={fxRates,news,status};
