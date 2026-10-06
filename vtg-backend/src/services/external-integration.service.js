const axios=require('axios');
const cache=new Map();
const TTL=30000;
const providers={
  vessel:{configured:()=>Boolean(process.env.VTG_TRACKING_API_KEY),provider:()=>String(process.env.VTG_TRACKING_PROVIDER||'none')},
  fx:{configured:()=>Boolean(process.env.VTG_FX_BASE_URL),provider:()=>String(process.env.VTG_FX_PROVIDER||'none')},
  news:{configured:()=>Boolean(process.env.VTG_NEWS_BASE_URL),provider:()=>String(process.env.VTG_NEWS_PROVIDER||'none')}
};
function get(key){const x=cache.get(key);return x&&Date.now()-x.at<TTL?x.value:null}
function put(key,value){cache.set(key,{at:Date.now(),value});return value}
async function fxRates(base='USD',symbols=['NGN','CNY','KRW']){
 const b=String(base).toUpperCase();const syms=symbols.map(x=>String(x).toUpperCase()).filter(Boolean);
 const url=process.env.VTG_FX_BASE_URL;
 if(!url)return {available:false,provider:'none',reason:'No VTG_FX_BASE_URL configured.'};
 const key='fx:'+b+':'+syms.join(',');
 const hit=get(key);if(hit)return hit;
 try{const r=await axios.get(url,{params:{base:b,symbols:syms.join(',')},timeout:8000});return put(key,{available:true,provider:String(process.env.VTG_FX_PROVIDER||'external'),base:b,rates:r.data?.rates||{},timestamp:new Date().toISOString()});}
 catch(e){return {available:false,provider:String(process.env.VTG_FX_PROVIDER||'external'),reason:'FX provider request failed.'};}
}
async function status(){
 const rows={};
 for(const [k,v] of Object.entries(providers))rows[k]={configured:v.configured(),provider:v.provider()};
 return {generatedAt:new Date().toISOString(),providers:rows};
}
module.exports={fxRates,status};
