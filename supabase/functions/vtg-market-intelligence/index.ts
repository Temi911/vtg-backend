import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

const trustedDomains = [
  "reuters.com","apnews.com","bbc.com","bbc.co.uk","ft.com","bloomberg.com",
  "aljazeera.com","unctad.org","wto.org","trade.gov","intracen.org",
  "customs.gov.ng","nigerianports.gov.ng","imo.org","worldbank.org","imf.org",
  "afdb.org","ec.europa.eu","gov.uk","gov.cn","gov.kr","punchng.com",
  "premiumtimesng.com","businessday.ng","thecable.ng","nairametrics.com",
];
const topicTerms: [string,string[]][] = [
  ["Nigeria customs",["nigeria customs","nigerian customs","nigeria import","customs duty nigeria","nigeria tariff","nigeria port"]],
  ["Africa–China trade",["africa china trade","china africa trade","china nigeria trade","china nigeria imports"]],
  ["Shipping & ports",["shipping","freight","container","port congestion","port authority","vessel","maritime","cargo","logistics"]],
  ["FX & landed cost",["naira","yuan","renminbi","foreign exchange","exchange rate","currency","freight cost","import cost"]],
  ["South Korea trade",["south korea trade","korea africa trade","korean exports","korean imports","korea nigeria"]],
  ["Products & sourcing",["manufacturing","commodity","supply chain","supplier","sourcing","export ban","trade agreement","tariff","trade policy"]],
];
function clean(value: unknown, max=500): string {
  return String(value ?? "").replace(/\s+/g," ").trim().slice(0,max);
}
function parseSeenDate(value: unknown): string | null {
  const s=String(value??"");
  if(/^\d{14}$/.test(s)){
    const d=new Date(s.slice(0,4)+"-"+s.slice(4,6)+"-"+s.slice(6,8)+"T"+s.slice(8,10)+":"+s.slice(10,12)+":"+s.slice(12,14)+"Z");
    return Number.isNaN(d.getTime())?null:d.toISOString();
  }
  const d=new Date(s);
  return s&& !Number.isNaN(d.getTime())?d.toISOString():null;
}
function classify(title:string,domain:string){
  const hay=(title+" "+domain).toLowerCase();
  let topic="Trade & logistics",score=0;
  for(const [label,terms] of topicTerms){const hits=terms.filter(term=>hay.includes(term)).length;if(hits>score){topic=label;score=hits;}}
  const relevance=Math.min(10,score*2+(/nigeria|africa|china|korea|shipping|port|customs|trade|freight|import|export|tariff/i.test(hay)?2:0));
  const trusted=trustedDomains.some(d=>domain===d||domain.endsWith("."+d));
  return {topic,relevance,trusted};
}
function contextNote(topic:string){
  const notes:Record<string,string>={
    "Nigeria customs":"Check the original notice, effective date, tariff code and implementation guidance before acting.",
    "Africa–China trade":"Assess supplier availability, payment terms, documentation and landed-cost implications across this corridor.",
    "Shipping & ports":"Verify carrier and port details directly before changing shipment plans, delivery estimates or freight budgets.",
    "FX & landed cost":"Confirm the applicable rate and bank charges with your provider before using any figure in an estimate.",
    "South Korea trade":"Check the original announcement for affected products, origin rules and documentation requirements.",
    "Products & sourcing":"Validate product specifications, supplier credentials and destination-market requirements.",
    "Trade & logistics":"Open the original source and verify the facts, date and trade-route relevance before making a decision.",
  };
  return notes[topic]||notes["Trade & logistics"];
}
async function getBuyer(req:Request){
  const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_ANON_KEY")??Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const auth=req.headers.get("Authorization")??"",token=auth.startsWith("Bearer ")?auth.slice(7):"";
  if(!url||!key||!token)throw new Error("AUTH_REQUIRED");
  const db=createClient(url,key,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
  const who=await db.auth.getUser(token);
  if(who.error||!who.data.user)throw new Error("AUTH_INVALID");
  const profile=await db.from("profiles").select("role,is_active").eq("id",who.data.user.id).maybeSingle();
  if(profile.error||profile.data?.role!=="buyer"||profile.data?.is_active!==true)throw new Error("BUYER_REQUIRED");
  return who.data.user;
}

async function getTradeUser(req:Request){
  const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_ANON_KEY")??Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const auth=req.headers.get("Authorization")??"",token=auth.startsWith("Bearer ")?auth.slice(7):"";
  if(!url||!key||!token)throw new Error("AUTH_REQUIRED");
  const db=createClient(url,key,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
  const who=await db.auth.getUser(token);
  if(who.error||!who.data.user)throw new Error("AUTH_INVALID");
  const profile=await db.from("profiles").select("role,is_active").eq("id",who.data.user.id).maybeSingle();
  if(profile.error||profile.data?.is_active!==true||!["buyer","supplier","bank","admin"].includes(profile.data?.role))throw new Error("TRADE_ROLE_REQUIRED");
  return {user:who.data.user,role:profile.data.role};
}
function authError(error:unknown){
  const code=(error as Error)?.message;
  const status=code==="AUTH_REQUIRED"||code==="AUTH_INVALID"?401:code==="TRADE_ROLE_REQUIRED"||code==="BUYER_REQUIRED"?403:500;
  return reply({error:status===401?"A valid signed-in session is required.":status===403?"An active buyer, supplier, bank or admin account is required.":"Market intelligence request could not be completed."},status);
}
function landedCostEstimate(input:any){
  const currency=String(input?.currency??"").trim().toUpperCase();
  const goodsValue=Number(input?.goodsValue);
  const freight=input?.freight===undefined?0:Number(input.freight);
  const insurance=input?.insurance===undefined?0:Number(input.insurance);
  const dutyRate=Number(input?.dutyRate);
  const vatRate=input?.vatRate===undefined?0:Number(input.vatRate);
  const vatBasis=input?.vatBasis===undefined?"cif_plus_duty":String(input.vatBasis);
  const otherCharges=input?.otherCharges===undefined?0:Number(input.otherCharges);
  const assumptions=Array.isArray(input?.assumptions)?input.assumptions: [];
  const amounts=[goodsValue,freight,insurance,otherCharges];
  if(!/^[A-Z]{3}$/.test(currency)||amounts.some(v=>!Number.isFinite(v)||v<0)||!Number.isFinite(dutyRate)||dutyRate<0||dutyRate>1||!Number.isFinite(vatRate)||vatRate<0||vatRate>1||!["cif","cif_plus_duty"].includes(vatBasis)||assumptions.length>30||assumptions.some((v:any)=>typeof v!=="string"||!v.trim()||v.length>500)){
    throw new Error("INVALID_ESTIMATE");
  }
  const round=(v:number)=>Math.round((v+Number.EPSILON)*100)/100;
  const cif=round(goodsValue+freight+insurance),duty=round(cif*dutyRate);
  const vatBase=vatBasis==="cif"?cif:cif+duty,vat=round(vatBase*vatRate);
  return {schemaVersion:"1.0",kind:"landed_cost",status:"indicative",currency,
    components:{goods:round(goodsValue),freight:round(freight),insurance:round(insurance),cif,duty,vat,otherCharges:round(otherCharges)},
    rates:{dutyRate,vatRate,vatBasis},estimatedTotal:round(cif+duty+vat+otherCharges),source:null,
    assumptions:[...assumptions,"Duty and VAT rates are treated as supplied inputs; this calculator does not determine legally applicable tariff rates.","Does not include charges not entered by the user, such as port, inspection, agency, bank, storage, demurrage or inland delivery fees."],
    limitations:["Indicative planning estimate only; not a customs valuation, binding tariff ruling, tax advice, freight offer or payment instruction.","Confirm the HS classification, customs valuation basis, exemptions, levies, VAT base and applicable rates with the relevant customs authority or licensed clearing agent."]};
}
type TradeStatisticsCacheEntry={cachedAt:number;value:any};
const tradeStatisticsCache=new Map<string,TradeStatisticsCacheEntry>();
const TRADE_STATS_CACHE_TTL_MS=6*60*60*1000;
const TRADE_STATS_STALE_MAX_MS=7*24*60*60*1000;

async function loadTradeStatistics(url:URL){
  const reporterCode=String(url.searchParams.get("reporterCode")||"");
  const flowCode=String(url.searchParams.get("flowCode")||"M").toUpperCase();
  const currentYear=new Date().getUTCFullYear();
  const period=String(url.searchParams.get("period")||String(currentYear-2));
  const cmdCode=String(url.searchParams.get("cmdCode")||"");
  if(!/^\\d{2,3}$/.test(reporterCode))throw new Error("INVALID_REPORTER");
  if(!["M","X"].includes(flowCode))throw new Error("INVALID_FLOW");
  if(!/^\\d{4}$/.test(period)||Number(period)<2010||Number(period)>currentYear)throw new Error("INVALID_PERIOD");
  if(!/^\\d{2,6}$/.test(cmdCode))throw new Error("INVALID_HS_CODE");
  const cacheKey=[reporterCode,flowCode,period,cmdCode].join(":");
  const now=Date.now(),cached=tradeStatisticsCache.get(cacheKey);
  if(cached&&now-cached.cachedAt<TRADE_STATS_CACHE_TTL_MS){
    return {...cached.value,cache:{status:"fresh",ageSeconds:Math.floor((now-cached.cachedAt)/1000),ttlSeconds:Math.floor((TRADE_STATS_CACHE_TTL_MS-(now-cached.cachedAt))/1000)}};
  }
  try{
    const upstreamUrl=new URL("https://comtradeapi.un.org/public/v1/preview/C/A/HS");
    for(const [key,value] of Object.entries({period,reporterCode,cmdCode,flowCode,partnerCode:"0",partner2Code:"0",motCode:"0",aggregateBy:"6",breakdownMode:"classic",includeDesc:"true"}))upstreamUrl.searchParams.set(key,value);
    const upstream=await fetch(upstreamUrl,{headers:{Accept:"application/json","User-Agent":"VTG-Market-Intelligence/1.0"},signal:AbortSignal.timeout(18000)});
    if(!upstream.ok)throw new Error(upstream.status===429?"PROVIDER_RATE_LIMITED":"PROVIDER_UNAVAILABLE");
    const payload=await upstream.json();
    if(payload?.error||payload?.validation?.length)throw new Error("PROVIDER_UNAVAILABLE");
    const records=Array.isArray(payload.data)?payload.data:[];
    const items=records.slice(0,100).map((row:any)=>{
      const value=Number(row.primaryValue),valid=Number.isFinite(value);
      return {reporterCode:row.reporterCode,reporter:row.reporterDesc||null,partnerCode:row.partnerCode,partnerDesc:row.partnerDesc||"World",period:row.period||period,flowCode:row.flowCode||flowCode,flowDesc:row.flowDesc||(flowCode==="M"?"Imports":"Exports"),cmdCode:row.cmdCode||cmdCode,cmdDesc:row.cmdDesc||null,tradeValue:valid?value:null,tradeValueFormatted:valid?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(value):"Value unavailable",netWgt:row.netWgt==null?null:Number(row.netWgt),qty:row.qty==null?null:Number(row.qty),qtyUnitAbbr:row.qtyUnitAbbr||null};
    });
    const result={source:"UN Comtrade public preview",dataType:"historical trade statistics; not a live quote",reporter:items[0]?.reporter||null,reporterCode,flow:flowCode==="M"?"Imports":"Exports",period,cmdCode,count:items.length,fetchedAt:new Date().toISOString(),timestampMeaning:"VTG retrieval time; the reporting period is the year selected above",coverageNote:"A returned result may be incomplete, revised or delayed. No returned records do not prove that no trade occurred.",items};
    tradeStatisticsCache.set(cacheKey,{cachedAt:now,value:result});
    return {...result,cache:{status:"refreshed",ageSeconds:0,ttlSeconds:Math.floor(TRADE_STATS_CACHE_TTL_MS/1000)}};
  }catch(error){
    if(cached&&now-cached.cachedAt<TRADE_STATS_STALE_MAX_MS){
      return {...cached.value,cache:{status:"stale",ageSeconds:Math.floor((now-cached.cachedAt)/1000),warning:"The provider could not refresh this result. Showing a previously retrieved copy; verify against UN Comtrade before relying on it."}};
    }
    throw error;
  }
}


function decodeXml(value:string){
  return value.replaceAll("<![CDATA[","").replaceAll("]]>","").replaceAll("&amp;","&").replaceAll("&lt;","<").replaceAll("&gt;",">").replaceAll("&quot;",'"').replaceAll("&#39;","'").replaceAll("&apos;","'").trim();
}
function rssTag(block:string,name:string){
  const open="<"+name+">",close="</"+name+">",start=block.indexOf(open);
  if(start<0)return "";
  const end=block.indexOf(close,start+open.length);
  return end<0?"":decodeXml(block.slice(start+open.length,end));
}
function isHttpUrl(value:string){
  try{const url=new URL(value);return url.protocol==="http:"||url.protocol==="https:";}catch(_){return false;}
}
async function loadGoogleNews(){
  const query='("Africa China trade" OR "Nigeria customs" OR "Nigeria imports" OR "shipping ports" OR "freight logistics" OR "South Korea trade") when:7d';
  const url="https://news.google.com/rss/search?q="+encodeURIComponent(query)+"&hl=en-US&gl=NG&ceid=NG:en";
  const response=await fetch(url,{headers:{Accept:"application/rss+xml, application/xml, text/xml","User-Agent":"VTG-Market-Intelligence/1.0"},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error("Google News RSS returned HTTP "+response.status);
  const xml=await response.text(),seen=new Set<string>();
  const blocks=xml.split("<item>").slice(1).map((item)=>item.split("</item>")[0]||"");
  const items=blocks.map((item)=>{
    const title=rssTag(item,"title"),articleUrl=rssTag(item,"link"),dateValue=rssTag(item,"pubDate");
    const sourceOpen=item.match(/<source[^>]*>/i)?.[0]||"";
    const sourceUrl=sourceOpen.match(/url=["']([^"']+)["']/i)?.[1]||"";
    const sourceText=sourceOpen?(item.split(sourceOpen)[1]||"").split("</source>")[0]||"":"";
    let domain="",source="";
    try{domain=new URL(sourceUrl).hostname.replace(/^www\./,"").toLowerCase();}catch(_){}
    source=decodeXml(sourceText)||domain;
    const discoveredAt=dateValue&&!Number.isNaN(Date.parse(dateValue))?new Date(dateValue).toISOString():null;
    const {topic,relevance,trusted}=classify(title,domain);
    return {title,url:articleUrl,domain,source:source||domain||"Publisher not identified",topic,relevance,trusted,discoveredAt,publishedAt:null,provider:"Google News RSS",summary:contextNote(topic)};
  }).filter((item:any)=>{
    if(!item.title||!isHttpUrl(item.url)||!item.trusted||item.relevance<2||!item.discoveredAt||Date.parse(item.discoveredAt)>Date.now()+5*60*1000||Date.now()-Date.parse(item.discoveredAt)>7*24*60*60*1000||seen.has(item.url.split("#")[0]))return false;
    seen.add(item.url.split("#")[0]);return true;
  }).sort((a:any,b:any)=>Date.parse(b.discoveredAt)-Date.parse(a.discoveredAt)).slice(0,12);
  return {items,count:items.length,provider:"Google News RSS",fetchedAt:new Date().toISOString(),timestampMeaning:"Google News RSS item date; not independently verified publisher publication time",note:"Headlines link through Google News to the named publisher. VTG has not independently verified the article's claims."};
}
async function loadGdeltNews(){
  const query='("Africa China trade" OR "Nigeria customs" OR "Nigeria imports" OR "shipping ports" OR "freight logistics" OR "South Korea trade")';
  const url="https://api.gdeltproject.org/api/v2/doc/doc?query="+encodeURIComponent(query)+"&mode=ArtList&format=json&maxrecords=20&sort=DateDesc&timespan=24h";
  const response=await fetch(url,{headers:{Accept:"application/json","User-Agent":"VTG-Market-Intelligence/1.0"},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error("GDELT returned HTTP "+response.status);
  const payload=await response.json(),seen=new Set<string>();
  const items=(Array.isArray(payload.articles)?payload.articles:[]).map((a:any)=>{
    const title=clean(a.title,500),url=clean(a.url,1800),domain=clean(a.domain,255).toLowerCase();
    const parsed=parseSeenDate(a.seendate),{topic,relevance,trusted}=classify(title,domain);
    return {title,url,domain,source:domain||"Publisher not identified",topic,relevance,trusted,discoveredAt:parsed,publishedAt:null,provider:"GDELT",summary:contextNote(topic)};
  }).filter((a:any)=>{
    if(!a.title||!isHttpUrl(a.url)||!a.trusted||a.relevance<2||!a.discoveredAt||seen.has(a.url.split("#")[0]))return false;
    seen.add(a.url.split("#")[0]);return true;
  }).sort((a:any,b:any)=>Date.parse(b.discoveredAt)-Date.parse(a.discoveredAt)).slice(0,12);
  return {items,count:items.length,provider:"GDELT",fetchedAt:new Date().toISOString(),timestampMeaning:"GDELT discovery/seen time; not the publisher's confirmed publication time",note:"Headlines are source-linked discovery results. VTG has not independently verified the article's claims."};
}
async function loadNews(){
  try{const feed=await loadGoogleNews();if(feed.items.length)return feed;}catch(error){console.error("VTG_MI_GOOGLE_RSS_ERROR",String((error as Error)?.message||error).slice(0,300));}
  try{return await loadGdeltNews();}catch(error){console.error("VTG_MI_GDELT_ERROR",String((error as Error)?.message||error).slice(0,300));throw error;}
}
const publicEstimateBuckets=new Map<string,{start:number,count:number}>();
function allowPublicEstimate(req:Request){
  const ip=req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
  const now=Date.now(),current=publicEstimateBuckets.get(ip);
  if(!current||now-current.start>=60_000){publicEstimateBuckets.set(ip,{start:now,count:1});return true;}
  if(current.count>=30)return false;
  current.count+=1;return true;
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  const pathParts=new URL(req.url).pathname.split("/").filter(Boolean);
  const routePath=pathParts.slice(pathParts.indexOf("vtg-market-intelligence")+1).join("/");
  if(req.method==="GET" && routePath==="news"){
    try{return reply({ok:true,...await loadNews()});}
    catch(error){console.error("VTG_MI_NEWS_UPSTREAM_ERROR",String((error as Error)?.message||error).slice(0,500));return reply({ok:false,error:"Trade news discovery is temporarily unavailable.",items:[],count:0,fetchedAt:new Date().toISOString()},503);}
  }

  if(req.method==="POST" && routePath==="trade/landed-cost"){
    if(!allowPublicEstimate(req))return reply({error:"Too many calculator requests. Please try again shortly."},429);
    const body=await req.json().catch(()=>null);
    if(!body||typeof body!=="object"||Array.isArray(body))return reply({error:"A valid landed-cost request is required."},400);
    const quantity=Number(body.quantity),unitPrice=Number(body.unitPrice),currency=String(body.currency||"USD").trim().toUpperCase();
    const freight=body.freight===undefined?0:Number(body.freight),insurance=body.insurance===undefined?0:Number(body.insurance);
    const dutyRate=body.dutyRate===undefined?0.2:Number(body.dutyRate),vatRate=body.vatRate===undefined?0.075:Number(body.vatRate);
    const otherLevies=body.otherLevies===undefined?0:Number(body.otherLevies),portCharges=body.portCharges===undefined?0:Number(body.portCharges);
    const clearingFee=body.clearingFee===undefined?0:Number(body.clearingFee),inlandTransport=body.inlandTransport===undefined?0:Number(body.inlandTransport);
    const amounts=[unitPrice,freight,insurance,otherLevies,portCharges,clearingFee,inlandTransport];
    if(!Number.isFinite(quantity)||quantity<=0||quantity>100_000_000||amounts.some(v=>!Number.isFinite(v)||v<0||v>1_000_000_000_000)||
       !/^[A-Z]{3}$/.test(currency)||!Number.isFinite(dutyRate)||dutyRate<0||dutyRate>1||!Number.isFinite(vatRate)||vatRate<0||vatRate>1){
      return reply({error:"Enter a valid quantity, currency, non-negative charges and duty/VAT rates between 0 and 100%."},400);
    }
    const country=String(body.country||body.destination||"Nigeria").trim().toUpperCase();
    if(country!=="NG"&&country!=="NIGERIA"){
      return reply({supported:false,message:"A country-specific statutory calculator is not enabled for this destination yet. Do not invent government rates; use an authoritative customs source.",generatedAt:new Date().toISOString()});
    }
    const productValue=unitPrice*quantity,cif=productValue+freight+insurance,duty=cif*dutyRate,vat=(cif+duty)*vatRate;
    const localCharges=otherLevies+portCharges+clearingFee+inlandTransport;
    const landedBeforeLocalCharges=cif+duty+vat;
    return reply({supported:true,country:"Nigeria",currency,quantity,productValue,freight,insurance,cif,dutyRate,duty,vatRate,vat,
      customsTaxes:duty+vat,landedBeforeLocalCharges,otherLevies,portCharges,clearingFee,inlandTransport,localCharges,
      estimatedTotalLandedCost:landedBeforeLocalCharges+localCharges,
      methodology:"Illustrative calculation. Final classification, customs valuation and statutory assessment remain subject to the competent customs authority.",
      source:"Duty and VAT rates are user-supplied assumptions; no official tariff lookup is performed.",generatedAt:new Date().toISOString()});
  }

  if(req.method==="GET" && routePath==="tools/contract"){
    try{
      await getTradeUser(req);
      return reply({schemaVersion:"1.0",recordKinds:["fx_rate","tariff_rule","country_rule","freight_quote","market_signal","landed_cost"],statuses:["live","indicative","demo","unavailable"],freshness:["current","recent","stale","unknown"],provenanceRequired:["source name","authority type","retrieval timestamp for live records"],providers:{tariff:"not connected by this endpoint",freight:"not connected by this endpoint",fx:"client-side indicative exchange-rate feed; not verified by this API",tradeStatistics:"UN Comtrade public preview is available through the separate trade-statistics route; historical/statistical data, not a live quote"},note:"Contract discovery only; this response does not claim that live tariff or freight data is available."});
    }catch(error){return authError(error);}
  }
  if(req.method==="POST" && routePath==="tools/landed-cost/estimate"){
    try{
      await getTradeUser(req);
      const body=await req.json().catch(()=>null);
      if(!body||typeof body!=="object"||Array.isArray(body))return reply({error:"A valid estimate payload is required."},400);
      try{return reply({estimate:landedCostEstimate(body),generatedAt:new Date().toISOString()});}
      catch(error){if((error as Error)?.message==="INVALID_ESTIMATE")return reply({error:"Enter a valid currency, non-negative amounts, rates between 0 and 100%, and supported VAT basis."},400);throw error;}
    }catch(error){return authError(error);}
  }
  if(req.method==="GET" && routePath==="trade"){
    try{
      await getTradeUser(req);
      try{return reply(await loadTradeStatistics(new URL(req.url)));}
      catch(error){
        const code=(error as Error)?.message;
        const status=code==="INVALID_REPORTER"||code==="INVALID_FLOW"||code==="INVALID_PERIOD"||code==="INVALID_HS_CODE"?400:code==="PROVIDER_RATE_LIMITED"?503:code==="PROVIDER_UNAVAILABLE"?502:code==="TimeoutError"||code==="AbortError"?504:500;
        const message=status===400?"Check the reporting market, trade flow, year and HS product code.":status===503?"The trade-statistics provider is rate-limiting requests. Please try again shortly.":status===502?"The trade-statistics provider is temporarily unavailable.":status===504?"The trade-statistics request timed out. Please try again.":"Trade statistics could not be loaded.";
        return reply({error:message,source:"UN Comtrade public preview"},status);
      }
    }catch(error){return authError(error);}
  }
  if(req.method!=="POST")return reply({error:"Method not allowed"},405);
  try{
    await getBuyer(req);
    const body=await req.json().catch(()=>({}));
    const action=String(body.action??"");
    if(action==="status"){
      const checkedAt=new Date().toISOString();
      return reply({
        ok:true,api:{connected:true,service:"VTG Supabase Edge Function",checkedAt},
        providers:{
          fx:{status:"not_connected",connected:false,message:"No verified FX provider is connected. Enter a current bank/provider quote manually."},
          tariffs:{status:"not_connected",connected:false,message:"No tariff-data provider is connected. Confirm HS classification and destination rules with the relevant customs authority."},
          freight:{status:"not_connected",connected:false,message:"No freight or port-data provider is connected. Use a current written carrier or forwarder quotation."},
          landedCost:{status:"indicative_only",available:true,message:"The calculator uses user-supplied assumptions; it does not determine statutory duty or tax rates."}
        },
        note:"A reachable VTG endpoint does not mean a third-party data provider is connected."
      });
    }
    if(action==="news"){
      try{return reply({ok:true,...await loadNews()});}
      catch(error){return reply({ok:false,error:"Trade news discovery is temporarily unavailable.",detail:clean((error as Error)?.message,240),items:[],count:0,fetchedAt:new Date().toISOString()});}
    }
    return reply({error:"Unsupported market-intelligence action."},400);
  }catch(error){
    const code=(error as Error)?.message;
    const status=code==="AUTH_REQUIRED"||code==="AUTH_INVALID"?401:code==="BUYER_REQUIRED"?403:500;
    return reply({error:status===401?"A valid signed-in session is required.":status===403?"An active buyer account is required.":"Market intelligence request could not be completed."},status);
  }
});