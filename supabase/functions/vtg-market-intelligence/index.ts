import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
async function loadNews(){
  const query='("Africa China trade" OR "Nigeria customs" OR "Nigeria imports" OR "shipping ports" OR "freight logistics" OR "South Korea trade" OR "trade tariffs" OR "supply chain")';
  const url="https://api.gdeltproject.org/api/v2/doc/doc?query="+encodeURIComponent(query)+"&mode=ArtList&format=json&maxrecords=50&sort=HybridRel&timespan=24h";
  const response=await fetch(url,{headers:{Accept:"application/json","User-Agent":"VTG-Market-Intelligence/1.0"},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error("News discovery source returned HTTP "+response.status);
  const payload=await response.json();
  const seen=new Set<string>();
  const items=(Array.isArray(payload.articles)?payload.articles:[]).map((a:any)=>{
    const title=clean(a.title,500),url=clean(a.url,1800),domain=clean(a.domain,255).toLowerCase();
    const parsed=parseSeenDate(a.seendate),{topic,relevance,trusted}=classify(title,domain);
    return {title,url,domain,source:domain||"Publisher not identified",topic,relevance,trusted,discoveredAt:parsed,publishedAt:null,provider:"GDELT",summary:contextNote(topic)};
  }).filter((a:any)=>{
    if(!a.title||!/^https?:\/\//i.test(a.url)||!a.trusted||a.relevance<2||!a.discoveredAt||seen.has(a.url.split("#")[0]))return false;
    seen.add(a.url.split("#")[0]);return true;
  }).sort((a:any,b:any)=>Date.parse(b.discoveredAt)-Date.parse(a.discoveredAt)).slice(0,12);
  return {items,count:items.length,provider:"GDELT",fetchedAt:new Date().toISOString(),timestampMeaning:"GDELT discovery/seen time; not the publisher's confirmed publication time",note:"Headlines are source-linked discovery results. VTG has not independently verified the article's claims."};
}
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
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