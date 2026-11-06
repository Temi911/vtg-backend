import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const H = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const out = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: H });
const str = (v: unknown) => typeof v === "string" ? v.trim() : "";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: H });
  if (req.method !== "POST") return out({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const bearer = req.headers.get("Authorization") || "";
  const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
  if (!url || !anon || !token) return out({ error: "Sign in to your VTG bank account" }, 401);

  const db = createClient(url, anon, {
    global: { headers: { Authorization: "Bearer " + token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const identity = await db.auth.getUser(token);
  if (identity.error || !identity.data.user) return out({ error: "Invalid session" }, 401);
  const user = identity.data.user;
  const [{ data: profile, error: pe }, { data: bank, error: be }] = await Promise.all([
    db.from("profiles").select("id,role,is_active,account_environment").eq("id", user.id).maybeSingle(),
    db.from("bank_profiles").select("user_id,bank_name,verification_status,swift_code,branch_name").eq("user_id", user.id).maybeSingle(),
  ]);
  if (pe || be || profile?.role !== "bank" || profile?.account_environment !== "trade" || profile?.is_active !== true) {
    return out({ error: "An active VTG bank trade account is required" }, 403);
  }
  if (!bank || bank.verification_status !== "verified") {
    return out({ error: "Your bank account is awaiting VTG approval. Assigned trade cases will appear after approval." }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const action = str(body.action) || "overview";
  if (action === "review-lc") {
    const lcId = str(body.lc_id);
    const status = str(body.status);
    const note = str(body.note).slice(0, 1000);
    if (!lcId || !["under_review", "documents_requested", "declined"].includes(status)) {
      return out({ error: "Choose an assigned LC and a supported review outcome" }, 400);
    }
    const { data, error } = await db.rpc("vtg_bank_review_lc", {
      p_lc_id: lcId,
      p_status: status,
      p_note: note,
    });
    if (error) return out({ error: "LC review could not be recorded. Confirm that the case is assigned to this verified bank." }, 403);
    return out({ success: true, lc_id: data, status });
  }
  if (action !== "overview") return out({ error: "Unknown bank workspace action" }, 400);

  const { data: lcs, error: le } = await db.from("letters_of_credit")
    .select("id,order_id,buyer_id,supplier_id,reference,amount,currency,status,expiry_date,created_at,updated_at")
    .eq("bank_id", user.id).order("created_at", { ascending: false }).limit(100);
  if (le) return out({ error: "Assigned bank cases could not be loaded" }, 403);
  const rows = lcs || [];
  const orderIds = [...new Set(rows.map((x: any) => x.order_id).filter(Boolean))];
  if (!orderIds.length) return out({ bank: { bank_name: bank.bank_name }, letters_of_credit: [], orders: [], documents: [], shipments: [], shipment_events: [], payment_intents: [] });

  const [orders, docs, shipments, intents] = await Promise.all([
    db.from("trade_orders").select("id,reference,buyer_id,supplier_id,product_id,status,quantity,unit_price,currency,incoterm,origin_port,destination_port,created_at").in("id", orderIds),
    db.from("trade_documents").select("id,order_id,owner_id,document_type,file_name,mime_type,file_size_bytes,status,storage_path,created_at").in("order_id", orderIds).order("created_at", { ascending: false }).limit(200),
    db.from("shipments").select("id,order_id,carrier,tracking_number,container_number,origin_port,destination_port,status,created_at").in("order_id", orderIds).limit(100),
    db.from("vtg_payment_intents").select("id,order_id,payer_id,payee_id,amount,currency,purpose,status,provider,created_at").in("order_id", orderIds).limit(100),
  ]);
  if (orders.error || docs.error || shipments.error || intents.error) {
    return out({ error: "Assigned trade records could not be loaded under bank access policies" }, 403);
  }
  const shipmentIds = (shipments.data || []).map((x: any) => x.id);
  let events: any[] = [];
  if (shipmentIds.length) {
    const result = await db.from("shipment_events")
      .select("id,shipment_id,event_type,description,location,event_time,created_at")
      .in("shipment_id", shipmentIds).order("event_time", { ascending: false }).limit(200);
    if (result.error) return out({ error: "Shipment milestones could not be loaded" }, 403);
    events = result.data || [];
  }
  return out({
    bank: { bank_name: bank.bank_name, branch_name: bank.branch_name, swift_code: bank.swift_code },
    letters_of_credit: rows,
    orders: orders.data || [],
    documents: docs.data || [],
    shipments: shipments.data || [],
    shipment_events: events,
    payment_intents: intents.data || [],
    notice: "Read-only assigned trade view. Review actions are audit-recorded. This workspace does not issue LCs or execute/release payments.",
  });
});
