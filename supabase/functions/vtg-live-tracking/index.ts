import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-vtg-webhook-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const env = (key: string) => Deno.env.get(key) || "";
const supabaseUrl = env("SUPABASE_URL");
const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
const anonKey = env("SUPABASE_ANON_KEY");
const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

type CargoProvider = "vizion" | "tracking_one";
type AISProvider = "vesselfinder" | "marinetraffic";
const cargoEnv = (p: CargoProvider) => p === "vizion"
  ? { base: "VIZION_API_BASE_URL", path: "VIZION_CREATE_TRACKING_PATH", key: "VIZION_API_KEY", header: "VIZION_AUTH_HEADER", prefix: "VIZION_AUTH_PREFIX" }
  : { base: "TRACKING_ONE_API_BASE_URL", path: "TRACKING_ONE_CREATE_TRACKING_PATH", key: "TRACKING_ONE_API_KEY", header: "TRACKING_ONE_AUTH_HEADER", prefix: "TRACKING_ONE_AUTH_PREFIX" };
const aisEnv = (p: AISProvider) => p === "vesselfinder"
  ? { base: "VESSELFINDER_API_BASE_URL", path: "VESSELFINDER_POSITION_PATH", key: "VESSELFINDER_API_KEY", header: "VESSELFINDER_AUTH_HEADER", prefix: "VESSELFINDER_AUTH_PREFIX" }
  : { base: "MARINETRAFFIC_API_BASE_URL", path: "MARINETRAFFIC_POSITION_PATH", key: "MARINETRAFFIC_API_KEY", header: "MARINETRAFFIC_AUTH_HEADER", prefix: "MARINETRAFFIC_AUTH_PREFIX" };

function configured(keys: {base:string;path:string;key:string}) {
  return Boolean(env(keys.base) && env(keys.path) && env(keys.key));
}
function authHeader(keys: {key:string;header:string;prefix:string}) {
  const name = env(keys.header) || "Authorization";
  const prefix = env(keys.prefix) || (name.toLowerCase() === "authorization" ? "Bearer " : "");
  return { [name]: prefix + env(keys.key) };
}
async function providerRequest(url: URL, keys: {key:string;header:string;prefix:string}, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Accept": "application/json", ...(body ? {"Content-Type":"application/json"} : {}), ...authHeader(keys) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(18000),
  });
  const text = await response.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text.slice(0, 500) }; }
  if (!response.ok) throw new Error("Provider request failed with HTTP " + response.status);
  return data;
}
async function buyerContext(req: Request) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Sign in is required.");
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: "Bearer " + token } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data.user) throw new Error("Your VTG session is invalid or expired.");
  const { data: profile, error: pe } = await admin.from("profiles").select("role,is_active").eq("id", data.user.id).maybeSingle();
  if (pe || profile?.role !== "buyer" || profile?.is_active !== true) throw new Error("An active buyer account is required.");
  return { user: data.user, userClient };
}
async function ownedShipment(shipmentId: string, buyerId: string) {
  const { data: shipment, error } = await admin.from("shipments").select("id,order_id,origin_port,destination_port,status").eq("id", shipmentId).maybeSingle();
  if (error || !shipment) throw new Error("Shipment was not found.");
  const { data: order, error: oe } = await admin.from("trade_orders").select("id,buyer_id,reference").eq("id", shipment.order_id).maybeSingle();
  if (oe || !order || order.buyer_id !== buyerId) throw new Error("This shipment is not linked to your buyer account.");
  return { shipment, order };
}
async function log(provider: string, operation: string, shipmentId: string | null, status: string, httpStatus: number | null, detail: string) {
  await admin.schema("private").from("tracking_provider_logs").insert({ provider, operation, shipment_id: shipmentId, status, http_status: httpStatus, detail: detail.slice(0, 500) });
}
const str = (v: unknown) => typeof v === "string" || typeof v === "number" ? String(v) : "";
const iso = (v: unknown) => {
  const d = v ? new Date(String(v)) : new Date();
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};
function findArray(o: any): any[] {
  if (Array.isArray(o)) return o;
  for (const k of ["events","milestones","data","results","items","positions","vessels"]) if (Array.isArray(o?.[k])) return o[k];
  if (o && typeof o === "object") for (const v of Object.values(o)) if (Array.isArray(v)) return v as any[];
  return [];
}
function normalizeEvent(e: any) {
  const loc = e.location || e.port || e.facility || e.place || {};
  const lat = Number(e.latitude ?? e.lat ?? loc.latitude ?? loc.lat);
  const lon = Number(e.longitude ?? e.lon ?? e.lng ?? loc.longitude ?? loc.lon ?? loc.lng);
  return {
    provider_event_id: str(e.id ?? e.event_id ?? e.eventId ?? e.reference_id) || null,
    event_code: str(e.code ?? e.event_code ?? e.type ?? e.status_code) || null,
    event_label: str(e.label ?? e.description ?? e.event ?? e.status ?? e.type) || "Shipment update",
    description: str(e.description ?? e.details ?? e.message) || null,
    location: typeof loc === "string" ? loc : str(loc.name ?? loc.port_name ?? loc.city ?? e.location_name) || null,
    latitude: Number.isFinite(lat) && lat >= -90 && lat <= 90 ? lat : null,
    longitude: Number.isFinite(lon) && lon >= -180 && lon <= 180 ? lon : null,
    event_time: iso(e.event_time ?? e.timestamp ?? e.datetime ?? e.date ?? e.time),
  };
}
async function storeCargoEvents(provider: CargoProvider, payload: any, forcedReference?: any) {
  const events = findArray(payload);
  const referenceId = str(payload.tracking_reference_id ?? payload.reference_id ?? payload.tracking_id);
  let ref = forcedReference || null;
  if (!ref && referenceId) {
    const { data } = await admin.from("shipment_tracking_references").select("*").eq("provider_reference", referenceId).eq("cargo_provider", provider).maybeSingle();
    ref = data;
  }
  if (!ref) throw new Error("No VTG tracking reference matches this provider update.");
  let inserted = 0;
  for (const e of events) {
    const n = normalizeEvent(e);
    const dedupe = provider + ":" + (n.provider_event_id || await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(n))).then(b => Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("")));
    const { data: saved, error } = await admin.from("shipment_tracking_events").upsert({
      tracking_reference_id: ref.id, shipment_id: ref.shipment_id, trade_order_id: ref.trade_order_id, buyer_id: ref.buyer_id,
      provider, provider_event_id: n.provider_event_id, idempotency_key: dedupe, ...n, source_mode: ref.source_mode, raw_payload: e,
    }, { onConflict: "idempotency_key", ignoreDuplicates: true }).select("id");
    if (error) throw error;
    if (saved?.length) {
      inserted++;
      await admin.from("shipment_events").insert({ shipment_id: ref.shipment_id, event_type: n.event_code || n.event_label, description: n.description || n.event_label, location: n.location, event_time: n.event_time });
    }
  }
  await admin.from("shipment_tracking_references").update({ provider_status: "active", last_synced_at: new Date().toISOString() }).eq("id", ref.id);
  return inserted;
}
function normalizePosition(p: any) {
  const lat = Number(p.latitude ?? p.lat ?? p.position?.latitude);
  const lon = Number(p.longitude ?? p.lon ?? p.lng ?? p.position?.longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) throw new Error("Provider returned invalid vessel coordinates.");
  return {
    latitude: lat, longitude: lon,
    speed_knots: Number.isFinite(Number(p.speed ?? p.speed_knots)) ? Number(p.speed ?? p.speed_knots) : null,
    course_degrees: Number.isFinite(Number(p.course ?? p.course_over_ground)) ? Number(p.course ?? p.course_over_ground) : null,
    heading_degrees: Number.isFinite(Number(p.heading)) ? Number(p.heading) : null,
    navigation_status: str(p.navigation_status ?? p.status) || null,
    position_time: iso(p.position_time ?? p.timestamp ?? p.last_position_time ?? p.time),
  };
}
async function storePosition(vessel: any, provider: AISProvider, raw: any) {
  const p = normalizePosition(raw);
  const record = { vessel_id:vessel.id, shipment_id:vessel.shipment_id, trade_order_id:vessel.trade_order_id, buyer_id:vessel.buyer_id, provider, ...p, source_mode:vessel.source_mode, raw_payload:raw, received_at:new Date().toISOString() };
  const { error: he } = await admin.from("vessel_position_history").upsert(record, { onConflict:"vessel_id,position_time,provider", ignoreDuplicates:true });
  if (he) throw he;
  const { error: le } = await admin.from("vessel_position_latest").upsert(record, { onConflict:"vessel_id" });
  if (le) throw le;
  return p;
}
async function main(req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers:cors });
  if (req.method !== "POST" && req.method !== "GET") return json({error:"Method not allowed"},405);
  const actionFromUrl = new URL(req.url).searchParams.get("action");
  let body: any = {};
  if (req.method === "POST") { try { body = await req.json(); } catch { return json({error:"Invalid JSON body"},400); } }
  const action = body.action || actionFromUrl || "status";
  if (action === "webhook") {
    const provider = body.provider as CargoProvider;
    if (!["vizion","tracking_one"].includes(provider)) return json({error:"Unsupported cargo provider"},400);
    const secret = env("VTG_TRACKING_WEBHOOK_SECRET_" + provider.toUpperCase());
    if (!secret || req.headers.get("x-vtg-webhook-secret") !== secret) return json({error:"Webhook authentication failed"},401);
    try { const count = await storeCargoEvents(provider, body.payload || body); return json({ok:true,accepted:count}); }
    catch(e) { await log(provider,"webhook",null,"error",400,String(e)); return json({error:String(e)},400); }
  }
  try {
    const { user } = await buyerContext(req);
    if (action === "status") {
      return json({ ok:true, mode:"provider-readiness", cargo:{ vizion:configured(cargoEnv("vizion")), tracking_one:configured(cargoEnv("tracking_one")) }, ais:{ vesselfinder:configured(aisEnv("vesselfinder")), marinetraffic:configured(aisEnv("marinetraffic")) }, liveDataEnabled:false, note:"Provider credentials and endpoint configuration are required before live requests can run." });
    }
    if (action === "register-reference") {
      const shipmentId = str(body.shipment_id);
      const type = str(body.reference_type);
      const value = str(body.reference_value).trim().toUpperCase();
      const provider = body.provider as CargoProvider;
      const mode = body.source_mode === "sandbox" ? "sandbox" : "live";
      if (!shipmentId || !value || !["container","bill_of_lading","booking"].includes(type) || !["vizion","tracking_one"].includes(provider)) return json({error:"Shipment, reference type, reference value and cargo provider are required."},400);
      const {shipment,order}=await ownedShipment(shipmentId,user.id);
      const row = {shipment_id:shipment.id,trade_order_id:order.id,buyer_id:user.id,reference_type:type,reference_value:value,carrier_code:str(body.carrier_code)||null,cargo_provider:provider,source_mode:mode,metadata:{registered_via:"buyer-dashboard"}};
      const {data:ref,error}=await admin.from("shipment_tracking_references").upsert(row,{onConflict:"shipment_id,reference_type,reference_value,cargo_provider"}).select("*").single();
      if(error) throw error;
      const cfg=cargoEnv(provider);
      if(mode==="sandbox") return json({ok:true,reference_id:ref.id,provider_status:"sandbox-ready",providerConfigured:false,mode:"sandbox",message:"Reference saved for sandbox validation. No external provider was contacted."});
      if(!configured(cfg)) return json({ok:true,reference_id:ref.id,provider_status:"pending_provider",providerConfigured:false,mode:"live",message:"Reference saved. Provider API access is not configured yet; no live request was sent."});
      try {
        const url=new URL(env(cfg.path),env(cfg.base));
        const data=await providerRequest(url,cfg,"POST",{reference:value,reference_type:type,carrier_code:row.carrier_code,callback_url:supabaseUrl+"/functions/v1/vtg-live-tracking?action=webhook"});
        const providerRef=str(data.tracking_id??data.id??data.reference_id??data.data?.id)||null;
        await admin.from("shipment_tracking_references").update({provider_reference:providerRef,provider_status:"registered"}).eq("id",ref.id);
        await log(provider,"register",shipment.id,"ok",200,"Provider accepted tracking registration.");
        return json({ok:true,reference_id:ref.id,provider_status:"registered",providerConfigured:true,mode:"live",message:"Provider accepted the tracking request. Awaiting verified carrier events."});
      } catch(e) { await admin.from("shipment_tracking_references").update({provider_status:"error"}).eq("id",ref.id); await log(provider,"register",shipment.id,"error",502,String(e)); return json({error:"Provider registration failed. Check provider endpoint and credentials.",reference_id:ref.id},502); }
    }
    if (action === "link-vessel") {
      const shipmentId=str(body.shipment_id),provider=body.provider as AISProvider,imo=str(body.imo).trim(),mmsi=str(body.mmsi).trim();
      if(!shipmentId||!["vesselfinder","marinetraffic"].includes(provider)||(!imo&&!mmsi)) return json({error:"Shipment, AIS provider and IMO or MMSI are required."},400);
      const {shipment,order}=await ownedShipment(shipmentId,user.id);
      const {data,error}=await admin.from("shipment_vessels").insert({shipment_id:shipment.id,trade_order_id:order.id,buyer_id:user.id,ais_provider:provider,imo:imo||null,mmsi:mmsi||null,vessel_name:str(body.vessel_name)||null,source_mode:body.source_mode==="sandbox"?"sandbox":"live"}).select("id").single();
      if(error) throw error;
      return json({ok:true,vessel_id:data.id,message:"Vessel identity linked to this shipment. This link does not prove the cargo is aboard; carrier documentation must confirm that association."});
    }
    if (action === "refresh-vessel") {
      const vesselId=str(body.vessel_id);
      const {data:vessel,error}=await admin.from("shipment_vessels").select("*").eq("id",vesselId).eq("buyer_id",user.id).maybeSingle();
      if(error||!vessel) return json({error:"Vessel link not found for this buyer."},404);
      const provider=vessel.ais_provider as AISProvider,cfg=aisEnv(provider);
      if(vessel.source_mode==="sandbox") return json({error:"Sandbox vessel links do not request live AIS positions."},409);
      if(!configured(cfg)) return json({error:"AIS provider API access is not configured. No live position was requested."},424);
      try {
        const url=new URL(env(cfg.path),env(cfg.base));
        if(vessel.imo)url.searchParams.set("imo",vessel.imo);
        if(vessel.mmsi)url.searchParams.set("mmsi",vessel.mmsi);
        const data=await providerRequest(url,cfg,"GET");
        const pos=findArray(data)[0]||data.position||data.data?.position||data.data||data;
        const saved=await storePosition(vessel,provider,pos);
        await log(provider,"position",vessel.shipment_id,"ok",200,"AIS position received and validated.");
        return json({ok:true,position_time:saved.position_time,source_mode:"live"});
      } catch(e) { await log(provider,"position",vessel.shipment_id,"error",502,String(e)); return json({error:"AIS request failed or returned an invalid position."},502); }
    }
    if (action === "sandbox-event") {
      const shipmentId=str(body.shipment_id);
      const {shipment,order}=await ownedShipment(shipmentId,user.id);
      const label=str(body.event_label).trim().slice(0,120)||"Sandbox milestone";
      const {data:ref}=await admin.from("shipment_tracking_references").select("id,cargo_provider").eq("shipment_id",shipment.id).eq("buyer_id",user.id).limit(1).maybeSingle();
      const key="sandbox:"+crypto.randomUUID();
      const {error}=await admin.from("shipment_tracking_events").insert({tracking_reference_id:ref?.id||null,shipment_id:shipment.id,trade_order_id:order.id,buyer_id:user.id,provider:ref?.cargo_provider||"vizion",idempotency_key:key,event_label:label,event_code:"SANDBOX",description:"Test-only event. Not a carrier or port update.",event_time:new Date().toISOString(),source_mode:"sandbox",raw_payload:{test:true}});
      if(error)throw error;
      return json({ok:true,source_mode:"sandbox",message:"Sandbox milestone saved. It is clearly labelled as test data and is not a real shipment update."});
    }
    return json({error:"Unknown action"},400);
  } catch(e) { return json({error:String(e?.message||e)},400); }
}
Deno.serve(main);
